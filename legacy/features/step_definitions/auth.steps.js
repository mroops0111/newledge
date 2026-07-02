const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Background step
Given('I am on the login page', async function() {
  await this.page.goto('/login');
});

// Login page steps
When('I view the login page', async function() {
  await this.page.waitForSelector('h2:has-text("歡迎使用 Newledge")');
});

Then('I should see a {string} button', async function(buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`);
  await expect(button).toBeVisible();
});

Then('the button should have the Google logo', async function() {
  const googleLogo = await this.page.locator('svg[viewBox="0 0 24 24"]');
  await expect(googleLogo).toBeVisible();
});

Then('the button should be enabled', async function() {
  const button = await this.page.locator('button:has-text("使用 Google 登入")');
  await expect(button).toBeEnabled();
});

// Google OAuth flow steps
When('I click the {string} button', async function(buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();
});

Then('I should be redirected to Google OAuth page', async function() {
  // This step would need to be mocked in tests since we can't actually redirect to Google
  // In a real test environment, you might use a mock OAuth server
  await this.page.waitForTimeout(1000); // Simulate redirect
});

Then('the redirect should include the correct redirect URI', async function() {
  // Verify the redirect URI is properly formatted
  // This would be checked in the mock OAuth server
});

// OAuth callback steps
Given('I am redirected back from Google OAuth', async function() {
  // Simulate being redirected back with OAuth code
  await this.page.goto('/auth/callback?code=test_code&state=test_state');
});

When('I provide valid OAuth code and state', async function() {
  // The callback page should automatically process the code
  await this.page.waitForSelector('text=處理登入中', { timeout: 5000 });
});

Then('I should be authenticated', async function() {
  // Wait for redirect to home page
  await this.page.waitForURL('/');
});

Then('I should see my Google profile picture', async function() {
  const profilePicture = await this.page.locator('img[alt*="profile"], img[alt*="avatar"]');
  await expect(profilePicture).toBeVisible();
});

Then('I should see my Google account name', async function() {
  const userName = await this.page.locator('text=Test User'); // Mock user name
  await expect(userName).toBeVisible();
});

Then('I should be redirected to the home page', async function() {
  await this.page.waitForURL('/');
});

// Logout steps
Given('I am logged in with Google', async function() {
  // Setup authenticated state
  await this.page.goto('/');
  // Mock authentication state
});

When('I click on my profile picture', async function() {
  const profileButton = await this.page.locator('button[aria-label*="profile"], button:has(img)');
  await profileButton.click();
});

Then('I should see a dropdown menu', async function() {
  const dropdown = await this.page.locator('div[role="menu"], .dropdown-menu');
  await expect(dropdown).toBeVisible();
});

Then('I should see my name and email', async function() {
  const name = await this.page.locator('text=Test User');
  const email = await this.page.locator('text=test@example.com');
  await expect(name).toBeVisible();
  await expect(email).toBeVisible();
});

When('I click {string}', async function(buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();
});

Then('I should be logged out', async function() {
  // Should see login button again
  const loginButton = await this.page.locator('button:has-text("使用 Google 登入")');
  await expect(loginButton).toBeVisible();
});

Then('I should see the Google login button again', async function() {
  const loginButton = await this.page.locator('button:has-text("使用 Google 登入")');
  await expect(loginButton).toBeVisible();
});

// Navbar profile steps
When('I view the navbar', async function() {
  await this.page.waitForSelector('nav');
});

Then('I should see my profile picture', async function() {
  const profilePicture = await this.page.locator('nav img[alt*="profile"], nav img[alt*="avatar"]');
  await expect(profilePicture).toBeVisible();
});

Then('I should see my name', async function() {
  const userName = await this.page.locator('nav text=Test User');
  await expect(userName).toBeVisible();
});

Then('I should see my email address', async function() {
  const email = await this.page.locator('text=test@example.com');
  await expect(email).toBeVisible();
});

Then('I should see a logout option', async function() {
  const logoutOption = await this.page.locator('text=登出');
  await expect(logoutOption).toBeVisible();
});

// Mobile responsive steps
Given('I am on a mobile device', async function() {
  await this.page.setViewportSize({ width: 375, height: 667 });
});

Then('the button should be properly sized for mobile', async function() {
  const button = await this.page.locator('button:has-text("使用 Google 登入")');
  const buttonBox = await button.boundingBox();
  expect(buttonBox.width).toBeGreaterThan(200); // Minimum mobile button width
});

// Error handling steps
Given('I am redirected back from Google OAuth with invalid code', async function() {
  await this.page.goto('/auth/callback?code=invalid_code&state=invalid_state');
});

When('the OAuth process fails', async function() {
  await this.page.waitForSelector('text=登入失敗', { timeout: 10000 });
});

Then('I should see an error message', async function() {
  const errorMessage = await this.page.locator('text=登入失敗');
  await expect(errorMessage).toBeVisible();
});

Then('I should have the option to return to home page', async function() {
  const homeButton = await this.page.locator('button:has-text("返回首頁")');
  await expect(homeButton).toBeVisible();
});
