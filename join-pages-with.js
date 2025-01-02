const { program } = require("commander");
const { JSDOM } = require("jsdom");
const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");

program
  .option("-l, --language <lang>", "Primary language code (e.g., turkish)")
  .option("-w, --with <lang>", "Secondary language to display alongside")
  .parse(process.argv);

const options = program.opts();

async function joinPagesWithComparison(primaryLang, secondaryLang) {
  try {
    // Read template
    const templatePath = path.join(__dirname, "joined-template.html");
    let templateContent = await fs.readFile(templatePath, "utf8");

    // Update CSS path for primary language
    templateContent = templateContent.replace(
      "REPLACE_WITH_CSS_FILE.css",
      `${primaryLang}/styles.css`
    );

    // Create DOM from template
    const dom = new JSDOM(templateContent);
    const document = dom.window.document;
    const body = document.querySelector("body");

    // Add comparison styles
    const comparisonStyles = document.createElement("style");
    comparisonStyles.textContent = `
      .page-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        justify-content: center;
      }
      
      .page-wrapper {
        flex: 1;
        min-width: 300px;
      }
      
      .page-wrapper .page {
        margin: 0 auto;
      }
      
      .secondary-page {
        opacity: 0.8;
      }
      
      @media (max-width: 999px) {
        .page-wrapper {
          flex-basis: 100%;
        }
      }
      
      @media (min-width: 1000px) {
        .page-wrapper {
          flex-basis: calc(50% - 10px);
        }
      }

      .header {
        display: none;
      }
    `;
    document.head.appendChild(comparisonStyles);

    // Add mobile styles
    const linkElement = document.createElement("link");
    linkElement.rel = "stylesheet";
    linkElement.href = `${primaryLang}/styles-mobile.css`;
    document.head.appendChild(linkElement);

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

    // Add navigation script
    const navigationScriptContent = await fs.readFile(
      "scripts/one-page-navigation.js",
      "utf8"
    );
    
    const navigationScript = document.createElement("script");
    navigationScript.textContent = navigationScriptContent;
    document.head.appendChild(navigationScript);

    // Read pages from both languages
    const primaryPagesDir = path.join(__dirname, primaryLang, "pages-html");
    const secondaryPagesDir = path.join(__dirname, secondaryLang, "pages-html");

    const primaryFiles = await fs.readdir(primaryPagesDir);
    const secondaryFiles = await fs.readdir(secondaryPagesDir);

    const primaryHtmlFiles = primaryFiles.filter(file => file.endsWith(".html")).sort();
    const secondaryHtmlFiles = secondaryFiles.filter(file => file.endsWith(".html")).sort();

    // Create container for side-by-side pages
    const pageContainer = document.createElement("div");
    pageContainer.className = "page-container";
    body.appendChild(pageContainer);

    // Process and add pages
    for (let i = 0; i < primaryHtmlFiles.length; i++) {
      // Add secondary page first if available
      if (i < secondaryHtmlFiles.length) {
        const secondaryFile = secondaryHtmlFiles[i];
        const secondaryWrapper = document.createElement("div");
        secondaryWrapper.className = "page-wrapper secondary-page";

        const secondaryContent = await fs.readFile(
          path.join(secondaryPagesDir, secondaryFile),
          "utf8"
        );
        const secondaryDom = new JSDOM(secondaryContent);
        const secondaryElement = secondaryDom.window.document.querySelector(".page");

        processPage(secondaryElement, secondaryLang);
        secondaryWrapper.appendChild(document.importNode(secondaryElement, true));
        pageContainer.appendChild(secondaryWrapper);
      }

      // Add primary page
      const primaryFile = primaryHtmlFiles[i];
      const primaryWrapper = document.createElement("div");
      primaryWrapper.className = "page-wrapper primary-page";

      const primaryContent = await fs.readFile(
        path.join(primaryPagesDir, primaryFile),
        "utf8"
      );
      const primaryDom = new JSDOM(primaryContent);
      const primaryElement = primaryDom.window.document.querySelector(".page");

      processPage(primaryElement, primaryLang);
      primaryWrapper.appendChild(document.importNode(primaryElement, true));
      pageContainer.appendChild(primaryWrapper);
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
      `${primaryLang}-one-page-with-${secondaryLang}-screen.html`
    );

    await fs.writeFile(outputPath, finalContent, "utf8");
    console.log(`Successfully created ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function processPage(pageElement, language) {
  const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];

  // Remove unnecessary elements
  pageElement.querySelector(".nav-container style")?.remove();
  pageElement.querySelector(".nav-container script")?.remove();

  // Fix index links
  const indexLinks = pageElement.querySelectorAll("a");
  indexLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href?.startsWith("0")) {
      const pageNumber = parseInt(href.replace(".html", ""), 10);
      if (pageNumber <= 8) {
        link.setAttribute("href", `#page-000${romanNumerals[pageNumber - 1]}`);
      } else {
        link.setAttribute("href", `#page-${(pageNumber - 8).toString().padStart(3, "0")}`);
      }
    }
  });

  // Fix image paths
  const images = pageElement.querySelectorAll("img");
  images.forEach(img => {
    const src = img.getAttribute("src");
    if (src && (src.startsWith("../../images/") || src.startsWith("../../drawings/"))) {
      img.setAttribute("src", src.replace("../../", ""));
    } else if (src && src.startsWith("images/")) {
      img.setAttribute("src", src.replace("images/", `${language}/pages-html/images/`));
    }
  });
}

// Validate required options
if (!options.language) {
  console.error("Please specify a primary language using -l or --language");
  process.exit(1);
}

if (!options.with) {
  console.error("Please specify a secondary language using -w or --with");
  process.exit(1);
}

// Run the script
joinPagesWithComparison(options.language, options.with); 