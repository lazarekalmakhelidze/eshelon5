import { test, expect } from '@playwright/test';

test.describe('PreExamV2 UX/UI Testing', () => {
  test('Home page should have correct title and load basic UI', async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/');

    // Check if the title matches what we set in layout.js
    await expect(page).toHaveTitle(/PreExam!/);
  });

  test('Navbar should contain the dartboard logo', async ({ page }) => {
    await page.goto('/');

    // Check if the dartboard emoji exists in the document
    const dartboard = page.locator('text="🎯"');
    await expect(dartboard).toBeVisible();
  });

  test('Exam taking page should have interactive buttons with hover animations', async ({ page }) => {
    // Navigate to quick exam
    await page.goto('/exam?quick=true');

    // Check if the font-size button exists and test its hover state
    const fontButton = page.locator('button[title="ปรับขนาดตัวอักษร"]');
    await expect(fontButton).toBeVisible();

    // Hover over the font button to trigger transition
    await fontButton.hover();
    
    // Wait a brief moment for the CSS transition to apply
    await page.waitForTimeout(200);

    // Check if the 4 choice buttons are rendered
    const choices = page.locator('.grid.grid-cols-1.md\\:grid-cols-2 button');
    await expect(choices).toHaveCount(4);

    // Test hover animation on the first choice button
    const firstChoice = choices.nth(0);
    await firstChoice.hover();
    await page.waitForTimeout(200); // wait for hover animation
    
    // Check if the button remains visible and interactive after hover
    await expect(firstChoice).toBeVisible();
    await expect(firstChoice).toBeEnabled();
  });
});
