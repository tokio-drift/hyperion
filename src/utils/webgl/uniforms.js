function computeContrastFactor(contrast) {
  if (contrast === 0) return 1;
  return (259 * (contrast + 255)) / (255 * (259 - contrast));
}

export function getUniformValues(adjustments = {}) {
  const {
    exposure = 0,
    brightness = 0,
    contrast = 0,
    highlights = 0,
    shadows = 0,
    whites = 0,
    blacks = 0,
    temperature = 0,
    tint = 0,
    hue = 0,
    saturation = 0,
    vibrance = 0,
  } = adjustments;

  return {
    exposureFactor: Math.pow(2, (exposure / 100) * 3.32),
    brightnessOffset: brightness / 100,
    contrastFactor: computeContrastFactor(contrast),
    highlights,
    shadows,
    whites,
    blacks,
    temperature,
    tint,
    hue,
    saturation,
    vibrance,
  };
}

export function setUniforms(gl, uniforms, values) {
  gl.uniform1f(uniforms.uExposureFactor, values.exposureFactor);
  gl.uniform1f(uniforms.uBrightnessOffset, values.brightnessOffset);
  gl.uniform1f(uniforms.uContrastFactor, values.contrastFactor);
  gl.uniform1f(uniforms.uHighlights, values.highlights);
  gl.uniform1f(uniforms.uShadows, values.shadows);
  gl.uniform1f(uniforms.uWhites, values.whites);
  gl.uniform1f(uniforms.uBlacks, values.blacks);
  gl.uniform1f(uniforms.uTemperature, values.temperature);
  gl.uniform1f(uniforms.uTint, values.tint);
  gl.uniform1f(uniforms.uHue, values.hue);
  gl.uniform1f(uniforms.uSaturation, values.saturation);
  gl.uniform1f(uniforms.uVibrance, values.vibrance);
}

export function setMaskUniforms(gl, uniforms, { useMask, invertMask }) {
  gl.uniform1f(uniforms.uUseMask, useMask ? 1 : 0);
  gl.uniform1f(uniforms.uInvertMask, invertMask ? 1 : 0);
}
