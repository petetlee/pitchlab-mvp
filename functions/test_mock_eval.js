process.env.GCLOUD_PROJECT = "antigravity-pitchlab";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const test = require('firebase-functions-test')({ projectId: 'antigravity-pitchlab' });
const myFunctions = require('./index.js');

async function runMockTest() {
    try {
        const wrapped = test.wrap(myFunctions.pitchLabEvaluation);
        const result = await wrapped({
            data: { 
                idea: "A SaaS platform for independent drivers to manage expenses.",
                problem: "Independent drivers struggle to track their daily expenses and tax liabilities accurately.",
                targetMarket: "Independent rideshare and delivery drivers globally.",
                category: "B2B SaaS",
                budget: "$2000",
                experience: "High",
                capacity: "Full-time",
                network: "Strong business network across New Zealand and Samoa through accounting, consulting, transport, construction, tourism, and community work. Access to SME owners, potential pilot customers, business advisers, and referral channels, plus growing links to investors, grant bodies, and strategic partners relevant to early validation."
            },
            auth: { uid: "test-uid-123" }
        });
        console.log("MOCK RESPONSE SUCCESS:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("MOCK RESPONSE FAILED:", e);
    } finally {
        test.cleanup();
    }
}
runMockTest();
