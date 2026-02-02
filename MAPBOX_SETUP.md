# Mapbox Configuration

Since the @rnmapbox/maps plugin has ESM compatibility issues with Expo's config plugin system, we're using manual configuration.

## iOS Configuration
The Mapbox access token is set in `app.config.js` under `ios.infoPlist.MGLMapboxAccessToken`.

## Android Configuration
For Android, you need to add the Mapbox token to your gradle.properties or local build configuration when running a production build.

## Development Setup
For development with Expo Go, Mapbox works with just the runtime token set via `Mapbox.setAccessToken()` in the code (already done in Map.tsx).

## Production Builds (EAS Build)
When you're ready to create production builds:

1. **iOS**: The token is automatically injected from the config
2. **Android**: Add to your EAS build configuration or use `expo prebuild` and configure manually

## Alternative: Use Expo Development Build
For full Mapbox features, use `expo prebuild` to generate native projects and build a custom development client.
