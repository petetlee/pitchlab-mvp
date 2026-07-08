
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInAnonymously, connectAuthEmulator } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "fake-api-key",
  projectId: "antigravity-pitchlab",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');
const auth = getAuth(app);

// Connect to emulators
connectAuthEmulator(auth, "http://localhost:9099");
connectFunctionsEmulator(functions, "localhost", 5001);

async function runTest() {
  try {
    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in as:", auth.currentUser.uid);

    const pitchLabEvaluation = httpsCallable(functions, 'pitchLabEvaluation');
    
    console.log("Calling pitchLabEvaluation...");
    const result = await pitchLabEvaluation({
      idea: "Test Idea: AI for finding pens",
      problem: "I always lose my pens.",
      targetMarket: "Everyone",
      budget: "100",
      experience: "None",
      capacity: "1",
      network: "None"
    });

    console.log("SUCCESS! Result:", JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.error("FAILURE:", e.message);
    if (e.details) console.error("Details:", e.details);
  }
}

runTest();
