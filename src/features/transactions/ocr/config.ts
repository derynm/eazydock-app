/** Ported from web useBrowserPlateReader defaultConfig — must stay in sync. */
export const OCR_CONFIG = {
  detectorInputSize: 640,
  detectorConfidenceThreshold: 0.35,
  detectorIouThreshold: 0.45,
  ocrImageWidth: 128,
  ocrImageHeight: 64,
  ocrAlphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_',
  ocrPadCharacter: '_',
  plateCropPaddingRatio: 0.12,
} as const;

export type OcrConfig = typeof OCR_CONFIG;
