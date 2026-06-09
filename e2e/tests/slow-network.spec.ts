import { test, expect } from '../fixtures/app.fixture';
import { goToLanding } from '../helpers/navigation';

/**
 * Slow-network resilience.
 *
 * Real classrooms run on congested school Wi-Fi, not a developer's
 * fiber. This throttles the connection to a "bad 3G" profile via the
 * Chrome DevTools Protocol and asserts the landing page still mounts —
 * a regression that doubles the bundle or adds a render-blocking request
 * shows up here as a timeout long before a student on slow Wi-Fi hits it.
 *
 * CDP network emulation is Chromium-only, so this test self-skips on the
 * WebKit/Firefox projects in the device matrix. To exercise slow network
 * on real mobile engines, throttle via a real-device cloud instead
 * (see docs/testing-at-scale.md).
 */
test.describe('Slow network', () => {
  // The bundle download under throttling eats into the budget — give it
  // room so a pass means "loads on bad Wi-Fi", not "loads in 60s flat".
  test.setTimeout(120_000);

  test('landing page mounts on throttled (bad-3G) connection', async ({
    publicPage: page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP network throttling is Chromium-only');

    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    // ~400 kbps down/up, 400ms latency — a deliberately rough school
    // Wi-Fi profile (between Chrome DevTools' "Slow 3G" and "Fast 3G").
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
      latency: 400,
    });

    await goToLanding(page);
    await expect(page.getByText('Level Up Your Vocabulary')).toBeVisible({
      timeout: 30_000,
    });
  });
});
