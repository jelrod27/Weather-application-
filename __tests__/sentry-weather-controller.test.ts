/**
 * Test for Sentry fix: JAVASCRIPT-NEXTJS-X / JAVASCRIPT-NEXTJS-W
 * useWeatherSession (home alias: useWeatherController) must use a ref gate
 * to prevent infinite re-renders when checkRateLimit is in the useEffect
 * dependency array.
 */

describe('useWeatherSession rate limit effect (JAVASCRIPT-NEXTJS-X/W)', () => {
  it('should use a ref gate to run rate limit init only once', () => {
    const fs = require('fs');
    const path = require('path');
    const hookSource = fs.readFileSync(
      path.join(__dirname, '..', 'hooks', 'useWeatherSession.ts'),
      'utf8'
    );

    const lines = hookSource.split('\n');

    // Find the useEffect block that contains both isClient and checkRateLimit()
    // Then verify it has a .current ref guard and no eslint-disable
    let effectStart = -1;
    let effectEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('useEffect(')) {
        // Scan ahead to find the closing deps array
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          if (lines[j].match(/\},\s*\[/)) {
            // Check if this effect block contains both isClient and checkRateLimit()
            const block = lines.slice(i, j + 1).join('\n');
            if (block.includes('checkRateLimit()') && block.includes('isClient')) {
              effectStart = i;
              effectEnd = j;
            }
            break;
          }
        }
      }
      if (effectStart >= 0) break;
    }

    expect(effectStart).toBeGreaterThan(-1);

    const effectBlock = lines.slice(effectStart, effectEnd + 1).join('\n');
    // Must have a ref guard (.current)
    expect(effectBlock).toMatch(/\.current/);
    // Must NOT have eslint-disable
    expect(effectBlock).not.toMatch(/eslint-disable/);
  });
});
