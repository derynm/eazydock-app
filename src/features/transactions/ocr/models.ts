/**
 * Lazy-load and cache the two ONNX InferenceSessions for the scanner's lifetime.
 * Bundled from assets/models/ via expo-asset.
 */
import { Asset } from 'expo-asset';
import { InferenceSession } from 'onnxruntime-react-native';

let detectorSession: InferenceSession | null = null;
let ocrSession: InferenceSession | null = null;
let loadPromise: Promise<{ detector: InferenceSession; ocr: InferenceSession }> | null = null;

export async function getSessions(): Promise<{ detector: InferenceSession; ocr: InferenceSession }> {
  if (detectorSession && ocrSession) return { detector: detectorSession, ocr: ocrSession };
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const assets = await Asset.loadAsync([
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../../assets/models/license-plate-detector.onnx'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../../assets/models/plate-ocr.onnx'),
    ]);

    const [detectorAsset, ocrAsset] = assets;
    if (!detectorAsset?.localUri || !ocrAsset?.localUri) {
      throw new Error('ONNX model assets failed to load');
    }

    detectorSession = await InferenceSession.create(detectorAsset.localUri);
    ocrSession = await InferenceSession.create(ocrAsset.localUri);
    return { detector: detectorSession, ocr: ocrSession };
  })();

  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null;
    throw e;
  }
}

export function releaseSessions(): void {
  detectorSession = null;
  ocrSession = null;
  loadPromise = null;
}
