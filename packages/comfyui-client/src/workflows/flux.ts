import type { ComfyWorkflow, FLUXParams } from '@repo/shared/types'

/**
 * FLUX.2-dev workflow
 *
 * Models on disk:
 *  - diffusion_models/flux2_dev_fp8mixed.safetensors
 *  - text_encoders/mistral_3_small_flux2_fp8.safetensors
 *  - vae/flux2-vae.safetensors
 *
 * Key differences from FLUX.1:
 *  - Single text encoder (Mistral-3-Small replaces T5+CLIP-L)
 *  - FluxGuidance node handles CFG — KSampler uses cfg=1
 *  - CLIPTextEncode (not CLIPTextEncodeFlux) since single encoder
 */
export function createFLUXWorkflow(params: FLUXParams): ComfyWorkflow {
  const {
    prompt,
    width = 1024,
    height = 1024,
    steps = 20,
    cfg = 3.5,
    seed = Math.floor(Math.random() * 2 ** 32),
  } = params

  return {
    // ── Model loaders ──────────────────────────────────────────────────────
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'flux2_dev_fp8mixed.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: 'mistral_3_small_flux2_fp8.safetensors',
        type: 'flux2',
      },
    },
    '3': {
      class_type: 'VAELoader',
      inputs: {
        vae_name: 'flux2-vae.safetensors',
      },
    },
    // ── Text encoding ──────────────────────────────────────────────────────
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['2', 0],
        text: prompt,
      },
    },
    // ── FluxGuidance embeds CFG into conditioning (KSampler uses cfg=1) ───
    '5': {
      class_type: 'FluxGuidance',
      inputs: {
        conditioning: ['4', 0],
        guidance: cfg,
      },
    },
    // ── Empty conditioning for negative (FLUX doesn't use negative prompts)
    '6': {
      class_type: 'ConditioningZeroOut',
      inputs: {
        conditioning: ['4', 0],
      },
    },
    // ── Latent ────────────────────────────────────────────────────────────
    '7': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    },
    // ── Sampling ──────────────────────────────────────────────────────────
    '8': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['5', 0],
        negative: ['6', 0],
        latent_image: ['7', 0],
        sampler_name: 'euler',
        scheduler: 'simple',
        steps,
        cfg: 1,      // guidance is handled by FluxGuidance node
        seed,
        denoise: 1.0,
      },
    },
    // ── Decode + Save ─────────────────────────────────────────────────────
    '9': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['8', 0],
        vae: ['3', 0],
      },
    },
    '10': {
      class_type: 'SaveImage',
      inputs: {
        images: ['9', 0],
        filename_prefix: 'flux2',
      },
    },
  }
}
