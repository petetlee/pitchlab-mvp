/**
 * PitchLab Robust Multi-Format CV Parser & Garbage Filter
 * Supports PDF, DOCX, TXT, and RTF files.
 * Ensures Gemini AI receives clean, human-readable plain text without binary artifacts.
 */

const { PDFParse } = require("pdf-parse");
let mammoth;
try {
  mammoth = require("mammoth");
} catch (e) {
  mammoth = null;
}

/**
 * Extracts clean, human-readable text from a base64 encoded CV file.
 * @param {string} cvBase64 Base64 string of the uploaded file.
 * @param {string} fileName Original filename (optional).
 * @returns {Promise<string>} Clean extracted text or empty string.
 */
async function extractCvText(cvInput = "", fileName = "") {
  if (!cvInput) return "";

  try {
    let buffer;
    if (Buffer.isBuffer(cvInput)) {
      buffer = cvInput;
    } else if (typeof cvInput === 'string') {
      const cleanBase64 = cvInput
        .replace(/^data:application\/[a-zA-Z0-9.-]+;base64,/, '')
        .replace(/^data:.*?;base64,/, '')
        .trim();

      if (!cleanBase64) return "";
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return "";
    }

    if (!buffer || buffer.length === 0) return "";

    let extractedText = "";
    const lowerName = (fileName || "").toLowerCase();

    // 1. PDF File Detection (%PDF or .pdf extension)
    if ((buffer.length > 4 && buffer.toString('utf8', 0, 4) === '%PDF') || lowerName.endsWith('.pdf')) {
      try {
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        extractedText = typeof res === 'string' ? res : (res?.text || '');
        console.log(`PitchLab CV Parser: PDF text extracted (${extractedText.length} chars).`);
      } catch (pdfErr) {
        console.warn("PitchLab CV Parser: pdf-parse failed:", pdfErr.message);
      }
    }

    // 2. DOCX File Detection (ZIP header PK\x03\x04 or .docx extension)
    else if ((buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) || lowerName.endsWith('.docx')) {
      if (mammoth) {
        try {
          const docResult = await mammoth.extractRawText({ buffer: buffer });
          extractedText = docResult.value || "";
          console.log(`PitchLab CV Parser: Mammoth DOCX text extracted (${extractedText.length} chars).`);
        } catch (docxErr) {
          console.warn("PitchLab CV Parser: Mammoth DOCX extraction failed:", docxErr.message);
        }
      }

      // Fallback DOCX XML extraction regex if mammoth is pending
      if (!extractedText || extractedText.trim().length === 0) {
        const rawStr = buffer.toString('utf8');
        const matches = rawStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (matches && matches.length > 0) {
          extractedText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
          console.log(`PitchLab CV Parser: Fallback DOCX XML text extracted (${extractedText.length} chars).`);
        }
      }
    }

    // 3. Plain Text / RTF / TXT Fallback
    else {
      const rawString = buffer.toString('utf8');
      // Strip RTF markup if present
      const cleanRtf = rawString.replace(/\\(?:[a-z]{1,32}(-?\d{1,10})?|'[\da-f]{2}|[^a-z])/gi, ' ');
      extractedText = cleanRtf;
    }

    // 4. Garbage Sanity Filter — Ensure text is clean human-readable ASCII/UTF-8
    const sanitized = sanitizeCvText(extractedText);
    return sanitized.slice(0, 4000);

  } catch (e) {
    console.warn("PitchLab CV Parser: Error processing CV file:", e.message);
    return "";
  }
}

/**
 * Sanitizes extracted text and strips binary garbage.
 * @param {string} text Raw extracted text string.
 * @returns {string} Sanitized string or empty if text was binary noise.
 */
function sanitizeCvText(text = "") {
  if (!text || typeof text !== 'string') return "";

  // Replace non-printable control codes with spaces
  let cleaned = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 20) return "";

  // Calculate ratio of printable characters vs binary noise
  let printableCount = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i);
    // Allow printable ASCII, common punctuation, newlines, and standard Latin/extended characters
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || (code >= 160 && code <= 55000)) {
      printableCount++;
    }
  }

  const printableRatio = printableCount / cleaned.length;

  // If text is more than 20% binary garbage (e.g. unparsed ZIP/PDF stream), discard it so Gemini isn't fed garbled text
  if (printableRatio < 0.80) {
    console.warn(`PitchLab CV Parser WARNING: Extracted text failed printable ratio check (${(printableRatio * 100).toFixed(1)}% printable). Discarding binary garbage.`);
    return "";
  }

  return cleaned;
}

module.exports = {
  extractCvText,
  sanitizeCvText
};
