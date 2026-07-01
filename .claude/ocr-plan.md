# Plan — On-device ONNX plate OCR on the check-in screen

Date: 2026-07-01
Scope: add **live camera plate scanning** (no shutter button) that auto-fills the
**Plate number** field on [`src/app/(app)/transactions/check-in.tsx`](../src/app/(app)/transactions/check-in.tsx),
inline on the same page. **On-device, ONNX parity with the web app.**
**Plan only — no implementation yet.**

Two decisions are locked:
- **Engine: on-device ONNX parity** — reuse the exact two web models.
- **Capture: live / automatic** — no tap-to-capture (see §2 for the mode).

---

## 0. What we reuse from the web app

The web app runs a **two-stage ONNX pipeline** in the browser via
`onnxruntime-web` (`resources/js/composables/useBrowserPlateReader.ts`, 542 lines):

1. **Detector** — `license-plate-detector.onnx` (YOLOv8, `float32` `[1,3,640,640]`)
   → boxes → confidence filter (0.35) + **NMS** (IoU 0.45).
2. **Crop** the best box (padding ratio) from the original frame.
3. **OCR** — `plate-ocr.onnx` (FastPlateOCR, `uint8` `[1,64,128,?]`, 128×64) →
   per-position argmax over alphabet `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_` →
   collapse pad `_` → plate string + confidence.

Models: `public/models/license-plate-detector.onnx` (~12 MB) +
`public/models/plate-ocr.onnx` (~5 MB) + `plate-ocr-config.yaml`.

