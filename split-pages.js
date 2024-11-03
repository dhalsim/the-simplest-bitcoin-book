const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

// Path to the HTML file
const htmlFilePath = path.join(__dirname, 'turkish.html');

// Output directory
const outputDirPath = path.join(__dirname, 'turkish', 'pages-html');

(async () => {
    try {
        // Read the HTML file
        const htmlContent = await fs.readFile(htmlFilePath, 'utf8');
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        // Create the output directory
        await fs.mkdir(outputDirPath, { recursive: true });

        // Select all page divs
        const pages = document.querySelectorAll('div.page');
        let count = 0;

        for (let page of pages) {
            count++;
            const fileName = `${String(count).padStart(4, '0')}.html`;
            const filePath = path.join(outputDirPath, fileName);

            // Update image paths
            const images = page.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                if (src && (src.startsWith('images/') || src.startsWith('drawings/'))) {
                    img.setAttribute('src', '../../' + src);
                }
            });

            // Create a new HTML document for each page
            const pageHtml = `<!DOCTYPE html>
<html lang="tr">
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
            await fs.writeFile(filePath, formattedHtml, 'utf8');
            console.log(`${fileName} created successfully.`);
        }

        // copy turkish.css into /turkish/styles.css
        const cssFilePath = path.join(__dirname, 'turkish', 'styles.css');
        
        await fs.copyFile(cssFilePath, path.join(outputDirPath, 'styles.css'));
        
        console.log('copied turkish.css into turkish/styles.css');
    } catch (err) {
        console.error("An error occurred:", err);
    }
})();