export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'index.ts',
    '!src/**/*.d.ts',
    '!**/__tests__/**'
  ],
  // Coverage thresholds disabled for initial release
  // Can be enabled as test coverage improves
  // coverageThreshold: {
  //   global: {
  //     branches: 30,
  //     functions: 30,
  //     lines: 20,
  //     statements: 20
  //   }
  // }
};
