const { withAppBuildGradle } = require('expo/config-plugins');

const DEBUG_SIGNING_BLOCK = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const RELEASE_SIGNING_BLOCK = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            def releasePropsFile = rootProject.file('../credentials/release-signing.properties')
            if (releasePropsFile.exists()) {
                def releaseProps = new Properties()
                releasePropsFile.withInputStream { releaseProps.load(it) }
                storeFile rootProject.file('../credentials/' + releaseProps['storeFile'])
                storePassword releaseProps['storePassword']
                keyAlias releaseProps['keyAlias']
                keyPassword releaseProps['keyPassword']
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }`;

const RELEASE_TYPE_DEBUG_SIGNING =
  '// Caution! In production, you need to generate your own keystore file.\n' +
  '            // see https://reactnative.dev/docs/signed-apk-android.\n' +
  '            signingConfig signingConfigs.debug';

const RELEASE_TYPE_RELEASE_SIGNING =
  '// Caution! In production, you need to generate your own keystore file.\n' +
  '            // see https://reactnative.dev/docs/signed-apk-android.\n' +
  '            signingConfig signingConfigs.release';

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (!contents.includes(DEBUG_SIGNING_BLOCK)) {
      throw new Error(
        'withAndroidReleaseSigning: expected debug signingConfig block not found in app/build.gradle — the Expo/RN template may have changed.'
      );
    }
    if (!contents.includes(RELEASE_TYPE_DEBUG_SIGNING)) {
      throw new Error(
        'withAndroidReleaseSigning: expected release buildType signingConfig not found in app/build.gradle — the Expo/RN template may have changed.'
      );
    }

    config.modResults.contents = contents
      .replace(DEBUG_SIGNING_BLOCK, RELEASE_SIGNING_BLOCK)
      .replace(RELEASE_TYPE_DEBUG_SIGNING, RELEASE_TYPE_RELEASE_SIGNING);

    return config;
  });
};
