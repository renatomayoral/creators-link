import type {
  InstanceConfig,
  Instance,
  InstanceStatus,
  GPUMetrics,
  BillingInfo,
} from '@repo/shared/types'
import { RUNPOD_DEFAULTS } from '@repo/shared/constants'
import type { CloudProvider } from '../interface'

export type RunPodConfig = {
  apiKey: string
  gpuType?: string
  dockerImage?: string
}

type RunPodPod = {
  id: string
  name: string
  desiredStatus: string
  imageName: string
  costPerHr: number
  runtime?: {
    ports?: Array<{
      ip: string
      privatePort: number
      publicPort: number
      type: string
    }>
  }
}

export class RunPodProvider implements CloudProvider {
  private apiKey: string
  private gpuType: string
  private dockerImage: string

  constructor(config: RunPodConfig) {
    this.apiKey = config.apiKey
    this.gpuType = config.gpuType ?? RUNPOD_DEFAULTS.defaultGpuType
    this.dockerImage = config.dockerImage ?? RUNPOD_DEFAULTS.defaultImage
  }

  async createInstance(config: InstanceConfig): Promise<Instance> {
    const mutation = `
      mutation {
        podFindAndDeployOnDemand(input: {
          name: "${config.name}"
          imageName: "${this.dockerImage}"
          gpuTypeId: "${this.gpuType}"
          cloudType: SECURE
          gpuCount: ${config.gpuCount ?? 1}
          volumeInGb: ${config.diskSizeGb ?? 200}
          containerDiskInGb: 50
          ports: "8188/http,22/tcp"
          volumeMountPath: "/data"
        }) {
          id desiredStatus imageName costPerHr
          runtime { ports { ip privatePort publicPort type } }
        }
      }
    `

    const data = await this.gql<{
      podFindAndDeployOnDemand: RunPodPod
    }>(mutation)

    const pod = data.podFindAndDeployOnDemand

    return {
      id: pod.id,
      name: config.name,
      status: 'STARTING',
      createdAt: new Date(),
    }
  }

  async startInstance(podId: string): Promise<InstanceStatus> {
    const mutation = `
      mutation {
        podResume(input: { podId: "${podId}", gpuCount: 1 }) {
          id desiredStatus
        }
      }
    `
    await this.gql(mutation)
    return 'STARTING'
  }

  async stopInstance(podId: string): Promise<void> {
    const mutation = `
      mutation {
        podStop(input: { podId: "${podId}" }) {
          id desiredStatus
        }
      }
    `
    await this.gql(mutation)
  }

  async deleteInstance(podId: string): Promise<void> {
    const mutation = `
      mutation {
        podTerminate(input: { podId: "${podId}" }) {
          id
        }
      }
    `
    await this.gql(mutation)
  }

  async getStatus(podId: string): Promise<InstanceStatus> {
    const query = `
      query {
        pod(input: { podId: "${podId}" }) {
          id desiredStatus
        }
      }
    `
    type PodStatus = { pod: { desiredStatus: string } }
    const data = await this.gql<PodStatus>(query)
    return this.mapStatus(data.pod.desiredStatus)
  }

  async getMetrics(_podId: string): Promise<GPUMetrics> {
    // RunPod doesn't expose real-time GPU metrics via API
    // Metrics are fetched via SSH to the pod
    return {
      vramUsedGB: 0,
      vramTotalGB: 80,
      gpuUtilizationPct: 0,
      temperatureC: 0,
    }
  }

  async getBilling(): Promise<BillingInfo> {
    const query = `
      query {
        myself {
          creditBalance
          currentSpend
        }
      }
    `
    type MyselfQuery = {
      myself: { creditBalance: number; currentSpend: number }
    }
    const data = await this.gql<MyselfQuery>(query)
    return {
      creditRemainingUSD: data.myself.creditBalance,
      usedThisMonthUSD: data.myself.currentSpend,
      estimatedCostPerHour: 2.21, // A100 80GB price
    }
  }

  async runCommand(_podId: string, _command: string): Promise<string> {
    // RunPod command execution happens via SSH to the pod's public IP
    throw new Error(
      'Use SSH to run commands on RunPod pods. Get the public IP from getTunnelUrl.',
    )
  }

  async getTunnelUrl(podId: string, port: number): Promise<string> {
    const query = `
      query {
        pod(input: { podId: "${podId}" }) {
          id
          runtime {
            ports { ip privatePort publicPort type }
          }
        }
      }
    `
    type PodQuery = {
      pod: {
        runtime?: {
          ports?: Array<{
            ip: string
            privatePort: number
            publicPort: number
            type: string
          }>
        }
      }
    }
    const data = await this.gql<PodQuery>(query)
    const portInfo = data.pod.runtime?.ports?.find(
      (p) => p.privatePort === port,
    )
    if (!portInfo) throw new Error(`Port ${port} not found on pod ${podId}`)
    return `https://${portInfo.ip}-${portInfo.publicPort}.proxy.runpod.net`
  }

  private async gql<T>(query: string): Promise<T> {
    const res = await fetch(RUNPOD_DEFAULTS.apiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) {
      throw new Error(`RunPod API error: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as { data?: T; errors?: unknown[] }
    if (json.errors?.length) {
      throw new Error(`RunPod GraphQL error: ${JSON.stringify(json.errors)}`)
    }

    return json.data as T
  }

  private mapStatus(runpodStatus: string): InstanceStatus {
    const map: Record<string, InstanceStatus> = {
      RUNNING: 'RUNNING',
      EXITED: 'STOPPED',
      PAUSED: 'STOPPED',
      DEAD: 'STOPPED',
    }
    return map[runpodStatus] ?? 'UNKNOWN'
  }
}
