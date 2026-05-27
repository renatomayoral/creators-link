#!/bin/bash
# Watches /data/outputs for new files and uploads them to GCS with metadata
set -e

WATCH_DIR="${1:-/data/outputs}"
GCS_BUCKET="${2:-mktia-ai-studio-outputs}"
PROVIDER="${CLOUD_PROVIDER:-gcp}"

echo "Watching ${WATCH_DIR} → gs://${GCS_BUCKET}/${PROVIDER}/"

inotifywait -m -e close_write,moved_to --format '%w%f' "${WATCH_DIR}" 2>/dev/null |
while read -r filepath; do
    filename=$(basename "${filepath}")
    ext="${filename##*.}"

    # Only process image/video files
    case "${ext,,}" in
        png|jpg|jpeg|webp|mp4|webm)
            ;;
        *)
            continue
            ;;
    esac

    gcs_path="${PROVIDER}/${filename}"

    echo "Uploading: ${filename} → gs://${GCS_BUCKET}/${gcs_path}"

    # Extract metadata from companion JSON if exists
    metadata_file="${filepath%.*}.json"
    metadata_flags=""

    if [ -f "${metadata_file}" ]; then
        prompt=$(python3 -c "import json,sys; d=json.load(open('${metadata_file}')); print(d.get('prompt',''))" 2>/dev/null || echo "")
        model=$(python3 -c "import json,sys; d=json.load(open('${metadata_file}')); print(d.get('model','unknown'))" 2>/dev/null || echo "unknown")

        if [ -n "${prompt}" ]; then
            metadata_flags="--content-disposition=inline"
        fi
    fi

    if gcloud storage cp "${filepath}" "gs://${GCS_BUCKET}/${gcs_path}" \
        ${metadata_flags} \
        2>/dev/null; then
        echo "✓ Uploaded: ${filename}"
        # Remove from VM after confirmed upload to GCS
        rm -f "${filepath}"
        # Also remove companion JSON if it exists
        [ -f "${metadata_file}" ] && rm -f "${metadata_file}"
        echo "🗑 Removed local: ${filename}"
    else
        echo "✗ Failed: ${filename} (kept on disk)"
    fi
done
