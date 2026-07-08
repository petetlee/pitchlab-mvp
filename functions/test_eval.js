const fetch = require('node-fetch'); // Use native fetch if Node 18+

async function testFunction() {
    const url = 'http://127.0.0.1:5001/antigravity-pitchlab/us-central1/pitchLabEvaluation';
    const payload = {
        data: {
            idea: "AI driven coffee maker",
            problem: "People are too tired to make coffee.",
            budget: "$500",
            experience: "I am a founder",
            capacity: "40",
            network: "I have mentors",
            targetMarket: "Tired professionals",
            category: "Tech"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testFunction();
