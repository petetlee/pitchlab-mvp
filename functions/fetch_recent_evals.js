const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: 'antigravity-pitchlab' });
const db = getFirestore();

async function getRecentEvals() {
  const snapshot = await db.collection("EvaluationScore").orderBy("createdAt", "desc").limit(3).get();
  if (snapshot.empty) {
    console.log("No recent evaluations found.");
    return;
  }
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nDocument ID: ${doc.id}`);
    console.log(`Overall Score: ${data.scores?.overall}`);
    console.log(`TEAR Scores: Theme=${data.scores?.theme}, Execution=${data.scores?.execution}, Analysis=${data.scores?.analysis}, Readiness=${data.scores?.readiness}`);
  });
}
getRecentEvals().catch(console.error);
