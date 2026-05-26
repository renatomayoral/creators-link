/**
 * ComfyUI SSH Tunnel Manager
 *
 * Manages a gcloud compute ssh port-forwarding process that tunnels
 * localhost:8188 → VM:8188. The tunnel is started lazily on first
 * proxy request and kept alive until the process exits.
 *
 * Retry strategy:
 *  - If SSH connection is refused (VM still booting), retries every 10s
 *  - Total wait budget: 5 minutes (VM boot + ComfyUI startup)
 *  - Once SSH is up, waits up to 90s for ComfyUI to listen on port 8188
 */

import { spawn, spawnSync, type ChildProcess } from 'child_process'

/** Kill any process holding the local port (stale tunnel cleanup) */
function freePort(port: number): void {
  // Try fuser first (Linux)
  const fuser = spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' })
  if (fuser.status === 0) return

  // Fallback: lsof + kill
  const lsof = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' })
  const pids = (lsof.stdout as string)?.trim().split('\n').filter(Boolean) ?? []
  for (const pid of pids) {
    spawnSync('kill', ['-9', pid], { stdio: 'ignore' })
  }
}

const LOCAL_PORT              = 8188
const COMFYUI_READY_TIMEOUT   = 3 * 60_000  // wait up to 3min for ComfyUI HTTP (model loading)
const SSH_RETRY_INTERVAL      = 10_000      // retry SSH every 10s
const TOTAL_BUDGET_MS         = 8 * 60 * 1000  // 8 min total (VM boot + ComfyUI model load)

type TunnelState = 'idle' | 'starting' | 'ready' | 'error'

let tunnelProcess: ChildProcess | null = null
let tunnelState: TunnelState = 'idle'
let readyPromise: Promise<void> | null = null

function getGCPConfig() {
  return {
    project:  process.env['GCP_PROJECT']       ?? 'mktia-ai-studio',
    zone:     process.env['GCP_ZONE']          ?? 'us-central1-f',
    instance: process.env['GCP_INSTANCE_NAME'] ?? 'ai-studio-vm',
  }
}

/**
 * Check if ComfyUI is truly responding over HTTP through the tunnel.
 * isPortOpen() returns true as soon as SSH binds the local port — even
 * before ComfyUI is listening on the remote end. This actually sends
 * an HTTP request to confirm ComfyUI is serving.
 */
async function isComfyUIReady(port: number): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3_000)
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: ctrl.signal })
    clearTimeout(timer)
    return res.status < 500
  } catch {
    return false
  }
}

/** Poll ComfyUI HTTP endpoint until it responds or timeout expires */
async function waitForComfyUI(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isComfyUIReady(port)) return true
    await new Promise((r) => setTimeout(r, 2_000))
  }
  return false
}

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Attempt a single SSH tunnel connection.
 * Returns 'connected' if SSH established and port 8188 is open,
 * 'refused'   if SSH itself was refused (VM not ready),
 * 'timeout'   if SSH connected but ComfyUI didn't answer in time.
 */
