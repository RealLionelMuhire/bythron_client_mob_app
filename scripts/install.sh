#!/bin/bash
# Install the release APK on a connected Android device via ADB.
# Usage:  ./scripts/install.sh
#
# Requires: adb in PATH, device connected with USB debugging enabled.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

APK="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK" ]; then
  echo "❌  APK not found at:"
  echo "    $APK"
  echo ""
  echo "    Run ./scripts/build.sh first."
  exit 1
fi

# Check adb is available
if ! command -v adb &> /dev/null; then
  echo "❌  adb not found. Install Android platform-tools and add to PATH."
  exit 1
fi

# Check a device is connected
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
  echo "❌  No Android device connected."
  echo "    Enable USB debugging and connect your device."
  exit 1
fi

echo "📲 Installing APK on device ..."
adb install -r "$APK"

echo ""
echo "✅  Installed successfully!"
echo "    App: $(grep '"name"' "$PROJECT_DIR/app.json" | head -1 | sed 's/.*: "\(.*\)".*/\1/')"
