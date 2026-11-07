import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

export const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^react-markdown$': '<rootDir>/tests/__mocks__/react-markdown.js',
    '^rehype-sanitize$': '<rootDir>/tests/__mocks__/rehype-sanitize.js',
    '^remark-gfm$': '<rootDir>/tests/__mocks__/remark-gfm.js'
  },
  testMatch: ['**/__tests__/**/*.test.[tj]s?(x)', '**/__tests__/**/*.spec.[tj]s?(x)']
};

export default createJestConfig(customJestConfig);
