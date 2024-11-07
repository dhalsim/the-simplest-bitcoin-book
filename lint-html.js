const { ESLint } = require('eslint');
const { program } = require('commander');
const path = require('path');
const fs = require('fs').promises;
const prettier = require('prettier');

async function lintHtmlFiles() {
  program
    .option('-l, --language <lang>', 'Language code (e.g., turkish)')
    .parse(process.argv);

  const options = program.opts();

  if (!options.language) {
    console.error('Please specify a language using -l or --language');
    process.exit(1);
  }

  const pagesDir = path.join(__dirname, options.language, 'pages-html');

  try {
    // First run ESLint
    const eslint = new ESLint({
      useEslintrc: true,
      fix: true,
      rulePaths: [path.join(__dirname, 'eslint-rules')],
      overrideConfigFile: path.join(__dirname, '.eslintrc.js'),
    });

    const files = await fs.readdir(pagesDir);
    const htmlFiles = files
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(pagesDir, f));

    const results = await eslint.lintFiles(htmlFiles);
    await ESLint.outputFixes(results);

    // Then format with Prettier
    for (const file of htmlFiles) {
      const content = await fs.readFile(file, 'utf8');
      const formatted = await prettier.format(content, {
        parser: 'html',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        htmlWhitespaceSensitivity: 'ignore'
      });
      await fs.writeFile(file, formatted, 'utf8');
    }

    // Output lint results
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    console.log(resultText);
    console.log('Files have been linted and formatted!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

lintHtmlFiles();