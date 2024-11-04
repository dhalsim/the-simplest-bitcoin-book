const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

async function addPageNumbers() {
  program
    .option("-l, --language <lang>", "Language code (e.g., english)")
    .parse(process.argv);

  const options = program.opts();

  if (!options.language) {
    console.error("Please specify a language using -l or --language");
    process.exit(1);
  }

  const pagesDir = path.join(__dirname, options.language, "pages-html");
  
  try {
    // Get all HTML files and sort them
    const files = await fs.readdir(pagesDir);
    const htmlFiles = files
      .filter(f => f.endsWith('.html'))
      .sort();
    
    // Process each file sequentially
    for (let i = 0; i < htmlFiles.length; i++) {
      const pageNumber = i + 1; // Start numbering from 1
      const filePath = path.join(pagesDir, htmlFiles[i]);
      const content = await fs.readFile(filePath, 'utf8');
      const dom = new JSDOM(content);
      const document = dom.window.document;

      // Find the page div and add the new attribute
      const pageDiv = document.querySelector('div.page');
      if (pageDiv) {
        pageDiv.setAttribute('data-page-number', pageNumber.toString());
      }

      // Format with Prettier
      const updatedHtml = await prettier.format(dom.serialize(), {
        parser: "html",
        tabWidth: 2,
        htmlWhitespaceSensitivity: "ignore"
      });

      // Save the updated file
      await fs.writeFile(filePath, updatedHtml, 'utf8');
      console.log(`Added page number ${pageNumber} to ${htmlFiles[i]}`);
    }
    
    console.log('Page numbering completed successfully!');
    
  } catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
  }
}

addPageNumbers();
