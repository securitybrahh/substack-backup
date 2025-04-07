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

    // Find the Settings button using XPath
    let button = await page.$x("//*[@id="publish-home"]/div[1]/div/div[1]/div[2]/div/div[1]/div[8]/a/span");
    await button.click();

    
    // launch export creation button using XPath
    let button = await page.$x("//*[@id="import-export-settings"]/div/div[3]/div[3]/button");
    await button.click();

    // Wait for export to get ready
    await page.waitFor(60000);


    // Click download
    let button = await page.$x("//*[@id="import-export-settings"]/div/div[3]/table/tr[2]/td[2]/button");
    await button.click();

    console.log("Done!")

    await page.screenshot({ path: "success.png" });
  } catch (err) {
    console.error("Something went wrong!");
    console.error(err);

    await page.screenshot({ path: "error.png" });
  }
  await browser.close();
};

const uploadToBucket = async filename => {
   try {
     const fileContent = fs.readFileSync(filename);
 
     const params = {
       Bucket: process.env.BUCKET_NAME,
       Key: `${config.backupFolder}/${filename}`,
       Body: fileContent
     };
 
     const data = await BUCKET.upload(params).promise();
     console.log(`Successfully backed up Substack data to ${data.Location}`);
   } catch (err) {
     console.error("Something went wrong while uploading");
     console.error(err);
   }
 };


const main = async function() {
  await generateExport();
  const files = glob.sync("*.csv");
  const Zipfile = glob.sync("*.zip");
  const filename = files[0];
  if (!filename) {
    throw new Error("Couldn't find a file to upload, aborting");
  }
  console.log(`Uploading ${filename} to Bucket`);
  await uploadToBucket(filename);
};

main();
