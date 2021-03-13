module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.aws-sam'],
  clearMocks: true,
  setupFiles: ['<rootDir>/.jest/setEnvVars.js']
};
