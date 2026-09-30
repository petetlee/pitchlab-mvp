process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("No API key found in .env");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function run() {
  try {
    const fetch = require('node-fetch');
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Available Models:", json.models?.map(m => m.name));
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

run();
