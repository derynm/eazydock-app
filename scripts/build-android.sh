#!/usr/bin/env bash
#
# Local Android build (no EAS cloud).
#   pnpm build:android -- [release|debug] [apk|aab]
#
# EXPO_PUBLIC_* values are inlined at build time. Production builds default to
# the live admin API below and intentionally override .env.local. Set API_URL to
# explicitly target another environment for one build.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VARIANT="${1:-release}"
FORMAT="${2:-apk}"
case "${VARIANT}:${FORMAT}" in
  release:apk) TASK="assembleRelease"; OUT="app/build/outputs/apk/release/app-release.apk" ;;
  debug:apk)   TASK="assembleDebug";   OUT="app/build/outputs/apk/debug/app-debug.apk" ;;
  release:aab) TASK="bundleRelease";   OUT="app/build/outputs/bundle/release/app-release.aab" ;;
  debug:aab)   TASK="bundleDebug";     OUT="app/build/outputs/bundle/debug/app-debug.aab" ;;
  *) echo "ERROR: unknown variant/format '${VARIANT}/${FORMAT}' (variant: release|debug, format: apk|aab)"; exit 1 ;;
esac

command -v pnpm >/dev/null 2>&1 || {
  echo "ERROR: pnpm not found on PATH (load the project Node version with nvm first)."
  exit 1
}
[ -n "${ANDROID_HOME:-}" ] || [ -d "$HOME/Library/Android/sdk" ] || {
  echo "ERROR: Android SDK not found. Install Android Studio or set ANDROID_HOME."
  exit 1
}

export EXPO_PUBLIC_API_URL="${API_URL:-https://app.eazydock.com.au/api}"
export EXPO_NO_DOTENV=1
echo ">> Production API: ${EXPO_PUBLIC_API_URL}"

echo ">> Installing locked pnpm dependencies..."
pnpm install --frozen-lockfile

echo ">> Verifying the production API in a clean Android bundle..."
VERIFY_DIR=".expo/production-export/android"
pnpm exec expo export --clear --platform android --output-dir "${VERIFY_DIR}"
grep -RqsF "${EXPO_PUBLIC_API_URL}" "${VERIFY_DIR}" || {
  echo "ERROR: production API was not embedded in the Android bundle."
  exit 1
}

echo ">> Prebuilding a clean Android project..."
pnpm exec expo prebuild --platform android --clean

# APKs default to arm64 only (physical phones/tablets); override for an
# emulator or additional targets, e.g. ANDROID_ABIS=x86_64. AABs default to
# every ABI so Play can serve the right slice to each device.
if [ "${FORMAT}" = "aab" ]; then
  ABIS="${ANDROID_ABIS:-armeabi-v7a,arm64-v8a,x86,x86_64}"
else
  ABIS="${ANDROID_ABIS:-arm64-v8a}"
fi

echo ">> Running Gradle ${TASK} (ABIs: ${ABIS})..."
cd android
attempt=1
until ./gradlew "${TASK}" -PreactNativeArchitectures="${ABIS}"; do
  if [ "${attempt}" -ge 3 ]; then
    echo "ERROR: Gradle ${TASK} failed after ${attempt} attempts."
    exit 1
  fi
  echo ">> Gradle failed (attempt ${attempt}); retrying..."
  attempt=$((attempt + 1))
done

echo ""
if [ "${FORMAT}" = "aab" ]; then
  echo "OK: AAB built -> android/${OUT}"
  echo "    Upload this file to the Play Console."
else
  echo "OK: APK built -> android/${OUT}"
  echo "    Install with: adb install -r android/${OUT}"
fi