async function attemptTunnel(): Promise<'connected' | 'refused' | 'timeout'> {
  const { project, zone, instance } = getGCPConfig()

  // Free any stale process holding the port before we try to bind it
  freePort(LOCAL_PORT)
  await sleep(500) // give the OS a moment to release the port

  return new Promise((resolve) => {
    let sshRefused = false

    const proc = spawn(
      'gcloud',
      [
        'compute', 'ssh', instance,
        `--project=${project}`,
        `--zone=${zone}`,
        '--',
        '-L', `${LOCAL_PORT}:localhost:${LOCAL_PORT}`,
        '-N',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ExitOnForwardFailure=yes',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'ConnectTimeout=8',
      ],
      { stdio: 'pipe', detached: false },
    )

    tunnelProcess = proc

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (msg) console.log(`[tunnel] ${msg.trim()}`)
      if (
        msg.includes('Connection refused') ||
        msg.includes('connect to host') ||
        msg.includes('Address already in use') ||
        (msg.includes('channel') && msg.includes('open failed'))
      ) {
        sshRefused = true
      }
    })

    // SSH exited before we resolved → connection refused or other error
    proc.on('exit', (code) => {
      console.log(`[tunnel] Process exited (code ${code})`)
      tunnelProcess = null
      if (!sshRefused && code === 255) sshRefused = true
      resolve(sshRefused ? 'refused' : 'refused') // treat all early exits as retry
    })

    proc.on('error', (err) => {
      console.error(`[tunnel] Spawn error: ${err.message}`)
      resolve('refused')
    })

    // Start polling ComfyUI HTTP in parallel once SSH process is up
    ;(async () => {
      // Give SSH ~3s to either fail fast (connection refused) or bind the local port
      await sleep(3_000)

      // If process already exited (SSH refused), don't poll
      if (!tunnelProcess) return

      // Use HTTP check — isPortOpen() returns true as soon as SSH binds
      // the local port, even before ComfyUI is listening on the remote end
      const ready = await waitForComfyUI(LOCAL_PORT, COMFYUI_READY_TIMEOUT)
      if (ready) {
        console.log(`[tunnel] ComfyUI respondendo em localhost:${LOCAL_PORT}`)
        resolve('connected')
      } else {
        proc.kill()
        resolve('timeout')
      }
    })()
  })
}

/** Start the tunnel with retry until budget expires */
function startTunnel(): Promise<void> {
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    tunnelState = 'starting'
    const deadline = Date.now() + TOTAL_BUDGET_MS

    // Already open and ComfyUI responding from a previous tunnel
    if (await isComfyUIReady(LOCAL_PORT)) {
      tunnelState = 'ready'
      return
    }

    const { instance } = getGCPConfig()
    if (!instance) {
      tunnelState = 'error'
      readyPromise = null
      throw new Error('GCP_INSTANCE_NAME não configurado')
    }

    let attempt = 0
    while (Date.now() < deadline) {
      attempt++
      console.log(`[tunnel] Tentativa ${attempt} — conectando ao SSH de ${instance}`)

      const result = await attemptTunnel()

      if (result === 'connected') {
        tunnelState = 'ready'
        return
      }

      // Both 'refused' and 'timeout' are retriable:
      //   refused  → VM still booting, SSH not up yet
      //   timeout  → SSH connected but ComfyUI still loading models (can take 2-4 min)
      const remaining = deadline - Date.now()
      if (remaining <= 0) break

      const wait = Math.min(SSH_RETRY_INTERVAL, remaining)
      if (result === 'timeout') {
        console.log(`[tunnel] ComfyUI não respondeu — modelos ainda carregando. Próxima tentativa em ${wait / 1000}s…`)
      } else {
        console.log(`[tunnel] SSH recusado — VM ainda iniciando. Próxima tentativa em ${wait / 1000}s…`)
      }
      await sleep(wait)
    }

    tunnelState = 'error'
    readyPromise = null
    throw new Error('Timeout de 8 minutos — VM disponível via SSH mas ComfyUI não respondeu. Verifique se o serviço ai-studio está rodando na VM.')
  })()

  readyPromise.catch(() => {
    tunnelState = 'idle'
    readyPromise = null
  })

  return readyPromise
}

/** Ensure tunnel is up, starting it if necessary */
export async function ensureTunnel(): Promise<void> {
  if (tunnelState === 'ready' && await isComfyUIReady(LOCAL_PORT)) return
  if (tunnelState === 'starting' && readyPromise) return readyPromise
  readyPromise = null
  tunnelState = 'idle'
  return startTunnel()
}

/** Stop the tunnel */
export function stopTunnel(): void {
  tunnelProcess?.kill()
  tunnelProcess = null
  tunnelState = 'idle'
  readyPromise = null
}

export function getTunnelState(): TunnelState {
  return tunnelState
}
