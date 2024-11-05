# Web version of the book "https://thesimplestbitcoinbook.net/"

There are now two languages for the book:

## English version -Original text-

One page version:
https://dhalsim.github.io/the-simplest-bitcoin-book/english-generated.html

Multi page version:
https://dhalsim.github.io/the-simplest-bitcoin-book/english/pages-html/0001.html

## Turkish version

Translation of the original text by me.

One page version:
https://dhalsim.github.io/the-simplest-bitcoin-book/turkish-generated.html

Multi page version:
https://dhalsim.github.io/the-simplest-bitcoin-book/turkish/pages-html/0001.html

# How to create a new language version

## Prerequisites

- Command Prompt or Terminal, search how to open it and use it in your OS.
- Git installed. Download it from [git-scm.com](https://git-scm.com/) if you don't have it.
- You can use Github Desktop if you want. [Download](https://desktop.github.com/) it from github.com.
- Node.js installed. [Download](https://nodejs.org/) it from nodejs.org.
- A text editor or an IDE, e.g. [Cursor](https://www.cursor.sh/) is with AI tools which was helpful for me to create this project.
- A browser with developer tools. Chrome is recommended.

## Steps

- Clone the repository to your local machine using Github Desktop or Git bash.
- Copy the `english` folder and rename it with the language (e.g. `dutch`).
- Translate all the texts in the new folder.
- Check out the pages-text and pages-html folders.
- It is easier to translate the text in the pages-text folder first,
- then copy the translated text to the pages-html folder. You can use AI tools to help you.

Don't forget to translate the images in the pages-html/images folder. They are language specific images.

If you need to, you can modify the CSS in the {language}/styles.css file for design changes specific to your language.

Some commands to run:

```bash
git clone https://github.com/dhalsim/the-simplest-bitcoin-book.git
cd the-simplest-bitcoin-book
```

```bash
npm install
```

Copy the `english` folder and rename it with the language (e.g. `dutch`).

Then

```bash
node join-pages.js --l dutch
```

It should have created a file called `dutch-generated.html` in the root folder.

You can use other tools (like chrome print dialog) to create a PDF file for your language.
