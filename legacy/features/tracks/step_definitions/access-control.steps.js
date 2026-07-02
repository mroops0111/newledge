const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

When('user navigates to the tracks page directly', async function () {
  await this.page.goto('http://localhost:3000/tracks');
});

Then('user should be redirected to the home page', async function () {
  await this.page.waitForURL('**/');
  const url = this.page.url();
  expect(url.endsWith('/')).toBeTruthy();
});

Given('user is on the home page', async function () {
  await this.page.goto('http://localhost:3000/');
});

Then('user should not see a navigation link to tracks', async function () {
  const navLink = this.page.locator('a[href="/tracks"]');
  await expect(navLink).toHaveCount(0);
});


