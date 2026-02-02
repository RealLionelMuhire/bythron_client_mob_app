const { withPlugins } = require("@expo/config-plugins");

/**
 * Custom plugin wrapper for @rnmapbox/maps to handle ESM compatibility
 */
const withMapbox = (config, props = {}) => {
  // Set the required properties for Mapbox
  if (!config.ios) config.ios = {};
  if (!config.android) config.android = {};

  // Add Mapbox config
  config.ios.config = config.ios.config || {};
  config.android.config = config.android.config || {};

  return config;
};

module.exports = withMapbox;
