const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

function numberToRoman(number) {
  const romanMap = {
    1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi', 7: 'vii', 8: 'viii'
  };

  if(romanMap[number]) {
    return romanMap[number];
  }

  return number - 8;
}

async function updateNavigation() {
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
    
    for (let i = 0; i < htmlFiles.length; i++) {
      const filePath = path.join(pagesDir, htmlFiles[i]);
      const content = await fs.readFile(filePath, 'utf8');
      const dom = new JSDOM(content);
      const document = dom.window.document;

      const pageDiv = document.querySelector('div.page');
      const currentPageNumber = Number(pageDiv.getAttribute('data-page-number'));
      const navContainer = document.querySelector('div.nav-container');
      
      // Build navigation HTML
      let navHtml = `
      <div class="flex-row nav-container aic">
        <style>
          .nav-container {
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Avenir Next Cyr';
            font-size: 1em;
            color: #ccc;
            padding: 5px;
          }

          .nav-container .nav-arrow {
            color: #ccc;
            text-decoration: none;
            margin: 0 8px;
            font-size: 1.2em;
          }

          .nav-container .nav-arrow:hover {
            color: #000; /* Slightly darker on hover */
          }

          .nav-container .index-button {
            border: 0;
            font-size: 0.9em;
            color: #ccc;
            background-color: transparent;
            margin-top: 5px;
            cursor: pointer;
          }

          .nav-container .index-button:hover {
            color: #000;
          }

          .nav-container .page-number {
            color: #000;
          }
        </style>`;
      
      // Add previous link if not first page
      if (i > 0) {
        navHtml += `<a href="${(currentPageNumber - 1).toString().padStart(4, '0')}.html" class="nav-arrow">←</a>`;
      } else {
        navHtml += `<a href="#" class="nav-arrow">←</a>`;
      }
      
      // Add page number
      navHtml += `<span class="page-number">${numberToRoman(currentPageNumber)}</span>`;
      
      // Add next link if not last page
      if (i < htmlFiles.length - 1) {
        navHtml += `<a href="${(currentPageNumber + 1).toString().padStart(4, '0')}.html" class="nav-arrow">→</a>`;
      } else {
        navHtml += `<a href="#" class="nav-arrow">→</a>`;
      }

      // Add index button
      navHtml += `
        <a href="0003.html" class="index-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M2.5 12.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </a>
      </div>`;
      
      // Update the page-number div
      navContainer.innerHTML = navHtml;

      // Format with Prettier
      const updatedHtml = await prettier.format(dom.serialize(), {
        parser: "html",
        tabWidth: 2,
        htmlWhitespaceSensitivity: "ignore"
      });

      // Save the updated file
      await fs.writeFile(filePath, updatedHtml, 'utf8');
      console.log(`Updated navigation in ${htmlFiles[i]}`);
    }
    
    console.log('Navigation update completed successfully!');
    
  } catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
  }
}

updateNavigation();