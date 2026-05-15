module.exports = ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    name: IS_DEV ? 'Nihon Dev' : 'Nihon',
    android: {
      ...config.android,
      package: IS_DEV ? 'com.tabitha.nihon.dev' : 'com.tabitha.nihon',
    },
    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV ? 'com.tabitha.nihon.dev' : 'com.tabitha.nihon',
    }
  };
};
