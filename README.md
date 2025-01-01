# Web version of the book "https://thesimplestbitcoinbook.net/"

There are now two languages for the book:

## Turkish version

Translation of the original text by me.

https://enbasitbitcoinkitabi.site

One page version:
https://enbasitbitcoinkitabi.site/turkish-one-page-screen.html

Multi page version with Nostr highlights, zaps, and comments:
https://enbasitbitcoinkitabi.site/turkish/pages-html/0001.html

## English version -Original text-

https://enbasitbitcoinkitabi.site select English

One page version:
https://enbasitbitcoinkitabi.site/english-one-page-screen.html

Multi page version with Nostr highlights, zaps, and comments:
https://enbasitbitcoinkitabi.site/english/pages-html/0001.html

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
Check out the l18n.json file in the new language folder. Translate the text in the file.
You can also optionally add your Nostr pubkey and relay hint to the file as the translator, so the highlights and comments can be attributed to you. Check the turkish/l18n.json file for an example.

Then run the following command to join the pages.

```bash
node join-pages.js --l dutch
```

It should have created a file called `dutch-generated.html` in the root folder.

You can use other tools (like chrome print dialog) to create a PDF file for your language.

Another way to work is copy and rename english-generated.html to your language and start translating from there. Later you can use these commands to create a multi page version.

Assuming you have renamed the file to `dutch-generated.html`:

```bash
node split-pages.js -l dutch
node update-pages.js -l dutch
```

This is the commands I use to work on both English and Turkish versions, starting from the generated single page version.

```bash
npm run split-english
npm run split-turkish
```

and to generate the single page version:

```bash
npm run join-english
npm run join-turkish
```

To create a command for your language, edit the `package.json` file. Add a new script with the language name, change the parameters in the script to match your language.

# Run a local Nostr relay for testing hightlights, zaps, and comments.

```bash
npm run relay
```

# Licence

Check the https://github.com/dhalsim/the-simplest-bitcoin-book/blob/main/LICENCE file to check the original licence and my attributions.
