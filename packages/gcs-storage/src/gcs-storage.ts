import { Storage } from '@google-cloud/storage'
import path from 'node:path'
import type {
  GeneratedAsset,
  AssetFilter,
  StorageStats,
  AssetMetadata,
} from '@repo/shared/types'
import { GCS_DEFAULTS } from '@repo/shared/constants'

export type GCSConfig = {
  projectId: string
  bucketName: string
}

export class GCSStorage {
  private storage: Storage
  private bucketName: string
  private projectId: string

  constructor(config?: Partial<GCSConfig>) {
    this.projectId = config?.projectId ?? GCS_DEFAULTS.projectId
    this.bucketName = config?.bucketName ?? GCS_DEFAULTS.bucketName
    // Auth via application-default credentials (gcloud auth application-default login)
    this.storage = new Storage({ projectId: this.projectId })
  }

  async listAssets(filter?: AssetFilter): Promise<GeneratedAsset[]> {
    const bucket = this.storage.bucket(this.bucketName)
    const [files] = await bucket.getFiles({
      prefix: filter?.provider ? `${filter.provider}/` : undefined,
      maxResults: filter?.limit ?? 500,
    })

    let assets = await Promise.all(
      files
        .filter((f) => this.isMediaFile(f.name))
        .map((f) => this.fileToAsset(f)),
    )

    if (filter?.type && filter.type !== 'all') {
      assets = assets.filter((a) => a.type === filter.type)
    }

    if (filter?.dateFrom) {
      assets = assets.filter((a) => a.createdAt >= filter.dateFrom!)
    }

    if (filter?.dateTo) {
      assets = assets.filter((a) => a.createdAt <= filter.dateTo!)
    }

    if (filter?.model) {
      assets = assets.filter((a) => a.metadata?.model === filter.model)
    }

    // Sort by newest first
    assets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    if (filter?.offset) {
      assets = assets.slice(filter.offset)
    }

    return assets
  }

  async getAsset(gcsPath: string): Promise<GeneratedAsset> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(gcsPath)
    return this.fileToAsset(file)
  }

  async getDownloadUrl(
    gcsPath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(gcsPath)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    })
    return url
  }

  async deleteAsset(gcsPath: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName)
    await bucket.file(gcsPath).delete()
  }

  async uploadFile(localPath: string, remotePath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName)
    await bucket.upload(localPath, {
      destination: remotePath,
      metadata: {
        cacheControl: 'no-cache',
      },
    })
    return `gs://${this.bucketName}/${remotePath}`
  }

  /**
   * Upload a Buffer or Uint8Array directly to GCS (no local file needed).
   * Returns the GCS URI.
   */
  async uploadBuffer(
    data: Buffer | Uint8Array,
    remotePath: string,
    contentType = 'application/octet-stream',
    customMetadata?: Record<string, string>,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName)
    const file   = bucket.file(remotePath)
    await file.save(Buffer.from(data), {
      contentType,
      metadata: {
        cacheControl: 'no-cache',
        metadata: customMetadata,
      },
    })
    return `gs://${this.bucketName}/${remotePath}`
  }

  async getStorageStats(): Promise<StorageStats> {
    const assets = await this.listAssets()
    const imageCount = assets.filter((a) => a.type === 'image').length
    const videoCount = assets.filter((a) => a.type === 'video').length
    const totalSizeBytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0)
    const dates = assets.map((a) => a.createdAt).sort()

    return {
      totalFiles: assets.length,
      totalSizeBytes,
      imageCount,
      videoCount,
      oldestAsset: dates[0],
      newestAsset: dates[dates.length - 1],
    }
  }

  async ensureBucket(): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName)
    const [exists] = await bucket.exists()
    if (!exists) {
      await bucket.create({
        location: 'us-central1',
        storageClass: 'STANDARD',
        iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
      })
    }
  }

  private isMediaFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm'].includes(
      ext,
    )
  }

  private async fileToAsset(
    file: ReturnType<ReturnType<Storage['bucket']>['file']>,
  ): Promise<GeneratedAsset> {
    const [metadata] = await file.getMetadata()
    const ext = path.extname(file.name).toLowerCase()
    const isVideo = ['.mp4', '.webm'].includes(ext)
    const customMeta = metadata.metadata as Record<string, string> | undefined

    let assetMetadata: AssetMetadata | undefined
    if (customMeta?.prompt) {
      assetMetadata = {
        prompt: customMeta.prompt ?? '',
        negativePrompt: customMeta.negativePrompt,
        model: customMeta.model ?? 'unknown',
        steps: Number(customMeta.steps ?? 0),
        cfg: Number(customMeta.cfg ?? 0),
        seed: Number(customMeta.seed ?? 0),
        resolution: customMeta.resolution ?? '',
        durationMs: Number(customMeta.durationMs ?? 0),
        generatedAt: customMeta.generatedAt ?? new Date().toISOString(),
        provider:
          (customMeta.provider as AssetMetadata['provider']) ?? 'local',
        gpu: customMeta.gpu ?? 'unknown',
      }
    }

    return {
      id: Buffer.from(file.name).toString('base64url'),
      filename: path.basename(file.name),
      gcsPath: file.name,
      type: isVideo ? 'video' : 'image',
      sizeBytes: Number(metadata.size ?? 0),
      createdAt: new Date(metadata.timeCreated ?? Date.now()),
      metadata: assetMetadata,
    }
  }
}
