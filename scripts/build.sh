#!/bin/bash
# Build a release APK from the project root.
# Usage:  ./scripts/build.sh [--clean]
#
# --clean  runs expo prebuild --clean first (full native regen)
#          WARNING: wipes the android/ folder

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# ── Optional: re-run prebuild before building ─────────────────────────────
if [[ "$1" == "--clean" ]]; then
  echo "⚙️  Running expo prebuild --clean ..."
  npx expo prebuild --platform android --clean
elif [[ "$1" == "--prebuild" ]]; then
  echo "⚙️  Running expo prebuild (incremental) ..."
  npx expo prebuild --platform android
fi

# ── Gradle release build ───────────────────────────────────────────────────
echo "🔨 Building release APK ..."
cd android
./gradlew assembleRelease

APK="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo ""
if [ -f "$APK" ]; then
  SIZE=$(du -sh "$APK" | cut -f1)
  echo "✅  Build complete!"
  echo "    APK : $APK"
  echo "    Size: $SIZE"
  echo ""
  echo "    To install on a connected device:"
  echo "    ./scripts/install.sh"
else
  echo "❌  APK not found — build may have failed."
  exit 1
fi
