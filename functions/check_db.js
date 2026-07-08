
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

initializeApp({
  projectId: 'antigravity-pitchlab'
});

const db = getFirestore();

async function checkData() {
  console.log("Checking IdeaInputs...");
  const inputs = await db.collection('IdeaInputs').orderBy('createdAt', 'desc').limit(5).get();
  inputs.forEach(doc => console.log('Input:', doc.id, doc.data().idea));

  console.log("Checking EvaluationScore...");
  const scores = await db.collection('EvaluationScore').orderBy('createdAt', 'desc').limit(5).get();
  scores.forEach(doc => console.log('Score:', doc.id, doc.data().scores?.overall));
}

checkData().catch(console.error);
