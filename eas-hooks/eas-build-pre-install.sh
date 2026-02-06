#!/usr/bin/env bash

set -euo pipefail

# Create gradle.properties if it doesn't exist
if [ ! -f "$EAS_BUILD_WORKINGDIR/android/gradle.properties" ]; then
  echo "Creating gradle.properties"
  touch "$EAS_BUILD_WORKINGDIR/android/gradle.properties"
fi

# Add Mapbox download token to gradle.properties
echo "MAPBOX_DOWNLOADS_TOKEN=$RNMAPBOX_MAPS_DOWNLOAD_TOKEN" >> "$EAS_BUILD_WORKINGDIR/android/gradle.properties"

echo "✅ Mapbox download token configured in gradle.properties"
