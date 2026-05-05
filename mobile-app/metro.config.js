const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Enable package.json `exports` field so @supabase/auth-js resolves correctly
    unstable_enablePackageExports: true,
    // Prefer `main`/`module` over `react-native` so Metro uses published JS under `lib/`.
    // Several packages set `"react-native": "src/..."` (TS); Metro then fails on extensionless
    // sub-imports — e.g. react-native-svg `./ReactNativeSVG`. @rnmapbox/maps also ships `lib/`.
    resolverMainFields: ['main', 'module', 'browser', 'react-native'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
