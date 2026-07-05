#!/usr/bin/env bash
#
# Local Android build (no EAS cloud).
#   pnpm build:android -- [release|debug]
#
# EXPO_PUBLIC_* values are inlined at build time. Production builds default to
# the live admin API below and intentionally override .env.local. Set API_URL to
# explicitly target another environment for one build.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VARIANT="${1:-release}"
case "$VARIANT" in
  release) TASK="assembleRelease"; OUT="app/build/outputs/apk/release/app-release.apk" ;;
  debug)   TASK="assembleDebug";   OUT="app/build/outputs/apk/debug/app-debug.apk" ;;
  *) echo "ERROR: unknown variant '${VARIANT}' (use 'release' or 'debug')"; exit 1 ;;
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

# Physical phones and tablets use arm64. Override for an emulator or additional
# targets, for example ANDROID_ABIS=x86_64.
ABIS="${ANDROID_ABIS:-arm64-v8a}"

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
echo "OK: APK built -> android/${OUT}"
echo "    Install with: adb install -r android/${OUT}"
