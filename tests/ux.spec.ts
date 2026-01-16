import { test, expect } from '@playwright/test';

test.describe('Maribeda Search & UX Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5174/');
    });

    test('Adaptive Header Animation', async ({ page }) => {
        // 1. Initial State: Large centered logo
        const header = page.locator('.app-header');
        const logo = page.locator('.app-logo');
        await expect(header).not.toHaveClass(/scrolled/);

        // 2. Scroll down
        await page.mouse.wheel(0, 500);
        // Wait for scroll event to trigger class update
        await expect(header).toHaveClass(/scrolled/);

        // 3. Scroll up - should return to normal
        await page.mouse.wheel(0, -500);
        await expect(header).not.toHaveClass(/scrolled/);
    });

    test('Edit Mode UX', async ({ page }) => {
        // Add a note first to ensure we have something to edit
        await page.getByPlaceholder("What's on your mind?").fill('Content for edit test');
        await page.getByRole('button', { name: 'Save' }).click();

        // Verify note is added
        const noteCard = page.locator('.note-card').first();
        await expect(noteCard).toContainText('Content for edit test');

        // Click Edit
        await noteCard.getByRole('button', { name: 'Edit' }).click();

        // Verify Header is forced into 'scrolled' (compact) mode
        // Even though we are at the top, editingNote state should force it
        const header = page.locator('.app-header');
        await expect(header).toHaveClass(/scrolled/);

        // Verify Textarea is expanded (implied by row check or visual height)
        const textarea = page.locator('.note-input-content');
        await expect(textarea).toHaveAttribute('rows', '15');

        // Cancel edit
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Verify we exited edit mode (Button says 'Save' not 'Update')
        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

        // Ensure we are at the top before checking header expansion
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(header).not.toHaveClass(/scrolled/);

        await expect(textarea).toHaveAttribute('rows', '3');
    });

    test('Search Functionality', async ({ page }) => {
        // Add unique notes
        const uniqueId = Date.now();
        await page.getByPlaceholder("What's on your mind?").fill(`Unicorn ${uniqueId}`);
        await page.getByRole('button', { name: 'Save' }).click();

        await page.getByPlaceholder("What's on your mind?").fill(`Dragon ${uniqueId}`);
        await page.getByRole('button', { name: 'Save' }).click();

        // Search for Unicorn
        const searchInput = page.getByPlaceholder('Search your notes...');
        await searchInput.fill('Unicorn');

        // Wait for debounce and effect
        await expect(page.locator('.note-card')).toHaveCount(1);
        await expect(page.locator('.note-card')).toContainText(`Unicorn ${uniqueId}`);

        // Clear search
        await searchInput.clear();
        await expect(page.getByText(`Dragon ${uniqueId}`)).toBeVisible();
    });
});
