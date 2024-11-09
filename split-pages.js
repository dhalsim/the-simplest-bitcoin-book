const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

program
  .option("-l, --language <lang>", "Language code (e.g., turkish)")
  .parse(process.argv);

const options = program.opts();

if (!options.language) {
  console.error("Please specify a language using -l or --language");
  process.exit(1);
}

// Path to the HTML file
const htmlFilePath = path.join(__dirname, `${options.language}-generated.html`);

// Output directory
const outputDirPath = path.join(__dirname, options.language);
const htmlDirPath = path.join(outputDirPath, "pages-html");

(async () => {
  try {
    // Read the HTML file
    const htmlContent = await fs.readFile(htmlFilePath, "utf8");
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Create the output directory
    await fs.mkdir(htmlDirPath, { recursive: true });

    // Select all page divs
    const pages = document.querySelectorAll("div.page");
    let count = 0;

    for (let page of pages) {
      count++;
      const fileName = `${String(count).padStart(4, "0")}.html`;
      const filePath = path.join(htmlDirPath, fileName);

      // Update image paths
      const images = page.querySelectorAll("img");
      images.forEach(img => {
        const src = img.getAttribute("src");
        if (src && (src.startsWith("images/") || src.startsWith("drawings/"))) {
          img.setAttribute("src", "../../" + src);
        }
      });

      // Create a new HTML document for each page
      const pageHtml = `<!DOCTYPE html>
<html lang="${options.language}">
    <head>
        <meta charset="UTF-8">
        
        <link rel="stylesheet" href="../../avenir-next/stylesheet.css">
        
        <link rel="stylesheet" href="../styles.css">
    </head>
    <body class="font-an">
        ${page.outerHTML}
    </body>
</html>`;

      // Format with Prettier
      const formattedHtml = await prettier.format(pageHtml, {
        parser: "html",
        tabWidth: 2,
        htmlWhitespaceSensitivity: "ignore"
      });

      // Save the file
      await fs.writeFile(filePath, formattedHtml, "utf8");
      console.log(`${fileName} created successfully.`);
    }

    // copy {language}.css into /{language}/styles.css
    const cssFilePath = path.join(__dirname, `${options.language}.css`);
    const cssOutputPath = path.join(outputDirPath, "styles.css");

    await fs.copyFile(cssFilePath, cssOutputPath);

    console.log(`copied ${options.language}.css into ${cssOutputPath}`);

    // Read the CSS file
    let cssContent = await fs.readFile(cssOutputPath, "utf8");

    // Update the image paths in the CSS file
    cssContent = cssContent.replace(/url\("images\//g, 'url("../images/');

    // Save the updated CSS file
    await fs.writeFile(cssOutputPath, cssContent, "utf8");
    console.log(`Updated image paths in ${cssOutputPath}`);
  } catch (err) {
    console.error("An error occurred:", err);
  }
})();
