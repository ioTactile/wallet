module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@wallet/shared$': '<rootDir>/../shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
