import { test as base, Page } from '@playwright/test';

/**
 * Default test credentials matching the seed data used during development.
 * Adjust these values if the seed script uses different credentials.
 */
export const TEST_USER = {
  email: 'admin@example.com',
  password: 'password123',
};

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Custom fixture that provides an authenticated page.
 *
 * The fixture logs in via the API, stores the access token in
 * localStorage and navigates to the root so the client-side auth
 * layer picks up the stored credentials.
 */
type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Authenticate via the API to get an access token
    const response = await page.request.post(
      `${API_BASE_URL}/api/v1/auth/login`,
      {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      },
    );

    const body = await response.json();
    const { accessToken, refreshToken } = body;

    // Seed localStorage with the tokens so the app recognises the session
    await page.goto('/');
    await page.evaluate(
      ({ accessToken: at, refreshToken: rt }) => {
        localStorage.setItem('accessToken', at);
        localStorage.setItem('refreshToken', rt);
        // Also seed the zustand persisted auth store so the user object is available
        // immediately on the next navigation without an extra /auth/me round-trip.
      },
      { accessToken, refreshToken },
    );

    // Reload so the app picks up the stored token on its initial render
    await page.reload();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
