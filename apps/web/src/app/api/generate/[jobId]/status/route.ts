import { NextRequest } from 'next/server'
import { ComfyUIClient } from '@repo/comfyui-client'
import { GCSStorage } from '@repo/gcs-storage'

const COMFYUI_BASE = 'http://127.0.0.1:8188'

/** Fetch raw bytes from ComfyUI output via the tunnel */
async function fetchOutputFile(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(
      `${COMFYUI_BASE}/view?filename=${encodeURIComponent(filename)}&type=output`,
      { headers: { origin: COMFYUI_BASE, referer: `${COMFYUI_BASE}/` } },
    )
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    return { buffer, contentType }
  } catch {
    return null
  }
}

/** Delete a file from ComfyUI's output folder via its API */
async function deleteFromComfyUI(filename: string): Promise<void> {
  try {
    await fetch(`${COMFYUI_BASE}/api/free`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: COMFYUI_BASE,
        referer: `${COMFYUI_BASE}/`,
      },
      // ComfyUI v1.3+ accepts a list of output filenames to purge
      body: JSON.stringify({ unload_models: false, free_memory: false, output_files: [filename] }),
    })
  } catch {
    // Non-critical — file will remain on disk but GCS copy is the source of truth
  }
}

/**
 * Upload the file to GCS, delete it from the VM, and return a signed URL.
 * Falls back to the Next.js proxy URL if GCS upload fails.
 */
async function uploadAndGetUrl(
  filename: string,
  outputType: 'image' | 'video',
  provider: string,
): Promise<string> {
  const proxyFallback = `/api/comfyui/view?filename=${encodeURIComponent(filename)}&type=output`

  const file = await fetchOutputFile(filename)
  if (!file) return proxyFallback

  try {
    const storage = new GCSStorage()
    const gcsPath = `${provider}/${filename}`
    await storage.uploadBuffer(file.buffer, gcsPath, file.contentType, {
      generatedAt: new Date().toISOString(),
      provider,
      type: outputType,
    })
    // Remove from VM after confirmed GCS upload
    await deleteFromComfyUI(filename)
    return await storage.getDownloadUrl(gcsPath, 3600)
  } catch (err) {
    console.error('[generate/status] GCS upload failed, using proxy URL:', err)
    return proxyFallback
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const client    = new ComfyUIClient(process.env['COMFYUI_URL'] ?? COMFYUI_BASE)
  const provider  = process.env['CLOUD_PROVIDER'] ?? 'gcp'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      let attempts    = 0
      const maxAttempts = 300  // 5 min at 1s intervals

      while (attempts < maxAttempts) {
        const output = await client.getJobOutput(jobId)

        if (output.status === 'completed') {
          const firstVideo = output.videos?.[0]
          const firstImage = output.images?.[0]

          let outputUrl:  string | undefined
          let outputType: 'image' | 'video' = 'image'

          if (firstVideo) {
            outputType = 'video'
            outputUrl  = await uploadAndGetUrl(firstVideo.filename, 'video', provider)
          } else if (firstImage) {
            outputUrl  = await uploadAndGetUrl(firstImage.filename, 'image', provider)
          }

          send({ status: 'completed', percentage: 100, outputUrl, outputType })
          break
        }

        if (output.status === 'failed') {
          send({ status: 'failed', percentage: 0 })
          break
        }

        send({ status: output.status, percentage: Math.min(attempts * 2, 95) })
        await new Promise((r) => setTimeout(r, 1_000))
        attempts++
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
