/**
 * renderer.js - WebGPU sprite compositing render pipeline with Canvas2D fallback
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Renders a Scene of Sprites using either WebGPU or Canvas2D.
 * Features:
 * - Back-to-front alpha-blended sprite rendering
 * - Per-sprite tint and opacity uniforms
 * - Dirty-flag optimized render loop (requestAnimationFrame)
 * - Canvas2D fallback for browsers without WebGPU
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DPI_SCALE,
  PHYSICAL_WIDTH,
  PHYSICAL_HEIGHT,
} from "../utils/constants.js";
import { Mat4 } from "../utils/math.js";
import {
  SHADER_SOURCE,
  QUAD_VERTICES,
  VERTEX_STRIDE,
  VERTEX_COUNT,
} from "./shaders.js";

export class Renderer {
  /**
   * @param {import("./gpu-context.js").GPUContextResult} gpuContext
   * @param {import("./texture-manager.js").TextureManager} textureManager
   */
  constructor(gpuContext, textureManager) {
    this.gpuContext = gpuContext;
    this.textureManager = textureManager;
    this.mode = gpuContext.mode;

    /** @type {import("./scene.js").Scene|null} */
    this.scene = null;

    /** @type {number} - Animation frame ID for cancellation */
    this._rafId = 0;

    /** @type {boolean} - Whether the render loop is running */
    this._running = false;

    /** @type {number} - Current time uniform */
    this._time = 0;

    /** @type {number} - Timestamp of last frame */
    this._lastFrameTime = 0;

    /** @type {function|null} - External per-frame callback */
    this.onFrame = null;

    // WebGPU-specific resources
    this._pipeline = null;
    this._vertexBuffer = null;
    this._frameUniformBuffer = null;
    this._frameBindGroup = null;
    this._projectionMatrix = null;

    // Per-sprite GPU resources cache
    this._spriteGPUResources = new Map();

    if (this.mode === "webgpu") {
      this._initWebGPU();
    }
  }

  /**
   * Initialize WebGPU pipeline, buffers, and bind group layouts.
   */
  _initWebGPU() {
    const { device, format } = this.gpuContext;

    // Create shader module
    const shaderModule = device.createShaderModule({
      label: "Sprite Shader Module",
      code: SHADER_SOURCE,
    });

    // Create vertex buffer for unit quad
    this._vertexBuffer = device.createBuffer({
      label: "Quad Vertex Buffer",
      size: QUAD_VERTICES.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this._vertexBuffer, 0, QUAD_VERTICES);

    // Frame uniforms: mat4 projection (64 bytes) + f32 time (4 bytes) + padding (12 bytes) = 80 bytes
    this._frameUniformBuffer = device.createBuffer({
      label: "Frame Uniform Buffer",
      size: 80,  // 64 (mat4) + 4 (f32) + 12 (padding to 16-byte alignment)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Projection matrix: orthographic, maps logical pixels to NDC
    this._projectionMatrix = Mat4.orthographic(CANVAS_WIDTH, CANVAS_HEIGHT);
    device.queue.writeBuffer(this._frameUniformBuffer, 0, this._projectionMatrix);

    // Bind group layouts
    this._frameBindGroupLayout = device.createBindGroupLayout({
      label: "Frame Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    this._spriteBindGroupLayout = device.createBindGroupLayout({
      label: "Sprite Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });

    // Pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      label: "Sprite Pipeline Layout",
      bindGroupLayouts: [this._frameBindGroupLayout, this._spriteBindGroupLayout],
    });

    // Render pipeline
    this._pipeline = device.createRenderPipeline({
      label: "Sprite Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vsMain",
        buffers: [
          {
            arrayStride: VERTEX_STRIDE,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },  // position
              { shaderLocation: 1, offset: 8, format: "float32x2" },  // texCoord
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fsMain",
        targets: [
          {
            format,
            blend: {
              // Premultiplied alpha blending
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    // Frame bind group
    this._frameBindGroup = device.createBindGroup({
      label: "Frame Bind Group",
      layout: this._frameBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this._frameUniformBuffer } },
      ],
    });
  }

  /**
   * Get or create GPU resources for a specific sprite.
   * @param {import("./sprite.js").Sprite} sprite
   * @returns {Object|null} The bind group + uniform buffer, or null if texture not ready
   */
  _getSpriteGPUResources(sprite) {
    const { device } = this.gpuContext;

    // Check if texture is loaded
    const texture = this.textureManager.getTexture(sprite.textureId);
    if (!texture) return null;

    let resources = this._spriteGPUResources.get(sprite.id);

    if (!resources) {
      // Sprite uniform: mat4 model (64) + vec4 tint (16) + f32 opacity (4) + padding (12) = 96 bytes
      const uniformBuffer = device.createBuffer({
        label: `Sprite Uniform: ${sprite.label || sprite.id}`,
        size: 96,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const bindGroup = device.createBindGroup({
        label: `Sprite Bind Group: ${sprite.label || sprite.id}`,
        layout: this._spriteBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: this.textureManager.defaultSampler },
          { binding: 2, resource: texture.createView() },
        ],
      });

      resources = { uniformBuffer, bindGroup, textureId: sprite.textureId };
      this._spriteGPUResources.set(sprite.id, resources);
    }

    // Recreate bind group if texture changed
    if (resources.textureId !== sprite.textureId) {
      const newTexture = this.textureManager.getTexture(sprite.textureId);
      if (!newTexture) return null;

      resources.bindGroup = device.createBindGroup({
        label: `Sprite Bind Group: ${sprite.label || sprite.id}`,
        layout: this._spriteBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: resources.uniformBuffer } },
          { binding: 1, resource: this.textureManager.defaultSampler },
          { binding: 2, resource: newTexture.createView() },
        ],
      });
      resources.textureId = sprite.textureId;
    }

    // Update uniforms
    const modelMatrix = sprite.getModelMatrix();
    device.queue.writeBuffer(resources.uniformBuffer, 0, modelMatrix);
    device.queue.writeBuffer(resources.uniformBuffer, 64, sprite.tint);
    const opacityData = new Float32Array([sprite.opacity]);
    device.queue.writeBuffer(resources.uniformBuffer, 80, opacityData);

    return resources;
  }

  /**
   * Set the scene to render.
   * @param {import("./scene.js").Scene} scene
   */
  setScene(scene) {
    this.scene = scene;
    scene.markDirty();
  }

  /**
   * Render a single frame.
   * @param {number} [timestamp=0] - Current timestamp in ms
   */
  render(timestamp = 0) {
    if (!this.scene) return;

    this._time = timestamp;

    if (this.mode === "webgpu") {
      this._renderWebGPU(timestamp);
    } else {
      this._renderCanvas2D(timestamp);
    }
  }

  /**
   * Render using WebGPU.
   */
  _renderWebGPU(timestamp) {
    const { device, gpuContext } = this.gpuContext;
    const sprites = this.scene.getSortedSprites();

    // Update time uniform
    const timeData = new Float32Array([timestamp / 1000]);
    device.queue.writeBuffer(this._frameUniformBuffer, 64, timeData);

    // Get current texture to render to
    const textureView = gpuContext.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder({
      label: "Frame Command Encoder",
    });

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.94, g: 0.92, b: 0.88, a: 1.0 },  // Warm cream background
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this._pipeline);
    renderPass.setVertexBuffer(0, this._vertexBuffer);
    renderPass.setBindGroup(0, this._frameBindGroup);

    // Draw each sprite back-to-front
    for (const sprite of sprites) {
      const resources = this._getSpriteGPUResources(sprite);
      if (!resources) continue;

      renderPass.setBindGroup(1, resources.bindGroup);
      renderPass.draw(VERTEX_COUNT);
    }

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Render using Canvas2D (fallback).
   */
  _renderCanvas2D(timestamp) {
    const { ctx2d } = this.gpuContext;
    const sprites = this.scene.getSortedSprites();

    // Clear canvas
    ctx2d.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    ctx2d.fillStyle = "#f0ebe0";
    ctx2d.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw each sprite back-to-front
    for (const sprite of sprites) {
      const bitmap = this.textureManager.getBitmap(sprite.textureId);
      if (!bitmap) continue;

      ctx2d.save();

      // Apply transform
      ctx2d.globalAlpha = sprite.opacity;
      ctx2d.translate(sprite.x, sprite.y);

      if (sprite.rotation !== 0) {
        ctx2d.rotate(sprite.rotation);
      }

      // Draw from anchor point
      const drawX = -sprite.anchorX * sprite.width;
      const drawY = -sprite.anchorY * sprite.height;
      ctx2d.drawImage(bitmap, drawX, drawY, sprite.width, sprite.height);

      // Apply tint (multiply blend)
      if (sprite.tint[3] > 0) {
        ctx2d.globalCompositeOperation = "multiply";
        ctx2d.globalAlpha = sprite.tint[3] * sprite.opacity;
        ctx2d.fillStyle = `rgb(${sprite.tint[0] * 255}, ${sprite.tint[1] * 255}, ${sprite.tint[2] * 255})`;
        ctx2d.fillRect(drawX, drawY, sprite.width, sprite.height);
        ctx2d.globalCompositeOperation = "source-over";
      }

      ctx2d.restore();
    }
  }

  /**
   * Start the render loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this._tick(this._lastFrameTime);
  }

  /**
   * Stop the render loop.
   */
  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  /**
   * Internal render loop tick.
   */
  _tick = (timestamp) => {
    if (!this._running) return;

    const deltaTime = timestamp - this._lastFrameTime;
    this._lastFrameTime = timestamp;

    // Call external frame callback (for animations, etc.)
    if (this.onFrame) {
      this.onFrame(timestamp, deltaTime);
    }

    // Only render if scene is dirty or we have an animation callback
    if (this.scene && (this.scene.dirty || this.onFrame)) {
      this.render(timestamp);
      this.scene.clearDirty();
    }

    this._rafId = requestAnimationFrame(this._tick);
  };

  /**
   * Clean up all GPU resources.
   */
  destroy() {
    this.stop();

    // Release per-sprite GPU resources
    this._spriteGPUResources.forEach((resources) => {
      resources.uniformBuffer.destroy();
    });
    this._spriteGPUResources.clear();

    // Release shared resources
    if (this._vertexBuffer) this._vertexBuffer.destroy();
    if (this._frameUniformBuffer) this._frameUniformBuffer.destroy();
  }

  /**
   * Remove cached GPU resources for a sprite that was removed from the scene.
   * @param {number} spriteId
   */
  releaseSpriteResources(spriteId) {
    const resources = this._spriteGPUResources.get(spriteId);
    if (resources) {
      resources.uniformBuffer.destroy();
      this._spriteGPUResources.delete(spriteId);
    }
  }

  /**
   * Force a re-render on the next frame.
   */
  requestRender() {
    if (this.scene) {
      this.scene.markDirty();
    }
  }
}

