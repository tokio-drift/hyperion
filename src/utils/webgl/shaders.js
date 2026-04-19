export const VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D uTexture;
uniform float uExposureFactor;
uniform float uBrightnessOffset;
uniform float uContrastFactor;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhites;
uniform float uBlacks;
uniform float uTemperature;
uniform float uTint;
uniform float uHue;
uniform float uSaturation;
uniform float uVibrance;
uniform sampler2D uMaskTexture;
uniform float uUseMask;
uniform float uInvertMask;

varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 rgbToHsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float h = 0.0;
  float s = 0.0;
  float l = (maxC + minC) * 0.5;

  if (maxC != minC) {
    float d = maxC - minC;
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }

  return vec3(h, s, l);
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  if (s == 0.0) {
    return vec3(l, l, l);
  }

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;

  return vec3(
    hueToRgb(p, q, h + 1.0 / 3.0),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1.0 / 3.0)
  );
}

void main() {
  vec4 sampleColor = texture2D(uTexture, vUv);
  vec3 color = sampleColor.rgb;

  color *= uExposureFactor;
  color = clamp(color, 0.0, 1.0);

  color += vec3(uBrightnessOffset);
  color = clamp(color, 0.0, 1.0);

  color = ((color * 255.0 - 128.0) * uContrastFactor + 128.0) / 255.0;
  color = clamp(color, 0.0, 1.0);

  float lum = luma(color) * 255.0;

  if (uHighlights != 0.0 && lum > 192.0) {
    float t = (lum - 192.0) / 63.0;
    float shift = (uHighlights * t * 0.8) / 255.0;
    color += vec3(shift);
  }
  color = clamp(color, 0.0, 1.0);

  if (uShadows != 0.0 && lum < 64.0) {
    float t = (64.0 - lum) / 64.0;
    float shift = (uShadows * t * 0.8) / 255.0;
    color += vec3(shift);
  }
  color = clamp(color, 0.0, 1.0);

  if (uWhites != 0.0 && lum > 220.0) {
    float shift = (uWhites * 0.6) / 255.0;
    color += vec3(shift);
  }
  color = clamp(color, 0.0, 1.0);

  if (uBlacks != 0.0 && lum < 30.0) {
    float shift = (uBlacks * 0.6) / 255.0;
    color += vec3(shift);
  }
  color = clamp(color, 0.0, 1.0);

  if (uTemperature != 0.0) {
    float shift = (uTemperature * 1.2) / 255.0;
    color.r += shift;
    color.b -= shift;
  }

  if (uTint != 0.0) {
    float shift = (uTint * 0.8) / 255.0;
    color.r += shift;
    color.g -= shift;
    color.b += shift;
  }
  color = clamp(color, 0.0, 1.0);

  if (uHue != 0.0 || uSaturation != 0.0 || uVibrance != 0.0) {
    vec3 hsl = rgbToHsl(color);
    float hueDeg = hsl.x * 360.0;
    float sat = hsl.y;

    if (uHue != 0.0) {
      hueDeg = mod(hueDeg + uHue + 360.0, 360.0);
    }

    if (uSaturation != 0.0) {
      if (uSaturation >= 0.0) {
        sat = sat + (1.0 - sat) * (uSaturation / 100.0);
      } else {
        sat = sat + sat * (uSaturation / 100.0);
      }
    }

    if (uVibrance != 0.0) {
      float scale = (1.0 - sat) * (uVibrance / 100.0);
      if (uVibrance >= 0.0) {
        if (hueDeg >= 20.0 && hueDeg <= 40.0) {
          scale *= 0.7;
        }
        sat = sat + scale;
      } else {
        sat = sat + sat * (uVibrance / 100.0);
      }
    }

    hsl.x = hueDeg / 360.0;
    hsl.y = clamp(sat, 0.0, 1.0);
    color = hslToRgb(hsl);
  }

  float blend = 1.0;
  if (uUseMask > 0.5) {
    blend = texture2D(uMaskTexture, vUv).r;
    if (uInvertMask > 0.5) {
      blend = 1.0 - blend;
    }
  }

  vec3 outColor = mix(sampleColor.rgb, clamp(color, 0.0, 1.0), clamp(blend, 0.0, 1.0));
  gl_FragColor = vec4(outColor, sampleColor.a);
}
`;
