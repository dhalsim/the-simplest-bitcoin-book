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

// Function to convert Roman numeral to number
function romanToNumber(roman) {
  const romanMap = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8
  };
  
  if(romanMap[roman]) {
    return romanMap[roman];
  }

  return roman;
}

// Function to get display number (handles both roman and regular numbers)
function getDisplayNumber(pageAttr) {
  // Remove leading zeros
  const cleanPageNumber = pageAttr.replace('000', '');
  
  return romanToNumber(cleanPageNumber);
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
      const pageNumberDiv = document.querySelector('div.page-number');
      
      // Build navigation HTML
      let navHtml = '';
      
      // Add previous link if not first page
      if (i > 0) {
        navHtml += `<a class="page-navigation" href="${(currentPageNumber - 1).toString().padStart(4, '0')}.html">← 
        ${numberToRoman(currentPageNumber - 1)}</a>`;
      }
      
      // Add page number if not first two pages
      if(currentPageNumber > 2) {
        navHtml += numberToRoman(currentPageNumber);
      }
      
      // Add next link if not last page
      if (i < htmlFiles.length - 1) {
        navHtml += `<a class="page-navigation" href="${(currentPageNumber + 1).toString().padStart(4, '0')}.html">${numberToRoman(currentPageNumber + 1)} →</a>`;
      }
      
      // Update the page-number div
      pageNumberDiv.innerHTML = navHtml;

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
