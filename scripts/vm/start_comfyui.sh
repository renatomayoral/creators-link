#!/bin/bash
# Start ComfyUI — puxa a última imagem do Artifact Registry e inicia o container
# Executado automaticamente pelo startup-script da VM ou manualmente
set -euo pipefail

DATA_PATH="${DATA_PATH:-/data}"
GCS_BUCKET="${GCS_BUCKET:-mktia-ai-studio-outputs}"
CLOUD_PROVIDER="${CLOUD_PROVIDER:-gcp}"
PROJECT="${GCP_PROJECT:-mktia-ai-studio}"
IMAGE="${COMFYUI_IMAGE:-us-central1-docker.pkg.dev/mktia-ai-studio/ai-studio/comfyui:latest}"

echo "=== NFSW AI Studio - Starting ==="
echo "Image: ${IMAGE}"

# Auth Docker with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev -q 2>/dev/null || true

# Pull latest image
echo "Pulling latest image..."
docker pull "${IMAGE}" || echo "WARNING: Could not pull image, using cached version"

# Stop existing container if running
docker stop ai-studio-comfyui 2>/dev/null || true
docker rm ai-studio-comfyui 2>/dev/null || true

# Detect VRAM for startup env
VRAM_GB=0
if command -v nvidia-smi &>/dev/null; then
    VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 || echo "0")
    VRAM_GB=$(( VRAM_MB / 1024 ))
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown GPU")
    echo "GPU: ${GPU_NAME} (${VRAM_GB}GB VRAM)"
fi

# Start container
echo "Starting container..."
docker run -d \
    --name ai-studio-comfyui \
    --runtime=nvidia \
    --gpus all \
    -p 8188:8188 \
    -v "${DATA_PATH}:/data" \
    -v "/root/.config/gcloud:/root/.config/gcloud:ro" \
    -e "GCS_BUCKET=${GCS_BUCKET}" \
    -e "CLOUD_PROVIDER=${CLOUD_PROVIDER}" \
    -e "VRAM_GB=${VRAM_GB}" \
    --restart unless-stopped \
    "${IMAGE}"

echo "✓ Container started"
echo ""
echo "To access ComfyUI locally:"
echo "  gcloud compute ssh \$(hostname) --project=${PROJECT} -- -L 8188:localhost:8188 -N &"
echo "  Then open: http://localhost:8188"
echo ""
echo "Container logs:"
docker logs -f ai-studio-comfyui
