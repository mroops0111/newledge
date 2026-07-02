const { setWorldConstructor, World, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

// Set default timeout to 30 seconds
setDefaultTimeout(30000);

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.browser = null;
    this.context = null;
    this.page = null;
    this.initialItemCount = 0;
    this.baseUrl = 'http://localhost:3000';
  }

  async init() {
    try {
      this.browser = await chromium.launch({ 
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      });
    } catch (error) {
      // Fallback to default if Chrome not found
      console.log('Chrome not found, trying default browser...');
      this.browser = await chromium.launch({ headless: true });
    }
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async destroy() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
}

setWorldConstructor(CustomWorld); 