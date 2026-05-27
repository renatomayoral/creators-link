import type { ComfyWorkflow, WanT2VParams, WanI2VParams } from '@repo/shared/types'

/**
 * Wan 2.2 Text-to-Video workflow
 *
 * Uses Wan22ImageToVideoLatent (no start_image) to create an empty video
 * latent — this is the correct replacement for EmptyWanLatentVideo on
 * ComfyUI installations that ship the built-in Wan nodes.
 *
 * Models on disk:
 *  - diffusion_models/wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors
 *  - text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
 *  - vae/wan2.2_vae.safetensors
 */
export function createWanT2VWorkflow(params: WanT2VParams): ComfyWorkflow {
  const {
    prompt,
    negativePrompt = 'low quality, blurry, distorted, ugly, watermark',
    width   = 832,
    height  = 480,
    frames  = 49,   // 49 frames ≈ 2s @ 24fps
    steps   = 30,
    cfg     = 6.0,
    seed    = Math.floor(Math.random() * 2 ** 32),
  } = params

  const safeSeed = Math.max(0, Math.floor(seed))

  return {
    // ── Model loaders ─────────────────────────────────────────────────────────
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name:    'wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
        type:      'wan',
      },
    },
    '3': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'wan2.2_vae.safetensors' },
    },
    // ── Text encoding ─────────────────────────────────────────────────────────
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: prompt },
    },
    '5': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: negativePrompt },
    },
    // ── Video latent setup (T2V — no start image) ────────────────────────────
    // WanImageToVideo without start_image creates a 48-channel latent
    // (16 noise + 16 zeros image + 16 zeros mask) expected by the Wan UNet.
    // Also returns image-aware conditionings (outputs 0 and 1).
    '6': {
      class_type: 'WanImageToVideo',
      inputs: {
        positive:   ['4', 0],
        negative:   ['5', 0],
        vae:        ['3', 0],
        width,
        height,
        length:     frames,
        batch_size: 1,
        // start_image intentionally omitted → T2V (zeros for image channels)
      },
    },
    // ── Sampling ──────────────────────────────────────────────────────────────
    '7': {
      class_type: 'KSampler',
      inputs: {
        model:        ['1', 0],
        positive:     ['6', 0],   // conditioned positive from WanImageToVideo
        negative:     ['6', 1],   // conditioned negative from WanImageToVideo
        latent_image: ['6', 2],   // 48-channel latent from WanImageToVideo
        sampler_name: 'euler',
        scheduler:    'simple',
        steps,
        cfg,
        seed: safeSeed,
        denoise: 1.0,
      },
    },
    // ── Decode + Save ─────────────────────────────────────────────────────────
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['7', 0], vae: ['3', 0] },
    },
    '9': {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images:          ['8', 0],
        frame_rate:      24,
        loop_count:      0,
        filename_prefix: 'wan_t2v',
        format:          'video/h264-mp4',
        pingpong:        false,
        save_output:     true,
      },
    },
  }
}

/**
 * Wan 2.2 Image-to-Video workflow
 *
 * WanImageToVideo creates image-conditioned latent and merges image features
 * into the conditioning, outputting (positive, negative, latent) ready for
 * KSampler. No separate CLIPVision encoder needed for basic I2V.
 *
 * Models on disk:
 *  - diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors
 *  - text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
 *  - vae/wan2.2_vae.safetensors
 */
export function createWanI2VWorkflow(params: WanI2VParams): ComfyWorkflow {
  const {
    prompt,
    negativePrompt = 'low quality, blurry, distorted, ugly, watermark',
    width       = 832,
    height      = 480,
    frames      = 49,
    steps       = 30,
    cfg         = 6.0,
    seed        = Math.floor(Math.random() * 2 ** 32),
    imageBase64,
  } = params

  const safeSeed = Math.max(0, Math.floor(seed))

  return {
    // ── Model loaders ─────────────────────────────────────────────────────────
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name:    'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
        type:      'wan',
      },
    },
    '3': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'wan2.2_vae.safetensors' },
    },
    // ── Load input image ──────────────────────────────────────────────────────
    '4': {
      class_type: 'ETN_LoadImageBase64',
      inputs: { image: imageBase64 },
    },
    // ── Text encoding ─────────────────────────────────────────────────────────
    '5': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: prompt },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: negativePrompt },
    },
    // ── Image-conditioned latent setup ────────────────────────────────────────
    // WanImageToVideo merges the start_image into conditioning and creates
    // the initial latent. Outputs: (positive, negative, latent)
    '7': {
      class_type: 'WanImageToVideo',
      inputs: {
        positive:   ['5', 0],
        negative:   ['6', 0],
        vae:        ['3', 0],
        width,
        height,
        length:     frames,
        batch_size: 1,
        start_image: ['4', 0],
      },
    },
    // ── Sampling ──────────────────────────────────────────────────────────────
    // Use WanImageToVideo's conditioned positive/negative (outputs 0 and 1)
    '8': {
      class_type: 'KSampler',
      inputs: {
        model:        ['1', 0],
        positive:     ['7', 0],   // image-conditioned positive from WanImageToVideo
        negative:     ['7', 1],   // image-conditioned negative from WanImageToVideo
        latent_image: ['7', 2],   // initial latent from WanImageToVideo
        sampler_name: 'euler',
        scheduler:    'simple',
        steps,
        cfg,
        seed: safeSeed,
        denoise: 1.0,
      },
    },
    // ── Decode + Save ─────────────────────────────────────────────────────────
    '9': {
      class_type: 'VAEDecode',
      inputs: { samples: ['8', 0], vae: ['3', 0] },
    },
    '10': {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images:          ['9', 0],
        frame_rate:      24,
        loop_count:      0,
        filename_prefix: 'wan_i2v',
        format:          'video/h264-mp4',
        pingpong:        false,
        save_output:     true,
      },
    },
  }
}
