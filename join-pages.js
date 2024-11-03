const { program } = require('commander');
const { JSDOM } = require('jsdom');
const fs = require('fs').promises;
const path = require('path');
const prettier = require('prettier');

program
    .option('-l, --language <lang>', 'Language code (e.g., turkish)')
    .option('-p, --print', 'Add print styles')
    .parse(process.argv);

const options = program.opts();

async function joinPages(language) {
    try {
        // Read template
        const templatePath = path.join(__dirname, 'template.html');
        let templateContent = await fs.readFile(templatePath, 'utf8');

        // Update CSS path
        templateContent = templateContent.replace(
            'REPLACE_WITH_CSS_FILE.css',
            `${language}/styles.css`
        );

        // Create DOM from template
        const dom = new JSDOM(templateContent);
        const document = dom.window.document;
        const body = document.querySelector('body');

        // Add print styles if -p flag is present
        if (options.print) {
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .page:nth-child(odd) {
                    margin-left: 175px;
                    margin-right: 30px;
                }

                .page:nth-child(even) {
                    margin-right: 175px;
                    margin-left: 30px;
                }
            `;
            document.head.appendChild(styleElement);
        }

        // Read all page files
        const pagesDir = path.join(__dirname, language, 'pages-html');
        const files = await fs.readdir(pagesDir);
        const htmlFiles = files.filter(file => file.endsWith('.html')).sort();

        // Add each page to the document
        for (const file of htmlFiles) {
            const content = await fs.readFile(path.join(pagesDir, file), 'utf8');
            const pageDom = new JSDOM(content);
            const pageElement = pageDom.window.document.querySelector('.page');

            // Fix image paths before adding to main document
            const images = pageElement.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                if (src && (src.startsWith('../../images/') || src.startsWith('../../drawings/'))) {
                    img.setAttribute('src', src.replace('../../', ''));
                }
            });

            body.appendChild(document.importNode(pageElement, true));
        }

        // Get the final HTML
        let finalContent = dom.serialize();

        // Format with prettier
        finalContent = await prettier.format(finalContent, {
            parser: 'html',
            tabWidth: 2,
            htmlWhitespaceSensitivity: 'ignore'
        });

        // Write output file
        const outputPath = path.join(__dirname, `${language}-generated.html`);
        await fs.writeFile(outputPath, finalContent, 'utf8');
        
        console.log(`Successfully created ${outputPath}`);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

if (!options.language) {
    console.error('Please specify a language using -l or --language');
    process.exit(1);
}

joinPages(options.language);