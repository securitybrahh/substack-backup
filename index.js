require("dotenv").config();

const config = {
  backupFolder: "backups"
};

const fs = require("fs");
const glob = require("glob");
const puppeteer = require("puppeteer");

const generateExport = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  try {
    await page._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: process.cwd()
    });

    await page.goto(process.env.SUBSTACK_URL);

    console.log("Logging into Substack...");

    await page.$eval(".login-button", el => el.click());

    await page.waitFor(5000);

    await page.$eval(".login-option a", el => el.click());

    await page.focus('[name="email"]');
    await page.keyboard.type(process.env.SUBSTACK_EMAIL);

    await page.focus('[name="password"]');
    await page.keyboard.type(process.env.SUBSTACK_PASSWORD);

    await page.$eval("[type='submit']", el => el.click());

    await page.waitFor(5000);

    console.log("Logged in!");

    await page.$eval("#subscribers", el => el.click());

    // the Substack export link weirdly opens in a new tab,
    // which breaks Puppeteers ability to download it directly
    // so had to use this hack: https://github.com/puppeteer/puppeteer/issues/299#issuecomment-508545356
    // sad to report it took me 3 hours to figure this out... -_-
    await page.$eval('.stat-export', el => el.target = '');

    await page.click('.stat-export');

    console.log("Downloading subscribers...");

    await page.waitFor(10000);

    console.log("Done!")

    await page.screenshot({ path: "success.png" });
  } catch (err) {
    console.error("Something went wrong!");
    console.error(err);

    await page.screenshot({ path: "error.png" });
  }
  await browser.close();
};


const main = async function() {
  await generateExport();
  const files = glob.sync("*.csv");
  const filename = files[0];
};

main();
