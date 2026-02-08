import { test, expect } from './fixtures/auth';

test.describe('Navigation', () => {
  // ------------------------------------------------------------------ //
  // Sidebar renders all top-level menu items
  // ------------------------------------------------------------------ //

  test('sidebar contains all primary navigation links', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/dashboard');

    // The sidebar uses Ant Design Menu with role="menu". Each top-level
    // menu item is rendered inside the <aside> sider.
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Check for the main menu items visible in the sidebar
    const expectedLabels = [
      'Dashboard',
      'Items',
      'Inventory',
      'Sales',
      'Purchases',
      'Contacts',
      'Reports',
      'Settings',
    ];

    for (const label of expectedLabels) {
      await expect(
        sidebar.getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  // ------------------------------------------------------------------ //
  // Dashboard navigation
  // ------------------------------------------------------------------ //

  test('clicking Dashboard navigates to /dashboard', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/items');
    await page.waitForURL('**/items');

    const sidebar = page.locator('aside').first();
    await sidebar.getByText('Dashboard', { exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ------------------------------------------------------------------ //
  // Items sub-menu navigation
  // ------------------------------------------------------------------ //

  test('Items sub-menu expands and links work', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();

    // Click the Items menu item to expand
    await sidebar.getByText('Items', { exact: true }).first().click();

    // Sub-items should become visible
    await expect(sidebar.getByText('All Items')).toBeVisible();
    await expect(sidebar.getByText('Item Groups')).toBeVisible();
    await expect(sidebar.getByText('Categories')).toBeVisible();

    // Navigate to All Items
    await sidebar.getByText('All Items').click();
    await expect(page).toHaveURL(/\/items/);
  });

  // ------------------------------------------------------------------ //
  // Sales sub-menu navigation
  // ------------------------------------------------------------------ //

  test('Sales sub-menu expands and links work', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();

    await sidebar.getByText('Sales', { exact: true }).first().click();

    await expect(sidebar.getByText('Sales Orders')).toBeVisible();
    await expect(sidebar.getByText('Invoices')).toBeVisible();
    await expect(sidebar.getByText('Payments Received')).toBeVisible();

    await sidebar.getByText('Sales Orders').click();
    await expect(page).toHaveURL(/\/sales\/orders/);
  });

  // ------------------------------------------------------------------ //
  // Contacts sub-menu navigation
  // ------------------------------------------------------------------ //

  test('Contacts sub-menu expands and links work', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();

    await sidebar.getByText('Contacts', { exact: true }).first().click();

    await expect(sidebar.getByText('Customers')).toBeVisible();
    await expect(sidebar.getByText('Vendors')).toBeVisible();

    await sidebar.getByText('Customers').click();
    await expect(page).toHaveURL(/\/contacts\/customers/);
  });

  // ------------------------------------------------------------------ //
  // All main routes are accessible (smoke test)
  // ------------------------------------------------------------------ //

  test('main routes load without errors', async ({ authenticatedPage: page }) => {
    const routes = [
      '/dashboard',
      '/items',
      '/items/categories',
      '/items/groups',
      '/inventory',
      '/sales/orders',
      '/sales/invoices',
      '/sales/quotes',
      '/sales/payments',
      '/purchases/orders',
      '/contacts/customers',
      '/contacts/vendors',
      '/reports',
      '/settings',
    ];

    for (const route of routes) {
      const response = await page.goto(route);

      // The page should not return a server error
      expect(
        response?.status(),
        `Route ${route} returned status ${response?.status()}`,
      ).toBeLessThan(500);

      // Wait a short moment for client-side hydration
      await page.waitForTimeout(500);

      // No unhandled errors should be visible on the page
      const errorBoundary = page.getByText(/something went wrong/i);
      const isErrorVisible = await errorBoundary.isVisible().catch(() => false);
      expect(isErrorVisible, `Route ${route} rendered an error boundary`).toBe(false);
    }
  });

  // ------------------------------------------------------------------ //
  // Logo / brand displays
  // ------------------------------------------------------------------ //

  test('sidebar displays IMS branding', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();

    // The sidebar shows "IMS Pro" when expanded
    await expect(
      sidebar.getByText('IMS Pro').or(sidebar.getByText('IMS')),
    ).toBeVisible();
  });

  // ------------------------------------------------------------------ //
  // Sidebar collapse toggle
  // ------------------------------------------------------------------ //

  test('sidebar can be collapsed and expanded', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Ant Design Sider renders a collapse trigger at the bottom
    const collapseTrigger = sidebar.locator('.ant-layout-sider-trigger').first();

    if (await collapseTrigger.isVisible().catch(() => false)) {
      // Collapse
      await collapseTrigger.click();
      await page.waitForTimeout(300);

      // When collapsed the width narrows to 80px
      const collapsed = await sidebar.evaluate(
        (el) => el.classList.contains('ant-layout-sider-collapsed'),
      );
      expect(collapsed).toBe(true);

      // Expand again
      await collapseTrigger.click();
      await page.waitForTimeout(300);

      const expandedAgain = await sidebar.evaluate(
        (el) => !el.classList.contains('ant-layout-sider-collapsed'),
      );
      expect(expandedAgain).toBe(true);
    }
  });
});
