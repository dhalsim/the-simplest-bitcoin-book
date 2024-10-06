// TODO: WIP
const fs = require("fs").promises;
const path = require('path');
const crypto = require('crypto');

const inputFilePath = path.join(__dirname, 'tsbbew.html');

const fontsDirPath = path.join(__dirname, 'fonts');

(async () => {
  try {
    await fs.mkdir(fontsDirPath, { recursive: true });

    let htmlContent = await fs.readFile(inputFilePath, 'utf8');
    
    const fonts = [];

    let match;

    const regex = /src:url\('data:application\/font-woff;base64,(.*?)'\)format\("woff"\);/g;

    while ((match = regex.exec(htmlContent)) !== null) {
      const md5sum = crypto.createHash('md5');
      const fileName = `${md5sum.update(match[1]).digest('hex')}.woff`;
      const filePath = path.join(fontsDirPath, fileName);

      htmlContent = htmlContent.replace(match[1], fileName);

      await fs.writeFile(filePath, match[1], 'base64');
    }

    await fs.writeFile(inputFilePath + ".new", htmlContent, 'utf8');
  } catch (error) {
    console.error(error);
  }
})();
