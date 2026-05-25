# NFSW AI Studio — Contexto do Projeto

Monorepo com Turborepo + Next.js 16 para gerenciar ambiente de geração de vídeo/imagem com IA no Google Cloud (ComfyUI + Wan 2.2 + FLUX.1), com suporte a RunPod como provider alternativo e persistência permanente de outputs via Google Cloud Storage.

## Projeto GCP
- **Nome**: liberlaser > AI Studio
- **Número**: 448251250847
- **ID**: `mktia-ai-studio` ← usar SEMPRE em comandos gcloud
- **Organização**: liberlaser.com (ID: 1055618027140)
- **Billing Account**: FYGRAPH (01E2E4-6D42DB-07D06C)
- **Bucket de outputs**: `mktia-ai-studio-outputs`
- **Auth local**: `gcloud auth application-default login` (sem service account key file)

## GitHub
- **Repo**: `renatomayoral/nfsw-ai-studio`
- **Registry**: `ghcr.io/renatomayoral/nfsw-ai-studio:latest`

---

## Stack Tecnológica

- **Next.js 16** com App Router e Server Components
- **TypeScript** em todo o monorepo (strict mode)
- **Tailwind CSS v4**
- **shadcn/ui** (packages/ui compartilhado + apps/web)
- **Turborepo** como build system
- **pnpm workspaces** como package manager
- **Zod** para validação
- **@google-cloud/compute** SDK GCP
- **@google-cloud/storage** SDK GCS
- **execa** para comandos shell
- **ws** para WebSocket com ComfyUI
- **Zustand** para state management
- **TanStack Query v5** para data fetching
- **react-hook-form** para formulários

---

## Estrutura do Monorepo

```
nfsw-ai-studio/
├── apps/
│   └── web/                          # Next.js 16 dashboard
├── packages/
│   ├── ui/                           # shadcn/ui componentes compartilhados
│   ├── cloud-infra/                  # GCP + RunPod com interface comum
│   ├── comfyui-client/               # Client HTTP para API do ComfyUI
│   ├── gcs-storage/                  # Google Cloud Storage para outputs
│   └── shared/                       # Tipos TypeScript e utilitários
├── scripts/
│   ├── vm/
│   │   ├── setup.sh
│   │   ├── download_models.sh
│   │   └── start_comfyui.sh
│   └── workflows/
│       ├── wan22_t2v.json
│       └── flux_t2i.json
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── extra_model_paths.yaml
│   └── scripts/
│       ├── entrypoint.sh
│       ├── download_models.sh
│       └── save_metadata.sh
├── .github/
│   └── workflows/
│       └── docker-build.yml
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .dockerignore
├── .env.example
└── README.md
```

---

## Defaults de Configuração (hardcoded como defaults, nunca como secrets)

```typescript
const GCP_DEFAULTS = {
  projectId: 'mktia-ai-studio',
  projectNumber: '448251250847',
  defaultZone: 'us-central1-f',
  defaultRegion: 'us-central1',
} as const

const GCS_DEFAULTS = {
  projectId: 'mktia-ai-studio',
  bucketName: 'mktia-ai-studio-outputs',
} as const

const RUNPOD_DEFAULTS = {
  apiBaseUrl: 'https://api.runpod.io/graphql',
  restBaseUrl: 'https://api.runpod.io/v2',
  defaultGpuType: 'NVIDIA A100-SXM4-80GB',
  defaultImage: 'ghcr.io/renatomayoral/nfsw-ai-studio:latest',
} as const
```

---

## packages/shared — Tipos principais

```typescript
// src/types/settings.ts
export type AppSettings = {
  cloudProvider: 'gcp' | 'runpod'
  gcpProjectId: string        // default: 'mktia-ai-studio'
  gcpProjectNumber: string    // default: '448251250847'
  gcpInstanceName: string
  gcpZone: string             // default: 'us-central1-a'
  runpodApiKey?: string
  runpodGpuType?: string
  runpodPodId?: string
  runpodDockerImage?: string  // default: 'ghcr.io/renatomayoral/nfsw-ai-studio:latest'
  gcsBucketName: string       // default: 'mktia-ai-studio-outputs'
  autoUpload: boolean         // default: true
  hfToken: string
  autoShutdownHours: number | null
}

// src/types/assets.ts
export type GeneratedAsset = {
  id: string
  filename: string
  gcsPath: string
  downloadUrl?: string
  type: 'image' | 'video'
  sizeBytes: number
  createdAt: Date
  metadata?: AssetMetadata
}

export type AssetMetadata = {
  prompt: string
  negativePrompt?: string
  model: string
  steps: number
  cfg: number
  seed: number
  resolution: string
  durationMs: number
  generatedAt: string
  provider: 'gcp' | 'runpod' | 'local'
  gpu: string
}

export type StorageStats = {
  totalFiles: number
  totalSizeBytes: number
  imageCount: number
  videoCount: number
  oldestAsset?: Date
  newestAsset?: Date
}

export type AssetFilter = {
  type?: 'image' | 'video' | 'all'
  dateFrom?: Date
  dateTo?: Date
  model?: string
  provider?: 'gcp' | 'runpod'
  limit?: number
  offset?: number
}
```

