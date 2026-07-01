/**
 * readPlate() — full on-device two-stage ONNX pipeline.
 * Detector → NMS → crop → OCR.
 */
import { Tensor } from 'onnxruntime-react-native';

import { OCR_CONFIG } from './config';
import { decodeDetector, decodeOcr } from './decode';
import { getSessions } from './models';
import { preprocessFrame, cropForOcr } from './preprocess';

export type PlateReadResult = {
  plate: string;
  confidence: number;
  source: 'onnx';
};

export async function readPlate(
  photoUri: string,
  photoWidth: number,
  photoHeight: number,
): Promise<PlateReadResult | null> {
  const config = OCR_CONFIG;

  const { detector, ocr } = await getSessions();

  const { resizedUri, resizedW, resizedH, offsetX, offsetY, detectorTensor } =
    await preprocessFrame(photoUri, photoWidth, photoHeight, config);

  const detectorInputName = detector.inputNames[0] ?? 'images';
  const detectorInput = {
    [detectorInputName]: new Tensor('float32', detectorTensor, [1, 3, config.detectorInputSize, config.detectorInputSize]),
  };
  const detectorOutput = await detector.run(detectorInput) as unknown as Record<string, { data: Float32Array; dims: readonly number[] }>;

  const region = decodeDetector(detectorOutput, offsetX, offsetY, resizedW, resizedH, config);
  if (!region) return null;

  const ocrRgb = await cropForOcr(resizedUri, resizedW, resizedH, region, config);

  const ocrInputName = ocr.inputNames[0] ?? 'input';
  const ocrInput = {
    [ocrInputName]: new Tensor('uint8', ocrRgb, [1, config.ocrImageHeight, config.ocrImageWidth, 3]),
  };
  const ocrOutput = await ocr.run(ocrInput) as unknown as Record<string, { data: Float32Array; dims: readonly number[] }>;

  const plate = decodeOcr(ocrOutput, config);
  if (!plate) return null;

  return { plate, confidence: region.confidence, source: 'onnx' };
}
