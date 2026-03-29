// convert.js
const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');

// Where your CSV folders are (relative to this script)
const inputDir = './src/data';
// Where you want the JSON files to go
const outputDir = './src/data';

async function convertUnits() {
    // Get all folders (unit1, unit2, etc.)
    const units = fs.readdirSync(inputDir).filter(file =>
        fs.statSync(path.join(inputDir, file)).isDirectory()
    );

    console.log('🔍 Found units:', units);

    for (const unit of units) {
        const unitPath = path.join(inputDir, unit);
        const jsonFilePath = path.join(outputDir, `${unit}.json`);

        let allWords = [];

        // Get all CSV files inside this unit folder
        const files = fs.readdirSync(unitPath).filter(f => f.endsWith('.csv'));

        console.log(`📂 Processing ${unit}... (${files.length} files)`);

        for (const file of files) {
            const filePath = path.join(unitPath, file);
            // Convert CSV to JSON array
            const jsonArray = await csv().fromFile(filePath);
            allWords = [...allWords, ...jsonArray];
        }

        // Save the combined JSON file
        fs.writeFileSync(jsonFilePath, JSON.stringify(allWords, null, 2));
        console.log(`✅ Saved ${unit}.json with ${allWords.length} words`);
    }
}

convertUnits().catch(console.error);