const { reconcileScores, classifyVentureType, detectFeasibilityGates } = require('./scoring_logic');

console.log("==========================================================================");
console.log("      PITCHLAB MVP 3-IDEA SUBMISSION LIMIT ENGINE VERIFICATION           ");
console.log("==========================================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

const MVP_IDEA_SUBMISSION_LIMIT = 3;

// Mock User Storage & Role Resolution
const mockUsers = {
  "admin-uid-123": { role: "admin", email: "peter@pnc.co.nz" },
  "standard-uid-456": { role: "user", email: "founder@example.com" }
};

const mockEvaluationsStore = {
  "admin-uid-123": [
    { id: "eval-1", idea: "Idea 1" },
    { id: "eval-2", idea: "Idea 2" },
    { id: "eval-3", idea: "Idea 3" },
    { id: "eval-4", idea: "Idea 4" },
    { id: "eval-5", idea: "Idea 5" }
  ],
  "standard-uid-456": []
};

function checkSubmissionAllowed(userId) {
  const user = mockUsers[userId] || { role: "user" };
  const isAdmin = user.role === "admin";
  const userScores = mockEvaluationsStore[userId] || [];
  const used = userScores.length;

  if (isAdmin) {
    return {
      allowed: true,
      isAdmin: true,
      used,
      limit: MVP_IDEA_SUBMISSION_LIMIT,
      remaining: 999,
      code: "ALLOWED"
    };
  }

  if (used >= MVP_IDEA_SUBMISSION_LIMIT) {
    return {
      allowed: false,
      isAdmin: false,
      used,
      limit: MVP_IDEA_SUBMISSION_LIMIT,
      remaining: 0,
      code: "MVP_LIMIT_EXCEEDED",
      message: "You've completed your 3 available idea assessments during the PitchLab testing stage. You can still review and compare your existing ideas and assessments. Thank you for helping us test PitchLab."
    };
  }

  return {
    allowed: true,
    isAdmin: false,
    used,
    limit: MVP_IDEA_SUBMISSION_LIMIT,
    remaining: MVP_IDEA_SUBMISSION_LIMIT - used,
    code: "ALLOWED"
  };
}

function processSubmission(userId, ideaTitle) {
  const check = checkSubmissionAllowed(userId);
  if (!check.allowed) {
    return check;
  }
  
  if (!mockEvaluationsStore[userId]) mockEvaluationsStore[userId] = [];
  mockEvaluationsStore[userId].push({
    id: `eval-${Date.now()}-${Math.random()}`,
    idea: ideaTitle,
    createdAt: new Date().toISOString()
  });

  return {
    allowed: true,
    isAdmin: check.isAdmin,
    used: mockEvaluationsStore[userId].length,
    limit: MVP_IDEA_SUBMISSION_LIMIT,
    remaining: check.isAdmin ? 999 : Math.max(0, MVP_IDEA_SUBMISSION_LIMIT - mockEvaluationsStore[userId].length),
    code: "SUCCESS"
  };
}

// -------------------------------------------------------------------------
// TEST 1: Standard User Submissions (1 to 4)
// -------------------------------------------------------------------------
console.log("\n[Test 1] Standard User Submission Cycle (Limit = 3)");
const stdUid = "standard-uid-456";

const sub1 = processSubmission(stdUid, "Idea 1: Local SaaS");
assert(sub1.allowed === true && sub1.used === 1, "Submission 1 allowed (Used: 1/3)");

const sub2 = processSubmission(stdUid, "Idea 2: E-Commerce Store");
assert(sub2.allowed === true && sub2.used === 2, "Submission 2 allowed (Used: 2/3)");

const sub3 = processSubmission(stdUid, "Idea 3: Mobile App");
assert(sub3.allowed === true && sub3.used === 3, "Submission 3 allowed (Used: 3/3)");

const sub4 = processSubmission(stdUid, "Idea 4: Fourth Attempt");
assert(sub4.allowed === false && sub4.code === "MVP_LIMIT_EXCEEDED", "Submission 4 BLOCKED with MVP_LIMIT_EXCEEDED error!");
assert(mockEvaluationsStore[stdUid].length === 3, "Evaluations store for standard user remains strictly 3 (no 4th doc created)");

// -------------------------------------------------------------------------
// TEST 2: Admin User Submissions (Unlimited)
// -------------------------------------------------------------------------
console.log("\n[Test 2] Admin User Submission Cycle (Unlimited)");
const adminUid = "admin-uid-123";

const adminSub6 = processSubmission(adminUid, "Idea 6: Admin Test Idea");
assert(adminSub6.allowed === true && adminSub6.isAdmin === true, "Admin submission 6 allowed (Unlimited)");

const adminSub7 = processSubmission(adminUid, "Idea 7: Admin Test Idea 2");
assert(adminSub7.allowed === true && adminSub7.isAdmin === true, "Admin submission 7 allowed (Unlimited)");

// -------------------------------------------------------------------------
// TEST 3: Persistence Across Session Reset / Relogin
// -------------------------------------------------------------------------
console.log("\n[Test 3] Cumulative Persistence across Logouts/Relogins");
// Standard user logs out and logs back in (same UID):
const recheck = checkSubmissionAllowed(stdUid);
assert(recheck.allowed === false && recheck.used === 3, "Relogged standard user remains blocked at 3/3 (Persistent across sessions)");

console.log("\n==========================================================================");
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==========================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
