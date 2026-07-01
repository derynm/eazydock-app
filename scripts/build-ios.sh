#!/usr/bin/env bash
#
# Local iOS build (no EAS cloud).
#   pnpm build:ios -- [release|debug] [extra expo run:ios arguments...]
#
# Examples:
#   pnpm build:ios
#   pnpm build:ios -- debug
#   pnpm build:ios -- release --device
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG="Release"
case "${1:-}" in
  release|Release) CONFIG="Release"; shift ;;
  debug|Debug)     CONFIG="Debug"; shift ;;
  "") ;;
  -*) ;; # Forward options such as --device directly to Expo CLI.
  *) echo "ERROR: unknown configuration '${1}' (use 'release' or 'debug')"; exit 1 ;;
esac

if [ "$(uname)" != "Darwin" ]; then
  echo "ERROR: iOS builds require macOS."
  exit 1
fi
command -v pnpm >/dev/null 2>&1 || {
  echo "ERROR: pnpm not found on PATH (load the project Node version with nvm first)."
  exit 1
}
command -v xcodebuild >/dev/null 2>&1 || {
  echo "ERROR: Xcode and its command-line tools are required."
  exit 1
}
command -v pod >/dev/null 2>&1 || {
  echo "ERROR: CocoaPods not found. Install it with 'brew install cocoapods'."
  exit 1
}

export EXPO_PUBLIC_API_URL="${API_URL:-https://eazydoc.eazycab.au/api}"
export EXPO_NO_DOTENV=1
echo ">> Production API: ${EXPO_PUBLIC_API_URL}"

echo ">> Installing locked pnpm dependencies..."
pnpm install --frozen-lockfile

echo ">> Verifying the production API in a clean iOS bundle..."
VERIFY_DIR=".expo/production-export/ios"
pnpm exec expo export --clear --platform ios --output-dir "${VERIFY_DIR}"
grep -RqsF "${EXPO_PUBLIC_API_URL}" "${VERIFY_DIR}" || {
  echo "ERROR: production API was not embedded in the iOS bundle."
  exit 1
}

echo ">> Prebuilding a clean iOS project..."
pnpm exec expo prebuild --platform ios --clean

echo ">> Building and launching iOS (${CONFIG})..."
pnpm exec expo run:ios --configuration "${CONFIG}" "$@"

echo ""
echo "OK: iOS ${CONFIG} build completed."
