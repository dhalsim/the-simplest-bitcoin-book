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

async function updatePages() {
  program
    .option("-l, --language <lang>", "Language code (e.g., english)")
    .parse(process.argv);

  const options = program.opts();

  if (!options.language) {
    console.error("Please specify a language using -l or --language");
    process.exit(1);
  }

  const pagesDir = path.join(__dirname, options.language, "pages-html");
  const l18nFilePath = path.join(__dirname, options.language, "l18n.json");
  
  try {
    // Read the l18n file
    const l18n = JSON.parse(await fs.readFile(l18nFilePath, "utf8"));

    // Get all HTML files and sort them
    const files = await fs.readdir(pagesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html')).sort();
    
    for (let i = 0; i < htmlFiles.length; i++) {
      const filePath = path.join(pagesDir, htmlFiles[i]);
      const content = await fs.readFile(filePath, 'utf8');
      const dom = new JSDOM(content);
      const document = dom.window.document;

      // process anchor tags
      const anchorElements = document.querySelectorAll('a');
      
      anchorElements.forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#page-')) {
          
          // Extract the number using regex
          const match = href.match(/#page-(\d+)/);
          
          if (match) {
            const pageNum = parseInt(match[1], 10);
            const newPageNum = pageNum + 8;
            
            // Create the new href with padding
            const newHref = `${newPageNum.toString().padStart(4, '0')}.html`;
            anchor.setAttribute('href', newHref);
          }
        }
      });

      const pageDiv = document.querySelector('div.page');
      
      let componentsContainer = pageDiv.querySelector("div#components-container");
      
      if (!componentsContainer) {
        componentsContainer = document.createElement("div");
        componentsContainer.id = "components-container";
        
        pageDiv.appendChild(document.createTextNode('\n'));
        pageDiv.appendChild(componentsContainer);
      }
      
      const currentPageNumber = Number(pageDiv.getAttribute('data-page-number'));
      const navContainer = pageDiv.querySelector('div.nav-container');

      const nextPageNumber = (currentPageNumber + 1).toString().padStart(4, '0');
      const previousPageNumber = (currentPageNumber - 1).toString().padStart(4, '0');
      
      // Build navigation HTML
      if (navContainer) {
        let navHtml = `
        <div class="flex-row nav-container aic">
          <script>`
          
        if (i > 0) {
          navHtml += `
          document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
              window.location.href = '${previousPageNumber}.html';
            }
          });`;
        }
  
        if (i < htmlFiles.length - 1) {
          navHtml += `
          document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') {
              window.location.href = '${nextPageNumber}.html';
            }
          });`;
        }
  
        navHtml += `</script>
        <style>
          .nav-container {
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 1.4em;
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
            font-size: 2em;
            color: #ccc;
            background-color: transparent;
            margin: -7px 0 0 5px;
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
          navHtml += `<a href="${previousPageNumber}.html" class="nav-arrow">←</a>`;
        }
        
        // Add page number
        navHtml += `<span class="page-number">${numberToRoman(currentPageNumber)}</span>`;

        // Add index button
        navHtml += `
        <a href="0003.html" class="index-button" title="${l18n.toc}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M2.5 12.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </a>`;
          
        // Add next link if not last page
        if (i < htmlFiles.length - 1) {
          navHtml += `<a href="${nextPageNumber}.html" class="nav-arrow">→</a>`;
        }

        navHtml += "</div>";
        
        // Update the page-number div
        navContainer.outerHTML = navHtml;
      }
      
      // Format with Prettier
      const prettiedHtml = await prettier.format(dom.serialize(), {
        parser: "html",
        tabWidth: 2,
        htmlWhitespaceSensitivity: "ignore"
      });

      // Save the updated file
      await fs.writeFile(filePath, prettiedHtml, 'utf8');
      
      console.log(`Updated page DOM in ${htmlFiles[i]}`);
    }
    
    console.log('Page DOM update completed successfully!');
    
  } catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
  }
}

updatePages();
