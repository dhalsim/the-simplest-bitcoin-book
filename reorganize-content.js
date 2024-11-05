const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

async function reorganizeContent() {
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
    const htmlFiles = files.filter(f => f.endsWith('.html')).sort();
    
    for (const file of htmlFiles) {
      const filePath = path.join(pagesDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const dom = new JSDOM(content);
      const document = dom.window.document;

      const contentDiv = document.querySelector('div.content');
      if (!contentDiv) continue;

      let bodyDiv = contentDiv.querySelector('div.body');
      
      // If body div exists, continue
      if (bodyDiv) {
        continue;
      }

      bodyDiv = document.createElement('div');
      bodyDiv.className = 'body';

      // Get header and footer divs
      const headerDiv = contentDiv.querySelector('div.header');
      const footerDiv = contentDiv.querySelector('div.footer');

      // Move all content except header and footer into body
      const children = Array.from(contentDiv.children);
      children.forEach(child => {
        if (!child.classList.contains('header') && 
            !child.classList.contains('footer')) {
          bodyDiv.appendChild(child);
        }
      });

      // Clear content div and rebuild structure
      contentDiv.innerHTML = '';
      
      if (headerDiv) {
        contentDiv.appendChild(headerDiv);
      }
      
      contentDiv.appendChild(bodyDiv);
      
      if (footerDiv) {
        contentDiv.appendChild(footerDiv);
      }

      // Format with Prettier
      const updatedHtml = await prettier.format(dom.serialize(), {
        parser: "html",
        tabWidth: 2,
        htmlWhitespaceSensitivity: "ignore"
      });

      // Save the updated file
      await fs.writeFile(filePath, updatedHtml, 'utf8');
      console.log(`Reorganized content in ${file}`);
    }
    
    console.log('Content reorganization completed successfully!');
    
  } catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
  }
}

reorganizeContent();
