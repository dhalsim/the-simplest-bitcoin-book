const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

program
  .option("-l, --language <lang>", "Language code (e.g., turkish)")
  .parse(process.argv);

const options = program.opts();

async function joinPages(language, forPrint) {
  try {
    // Read template
    const templatePath = path.join(__dirname, "joined-template.html");
    let templateContent = await fs.readFile(templatePath, "utf8");

    // Update CSS path
    templateContent = templateContent.replace(
      "REPLACE_WITH_CSS_FILE.css",
      `${language}/styles.css`
    );

    // Create DOM from template
    const dom = new JSDOM(templateContent);
    const document = dom.window.document;
    const body = document.querySelector("body");

    // Add print styles if -p flag is present
    if (forPrint) {
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        .page {
          max-height: 1024px;
          height: 100vh;
        }

        .page:nth-child(odd) {
            margin-left: 175px;
            margin-right: 30px;
        }

        .page:nth-child(even) {
            margin-right: 175px;
            margin-left: 30px;
        }`;
      
        document.head.appendChild(styleElement);
    } else {
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        .header {
          display: none;
        }
      `;
      document.head.appendChild(styleElement);

      const linkElement = document.createElement("link");
      linkElement.rel = "stylesheet";
      linkElement.href = `${language}/styles-mobile.css`;
      document.head.appendChild(linkElement);
    }

    // Hide page navigation
    const pageNumberStyle = document.createElement("style");
    pageNumberStyle.textContent = `
        .nav-container .nav-arrow {
            display: none;
        }

        .nav-container .index-button {
            display: none;
        }

        #page-170 > .nav-container {
          display: none !important;
        }
    `;
    document.head.appendChild(pageNumberStyle);

    // add navigation script to the head
    const navigationScriptContent = await fs.readFile("scripts/one-page-navigation.js", "utf8");

    const navigationScript = document.createElement("script");
    navigationScript.textContent = navigationScriptContent;

    document.head.appendChild(navigationScript);

    // Read all page files
    const pagesDir = path.join(__dirname, language, "pages-html");
    const files = await fs.readdir(pagesDir);
    const htmlFiles = files.filter(file => file.endsWith(".html")).sort();

    // Add each page to the document
    for (let i = 0; i < htmlFiles.length; i++) {
      const file = htmlFiles[i];
      const content = await fs.readFile(path.join(pagesDir, file), "utf8");
      const pageDom = new JSDOM(content);
      const pageElement = pageDom.window.document.querySelector(".page");
      const navContainer = pageElement.querySelector(".nav-container");

      const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
      
      // fix the index href="#page-009" to href="0001.html"
      const indexLinks = pageElement.querySelectorAll("a");
      
      indexLinks.forEach(link => {
        const href = link.getAttribute("href");

        if (href.startsWith("0")) {
          // parse 0001.html to 1
          const pageNumber = parseInt(href.replace(".html", ""), 10);

          // the first 8 numbers should be roman numerals
          if (pageNumber <= 8) {
            const romanNumeral = romanNumerals[pageNumber - 1];
            link.setAttribute("href", `#page-000${romanNumeral}`);
          } else {
            link.setAttribute("href", `#page-${(pageNumber - 8).toString().padStart(3, "0")}`);
          }
        }
      });

      navContainer.querySelector("style")?.remove();
      navContainer.querySelector("script")?.remove();

      // Fix image paths before adding to main document
      const images = pageElement.querySelectorAll("img");

      images.forEach(img => {
        const src = img.getAttribute("src");

        if (
          src &&
          (src.startsWith("../../images/") || src.startsWith("../../drawings/"))
        ) {
          img.setAttribute("src", src.replace("../../", ""));
        } else if (src && src.startsWith("images/")) {
          // this is a language-specific image
          img.setAttribute(
            "src",
            src.replace("images/", `${language}/pages-html/images/`)
          );
        }
      });

      body.appendChild(document.createTextNode("\n"));
      body.appendChild(document.importNode(pageElement, true));

      // Add promotional div every 50 pages in screen mode for Turkish
      if (!forPrint && language === 'turkish' && (i + 10) % 30 === 0) {
        const promoDiv = document.createElement('div');
        
        promoDiv.className = 'print-promo';
        promoDiv.style.cssText = 'max-width: 500px; margin: 0 auto;';
        
        promoDiv.innerHTML = `
          <div style="background: #f7931a; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">Okuduklarınızı beğendiniz mi?</h3>
            <p style="margin: 0 0 15px 0;">
              Bu kitabın basılı versiyonunu kitaplığınızda görmek ister misiniz? 
              Sevdiklerinize Bitcoin'i öğretmek için mükemmel bir hediye!
            </p>
            <a href="order-page-tr.html" 
               target="_blank"
               style="display: inline-block; background: white; color: #f7931a; 
                      padding: 10px 20px; border-radius: 4px; text-decoration: none; 
                      font-weight: bold;">
              Basılı Kopya Sipariş Et
            </a>
          </div>
        `;
        body.appendChild(promoDiv);
      }
    }

    // Get the final HTML
    let finalContent = dom.serialize();

    // Format with prettier
    finalContent = await prettier.format(finalContent, {
      parser: "html",
      tabWidth: 2,
      htmlWhitespaceSensitivity: "ignore"
    });

    // Write output file
    const outputPath = path.join(
      __dirname,
      [
        `${language}-one-page-`, 
        forPrint ? "print" : "screen", 
        ".html"
      ].join("")
    );
    
    await fs.writeFile(outputPath, finalContent, "utf8");

    console.log(`Successfully created ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (!options.language) {
  console.error("Please specify a language using -l or --language");
  process.exit(1);
}

joinPages(options.language, true);
joinPages(options.language, false);
