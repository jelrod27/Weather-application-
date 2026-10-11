module.exports = {
  ci: {
    collect: {
      // Start Next.js server for Lighthouse to test against
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      url: ['http://localhost:3000'],
      
      // Number of runs (median aggregate) — extra runs reduce CI flake vs 0.85 perf gate
      numberOfRuns: 5,
      
      // Settings for Chrome
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      // Assertions - fail if these thresholds aren't met
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.80 }],
        'categories:best-practices': ['warn', { minScore: 0.80 }],
        'categories:seo': ['warn', { minScore: 0.80 }],
      },
    },
    upload: {
      // Store results locally
      target: 'filesystem',
      outputDir: './lighthouseci-reports/desktop',
    },
  },
};
