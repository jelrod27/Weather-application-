// Reuse the project setup, matchers and SWC transformer without Next's `dir`
// discovery, which spawns the TS6 CLI. No subprocesses or .env files are loaded.
import { fileURLToPath } from 'node:url';
import nextJest from 'next/jest.js';
import { customJestConfig } from '../../jest.config.mjs';

export default nextJest()({
  ...customJestConfig,
  rootDir: fileURLToPath(new URL('../../', import.meta.url)),
});
