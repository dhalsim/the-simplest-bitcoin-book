const fs = require('fs').promises;
const path = require('path');

// Change this to 'english' or 'turkish' to determine which content to keep
const LANGUAGE_TO_KEEP = 'turkish';

async function processFiles() {
    try {
        // Define source and destination directories based on language
        const sourceDir = path.join(__dirname, `${LANGUAGE_TO_KEEP}/pages-text`);
        
        // Get all .txt files from the source directory
        const files = await fs.readdir(sourceDir);
        const txtFiles = files.filter(file => file.endsWith('.txt'));

        for (const file of txtFiles) {
            const filePath = path.join(sourceDir, file);
            const content = await fs.readFile(filePath, 'utf8');

            // Split content by the separator
            const parts = content.split(/\n\s*-{3,}\s*\n/);
            
            // Determine which part to keep based on language
            let newContent;
            if (LANGUAGE_TO_KEEP === 'english') {
                newContent = parts[0].trim(); // Keep the first part (English)
            } else if (parts.length > 1) {
                newContent = parts[1].trim(); // Keep the second part (Turkish)
            } else {
                newContent = parts[0].trim(); // If no second part, keep the first part
            }

            // Write the filtered content back to the file
            await fs.writeFile(filePath, newContent + '\n', 'utf8');
        }

        console.log(`Successfully processed files for ${LANGUAGE_TO_KEEP} content`);
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

processFiles();