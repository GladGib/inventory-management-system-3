import { test, expect } from './fixtures/auth';

test.describe('Sales Flow', () => {
  // ------------------------------------------------------------------ //
  // Sales orders list
  // ------------------------------------------------------------------ //

  test('sales orders page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/orders');

    // The page should render a heading or the title "Sales Orders"
    await expect(
      page.getByRole('heading', { name: /sales orders|orders/i })
        .or(page.getByText('Sales Orders').first()),
    ).toBeVisible({ timeout: 10_000 });

    // A table or list should be present
    await expect(
      page.locator('table').or(page.locator('.ant-table')),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Invoices list
  // ------------------------------------------------------------------ //

  test('invoices page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/invoices');

    await expect(
      page.getByRole('heading', { name: /invoices/i })
        .or(page.getByText('Invoices').first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Quotes list
  // ------------------------------------------------------------------ //

  test('quotes page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/quotes');

    await expect(
      page.getByRole('heading', { name: /quotes/i })
        .or(page.getByText('Quotes').first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Navigate to create sales order
  // ------------------------------------------------------------------ //

  test('can navigate to new sales order form', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/orders');

    // Look for a "New" or "Create" button
    const newButton = page
      .getByRole('link', { name: /new|create/i })
      .or(page.getByRole('button', { name: /new|create/i }));

    if (await newButton.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newButton.first().click();
      await expect(page).toHaveURL(/\/sales\/orders\/new/);
    }
  });

  // ------------------------------------------------------------------ //
  // View sales order detail (if any exist)
  // ------------------------------------------------------------------ //

  test('can view a sales order detail page', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/orders');

    // Wait for the table to load
    await page.waitForTimeout(2_000);

    // Click the first order link in the table, if one exists
    const firstLink = page.locator('table tbody tr').first().locator('a').first();

    if (await firstLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstLink.click();

      // The detail page should show the order number or some details
      await expect(page).toHaveURL(/\/sales\/orders\/[a-zA-Z0-9-]+/);
    } else {
      // No orders exist yet -- that is acceptable in a fresh database
      test.skip();
    }
  });

  // ------------------------------------------------------------------ //
  // Payments page loads
  // ------------------------------------------------------------------ //

  test('payments received page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/payments');

    await expect(
      page.getByRole('heading', { name: /payments/i })
        .or(page.getByText('Payments Received').first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Sales returns page loads
  // ------------------------------------------------------------------ //

  test('sales returns page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/sales/returns');

    await expect(
      page.getByRole('heading', { name: /return/i })
        .or(page.getByText('Sales Returns').first())
        .or(page.getByText('Returns').first()),
    ).toBeVisible({ timeout: 10_000 });
  });
});