---

## packages/cloud-infra — Interface comum

```typescript
export interface CloudProvider {
  createInstance(config: InstanceConfig): Promise<Instance>
  startInstance(id: string): Promise<InstanceStatus>
  stopInstance(id: string): Promise<void>
  deleteInstance(id: string): Promise<void>
  getStatus(id: string): Promise<InstanceStatus>
  getMetrics(id: string): Promise<GPUMetrics>
  getBilling(): Promise<BillingInfo>
  runCommand(id: string, command: string): Promise<string>
  getTunnelUrl(id: string, port: number): Promise<string>
}

export type InstanceStatus = 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'UNKNOWN'

export type GPUMetrics = {
  vramUsedGB: number
  vramTotalGB: number
  gpuUtilizationPct: number
  temperatureC: number
}

export type BillingInfo = {
  creditRemainingUSD: number
  usedThisMonthUSD: number
  estimatedCostPerHour: number
  projectId?: string
}
```

RunPod usa GraphQL:
```graphql
mutation {
  podFindAndDeployOnDemand(input: {
    name: "ai-studio"
    imageName: "ghcr.io/renatomayoral/nfsw-ai-studio:latest"
    gpuTypeId: "NVIDIA A100-SXM4-80GB"
    cloudType: SECURE
    gpuCount: 1
    volumeInGb: 200
    containerDiskInGb: 50
    ports: "8188/http,22/tcp"
    volumeMountPath: "/data"
  }) {
    id desiredStatus imageName costPerHr
    runtime { ports { ip privatePort publicPort type } }
  }
}
```

---

## packages/gcs-storage — GCSStorage class

```typescript
export class GCSStorage {
  constructor(config?: Partial<GCSConfig>)
  async listAssets(filter?: AssetFilter): Promise<GeneratedAsset[]>
  async getAsset(path: string): Promise<GeneratedAsset>
  async getDownloadUrl(path: string, expiresInSeconds?: number): Promise<string>
  async deleteAsset(path: string): Promise<void>
  async uploadFile(localPath: string, remotePath: string): Promise<string>
  async getStorageStats(): Promise<StorageStats>
  async ensureBucket(): Promise<void>
}
```

---

## packages/comfyui-client

```typescript
export class ComfyUIClient {
  constructor(baseUrl: string)
  async submitWorkflow(workflow: ComfyWorkflow): Promise<string>
  async getJobStatus(promptId: string): Promise<JobStatus>
  async getJobOutput(promptId: string): Promise<JobOutput>
  subscribeToProgress(promptId: string, onProgress: ProgressCallback): () => void
  async getInstalledModels(): Promise<ModelList>
  async ping(): Promise<boolean>
}

export function createFLUXWorkflow(params: FLUXParams): ComfyWorkflow
export function createWanT2VWorkflow(params: WanT2VParams): ComfyWorkflow
export function createWanI2VWorkflow(params: WanI2VParams): ComfyWorkflow
```

---

## apps/web — Páginas

### `/` Dashboard
- Card status VM/Pod (badge Running/Stopped/Starting) + botões Iniciar/Parar/Reiniciar
- Estimativa custo sessão ($x.xx/hora, total gasto)
- Card Storage GCS: total files, tamanho, custo estimado ($0.02/GB/mês), link /library
- Grid de últimas gerações (thumbnails)
- GPU usage gauge via Progress (polling 5s)

### `/generate`
- Tabs: "Imagem (FLUX)" | "Vídeo T2V (Wan 2.2)" | "Animar (Wan I2V)"
- Textarea prompt, Sliders steps/cfg/seed/resolução
- Button Gerar → ComfyUI via SSH tunnel
- Progress SSE em tempo real
- Dialog preview do resultado

### `/library`
- Funciona com VM desligada (direto do GCS)
- Grid imagens/vídeos com signed URLs
- Badge provider (GCP / RunPod)
- Select filtros: tipo, provider, modelo, período
- Collapsible metadados (prompt, modelo, steps, cfg, seed, resolução, tempo, GPU)
- Download via signed URL
- AlertDialog confirmação antes de deletar

### `/settings`
- RadioGroup: "Google Cloud" | "RunPod"
- Form condicional por provider (react-hook-form + zod)
  - GCP: Project ID (mktia-ai-studio), Project Number (448251250847), Instance Name, Zone (us-central1-f)
  - RunPod: API Key, GPU Type, Pod Name, Docker Image