**We port the framework-agnostic parts verbatim** (they're plain math):
`preprocessImage` letterbox math, `imageDataToTensor`, `decodeDetector` + `nonMaxSuppression` + `iou`,
`decodeOcr`, and the `BrowserPlateReaderConfig` values (input sizes, thresholds,
alphabet, padding ratio). Only two things change vs web:

| Web | React Native |
|---|---|
| `onnxruntime-web` `InferenceSession`/`Tensor` | `onnxruntime-react-native` — **same API shape** |
| pixels via `<canvas>` `getImageData` | pixels via **`jpeg-js` decode** of a manipulated still (§3) |

Same models + same decoders ⇒ **identical reads** to the web.

---

## 1. UX (live, same page)

- A **Scan** button beside the Plate field opens a full-screen **`PlateScanner`**:
  live camera preview + centred **guide rectangle** + torch toggle + a
  "type manually" escape. **No shutter.**
- The scanner **auto-scans** (§2). Overlay shows state: `Point at the plate` →
  `Detecting…` → on a confident read, a brief `ABC123 ✓` confirmation, then it
  **auto-closes and fills** `plate_number`.
- Filling the field calls the **existing** `runLookup()`
  (`GET /admin/transactions/plate-lookup?plate=`) → the whole form prefills like
  manual typing does today. Optionally the winning frame is saved as the check-in
  `image` and `entry_method` set to `browser_camera`.
- OCR is **assistive** — the field stays editable; low confidence → keep scanning
  or let the operator type. A manual **Capture** button can remain as a fallback.

> OCR only needs to output a **plate string**; everything downstream
> (plate-lookup prefill, new vehicle/driver, submit) already exists.

---

## 2. Capture mode — "live" without a button

**v1 (recommended): auto-capture loop on `expo-camera`.**
`expo-camera` exposes **stills only** (no per-frame pixels), so "live" = a loop:
grab a **downscaled** still every ~700 ms–1 s → run the ONNX pipeline → keep the
best result across N frames → **auto-accept** at confidence ≥ threshold (or after
K stable identical reads). Cancel the loop on close/accept. Effective ~1–2
scans/s — feels automatic, reuses the still pipeline, **no vision-camera, no
`react-native-worklets-core`** (avoids clashing with reanimated's
`react-native-worklets`).

**v2 (upgrade, later): true realtime on `react-native-vision-camera`.**
Frame processors give per-frame pixels for smooth video-rate scanning, but:
- needs `react-native-worklets-core` alongside reanimated worklets (interop care);
- to hit realtime, inference/preprocess must run in a **native frame-processor
  plugin** (JSI/C++) — decoding frames with `jpeg-js` in JS can't keep up;
- more native surface + New-Arch validation.

Ship v1; the `PlateScanner` UI and the `readPlate` contract are identical, so v2
only swaps the frame source.

---

## 3. On-device pipeline (per scanned still)

```
expo-camera still (downscaled)
  └─ expo-image-manipulator: resize longest side → 640 (record scale/offsetX/offsetY)
      └─ base64 JPEG → jpeg-js.decode → RGBA Uint8Array
          └─ letterbox-pad to 640×640 + normalise → Float32 [1,3,640,640]   (port imageDataToTensor)
              └─ onnxruntime-rn detectorSession.run → decode + NMS → best box  (port decodeDetector/iou)
                  └─ map box → original coords → expo-image-manipulator crop (+pad ratio)
                      └─ resize 128×64 → jpeg-js.decode → OCR tensor (uint8, match web layout)
                          └─ ocrSession.run → argmax + collapse '_' → plate + confidence  (port decodeOcr)
```

- **Pixels without canvas:** `jpeg-js` (pure JS) decodes a JPEG to RGBA. Keep it
  fast by decoding the **already-downscaled** 640-px image, not the full photo.
- **Sessions:** create both `InferenceSession`s once, lazily, and cache for the
  scanner's lifetime.
- **Models on device:** bundle in `assets/models/` and resolve a local path with
  `expo-asset` (`Asset.fromModule(require(...)).downloadAsync().localUri`), **or**
  download once and cache in `expo-file-system` (avoids +17 MB in the binary).

---

## 4. New files

```
src/
  features/transactions/
    plate-scanner.tsx        # <PlateScanner visible onResult onClose /> live preview + guide + auto-loop + state
    ocr/
      plate-ocr.ts           # readPlate(imageUri) -> { plate, confidence, source:'onnx' }; owns sessions
      models.ts              # lazy-load/cache the two InferenceSessions (expo-asset)
      preprocess.ts          # jpeg-js decode + letterbox + tensor build (ported)
      decode.ts              # decodeDetector + nonMaxSuppression + iou + decodeOcr (ported)
      config.ts              # ported BrowserPlateReaderConfig values (640, 0.35/0.45, 128×64, alphabet, pad)
  lib/
    plate.ts                 # normalisePlate(): uppercase, strip separators, pick best token
```

Check-in wiring (in `check-in.tsx`): a **Scan** button next to the plate
`AutocompleteField`; `const [scanning, setScanning] = useState(false)`;
`<PlateScanner visible={scanning} onClose={…} onResult={(r) => { setValue('plate_number', r.plate); runLookup(); /* optional imageUri + entry_method */ }} />`.

---

## 5. Dependencies (`pnpm exec expo install`)

- `expo-camera` — live preview + stills (custom guide overlay).
- `expo-image-manipulator` — downscale, letterbox-resize, crop the detected box.
- `onnxruntime-react-native` — inference (same `InferenceSession`/`Tensor` API as web).
- `jpeg-js` — decode stills → RGBA for tensor building (pure JS).
- `expo-asset` (+ maybe `expo-file-system`) — load/cache the bundled `.onnx` models.
- **Not** needed for v1: vision-camera, worklets-core, ML Kit.

---

## 6. Constraints & risks

- **Dev build required** (native modules) — not Expo Go. You already ship local
  builds / TestFlight.
- **`onnxruntime-react-native` on New Arch (SDK-56 default):** verify a compatible
  version builds against RN 0.85 before committing — **primary risk**. Add its
  Expo config plugin.
- **Permissions:** iOS `NSCameraUsageDescription` (expo-camera plugin — set a
  clear message); Android `CAMERA`. Request at scan time; graceful manual fallback.
- **Perf:** `jpeg-js` is the bottleneck → always decode the **downscaled** image;
  throttle the loop (~1/s); run off the UI thread; show a "Detecting…" state.
  Detector+OCR per cycle ≈ a few hundred ms on device — fine for auto-capture,
  not for 30 fps (that's v2).
- **Binary size:** +~17 MB if bundling models; prefer download-and-cache if that
  matters for TestFlight.
- **Parity:** copy the web's tensor construction (channels, normalisation, dims)
  **exactly**, or reads will drift from the web.

---

## 7. Error / fallback matrix

| Situation | Behaviour |
|---|---|
| Permission denied | Toast → close scanner → manual entry. |
| No confident read after ~Ns | "Couldn't read it — hold steady or type the plate." Keep scanning / manual. |
| Model load / inference fails | Fall back to manual; log; never block check-in. |
| Low confidence | Don't auto-accept; keep looping; offer manual capture/confirm. |

---

## 8. Milestones

1. **M1 — Native spike:** install `onnxruntime-react-native`, load one `.onnx` via
   `expo-asset`, run a dummy inference in a dev build (iOS + Android). **De-risks
   the New-Arch/build question before UI work.**
2. **M2 — Still pipeline:** port `config`/`preprocess`/`decode`; `readPlate(uri)`
   end-to-end on a single captured still; validate reads match web on sample plates.
3. **M3 — Live scanner:** `PlateScanner` with `expo-camera` preview + guide +
   auto-capture loop + states; wire into `check-in.tsx` (fill plate → `runLookup`).
4. **M4 — Polish:** torch, confidence gating, save frame as check-in `image` +
   `entry_method`, error matrix, model bundle-vs-download decision.
5. **M5 (optional) — True realtime:** vision-camera frame processor + native
   plugin; same UI + `readPlate` contract.

---

## 9. Open questions

1. **Models: bundle (+17 MB) vs download-and-cache** on first run?
2. **Auto-accept rule:** confidence threshold only, or K stable identical reads?
3. Save the winning frame as the check-in `image` (and set `entry_method`)?
4. Return **state/region** too, or plate string only?
5. OK to keep a manual **Capture** button as a fallback inside the live scanner?
