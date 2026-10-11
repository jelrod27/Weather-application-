module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      url: [
        'http://localhost:3000/weather/new-york-ny',
        'http://localhost:3000/radar?lat=40.7128&lon=-74.0060&label=New%20York',
        'http://localhost:3000/read-your-sky?lat=40.7128&lon=-74.0060&label=New%20York&tz=America%2FNew_York&returnTo=%2Fweather%2Fnew-york-ny',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'mobile',
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.55 }],
        'categories:accessibility': ['warn', { minScore: 0.80 }],
        'categories:best-practices': ['warn', { minScore: 0.80 }],
        'categories:seo': ['warn', { minScore: 0.80 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouseci-reports/mobile',
    },
  },
};
