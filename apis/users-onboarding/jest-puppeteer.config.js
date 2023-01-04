// Puppeteer config
// See: https://github.com/smooth-code/jest-puppeteer#jest-puppeteerconfigjs
module.exports = {
  /** @type {import('puppeteer').LaunchOptions} */
  launch: {
    dumpio: false,
    headless: process.env.HEADLESS !== "false",
    product: "chrome",
  },
  browserContext: "default",
};
