# Web version of the book "https://thesimplestbitcoinbook.net/"

There are now two languages for the book:

## English version

Original text

## Turkish version

Translation of the original text by me.

# How to create a new language version

1. Copy the `english` folder and rename it with the language (e.g. `dutch`).
2. 1. Translate all the texts in the new folder.
2. 2. Check out the pages-text and pages-html folders. 
2. 3. It is easier to translate the text in the pages-text folder first, 
2. 4. then copy the translated text to the pages-html folder. You can use AI tools to help you.

Don't forget to translate the images in the pages-html/images folder. They are language specific images.
If you need to, you can modify the CSS in the {language}/styles.css file for design changes specific to your language.

Run the following script to create a one page HTML file for your language.

```bash
npm install
```

then

```bash
node join-pages.js --l dutch
```

It should have created a file called `dutch-generated.html` in the root folder.

Download node.js from [nodejs.org](https://nodejs.org/) if you don't have it.

You can use other tools (like chrome print dialog) to create a PDF file for your language.
