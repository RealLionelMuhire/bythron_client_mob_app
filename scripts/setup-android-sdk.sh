#!/bin/bash
# scripts/setup-android-sdk.sh
#
# Downloads and installs the Android SDK command-line tools, then installs
# the exact SDK components needed to build this app (compileSdk=36, ndk=27).
#
# Run once from the project root:
#   ./scripts/setup-android-sdk.sh
#
# After this script: run ./scripts/build.sh to build the APK.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Config ─────────────────────────────────────────────────────────────────
ANDROID_SDK_ROOT="$HOME/Android/Sdk"
CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"

# SDK components required by this app (from app.config.js / build.gradle output)
COMPILE_SDK="36"
BUILD_TOOLS="36.0.0"
NDK_VERSION="27.1.12297006"

# ── 1. Check Java ───────────────────────────────────────────────────────────
echo "── Checking Java ──────────────────────────────────────────────────────"
if ! command -v java &>/dev/null; then
  echo "❌  Java not found. Install with:"
  echo "    sudo apt install openjdk-17-jdk"
  exit 1
fi
java -version 2>&1 | head -1
echo "✅  Java OK"
echo ""

# ── 2. Download cmdline-tools ───────────────────────────────────────────────
echo "── Downloading Android cmdline-tools ──────────────────────────────────"

# Fetch the latest download URL from Android Studio page
CMDLINE_URL=$(curl -s "https://developer.android.com/studio" \
  | grep -o "https://dl.google.com/android/repository/commandlinetools-linux-[0-9]*_latest.zip" \
  | head -1)

if [ -z "$CMDLINE_URL" ]; then
  echo "⚠️   Could not auto-detect URL. Using known stable version."
  CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
fi

echo "    URL: $CMDLINE_URL"

TMPDIR_DL=$(mktemp -d)
ZIP="$TMPDIR_DL/cmdline-tools.zip"

echo "    Downloading..."
curl -L -o "$ZIP" "$CMDLINE_URL" --progress-bar

echo "    Extracting to $CMDLINE_TOOLS_DIR ..."
mkdir -p "$CMDLINE_TOOLS_DIR"
unzip -q "$ZIP" -d "$TMPDIR_DL"

# The zip extracts as cmdline-tools/ — move contents into .../latest/
mv "$TMPDIR_DL/cmdline-tools/"* "$CMDLINE_TOOLS_DIR/"
rm -rf "$TMPDIR_DL"
echo "✅  cmdline-tools installed"
echo ""

# ── 3. Set ANDROID_HOME for this session ────────────────────────────────────
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$CMDLINE_TOOLS_DIR/bin:$ANDROID_HOME/platform-tools:$PATH"

# ── 4. Persist to ~/.bashrc ─────────────────────────────────────────────────
BASHRC_BLOCK="
# Android SDK — added by setup-android-sdk.sh
export ANDROID_HOME=\"$ANDROID_SDK_ROOT\"
export PATH=\"\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH\"
"
if ! grep -q "ANDROID_HOME" "$HOME/.bashrc"; then
  echo "$BASHRC_BLOCK" >> "$HOME/.bashrc"
  echo "✅  ANDROID_HOME added to ~/.bashrc"
fi

# ── 5. Accept licenses ──────────────────────────────────────────────────────
echo "── Accepting SDK licenses ─────────────────────────────────────────────"
yes | sdkmanager --licenses > /dev/null 2>&1 || true
echo "✅  Licenses accepted"
echo ""

# ── 6. Install SDK components ───────────────────────────────────────────────
echo "── Installing SDK components ───────────────────────────────────────────"
echo "    This may take a few minutes ..."

sdkmanager \
  "platform-tools" \
  "platforms;android-${COMPILE_SDK}" \
  "build-tools;${BUILD_TOOLS}" \
  "ndk;${NDK_VERSION}"

echo "✅  SDK components installed"
echo ""

# ── 7. Create android/local.properties ─────────────────────────────────────
LOCAL_PROPS="$PROJECT_DIR/android/local.properties"
echo "── Writing android/local.properties ──────────────────────────────────"
echo "sdk.dir=$ANDROID_SDK_ROOT" > "$LOCAL_PROPS"
echo "✅  local.properties created: $LOCAL_PROPS"
echo ""

# ── Done ────────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════"
echo "  Android SDK setup complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  SDK location : $ANDROID_SDK_ROOT"
echo "  Next step    : ./scripts/build.sh"
echo ""
echo "  ⚠️  Open a new terminal (or run: source ~/.bashrc)"
echo "     for ANDROID_HOME to take effect globally."
echo ""
