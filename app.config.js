module.exports = {
  expo: {
    name: "Track IQ",
    slug: "track-iq",
    owner: "muhire01",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    extra: {
      eas: {
        projectId: "58a5178d-4c52-479c-8407-044ddd9c49da"
      }
    },
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#2F80ED",
    },
    ios: {
      bundleIdentifier: "com.bythron.gpstracker",
      supportsTablet: true,
      infoPlist: {
        MGLMapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
      },
    },
    android: {
      package: "com.bythron.gpstracker",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      bundler: "metro",
      output: "server",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow Track IQ to use the camera to scan GPS device QR codes.",
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#2F80ED",
          defaultChannel: "gps-alarms",
          sounds: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
