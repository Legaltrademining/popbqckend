const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const downloadsDir = path.resolve(__dirname, 'downloads');
fs.ensureDirSync(downloadsDir);

async function downloadFromInstagram(url, index) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('script[type="application/ld+json"]', { timeout: 10000 });

    const jsonData = await page.$$eval('script[type="application/ld+json"]', scripts => {
      return scripts
        .map(script => {
          try {
            return JSON.parse(script.innerText);
          } catch {
            return null;
          }
        })
        .find(data => data && (data['@type'] === 'ImageObject' || data['@type'] === 'VideoObject'));
    });

    if (!jsonData || !jsonData.contentUrl) throw new Error('Media URL not found.');

    const mediaUrl = jsonData.contentUrl;
    const caption = jsonData.caption || 'No caption';
    const ext = mediaUrl.includes('.mp4') ? '.mp4' : '.jpg';
    const base = `post_${Date.now()}_${index}`;

    const mediaPath = path.join(downloadsDir, `${base}${ext}`);
    const captionPath = path.join(downloadsDir, `${base}.txt`);

    fs.writeFileSync(captionPath, caption, 'utf-8');

    const writer = fs.createWriteStream(mediaPath);
    const response = await axios({ url: mediaUrl, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return {
      url,
      media: `/downloads/${path.basename(mediaPath)}`,
      caption: `/downloads/${path.basename(captionPath)}`
    };
  } catch (error) {
    return { url, error: error.message };
  } finally {
    await browser.close();
  }
}

module.exports = { downloadFromInstagram };
