const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'node',
  // jsconfig.json's @ path mapping is not automatically picked up by next/jest in this environment,
  // so we need to explicitly map it in Jest's moduleNameMapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
})
