require('dotenv').config();

async function listModels() {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
        const data = await response.json();
        const fs = require('fs');
        fs.writeFileSync('test_models_list_output.json', JSON.stringify(data, null, 2));
        console.log("Successfully fetched models.");
    } catch (e) {
        console.error("Failed to fetch models: ", e);
    }
}

listModels();