- Seção Storage: bucket name, verificar bucket, stats, Switch auto-upload
- Select auto-shutdown (1h, 2h, 4h, nunca)
- Button "Testar conexão" com Toast feedback
- Checkbox list modelos instalados
- AlertDialog ao trocar provider (avisa ~100GB download, ~30-40min)
- **RunPod**: dois botões distintos:
  - [⏸ Parar Pod] → para mas mantém volume (~$0.07/GB/mês)
  - [🗑 Deletar Pod] → destrói tudo com AlertDialog

---

## apps/web — API Routes

```
POST   /api/vm/start                    Iniciar VM/Pod
POST   /api/vm/stop                     Parar VM/Pod
DELETE /api/vm                          Deletar Pod (RunPod only)
GET    /api/vm/status                   Status e métricas
POST   /api/generate                    Submeter job ao ComfyUI
GET    /api/generate/[jobId]/status     SSE stream de progresso
GET    /api/library                     Listar assets do GCS
GET    /api/library/stats               Stats do bucket GCS
GET    /api/library/[id]/download       Gerar signed URL de download
DELETE /api/library/[id]                Deletar asset do GCS
GET    /api/credits                     Saldo e uso de créditos GCP
GET    /api/health                      Health check + ping ComfyUI
```

---

## Docker

- **Base**: `nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04`
- **Modelos NÃO entram na imagem** — ficam no volume `/data`
- **Imagem final**: ~8-12GB (sem modelos)
- **inotifywait** monitora `/data/outputs/` → upload automático para GCS
- Detecta VRAM automaticamente e ajusta flags ComfyUI:
  - ≥70GB: `--gpu-only --bf16-unet`
  - ≥38GB: `--gpu-only --fp8_e4m3fn`
  - <38GB: `--gpu-only --fp8_e4m3fn --lowvram`

---

## Scripts VM GCP

- `scripts/vm/setup.sh`: formata disco /data, instala deps, ComfyUI, custom nodes, cria bucket GCS
- `scripts/vm/download_models.sh`: download via aria2c com HF_TOKEN
- `scripts/vm/start_comfyui.sh`: detecta VRAM, inicia watcher GCS, lança ComfyUI (listen 127.0.0.1)

SSH tunnel para acessar ComfyUI:
```bash
gcloud compute ssh INSTANCE_NAME --project=mktia-486913 -- -L 8188:localhost:8188
```

---

## Modelos (ficam em /data/models, ~100GB total)

| Modelo | Path | Tamanho |
|--------|------|---------|
| Wan 2.2 T2V-A14B FP8 | diffusion_models/ | ~28GB |
| Wan 2.2 I2V-A14B FP8 | diffusion_models/ | ~28GB |
| FLUX.1-dev | unet/ | ~24GB |
| T5-XXL FP16 | text_encoders/ | ~9GB |
| CLIP-L | text_encoders/ | ~0.5GB |
| VAE (ae) | vae/ | ~0.3GB |

---

## Variáveis de Ambiente

```bash
# GCP (auth via application-default, não precisa de key file)
GCP_PROJECT=mktia-ai-studio
GCP_ZONE=us-central1-f
GCP_INSTANCE_NAME=

# GCS
GCS_BUCKET=mktia-ai-studio-outputs

# RunPod
RUNPOD_API_KEY=

# HuggingFace (para download de modelos)
HF_TOKEN=

# ComfyUI (via SSH tunnel local)
COMFYUI_URL=http://localhost:8188

# Provider ativo
CLOUD_PROVIDER=gcp  # ou runpod
```

---

## Ordem de Implementação

1. ✅ `pnpm-workspace.yaml` (criado)
2. `turbo.json`
3. `package.json` (root)
4. `tsconfig.base.json`
5. `.dockerignore`
6. `.env.example`
7. `packages/shared` (tipos + utils)
8. `packages/ui` (shadcn/ui componentes)
9. `packages/gcs-storage` (GCSStorage class)
10. `packages/cloud-infra` (GCPProvider + RunPodProvider)
11. `packages/comfyui-client` (client + workflows)
12. `apps/web` (páginas + API routes + layout)
13. `docker/` (Dockerfile + scripts)
14. `scripts/vm/`
15. `.github/workflows/docker-build.yml`
16. `README.md`

---

## Convenções de Código

- Sem tokens/chaves hardcoded — sempre variáveis de ambiente
- Scripts shell com `set -e` + verificações explícitas
- Strict TypeScript em todo o monorepo
- Imports de componentes: `import { Button } from "@repo/ui/components/button"`
- Todas as API routes validam input com Zod
- Sem `console.log` em produção — usar `console.error` apenas em catch blocks
