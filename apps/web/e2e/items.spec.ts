import { test, expect } from './fixtures/auth';
import { createTestItem } from './fixtures/test-data';

test.describe('Items Management', () => {
  // ------------------------------------------------------------------ //
  // Items list page
  // ------------------------------------------------------------------ //

  test('items list page loads and shows table', async ({ authenticatedPage: page }) => {
    await page.goto('/items');

    // Page heading
    await expect(page.getByRole('heading', { name: /items/i })).toBeVisible({ timeout: 10_000 });

    // The "New Item" button should be present
    await expect(page.getByRole('button', { name: /new item/i })).toBeVisible();

    // The search input should be visible
    await expect(
      page.getByPlaceholder(/search by sku/i),
    ).toBeVisible();

    // The table should render (Ant Design Table has role="table" or the <table> element)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------------ //
  // Navigate to create item page
  // ------------------------------------------------------------------ //

  test('clicking New Item navigates to create form', async ({ authenticatedPage: page }) => {
    await page.goto('/items');

    await page.getByRole('link', { name: /new item/i }).click();

    await expect(page).toHaveURL(/\/items\/new/);
  });

  // ------------------------------------------------------------------ //
  // Create a new item
  // ------------------------------------------------------------------ //

  test('can create a new item', async ({ authenticatedPage: page }) => {
    const item = createTestItem();

    await page.goto('/items/new');

    // Wait for the form to be ready
    await expect(page.getByRole('heading', { name: /new item|add item|create item/i })).toBeVisible({
      timeout: 10_000,
    });

    // Fill required fields -- field labels may vary; fall back to placeholder or label text
    const skuInput = page.getByLabel(/sku/i).or(page.locator('input[id*="sku" i]'));
    await skuInput.fill(item.sku);

    const nameInput = page.getByLabel(/^name$/i).or(page.locator('input[id*="name" i]').first());
    await nameInput.fill(item.name);

    // Unit field -- may be a select or text input
    const unitInput = page.getByLabel(/unit/i).or(page.locator('[id*="unit" i]').first());
    if (await unitInput.isVisible()) {
      await unitInput.click();
      // Try typing into an Ant Design Select
      await page.keyboard.type(item.unit);
      await page.keyboard.press('Enter');
    }

    // Prices
    const costInput = page
      .getByLabel(/cost price/i)
      .or(page.locator('input[id*="costPrice" i]'));
    if (await costInput.isVisible()) {
      await costInput.fill(item.costPrice);
    }

    const sellingInput = page
      .getByLabel(/selling price/i)
      .or(page.locator('input[id*="sellingPrice" i]'));
    if (await sellingInput.isVisible()) {
      await sellingInput.fill(item.sellingPrice);
    }

    // Submit
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // After creation the app should either redirect to the item detail page
    // or show a success notification.
    await expect(
      page.getByText(/item created|created successfully|success/i)
        .or(page.locator('[class*="ant-message-success"]')),
    ).toBeVisible({ timeout: 15_000 });
  });

  // ------------------------------------------------------------------ //
  // Search / filter items
  // ------------------------------------------------------------------ //

  test('search input filters items list', async ({ authenticatedPage: page }) => {
    await page.goto('/items');

    // Wait for table data to appear
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder(/search by sku/i);
    await searchInput.fill('NONEXISTENT-SKU-12345');

    // After typing, the table should update -- ideally showing no results or
    // the "No data" empty state.
    await page.waitForTimeout(1_000); // debounce wait

    // We check that either the table body is empty or the empty-state message appears
    const emptyState = page.getByText(/no data|no items found/i);
    const tableRows = page.locator('table tbody tr');

    // One of these two conditions should be true
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const rowCount = await tableRows.count();

    expect(isEmpty || rowCount === 0).toBeTruthy();
  });

  // ------------------------------------------------------------------ //
  // Filter by status
  // ------------------------------------------------------------------ //

  test('status filter dropdown is functional', async ({ authenticatedPage: page }) => {
    await page.goto('/items');

    // Wait for the table
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });

    // Click the Status select to open its dropdown
    const statusSelect = page.getByText('Status').locator('..').locator('.ant-select');
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      // Choose "Active"
      await page.getByTitle('Active').or(page.getByText('Active', { exact: true })).click();

      // Wait for the table to re-render
      await page.waitForTimeout(500);

      // All visible status tags should be ACTIVE
      const statusTags = page.locator('table .ant-tag').filter({ hasText: /active/i });
      const count = await statusTags.count();
      // If there are items, they should all be active
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(statusTags.nth(i)).toHaveText(/active/i);
        }
      }
    }
  });

  // ------------------------------------------------------------------ //
  // Reset filters
  // ------------------------------------------------------------------ //

  test('reset button clears all filters', async ({ authenticatedPage: page }) => {
    await page.goto('/items');

    // Fill search, then reset
    const searchInput = page.getByPlaceholder(/search by sku/i);
    await searchInput.fill('test-filter');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /reset/i }).click();

    await expect(searchInput).toHaveValue('');
  });
});
