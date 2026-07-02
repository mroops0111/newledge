const { Before, After } = require('@cucumber/cucumber');

Before(async function () {
  await this.init();
  // Set base URL for the page
  if (this.page) {
    this.page.setDefaultTimeout(30000);
  }
});

After(async function () {
  await this.destroy();
}); 