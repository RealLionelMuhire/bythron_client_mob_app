#!/bin/bash
# Build a release APK.
# Run from the project root:  ./android/build.sh
# Output: android/app/build/outputs/apk/release/app-release.apk

set -e
cd "$(dirname "$0")"     # always run from android/ regardless of cwd
./gradlew assembleRelease
echo ""
echo "✅  APK ready: app/build/outputs/apk/release/app-release.apk"
