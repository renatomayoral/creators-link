import type { ComfyWorkflow, WanT2VParams, WanI2VParams } from '@repo/shared/types'

/**
 * Wan 2.2 Text-to-Video workflow (two-stage diffusion)
 *
 * Models on disk:
 *  - diffusion_models/wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors
 *  - diffusion_models/wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors
 *  - text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
 *  - vae/wan2.2_vae.safetensors
 *
 * Wan 2.2 is a two-stage model:
 *  - Stage 1 (high_noise): full denoising pass — generates structure/motion
 *  - Stage 2 (low_noise):  refinement pass — sharpens details, reduces artifacts
 */
export function createWanT2VWorkflow(params: WanT2VParams): ComfyWorkflow {
  const {
    prompt,
    negativePrompt = 'low quality, blurry, distorted, ugly, watermark',
    width = 832,
    height = 480,
    frames = 81,
    steps = 30,
    cfg = 6.0,
    seed = Math.floor(Math.random() * 2 ** 32),
  } = params

  // Split steps roughly 60/40 between stages
  const stepsHigh = Math.max(1, Math.round(steps * 0.6))
  const stepsLow  = Math.max(1, steps - stepsHigh)

  return {
    // ── Model loaders ──────────────────────────────────────────────────────
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '3': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
        type: 'wan',
      },
    },
    '4': {
      class_type: 'VAELoader',
      inputs: {
        vae_name: 'wan2.2_vae.safetensors',
      },
    },
    // ── Text encoding ──────────────────────────────────────────────────────
    '5': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 0],
        text: prompt,
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 0],
        text: negativePrompt,
      },
    },
    // ── Latent ────────────────────────────────────────────────────────────
    '7': {
      class_type: 'EmptyWanLatentVideo',
      inputs: {
        width,
        height,
        length: frames,
        batch_size: 1,
      },
    },
    // ── Stage 1: high_noise sampling (structure + motion) ─────────────────
    '8': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['5', 0],
        negative: ['6', 0],
        latent_image: ['7', 0],
        sampler_name: 'euler',
        scheduler: 'linear',
        steps: stepsHigh,
        cfg,
        seed,
        denoise: 1.0,
      },
    },
    // ── Stage 2: low_noise refinement (sharpening + detail) ───────────────
    '9': {
      class_type: 'KSampler',
      inputs: {
        model: ['2', 0],
        positive: ['5', 0],
        negative: ['6', 0],
        latent_image: ['8', 0],  // feeds from stage 1 output
        sampler_name: 'euler',
        scheduler: 'linear',
        steps: stepsLow,
        cfg,
        seed,
        denoise: 0.5,
      },
    },
    // ── Decode + Save ─────────────────────────────────────────────────────
    '10': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['9', 0],
        vae: ['4', 0],
      },
    },
    '11': {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images: ['10', 0],
        frame_rate: 24,
        loop_count: 0,
        filename_prefix: 'wan_t2v',
        format: 'video/h264-mp4',
        save_output: true,
      },
    },
  }
}

/**
 * Wan 2.2 Image-to-Video workflow (two-stage diffusion)
 *
 * Models on disk:
 *  - diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors
 *  - diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors
 *  - text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
 *  - vae/wan2.2_vae.safetensors
 *
 * Uses WanImageToVideo node for the initial image conditioning,
 * then refines with the low_noise model via KSampler.
 */
export function createWanI2VWorkflow(params: WanI2VParams): ComfyWorkflow {
  const {
    prompt,
    negativePrompt = 'low quality, blurry, distorted, ugly, watermark',
    width = 832,
    height = 480,
    frames = 81,
    steps = 30,
    cfg = 6.0,
    seed = Math.floor(Math.random() * 2 ** 32),
    imageBase64,
  } = params

  const stepsLow = Math.max(1, Math.round(steps * 0.4))

  return {
    // ── Model loaders ──────────────────────────────────────────────────────
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '3': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
        type: 'wan',
      },
    },
    '4': {
      class_type: 'VAELoader',
      inputs: {
        vae_name: 'wan2.2_vae.safetensors',
      },
    },
    // ── Load input image ──────────────────────────────────────────────────
    '5': {
      class_type: 'ETN_LoadImageBase64',
      inputs: {
        image: imageBase64,
      },
    },
    // ── Text encoding ──────────────────────────────────────────────────────
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 0],
        text: prompt,
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 0],
        text: negativePrompt,
      },
    },
    // ── Stage 1: image-conditioned high_noise sampling ────────────────────
    // WanImageToVideo encodes the input image into the latent space and
    // runs the first diffusion stage (high_noise) with image conditioning.
    '8': {
      class_type: 'WanImageToVideo',
      inputs: {
        model: ['1', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        image: ['5', 0],
        vae: ['4', 0],
        width,
        height,
        length: frames,
        steps: Math.max(1, steps - stepsLow),
        cfg,
        seed,
      },
    },
    // ── Stage 2: low_noise refinement ─────────────────────────────────────
    '9': {
      class_type: 'KSampler',
      inputs: {
        model: ['2', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['8', 0],
        sampler_name: 'euler',
        scheduler: 'linear',
        steps: stepsLow,
        cfg,
        seed,
        denoise: 0.5,
      },
    },
    // ── Decode + Save ─────────────────────────────────────────────────────
    '10': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['9', 0],
        vae: ['4', 0],
      },
    },
    '11': {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images: ['10', 0],
        frame_rate: 24,
        loop_count: 0,
        filename_prefix: 'wan_i2v',
        format: 'video/h264-mp4',
        save_output: true,
      },
    },
  }
}
