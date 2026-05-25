#!/bin/bash
# Setup script para VM GCP — executar UMA VEZ após criar a instância
# Usage: gcloud compute ssh $INSTANCE --project=mktia-ai-studio -- 'bash -s' < scripts/vm/setup.sh
set -euo pipefail

DATA_DISK="${DATA_DISK:-/dev/sdb}"
DATA_PATH="${DATA_PATH:-/data}"
GCS_BUCKET="${GCS_BUCKET:-mktia-ai-studio-outputs}"
PROJECT="${GCP_PROJECT:-mktia-ai-studio}"

echo "=== NFSW AI Studio VM Setup ==="
echo "Data disk: ${DATA_DISK}"
echo "Data path: ${DATA_PATH}"
echo "GCS bucket: ${GCS_BUCKET}"

# ─── 1. Formatar e montar disco de dados ─────────────────────────────────────
if ! mountpoint -q "${DATA_PATH}" 2>/dev/null; then
    echo "Formatting and mounting ${DATA_DISK}..."
    sudo mkfs.ext4 -F "${DATA_DISK}"
    sudo mkdir -p "${DATA_PATH}"
    sudo mount "${DATA_DISK}" "${DATA_PATH}"
    echo "${DATA_DISK} ${DATA_PATH} ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
    echo "✓ Disk mounted at ${DATA_PATH}"
fi

# ─── 2. Criar diretórios ───────────────────────────────────────────────────────
sudo mkdir -p \
    "${DATA_PATH}/models/diffusion_models" \
    "${DATA_PATH}/models/text_encoders" \
    "${DATA_PATH}/models/vae" \
    "${DATA_PATH}/models/unet" \
    "${DATA_PATH}/models/loras" \
    "${DATA_PATH}/outputs" \
    "${DATA_PATH}/inputs"
sudo chown -R "${USER}:${USER}" "${DATA_PATH}"
echo "✓ Directories created"

# ─── 3. System deps ───────────────────────────────────────────────────────────
echo "Installing system dependencies..."
sudo apt-get update -q
sudo apt-get install -y --no-install-recommends \
    curl wget ca-certificates gnupg lsb-release \
    inotify-tools

# ─── 4. Docker ────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list
    sudo apt-get update -q
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker "${USER}"
    sudo systemctl enable docker
    echo "✓ Docker installed"
fi

# ─── 5. NVIDIA Container Toolkit ──────────────────────────────────────────────
if ! dpkg -l | grep -q nvidia-container-toolkit 2>/dev/null; then
    echo "Installing NVIDIA Container Toolkit..."
    distribution=$(. /etc/os-release && echo "${ID}${VERSION_ID}")
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L "https://nvidia.github.io/libnvidia-container/${distribution}/libnvidia-container.list" | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update -q
    sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
    echo "✓ NVIDIA Container Toolkit installed"
fi

# ─── 6. Configurar Artifact Registry auth ─────────────────────────────────────
echo "Configuring Artifact Registry auth..."
gcloud auth configure-docker us-central1-docker.pkg.dev -q
echo "✓ Artifact Registry configured"

# ─── 7. Pre-pull da imagem ────────────────────────────────────────────────────
echo "Pulling Docker image (this takes a few minutes)..."
IMAGE="us-central1-docker.pkg.dev/${PROJECT}/ai-studio/comfyui:latest"
docker pull "${IMAGE}" && echo "✓ Image pulled: ${IMAGE}"

# ─── 8. Instalar start_comfyui como startup script ───────────────────────────
cat > /usr/local/bin/start-ai-studio.sh << 'STARTUP'
#!/bin/bash
set -e
DATA_PATH="/data"
GCS_BUCKET="mktia-ai-studio-outputs"
PROJECT="mktia-ai-studio"
IMAGE="us-central1-docker.pkg.dev/mktia-ai-studio/ai-studio/comfyui:latest"

# Auth
gcloud auth configure-docker us-central1-docker.pkg.dev -q 2>/dev/null || true

# Pull latest
docker pull "${IMAGE}" || true

# Stop old
docker stop ai-studio-comfyui 2>/dev/null || true
docker rm ai-studio-comfyui 2>/dev/null || true

# VRAM detection
VRAM_GB=0
if command -v nvidia-smi &>/dev/null; then
    VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 || echo "0")
    VRAM_GB=$(( VRAM_MB / 1024 ))
fi

# Run
docker run -d \
    --name ai-studio-comfyui \
    --runtime=nvidia \
    --gpus all \
    -p 8188:8188 \
    -v "${DATA_PATH}:/data" \
    -v "/root/.config/gcloud:/root/.config/gcloud:ro" \
    -e "GCS_BUCKET=${GCS_BUCKET}" \
    -e "CLOUD_PROVIDER=gcp" \
    -e "VRAM_GB=${VRAM_GB}" \
    --restart unless-stopped \
    "${IMAGE}"

echo "✓ ai-studio-comfyui started"
STARTUP
chmod +x /usr/local/bin/start-ai-studio.sh

# Systemd service para iniciar automaticamente quando a VM liga
sudo tee /etc/systemd/system/ai-studio.service > /dev/null << 'SERVICE'
[Unit]
Description=NFSW AI Studio (ComfyUI)
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/start-ai-studio.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable ai-studio.service
echo "✓ Systemd service installed (auto-start on boot)"

# ─── 9. Criar bucket GCS se não existir ───────────────────────────────────────
echo "Ensuring GCS bucket..."
gcloud storage buckets create "gs://${GCS_BUCKET}" \
    --project="${PROJECT}" \
    --location=us-central1 \
    --uniform-bucket-level-access 2>/dev/null || echo "(bucket already exists)"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Próximos passos:"
echo "  1. Baixar modelos (necessário uma vez, ~100GB, 30-40min):"
echo "     HF_TOKEN=hf_xxx bash scripts/vm/download_models.sh"
echo ""
echo "  2. ComfyUI inicia automaticamente quando a VM liga"
echo "     Ou manualmente: sudo systemctl start ai-studio"
echo ""
echo "  3. Acesso local via SSH tunnel:"
echo "     gcloud compute ssh \$(hostname) --project=${PROJECT} -- -L 8188:localhost:8188 -N &"
