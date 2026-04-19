import { FRAGMENT_SHADER_SOURCE, VERTEX_SHADER_SOURCE } from "./shaders";
import { createProgram, getCanvas, getWebGLContext } from "./glCore";
import { getUniformValues, setMaskUniforms, setUniforms } from "./uniforms";

function hasNonZeroAdjustments(adjustments = {}) {
  return Object.values(adjustments).some((value) => value !== 0);
}

function hasMaskCoverage(maskData) {
  if (!maskData) return false;
  for (let i = 0; i < maskData.length; i += 1) {
    if (maskData[i] > 0) return true;
  }
  return false;
}

function collectMaskPasses(masks = []) {
  if (!Array.isArray(masks) || masks.length === 0) return [];

  const passes = [];
  for (const mask of masks) {
    if (!mask?.visible) continue;

    const adjustments = mask.adjustments || {};
    if (!hasNonZeroAdjustments(adjustments)) continue;

    const maskData = mask.maskData;
    if (!maskData || maskData.length === 0) continue;

    if (!mask.inverted && !hasMaskCoverage(maskData)) continue;

    passes.push({
      adjustments,
      inverted: !!mask.inverted,
      maskData,
    });
  }

  return passes;
}

function configureTexture(gl, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

export function createWebGLImageProcessor() {
  const canvas = getCanvas();
  if (!canvas) return null;

  const gl = getWebGLContext(canvas);
  if (!gl) return null;

  const program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  gl.useProgram(program);

  const quad = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1,
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Unable to create buffer");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  const aUv = gl.getAttribLocation(program, "aUv");

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

  const sourceTextureA = gl.createTexture();
  const sourceTextureB = gl.createTexture();
  const maskTexture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();

  if (!sourceTextureA || !sourceTextureB || !maskTexture || !framebuffer) {
    throw new Error("Unable to create WebGL resources");
  }

  gl.activeTexture(gl.TEXTURE0);
  configureTexture(gl, sourceTextureA);
  configureTexture(gl, sourceTextureB);

  gl.activeTexture(gl.TEXTURE1);
  configureTexture(gl, maskTexture);

  const uniforms = {
    uTexture: gl.getUniformLocation(program, "uTexture"),
    uExposureFactor: gl.getUniformLocation(program, "uExposureFactor"),
    uBrightnessOffset: gl.getUniformLocation(program, "uBrightnessOffset"),
    uContrastFactor: gl.getUniformLocation(program, "uContrastFactor"),
    uHighlights: gl.getUniformLocation(program, "uHighlights"),
    uShadows: gl.getUniformLocation(program, "uShadows"),
    uWhites: gl.getUniformLocation(program, "uWhites"),
    uBlacks: gl.getUniformLocation(program, "uBlacks"),
    uTemperature: gl.getUniformLocation(program, "uTemperature"),
    uTint: gl.getUniformLocation(program, "uTint"),
    uHue: gl.getUniformLocation(program, "uHue"),
    uSaturation: gl.getUniformLocation(program, "uSaturation"),
    uVibrance: gl.getUniformLocation(program, "uVibrance"),
    uMaskTexture: gl.getUniformLocation(program, "uMaskTexture"),
    uUseMask: gl.getUniformLocation(program, "uUseMask"),
    uInvertMask: gl.getUniformLocation(program, "uInvertMask"),
  };

  gl.uniform1i(uniforms.uTexture, 0);
  gl.uniform1i(uniforms.uMaskTexture, 1);

  let allocatedWidth = 0;
  let allocatedHeight = 0;

  function allocateSourceTextures(width, height) {
    if (allocatedWidth === width && allocatedHeight === height) return;

    allocatedWidth = width;
    allocatedHeight = height;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTextureA);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );

    gl.bindTexture(gl.TEXTURE_2D, sourceTextureB);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  }

  function uploadSource(texture, width, height, data) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
  }

  function uploadMask(width, height, data) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      width,
      height,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data,
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }

  function renderPass({ sourceTexture, targetTexture, width, height, adjustments, mask }) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      targetTexture,
      0,
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);

    const values = getUniformValues(adjustments);
    setUniforms(gl, uniforms, values);

    if (mask) {
      uploadMask(width, height, mask.maskData);
      setMaskUniforms(gl, uniforms, {
        useMask: true,
        invertMask: mask.inverted,
      });
    } else {
      setMaskUniforms(gl, uniforms, {
        useMask: false,
        invertMask: false,
      });
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function process(imageData, adjustments = {}, masks = []) {
    const { width, height, data } = imageData;
    if (!width || !height) return imageData;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);

    allocateSourceTextures(width, height);
    uploadSource(sourceTextureA, width, height, data);

    const maskPasses = collectMaskPasses(masks);

    let source = sourceTextureA;
    let target = sourceTextureB;

    renderPass({
      sourceTexture: source,
      targetTexture: target,
      width,
      height,
      adjustments,
      mask: null,
    });

    [source, target] = [target, source];

    for (const maskPass of maskPasses) {
      renderPass({
        sourceTexture: source,
        targetTexture: target,
        width,
        height,
        adjustments: maskPass.adjustments,
        mask: maskPass,
      });
      [source, target] = [target, source];
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      source,
      0,
    );

    const output = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, output);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new ImageData(new Uint8ClampedArray(output), width, height);
  }

  function destroy() {
    gl.deleteTexture(sourceTextureA);
    gl.deleteTexture(sourceTextureB);
    gl.deleteTexture(maskTexture);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }

  return { process, destroy };
}
