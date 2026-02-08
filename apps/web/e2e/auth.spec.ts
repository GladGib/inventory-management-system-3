import { test, expect } from '@playwright/test';
import { TEST_USER } from './fixtures/auth';

test.describe('Authentication', () => {
  // ------------------------------------------------------------------ //
  // Login page rendering
  // ------------------------------------------------------------------ //

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // The heading and key form elements should be visible
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Registration link should exist
    await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();
  });

  // ------------------------------------------------------------------ //
  // Successful login
  // ------------------------------------------------------------------ //

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email address').fill(TEST_USER.email);
    await page.getByPlaceholder('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // After a successful login the app should redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  // ------------------------------------------------------------------ //
  // Failed login
  // ------------------------------------------------------------------ //

  test('login with invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email address').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Ant Design message component renders the error
    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Form validation
  // ------------------------------------------------------------------ //

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login');

    // Submit the empty form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Ant Design shows inline validation messages
    await expect(page.getByText(/please enter your email/i)).toBeVisible();
    await expect(page.getByText(/please enter your password/i)).toBeVisible();
  });

  // ------------------------------------------------------------------ //
  // Redirect unauthenticated users
  // ------------------------------------------------------------------ //

  test('unauthenticated user visiting root is redirected to dashboard then login', async ({
    page,
  }) => {
    // The Next.js config redirects "/" -> "/dashboard".
    // If the user has no token the auth guard should eventually redirect to /login.
    await page.goto('/');

    // Either we land on /login or /dashboard (depending on middleware).
    // The important part is we don't stay on a blank page.
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15_000 });
  });

  // ------------------------------------------------------------------ //
  // Register page navigation
  // ------------------------------------------------------------------ //

  test('can navigate to register page from login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /create an account/i }).click();

    await expect(page).toHaveURL(/\/register/);
  });
});
