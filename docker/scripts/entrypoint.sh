#!/bin/bash
set -e

DATA_PATH="${DATA_PATH:-/data}"
GCS_BUCKET="${GCS_BUCKET:-mktia-ai-studio-outputs}"
COMFYUI_PATH="${COMFYUI_PATH:-/app/ComfyUI}"

echo "=== NFSW AI Studio ==="
echo "Data path: ${DATA_PATH}"
echo "GCS bucket: ${GCS_BUCKET}"

# Detect available VRAM
VRAM_GB=0
if command -v nvidia-smi &>/dev/null; then
    VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 || echo "0")
    VRAM_GB=$(( VRAM_MB / 1024 ))
    echo "Detected VRAM: ${VRAM_GB}GB"
fi

# Set ComfyUI flags based on VRAM
# Note: --fp8_e4m3fn-unet is the specific flag (--fp8_e4m3fn is ambiguous in newer ComfyUI)
if [ "${VRAM_GB}" -ge 70 ]; then
    COMFYUI_FLAGS="--gpu-only --bf16-unet"
elif [ "${VRAM_GB}" -ge 38 ]; then
    COMFYUI_FLAGS="--gpu-only --fp8_e4m3fn-unet"
else
    COMFYUI_FLAGS="--gpu-only --fp8_e4m3fn-unet --lowvram"
fi

echo "ComfyUI flags: ${COMFYUI_FLAGS}"

# Ensure output directory exists on the data volume
mkdir -p "${DATA_PATH}/outputs"

# Start GCS watcher in background
if [ -n "${GCS_BUCKET}" ]; then
    /app/scripts/save_metadata.sh "${DATA_PATH}/outputs" "${GCS_BUCKET}" &
    echo "GCS watcher started (bucket: ${GCS_BUCKET})"
fi

# Start ComfyUI
cd "${COMFYUI_PATH}"
# --output-directory points ComfyUI output to /data/outputs (on the volume)
# so the GCS watcher picks up files, and outputs survive container restarts.
# ComfyUI listens on 0.0.0.0 INSIDE the container; security is enforced by
# Docker binding: --network host with ComfyUI bound to 127.0.0.1 on the VM.
exec python3 main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --output-directory "${DATA_PATH}/outputs" \
    ${COMFYUI_FLAGS}
