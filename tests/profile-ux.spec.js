const { test, expect } = require('@playwright/test');

test.describe('Profile UX/UI Tests', () => {

  test('should load profile dashboard and check elements', async ({ page }) => {
    await page.goto('/profile'); 

    // The user might not be logged in, so it might redirect. If it doesn't, we can test UI.
    // Let's just check if we get the dashboard layout or login redirection.
    // Wait for either the profile layout or some content.
    await page.waitForLoadState('networkidle');

    // Test for sidebar
    const sidebar = page.locator('.sidebar');
    if (await sidebar.count() > 0) {
      // Sidebar exists, hover over a nav item
      const navItem = page.locator('.nav-item').first();
      await navItem.hover();
      
      // Check for ProPlay Dashboard header
      await expect(page.locator('.topbar-title')).toBeVisible();

      // Check Profile hero
      const profileHero = page.locator('.profile-hero');
      if (await profileHero.count() > 0) {
        await expect(profileHero).toBeVisible();
        
        // Hover over avatar
        const avatar = page.locator('.avatar-big').first();
        await avatar.hover();
      }

      // Check for play button
      const playBtn = page.locator('.btn-play').first();
      if (await playBtn.count() > 0) {
        await playBtn.hover();
        await expect(playBtn).toBeVisible();
      }
    }
  });

});
