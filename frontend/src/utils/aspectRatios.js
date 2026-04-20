/**
 * aspectRatios.js
 * Preset crop ratio constants and helpers.
 */

export const ASPECT_RATIOS = [
  { label: 'Free',  value: null },
  { label: '1:1',   value: 1 },
  { label: '4:5',   value: 4 / 5 },
  { label: '5:4',   value: 5 / 4 },
  { label: '16:9',  value: 16 / 9 },
  { label: '9:16',  value: 9 / 16 },
  { label: '3:2',   value: 3 / 2 },
  { label: '2:3',   value: 2 / 3 },
];

/**
 * Given a desired aspect ratio and a bounding box, compute the largest
 * crop rectangle that fits inside the box while maintaining the ratio.
 */
export function computeCropForRatio(ratio, boundsW, boundsH) {
  if (!ratio) return { x: 0, y: 0, width: boundsW, height: boundsH };

  let w = boundsW;
  let h = Math.round(w / ratio);

  if (h > boundsH) {
    h = boundsH;
    w = Math.round(h * ratio);
  }

  const x = Math.round((boundsW - w) / 2);
  const y = Math.round((boundsH - h) / 2);

  return { x, y, width: w, height: h };
}
