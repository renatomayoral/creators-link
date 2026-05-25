import { InstancesClient, ZoneOperationsClient } from '@google-cloud/compute'
import { execa } from 'execa'
import type {
  InstanceConfig,
  Instance,
  InstanceStatus,
  GPUMetrics,
  BillingInfo,
} from '@repo/shared/types'
import { GCP_DEFAULTS } from '@repo/shared/constants'
import type { CloudProvider } from '../interface'

export type GCPConfig = {
  projectId: string
  zone: string
}

export class GCPProvider implements CloudProvider {
  private instancesClient: InstancesClient
  private zoneOpsClient: ZoneOperationsClient
  private projectId: string
  private zone: string

  constructor(config?: Partial<GCPConfig>) {
    this.projectId = config?.projectId ?? GCP_DEFAULTS.projectId
    this.zone = config?.zone ?? GCP_DEFAULTS.defaultZone
    // Auth via application-default credentials
    this.instancesClient = new InstancesClient()
    this.zoneOpsClient = new ZoneOperationsClient()
  }

  async createInstance(config: InstanceConfig): Promise<Instance> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await this.instancesClient.insert({
      project: this.projectId,
      zone: this.zone,
      instanceResource: {
        name: config.name,
        machineType: `zones/${this.zone}/machineTypes/${config.machineType ?? 'n1-standard-8'}`,
        disks: [
          {
            boot: true,
            autoDelete: true,
            initializeParams: {
              sourceImage:
                config.image ??
                'projects/deeplearning-platform-release/global/images/family/common-cu121-debian-11-py310',
              diskSizeGb: String(config.diskSizeGb ?? 200),
              diskType: `zones/${this.zone}/diskTypes/pd-ssd`,
            },
          },
        ],
        networkInterfaces: [
          {
            network: 'global/networks/default',
            accessConfigs: [{ type: 'ONE_TO_ONE_NAT', name: 'External NAT' }],
          },
        ],
        guestAccelerators: config.gpuType
          ? [
              {
                acceleratorType: `zones/${this.zone}/acceleratorTypes/${config.gpuType}`,
                acceleratorCount: config.gpuCount ?? 1,
              },
            ]
          : [],
        scheduling: config.gpuType
          ? { onHostMaintenance: 'TERMINATE', automaticRestart: false }
          : undefined,
        metadata: {
          items: [
            {
              key: 'startup-script',
              value: config.startupScript ?? '',
            },
          ],
        },
        labels: config.labels,
      },
    // v6 return type is `Promise<[...]> & void`, use explicit cast
    })) as unknown as [{ name?: string }]

    await this.waitForOperation(result[0]?.name ?? '')

    return {
      id: config.name,
      name: config.name,
      status: 'STARTING',
      zone: this.zone,
      createdAt: new Date(),
    }
  }

  async startInstance(instanceName: string): Promise<InstanceStatus> {
    const [operation] = await this.instancesClient.start({
      project: this.projectId,
      zone: this.zone,
      instance: instanceName,
    })
    await this.waitForOperation(
      (operation as { name?: string }).name ?? '',
    )
    return 'RUNNING'
  }

  async stopInstance(instanceName: string): Promise<void> {
    const [operation] = await this.instancesClient.stop({
      project: this.projectId,
      zone: this.zone,
      instance: instanceName,
    })
    await this.waitForOperation(
      (operation as { name?: string }).name ?? '',
    )
  }

  async deleteInstance(instanceName: string): Promise<void> {
    const [operation] = await this.instancesClient.delete({
      project: this.projectId,
      zone: this.zone,
      instance: instanceName,
    })
    await this.waitForOperation(
      (operation as { name?: string }).name ?? '',
    )
  }

  async getStatus(instanceName: string): Promise<InstanceStatus> {
    try {
      const [instance] = await this.instancesClient.get({
        project: this.projectId,
        zone: this.zone,
        instance: instanceName,
      })
      return this.mapStatus(instance.status ?? 'UNKNOWN')
    } catch {
      return 'UNKNOWN'
    }
  }

  async getMetrics(instanceName: string): Promise<GPUMetrics> {
    try {
      const result = await this.runCommand(
        instanceName,
        'nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader,nounits',
      )
      const [memUsed, memTotal, utilization, temp] = result
        .trim()
        .split(',')
        .map((s) => parseFloat(s.trim()))
      return {
        vramUsedGB: (memUsed ?? 0) / 1024,
        vramTotalGB: (memTotal ?? 0) / 1024,
        gpuUtilizationPct: utilization ?? 0,
        temperatureC: temp ?? 0,
      }
    } catch {
      return {
        vramUsedGB: 0,
        vramTotalGB: 0,
        gpuUtilizationPct: 0,
        temperatureC: 0,
      }
    }
  }

  async getBilling(): Promise<BillingInfo> {
    // GCP billing is read via Cloud Billing API or budget alerts
    // For now return a placeholder — actual impl would query the Billing API
    return {
      creditRemainingUSD: 0,
      usedThisMonthUSD: 0,
      estimatedCostPerHour: 0,
      projectId: this.projectId,
    }
  }

  async runCommand(instanceName: string, command: string): Promise<string> {
    const { stdout } = await execa('gcloud', [
      'compute',
      'ssh',
      instanceName,
      `--project=${this.projectId}`,
      `--zone=${this.zone}`,
      '--command',
      command,
    ])
    return stdout
  }

  async getTunnelUrl(instanceName: string, port: number): Promise<string> {
    // Returns the localhost URL after setting up an SSH tunnel
    // Tunnel must be started separately:
    // gcloud compute ssh $instance --project=$project -- -L $port:localhost:$port -N
    return `http://localhost:${port}`
  }

  private mapStatus(gcpStatus: string): InstanceStatus {
    const map: Record<string, InstanceStatus> = {
      RUNNING: 'RUNNING',
      TERMINATED: 'STOPPED',
      STOPPING: 'STOPPING',
      STAGING: 'STARTING',
      PROVISIONING: 'STARTING',
      SUSPENDING: 'STOPPING',
      SUSPENDED: 'STOPPED',
      REPAIRING: 'UNKNOWN',
    }
    return map[gcpStatus] ?? 'UNKNOWN'
  }

  private async waitForOperation(operationName: string): Promise<void> {
    if (!operationName) return
    let done = false
    while (!done) {
      const [op] = await this.zoneOpsClient.get({
        project: this.projectId,
        zone: this.zone,
        operation: operationName,
      })
      done = op.status === 'DONE'
      if (!done) await new Promise((r) => setTimeout(r, 2000))
    }
  }
}
