/**
 * PitchLab Scoring Configuration & Logic
 * This module contains all weights and pure functions for scoring.
 */

const SCORING_CONFIG = {
    WEIGHTS: {
        THEME: 0.20,
        EXECUTION: 0.30,
        ANALYSIS: 0.30,
        READINESS: 0.20,
    },
    FRI_BASE: 50,
    FRI_BONUS: {
        EXPERIENCE: 20, // Previous founder or 5+ yrs expertise
        CAPACITY: 15,   // >30 hours/week
        NETWORK: 15,    // Mentor/Investor access
    }
};

/**
 * Calculates the Founder Readiness Index (FRI) based on profile data.
 * @param {Object} profile - { experience, capacity, network }
 * @returns {number} 0-100 score
 */
function calculateFRI(profile) {
    let score = SCORING_CONFIG.FRI_BASE;
    const { experience = "", capacity = "0", network = "" } = profile;

    if (experience.toLowerCase().includes("founder") || experience.toLowerCase().includes("5 years")) {
        score += SCORING_CONFIG.FRI_BONUS.EXPERIENCE;
    }

    if (parseInt(capacity) >= 30) {
        score += SCORING_CONFIG.FRI_BONUS.CAPACITY;
    }

    if (network.toLowerCase().includes("mentor") || network.toLowerCase().includes("investor")) {
        score += SCORING_CONFIG.FRI_BONUS.NETWORK;
    }

    return Math.min(score, 100);
}

/**
 * Calculates the overall PitchLab Score.
 * @param {Object} tearScores - { theme, execution, analysis, readiness }
 * @returns {number} 0-100 overall score
 */
function calculateOverallScore(tearScores) {
    console.log("PitchLab Scoring: Received TEAR scores for final calculation:", JSON.stringify(tearScores));

    // Default to 0 if scores are missing or invalid
    const theme = Number(tearScores.theme);
    const execution = Number(tearScores.execution);
    const analysis = Number(tearScores.analysis);
    const readiness = Number(tearScores.readiness);

    if (isNaN(theme) || isNaN(execution) || isNaN(analysis) || isNaN(readiness)) {
        console.warn("PitchLab Scoring WARNING: One or more scores are NaN after conversion:", {
            theme, execution, analysis, readiness, raw: tearScores
        });
    }

    const { WEIGHTS } = SCORING_CONFIG;

    const overall =
        ((theme || 0) * WEIGHTS.THEME) +
        ((execution || 0) * WEIGHTS.EXECUTION) +
        ((analysis || 0) * WEIGHTS.ANALYSIS) +
        ((readiness || 0) * WEIGHTS.READINESS);

    const roundedOverall = Math.round(overall) || 0;
    console.log(`PitchLab Scoring: Final Overall Score: ${roundedOverall} (Theme: ${theme}, Exec: ${execution}, Analysis: ${analysis}, Readiness: ${readiness})`);

    return roundedOverall;
}

module.exports = {
    SCORING_CONFIG,
    calculateFRI,
    calculateOverallScore
};
