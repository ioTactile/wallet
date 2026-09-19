const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(projectRoot, '../shared')];

// @wallet/shared is TypeScript ESM: "./foo.js" specifiers point at foo.ts sources.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const tsPath = path.resolve(
      path.dirname(context.originModulePath),
      `${moduleName.slice(0, -3)}.ts`,
    );
    if (fs.existsSync(tsPath)) {
      return context.resolveRequest(context, `${moduleName.slice(0, -3)}.ts`, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
