#!/bin/bash
# Start Expo with web and Android support

echo "🚀 Starting development server..."
echo "📱 Android device must be connected via USB"
echo "🌐 Web will open automatically in Chrome"
echo ""

# Set Android SDK
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Check if Android device is connected
if ! adb devices | grep -q "device$"; then
    echo "⚠️  No Android device detected!"
    echo "Connect your device and try again"
    exit 1
fi

# Setup port forwarding for Android
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8097 tcp:8097
echo "✅ Port forwarding enabled for Android"

# Start Expo with localhost (for USB) and web
npx expo start --localhost --web
