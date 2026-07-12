#!/bin/bash
# Build a release APK from the project root.
# Usage:  ./scripts/build.sh [--clean | --prebuild]
#
# --clean     runs expo prebuild --clean first (full native regen)
# --prebuild  runs expo prebuild incrementally (safe for plugin changes)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# ── Auto-create android/local.properties if missing ────────────────────────
# This file is wiped by "prebuild --clean" — we rebuild it from ANDROID_HOME.
LOCAL_PROPS="$PROJECT_DIR/android/local.properties"
if [ ! -f "$LOCAL_PROPS" ]; then
  SDK_DIR="${ANDROID_HOME:-$HOME/Android/Sdk}"
  if [ -d "$SDK_DIR" ]; then
    echo "sdk.dir=$SDK_DIR" > "$LOCAL_PROPS"
    echo "ℹ️  Created android/local.properties → $SDK_DIR"
  else
    echo "❌  android/local.properties is missing and ANDROID_HOME is not set."
    echo "    Run ./scripts/setup-android-sdk.sh first."
    exit 1
  fi
fi
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
