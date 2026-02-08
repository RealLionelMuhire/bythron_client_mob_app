#!/bin/bash
# Setup Android SDK and port forwarding
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools

# Forward ports via USB
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8097 tcp:8097

echo "✅ Port forwarding enabled"
echo "🚀 Starting Expo..."

# Start Expo dev server with localhost flag
npx expo start --localhost
