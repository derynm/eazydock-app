/**
 * On-device image preprocessing for the ONNX pipeline.
 * Replaces the web canvas approach with expo-image-manipulator + jpeg-js.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpegjs from 'jpeg-js';

import { OCR_CONFIG, type OcrConfig } from './config';

export type PreprocessedFrame = {
  /** Base64 JPEG URI of the resized (≤640 px) image — used for OCR crop. */
  resizedUri: string;
  resizedW: number;
  resizedH: number;
  /** Letterbox padding added before the resized image content. */
  offsetX: number;
  offsetY: number;
  /** Float32 tensor [1, 3, 640, 640] in CHW layout, values in [0, 1]. */
  detectorTensor: Float32Array;
};

export async function preprocessFrame(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
  config: OcrConfig = OCR_CONFIG,
): Promise<PreprocessedFrame> {
  const inputSize = config.detectorInputSize;
  const scale = Math.min(inputSize / photoWidth, inputSize / photoHeight);
  const resizedW = Math.round(photoWidth * scale);
  const resizedH = Math.round(photoHeight * scale);
  const offsetX = Math.floor((inputSize - resizedW) / 2);
  const offsetY = Math.floor((inputSize - resizedH) / 2);

  const { uri: resizedUri } = await manipulateAsync(
    photoUri,
    [{ resize: { width: resizedW, height: resizedH } }],
    { format: SaveFormat.JPEG, base64: false },
  );

  const b64 = await FileSystem.readAsStringAsync(resizedUri, { encoding: FileSystem.EncodingType.Base64 });
  const { data: rgba, width: dw, height: dh } = jpegjs.decode(base64ToArrayBuffer(b64), { useTArray: true });

  const detectorTensor = buildDetectorTensor(rgba, dw, dh, offsetX, offsetY, inputSize);

  return { resizedUri, resizedW, resizedH, offsetX, offsetY, detectorTensor };
}

export async function cropForOcr(
  resizedUri: string,
  resizedW: number,
  resizedH: number,
  region: { x: number; y: number; width: number; height: number },
  config: OcrConfig = OCR_CONFIG,
): Promise<Uint8Array> {
  const padX = region.width * config.plateCropPaddingRatio;
  const padY = region.height * config.plateCropPaddingRatio * 1.6;
  const cropX = Math.max(0, Math.round(region.x - padX));
  const cropY = Math.max(0, Math.round(region.y - padY));
  const cropW = Math.min(resizedW - cropX, Math.round(region.width + 2 * padX));
  const cropH = Math.min(resizedH - cropY, Math.round(region.height + 2 * padY));

  const { uri: croppedUri } = await manipulateAsync(
    resizedUri,
    [
      { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
      { resize: { width: config.ocrImageWidth, height: config.ocrImageHeight } },
    ],
    { format: SaveFormat.JPEG, base64: false },
  );

  const b64 = await FileSystem.readAsStringAsync(croppedUri, { encoding: FileSystem.EncodingType.Base64 });
  const { data: rgba } = jpegjs.decode(base64ToArrayBuffer(b64), { useTArray: true });

  // Strip alpha → interleaved RGB Uint8Array [H, W, 3] = [64, 128, 3]
  const rgb = new Uint8Array(config.ocrImageWidth * config.ocrImageHeight * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]!;
    rgb[j + 1] = rgba[i + 1]!;
    rgb[j + 2] = rgba[i + 2]!;
  }
  return rgb;
}

function buildDetectorTensor(
  rgba: Uint8Array,
  imgW: number,
  imgH: number,
  offsetX: number,
  offsetY: number,
  inputSize: number,
): Float32Array {
  const area = inputSize * inputSize;
  const tensor = new Float32Array(3 * area); // [C, H, W] = CHW, black (0) by default

  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const srcIdx = (y * imgW + x) * 4;
      const dstY = y + offsetY;
      const dstX = x + offsetX;
      const dstIdx = dstY * inputSize + dstX;
      tensor[dstIdx] = rgba[srcIdx]! / 255;
      tensor[area + dstIdx] = rgba[srcIdx + 1]! / 255;
      tensor[2 * area + dstIdx] = rgba[srcIdx + 2]! / 255;
    }
  }
  return tensor;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}
