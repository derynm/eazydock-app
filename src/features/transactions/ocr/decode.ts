/**
 * Pure decoder functions ported verbatim from web useBrowserPlateReader.ts.
 * Coordinates returned by decodeDetector are in the *resized* (pre-letterbox)
 * image space so they can be fed directly to expo-image-manipulator crop.
 */
import type { OcrConfig } from './config';

export type PlateRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

type OrtTensor = { data: Float32Array; dims: readonly number[] };

export function decodeDetector(
  output: Record<string, OrtTensor>,
  offsetX: number,
  offsetY: number,
  resizedW: number,
  resizedH: number,
  config: OcrConfig,
): PlateRegion | null {
  const first = Object.values(output)[0];
  if (!first?.data || !first?.dims || first.dims.length < 3) return null;

  const { dims, data } = first;
  const detectionCount = dims[dims.length - 1];
  if (detectionCount === undefined) return null;

  const regions: PlateRegion[] = [];

  for (let i = 0; i < detectionCount; i++) {
    const conf = data[detectionCount * 4 + i];
    if (conf < config.detectorConfidenceThreshold) continue;

    const cx = data[i];
    const cy = data[detectionCount + i];
    const bw = data[detectionCount * 2 + i];
    const bh = data[detectionCount * 3 + i];

    // Map from 640×640 letterbox space to resized-image space.
    const left = Math.max(0, cx - bw / 2 - offsetX);
    const top = Math.max(0, cy - bh / 2 - offsetY);
    const right = Math.min(resizedW, cx + bw / 2 - offsetX);
    const bottom = Math.min(resizedH, cy + bh / 2 - offsetY);
    const rw = right - left;
    const rh = bottom - top;

    if (rw >= 10 && rh >= 6) regions.push({ x: left, y: top, width: rw, height: rh, confidence: conf });
  }

  if (regions.length === 0) return null;

  const suppressed = nonMaxSuppression(regions, config.detectorIouThreshold);
  if (suppressed.length === 0) return null;

  suppressed.sort((a, b) => b.confidence - a.confidence);
  return suppressed[0];
}

function nonMaxSuppression(regions: PlateRegion[], iouThreshold: number): PlateRegion[] {
  const result: PlateRegion[] = [];
  const sorted = [...regions].sort((a, b) => b.confidence - a.confidence);

  while (sorted.length > 0) {
    const top = sorted.shift()!;
    result.push(top);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (iou(top, sorted[i]!) > iouThreshold) sorted.splice(i, 1);
    }
  }
  return result;
}

function iou(a: PlateRegion, b: PlateRegion): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const intersection = (x2 - x1) * (y2 - y1);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export function decodeOcr(output: Record<string, OrtTensor>, config: OcrConfig): string {
  const first = Object.values(output)[0];
  if (!first?.data || !first?.dims || first.dims.length < 3) return '';

  const { dims, data } = first;
  const timeSteps = dims[dims.length - 2];
  const classes = dims[dims.length - 1];
  if (timeSteps === undefined || classes === undefined) return '';

  const padIndex = config.ocrAlphabet.indexOf(config.ocrPadCharacter);
  let decoded = '';

  for (let t = 0; t < timeSteps; t++) {
    let best = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let c = 0; c < classes; c++) {
      const score = data[t * classes + c];
      if (score !== undefined && score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best !== padIndex) {
      const ch = config.ocrAlphabet[best];
      if (ch !== undefined) decoded += ch;
    }
  }

  return decoded;
}
