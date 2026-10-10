process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = "antigravity-pitchlab";
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = "antigravity-pitchlab";

const { saveEvaluationDraft, deleteEvaluationDraft, getUserDrafts, cleanupExpiredDrafts } = require("./index");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

async function runRegressionTests() {
  console.log("=================================================");
  console.log("🚀 PitchLab Save & Resume Regression Test Suite");
  console.log("Tracking ID: PL-20261010-SAVE-RESUME-02");
  console.log("=================================================\n");

  const mockUserId = `test_founder_${Date.now()}`;
  const mockAuth = { uid: mockUserId };
  let passedCount = 0;
  let testCount = 0;

  function assert(condition, testName) {
    testCount++;
    if (condition) {
      console.log(`✅ PASS [Test ${testCount}]: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL [Test ${testCount}]: ${testName}`);
    }
  }

  try {
    // 1. Save new valid draft
    console.log("Executing Test 1: Save new draft...");
    const draft1Res = await saveEvaluationDraft.run({
      auth: mockAuth,
      data: {
        currentStep: 2,
        formData: {
          idea: "MoorSafe Solar Powered Mooring Sensor",
          problem: "Mooring line failure in harsh coastal environments causes vessel damage.",
          targetMarket: "Harbour authorities and commercial vessel operators.",
          cvFileName: "resume_peter_lee.pdf",
          cvBase64: "SGVsbG8gV29ybGQgQlVGRkVS", // Heavy binary to be stripped!
        }
      }
    });

    const draft1Id = draft1Res.draftId;
    assert(draft1Res.success === true && draft1Id && draft1Id.length > 0, "New draft saved successfully and generated draftId");

    // Verify document in Firestore
    const draft1Doc = await db.collection("EvaluationDrafts").doc(draft1Id).get();
    assert(draft1Doc.exists && draft1Doc.data().userId === mockUserId, "Draft doc exists in Firestore with correct owner UID");
    assert(draft1Doc.data().formData.cvBase64 === undefined, "Heavy binary cvBase64 was automatically stripped from draft storage");
    assert(draft1Doc.data().formData.cvFileName === "resume_peter_lee.pdf", "cvFileName metadata was preserved");

    // 2. Update existing draft
    console.log("\nExecuting Test 2: Update existing draft...");
    const updateRes = await saveEvaluationDraft.run({
      auth: mockAuth,
      data: {
        draftId: draft1Id,
        currentStep: 4,
        formData: {
          idea: "MoorSafe Solar Powered Mooring Sensor",
          problem: "Mooring line failure in harsh coastal environments causes vessel damage.",
          targetMarket: "Harbour authorities and commercial vessel operators.",
          marketScope: "National customers",
          investmentCommitment: "$25,000–$50,000"
        }
      }
    });

    assert(updateRes.success === true && updateRes.draftId === draft1Id, "Existing draft updated cleanly without creating duplicate doc");
    const updatedDoc = await db.collection("EvaluationDrafts").doc(draft1Id).get();
    assert(updatedDoc.data().currentStep === 4, "Current step updated to 4 in Firestore");

    // 3. Max field length enforcement (max 2,500 chars)
    console.log("\nExecuting Test 3: Validate field length limit enforcement...");
    let lengthErrCaught = false;
    try {
      await saveEvaluationDraft.run({
        auth: mockAuth,
        data: {
          draftId: draft1Id,
          formData: {
            idea: "A".repeat(2600), // Exceeds 2500 max limit!
          }
        }
      });
    } catch (e) {
      lengthErrCaught = true;
      assert(e.message.includes("Answer length limit exceeded"), "Field length > 2,500 chars rejected with clear error message");
    }
    assert(lengthErrCaught, "Answer length limit enforcement verified");

    // 4. Per-account draft limit enforcement (MAX 3 active drafts per account)
    console.log("\nExecuting Test 4: Verify 3-draft per-account limit...");
    const draft2Res = await saveEvaluationDraft.run({
      auth: mockAuth,
      data: { formData: { idea: "Second Assessment Idea" } }
    });
    const draft3Res = await saveEvaluationDraft.run({
      auth: mockAuth,
      data: { formData: { idea: "Third Assessment Idea" } }
    });
    assert(draft2Res.success && draft3Res.success, "Second and third drafts created successfully");

    let limitErrCaught = false;
    try {
      await saveEvaluationDraft.run({
        auth: mockAuth,
        data: { formData: { idea: "Fourth Assessment Idea (Exceeds Limit)" } }
      });
    } catch (e) {
      limitErrCaught = true;
      assert(e.message.includes("Draft limit reached"), "Fourth draft blocked with 3-draft account limit error");
    }
    assert(limitErrCaught, "3-draft account limit enforcement verified");

    // 5. Get user drafts & check 90-day retention calculation
    console.log("\nExecuting Test 5: Verify getUserDrafts & retention calculations...");
    const draftsRes = await getUserDrafts.run({ auth: mockAuth });
    assert(draftsRes.drafts.length === 3, "getUserDrafts returns exactly 3 active drafts");
    const firstDraft = draftsRes.drafts.find(d => d.draftId === draft1Id);
    assert(firstDraft && firstDraft.daysRemaining >= 89 && firstDraft.expiresAt, "Retention calculations show ~90 days remaining and valid expiresAt timestamp");

    // 6. Delete draft
    console.log("\nExecuting Test 6: Verify deleteEvaluationDraft...");
    const delRes = await deleteEvaluationDraft.run({
      auth: mockAuth,
      data: { draftId: draft3Res.draftId }
    });
    assert(delRes.success === true, "deleteEvaluationDraft returned success");
    const checkDeleted = await db.collection("EvaluationDrafts").doc(draft3Res.draftId).get();
    assert(!checkDeleted.exists, "Draft document removed from Firestore");

    // 7. Global Capacity Protection Switch
    console.log("\nExecuting Test 7: Verify System Capacity Protection Switch...");
    await db.collection("SystemConfig").doc("drafts").set({ allowNewDrafts: false });
    let capacityErrCaught = false;
    try {
      await saveEvaluationDraft.run({
        auth: mockAuth,
        data: { formData: { idea: "New Draft During Capacity Pause" } }
      });
    } catch (e) {
      capacityErrCaught = true;
      assert(e.message.includes("maximum draft capacity"), "New draft creation paused when system capacity switch is disabled");
    }
    assert(capacityErrCaught, "System capacity protection switch verified");

    // Reset capacity switch
    await db.collection("SystemConfig").doc("drafts").set({ allowNewDrafts: true });

    // 8. Test 90-day Cleanup
    console.log("\nExecuting Test 8: Verify cleanupExpiredDrafts...");
    const oldDraftId = `old_draft_${Date.now()}`;
    const hundredDaysAgo = new Date(Date.now() - (100 * 24 * 60 * 60 * 1000));
    await db.collection("EvaluationDrafts").doc(oldDraftId).set({
      draftId: oldDraftId,
      userId: mockUserId,
      appId: "pitchlab",
      ideaName: "Expired Test Draft",
      isComplete: false,
      updatedAt: hundredDaysAgo,
    });

    const cleanupRes = await cleanupExpiredDrafts.run({ auth: mockAuth });
    assert(cleanupRes.success === true, "cleanupExpiredDrafts executed successfully");
    const oldCheck = await db.collection("EvaluationDrafts").doc(oldDraftId).get();
    assert(!oldCheck.exists, "Expired draft doc older than 90 days purged from Firestore");

    // Clean up test data
    await db.collection("EvaluationDrafts").doc(draft1Id).delete();
    await db.collection("EvaluationDrafts").doc(draft2Res.draftId).delete();

    console.log("\n=================================================");
    console.log(`📊 Test Summary: ${passedCount}/${testCount} tests passed cleanly.`);
    console.log("=================================================");

    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("❌ CRITICAL ERROR in regression test suite:", err);
    process.exit(1);
  }
}

runRegressionTests();
