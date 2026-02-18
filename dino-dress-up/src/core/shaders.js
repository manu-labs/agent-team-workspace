/**
 * shaders.js - WGSL shader sources for textured quad sprite rendering
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Architecture:
 * - Bind Group 0 (per-frame): projection matrix, time uniform
 * - Bind Group 1 (per-sprite): model matrix, tint/opacity, texture + sampler
 * - Quad: 6 vertices (2 triangles), unit quad [0,0]-[1,1] scaled by model matrix
 */

export const VERTEX_SHADER = /* wgsl */ `
struct FrameUniforms {
  projection: mat4x4<f32>,
  time: f32,
};

struct SpriteUniforms {
  model: mat4x4<f32>,
  tint: vec4<f32>,    // rgb = tint color, a = tint strength
  opacity: f32,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(1) @binding(0) var<uniform> sprite: SpriteUniforms;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) texCoord: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vsMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let worldPos = sprite.model * vec4<f32>(input.position, 0.0, 1.0);
  output.clipPosition = frame.projection * worldPos;
  output.uv = input.texCoord;

  return output;
}
`;

export const FRAGMENT_SHADER = /* wgsl */ `
struct SpriteUniforms {
  model: mat4x4<f32>,
  tint: vec4<f32>,
  opacity: f32,
};

@group(1) @binding(0) var<uniform> sprite: SpriteUniforms;
@group(1) @binding(1) var spriteSampler: sampler;
@group(1) @binding(2) var spriteTexture: texture_2d<f32>;

@fragment
fn fsMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let texColor = textureSample(spriteTexture, spriteSampler, uv);

  // Apply tint: mix texture color with tint color based on tint strength (tint.a)
  let tinted = mix(texColor.rgb, sprite.tint.rgb * texColor.rgb, sprite.tint.a);

  // Apply opacity
  let finalAlpha = texColor.a * sprite.opacity;

  // Premultiplied alpha output
  return vec4<f32>(tinted * finalAlpha, finalAlpha);
}
`;

// Combined shader module source (WebGPU requires a single module string)
export const SHADER_SOURCE = VERTEX_SHADER + FRAGMENT_SHADER;

/**
 * Unit quad vertex data: 6 vertices (2 triangles) forming a [0,0]-[1,1] quad.
 * Each vertex: [x, y, u, v] — position + texture coordinates.
 * Layout: position(vec2) at offset 0, texCoord(vec2) at offset 8, stride 16 bytes.
 */
export const QUAD_VERTICES = new Float32Array([
  // Triangle 1 (top-left, bottom-left, bottom-right)
  0, 0,   0, 0,
  0, 1,   0, 1,
  1, 1,   1, 1,
  // Triangle 2 (top-left, bottom-right, top-right)
  0, 0,   0, 0,
  1, 1,   1, 1,
  1, 0,   1, 0,
]);

export const VERTEX_STRIDE = 16;  // 4 floats * 4 bytes
export const VERTEX_COUNT = 6;
