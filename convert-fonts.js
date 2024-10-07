const fs = require("fs").promises;
const path = require('path');

(async () => {
  try {
    // Read the base64 content from the file
    let fontContent = await fs.readFile("fonts/ff1.woff", 'utf8');
    
    // Convert base64 to binary buffer
    let binaryBuffer = Buffer.from(fontContent, 'base64');
    
    // Write the binary buffer to a new file
    const outputPath = path.join('fonts', 'ff1_converted.woff');
    await fs.writeFile(outputPath, binaryBuffer);
    
    console.log(`Conversion complete. Binary font file saved to: ${outputPath}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
