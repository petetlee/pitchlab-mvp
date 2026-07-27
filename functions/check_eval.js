const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({ projectId: "antigravity-pitchlab" });

async function checkLatestEval() {
  const db = admin.firestore();
  const snapshot = await db.collection("EvaluationScore")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log("No evaluations found.");
    return;
  }

  const doc = snapshot.docs[0];
  console.log("Document ID:", doc.id);
  console.log("Data:", JSON.stringify(doc.data(), null, 2));
}

checkLatestEval().catch(console.error);
