import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'models/evaluation_result.dart';
import 'pdf_downloader.dart';

class PdfService {
  static Future<void> generateReport(Map<String, dynamic> rawEvaluation) async {
    final res = EvaluationResult.fromMap(rawEvaluation);
    final pdf = pw.Document();

    // 12-16 Page PDF Layout
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (pw.Context context) {
          if (context.pageNumber == 1) return pw.SizedBox();
          final shortConcept = res.businessName.length > 45 ? '${res.businessName.substring(0, 45)}...' : res.businessName;
          return pw.Container(
            alignment: pw.Alignment.centerRight,
            margin: const pw.EdgeInsets.only(bottom: 8),
            padding: const pw.EdgeInsets.only(bottom: 4),
            decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey300, width: 0.5))),
            child: pw.Text(_cleanPdfText('PitchLab Assessment  |  ${res.founderName}  |  $shortConcept'), style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
          );
        },
        footer: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(top: 8),
            padding: const pw.EdgeInsets.only(top: 4),
            decoration: const pw.BoxDecoration(border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300, width: 0.5))),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(_cleanPdfText('Confidential Assessment prepared for ${res.founderName}'), style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
                pw.Text(_cleanPdfText('Page ${context.pageNumber} of ${context.pagesCount}'), style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
              ],
            ),
          );
        },
        build: (pw.Context context) {
          return [
            // ================= PAGE 1: EXECUTIVE DECISION SUMMARY =================
            pw.Container(
              padding: const pw.EdgeInsets.only(bottom: 12),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blueGrey900, width: 1.5)),
              ),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          _cleanPdfText('PitchLab Founder Commercial Assessment'),
                          style: pw.TextStyle(fontSize: 15.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900),
                        ),
                        pw.SizedBox(height: 6),
                        pw.RichText(
                          text: pw.TextSpan(
                            children: [
                              pw.TextSpan(text: 'Prepared For: ', style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                              pw.TextSpan(text: _cleanPdfText(res.founderName), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                            ],
                          ),
                        ),
                        pw.SizedBox(height: 3),
                        pw.RichText(
                          text: pw.TextSpan(
                            children: [
                              pw.TextSpan(text: 'Concept: ', style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                              pw.TextSpan(text: _cleanPdfText(_limitConceptTo23Sentences(res.fullBusinessName)), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                            ],
                          ),
                        ),
                        pw.SizedBox(height: 5),
                        pw.Text(
                          _cleanPdfText('Independent Commercial Assessment & Staged Action Roadmap (${res.assessmentDate})'),
                          style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey600),
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 12),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
                    child: pw.Text(
                      _cleanPdfText('Current Stage:\n${res.scoreBandName}'),
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 14),

            // Score & Master Recommendation Card
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: const pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.all(pw.Radius.circular(8)),
                border: pw.Border(left: pw.BorderSide(color: PdfColors.blueGrey900, width: 4))
              ),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(
                    width: 100,
                    padding: const pw.EdgeInsets.all(10),
                    decoration: const pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(8))),
                    child: pw.Column(
                      children: [
                        pw.Text(_cleanPdfText('COMMERCIAL READINESS'), style: pw.TextStyle(fontSize: 7, color: PdfColors.blueGrey100, fontWeight: pw.FontWeight.bold)),
                        pw.SizedBox(height: 2),
                        pw.Text('${res.overallScore}/100', style: pw.TextStyle(fontSize: 26, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                        pw.SizedBox(height: 2),
                        pw.Text(_cleanPdfText(res.scoreBandName), textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 8, color: PdfColors.teal200, fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 14),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text(_cleanPdfText('Master Recommendation: ${res.masterRecommendation}'), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                            pw.Text(_cleanPdfText('Assessment Confidence: ${res.assessmentConfidence}', isHardware: res.isHardware), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
                          ],
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(_cleanPdfText('PitchLab Verdict: ${res.pitchLabVerdict}'), style: const pw.TextStyle(fontSize: 8.5, lineSpacing: 1.3)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 14),

            // Executive Summary
            _buildSectionHeaderPDF('Executive Summary'),
            pw.Text(_cleanPdfText(res.executiveSummary), style: const pw.TextStyle(fontSize: 8.5, lineSpacing: 1.35)),
            pw.SizedBox(height: 6),
            pw.Text(_cleanPdfText('Note: This assessment reflects the current level of commercial evidence, not a permanent judgment on the founder or business idea.'), style: pw.TextStyle(fontSize: 7.5, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
            pw.SizedBox(height: 12),

            // 3 Priority Actions
            _buildSectionHeaderPDF('Three Immediate Priority Actions'),
            ...res.threePriorityActions.map((act) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 5),
              child: pw.Bullet(
                text: _cleanPdfText('${act['heading']}: ${act['explanation']} (Outcome: ${act['outcome']})'),
                style: const pw.TextStyle(fontSize: 8.5),
              ),
            )),
            pw.SizedBox(height: 8),


            // ================= PAGE 2: SCORECARD =================
            _buildSectionHeaderPDF('PitchLab Reconciled Scorecard (7 Categories)'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              columnWidths: const {
                0: pw.FlexColumnWidth(2.5),
                1: pw.FixedColumnWidth(55),
                2: pw.FlexColumnWidth(2.0),
                3: pw.FlexColumnWidth(4.0),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Scoring Category'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Score'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Evidence Level'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Missing Evidence & Improvement Action'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                ...res.scorecardCategories.map((cat) => pw.TableRow(
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText(cat.label), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text('${cat.scoreAchieved} / ${cat.maxScore}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText(cat.evidenceLevel), style: const pw.TextStyle(fontSize: 8))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('${cat.missingEvidence} ${cat.howToImprove}'), style: const pw.TextStyle(fontSize: 7.5))),
                  ],
                )),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Total Score Reconciliation: Sum of categories = ${res.overallScore}/100.'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey800, fontWeight: pw.FontWeight.bold)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),



            // ================= PAGE 4.5: BUSINESS MODEL SNAPSHOT =================
            _buildSectionHeaderPDF('Business Model Snapshot'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              columnWidths: const {
                0: pw.FlexColumnWidth(1),
                1: pw.FlexColumnWidth(2.2),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Business Model Snapshot'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText('Assessment'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                _buildPdfBmRow('Target Customer', res.bmTargetCustomer),
                _buildPdfBmRow('Core Offering', res.bmCoreOffering),
                _buildPdfBmRow('Customer Problem', res.bmCustomerProblem),
                _buildPdfBmRow('Value Proposition', res.bmValueProposition),
                _buildPdfBmRow('Revenue Model', res.bmRevenueModel),
                _buildPdfBmRow('Customer Acquisition', res.bmCustomerAcquisition),
                _buildPdfBmRow('Key Costs', res.bmKeyCosts),
                _buildPdfBmRow('Commercial Assessment', res.bmCommercialAssessment),
              ],
            ),
            pw.SizedBox(height: 12),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= MARKET INSIGHTS (NEW SECTION) =================
            _buildSectionHeaderPDF('Market Insights'),
            ...res.marketInsightsParagraphs.map((para) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 8),
              child: pw.Text(
                _cleanPdfText(para),
                style: const pw.TextStyle(fontSize: 8.5, lineSpacing: 1.35, color: PdfColors.grey900),
              ),
            )),
            pw.SizedBox(height: 8),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= COMMERCIAL READINESS ASSESSMENT =================
            _buildSectionHeaderPDF('Commercial Readiness Assessment'),
            pw.SizedBox(height: 6),
            pw.Text(
              _cleanPdfText(res.ibIntro),
              style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.grey800, lineSpacing: 1.3),
            ),
            pw.SizedBox(height: 12),

            // Scorecard Table
            pw.Text(_cleanPdfText('Investor Assessment Scorecard:'), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            pw.SizedBox(height: 6),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              columnWidths: const {
                0: pw.FixedColumnWidth(95),
                1: pw.FixedColumnWidth(75),
                2: pw.FlexColumnWidth(1.0),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText('Assessment Area'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900))),
                    pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText('Rating (1-5)'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900), textAlign: pw.TextAlign.center)),
                    pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText('Commentary'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900))),
                  ],
                ),
                ...res.ibScorecard.map((item) {
                  final area = item['area']?.toString() ?? '';
                  final rating = (item['rating'] as num? ?? 3).toInt().clamp(1, 5);
                  final comm = item['commentary']?.toString() ?? '';
                  return pw.TableRow(
                    children: [
                      pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText(area), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                      pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText('$rating / 5'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900), textAlign: pw.TextAlign.center)),
                      pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5), child: pw.Text(_cleanPdfText(comm), style: const pw.TextStyle(fontSize: 7.5))),
                    ],
                  );
                }),
              ],
            ),
            pw.SizedBox(height: 12),

            // Overall Interest & Verdict
            pw.Container(
              padding: const pw.EdgeInsets.all(6),
              decoration: pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.circular(4),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(_cleanPdfText('Overall Investor Interest: ${res.ibOverallInterestScore}/100'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                      pw.Text(_cleanPdfText('Potential: ${res.ibInvestmentPotential}'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900)),
                    ],
                  ),
                  pw.SizedBox(height: 3),
                  pw.Text(_cleanPdfText('Verdict: ${res.ibInvestmentVerdict}'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey900)),
                ],
              ),
            ),
            pw.SizedBox(height: 8),

            // Investor Questions
            pw.Text(_cleanPdfText('Questions Investors Would Ask:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
            ...res.ibInvestorQuestions.map((q) => pw.Bullet(text: _cleanPdfText(q), style: const pw.TextStyle(fontSize: 7.5))),
            pw.SizedBox(height: 6),

            // Strength & Risk
            pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(5),
                    decoration: pw.BoxDecoration(color: PdfColors.green50, borderRadius: pw.BorderRadius.circular(4)),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(_cleanPdfText('Biggest Investment Strength:'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
                        pw.Text(_cleanPdfText(res.ibBiggestStrength), style: const pw.TextStyle(fontSize: 7, color: PdfColors.green900)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 6),
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(5),
                    decoration: pw.BoxDecoration(color: PdfColors.amber50, borderRadius: pw.BorderRadius.circular(4)),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(_cleanPdfText('Biggest Investment Risk:'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900)),
                        pw.Text(_cleanPdfText(res.ibBiggestRisk), style: const pw.TextStyle(fontSize: 7, color: PdfColors.orange900)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 8),

            // Recommendations
            pw.Text(_cleanPdfText('How to Improve Your Investor Appeal:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
            ...res.ibImprovements.map((imp) => pw.Bullet(text: _cleanPdfText(imp), style: const pw.TextStyle(fontSize: 7.5))),
            pw.SizedBox(height: 6),

            // Recommendation badge
            pw.Text(_cleanPdfText('PitchLab Recommendation: ${res.ibPitchLabRecommendation} - ${res.ibPitchLabRecommendationExplanation}'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 12),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 4: COMMERCIAL SYNTHESIS & KISS REVIEW =================
            pw.SizedBox(height: 8),

            // ================= PAGE 5: KISS REVIEW & MVP FEASIBILITY =================



            // ================= PAGE 6: BUSINESS THEME =================
            _buildSectionHeaderPDF('Business Theme & Strategic Positioning'),
            pw.Text(_cleanPdfText('Primary Theme: ${res.primaryTheme} | Secondary Theme: ${res.secondaryTheme}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('Strategic Positioning: ${res.strategicPositioning}'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey900)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('Market Category Dynamics: ${res.marketCategoryDynamics}'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('Strategic Moat & Defensibility: ${res.strategicMoat}'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 6: FOUNDER BACKGROUND & SCORE EXPLANATION =================
            _buildSectionHeaderPDF('Founder Background & Capability Assessment'),
            if (res.founderBackgroundNarrative.isNotEmpty) ...[
              pw.Text(_cleanPdfText('Synthesized Founder Input & Capability Insights:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
              pw.SizedBox(height: 2),
              pw.Text(_cleanPdfText(res.founderBackgroundSummary), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey900)),
              pw.SizedBox(height: 8),
            ],
            pw.Text(_cleanPdfText('Evidence Relied On: ${res.evidenceReliedOn}'), style: const pw.TextStyle(fontSize: 8)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('Why Score Was Awarded: ${res.whyThisScoreWasAwarded}'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
            pw.SizedBox(height: 6),
            pw.Text(_cleanPdfText('Identified Capability Gaps:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900)),
            ...res.capabilityGaps.map((g) => pw.Bullet(text: _cleanPdfText(g), style: const pw.TextStyle(fontSize: 7.5))),
            pw.SizedBox(height: 6),
            pw.Text(_cleanPdfText('Recommended Response to Gaps:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            ...res.recommendedGapResponses.map((r) => pw.Bullet(text: _cleanPdfText(r), style: const pw.TextStyle(fontSize: 7.5))),
            pw.Divider(height: 20, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 6: FOUNDER CV & CREDENTIALS =================
            _buildSectionHeaderPDF('Founder CV Analysis & Credentials'),
            pw.Text(_cleanPdfText('Extracted Qualifications & Domain Experience:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 4),
            ...res.cvCredentials.map((c) => pw.Bullet(text: _cleanPdfText(c), style: const pw.TextStyle(fontSize: 8))),
            pw.SizedBox(height: 6),
            pw.Text(_cleanPdfText('Synthesized Founder Strengths: ${res.cvStrengths}'), style: const pw.TextStyle(fontSize: 8)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('Alignment with Business Idea: ${res.cvAlignment}'), style: const pw.TextStyle(fontSize: 8)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 7: TIME, CAPITAL & FOUNDER REALITY =================
            _buildSectionHeaderPDF('Founder Positioning, Time & Capital Reality'),
            pw.Container(
              padding: const pw.EdgeInsets.all(6),
              decoration: const pw.BoxDecoration(
                color: PdfColors.blue50,
                borderRadius: pw.BorderRadius.all(pw.Radius.circular(4)),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(_cleanPdfText('Founder Positioning: ${res.founderPositionSummary}'), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                  pw.SizedBox(height: 3),
                  pw.Text(_cleanPdfText(res.founderMetricsAnalysis), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey900)),
                ],
              ),
            ),
            pw.SizedBox(height: 8),

            // Time & Capital Reality Metrics
            pw.Bullet(text: _cleanPdfText('Weekly Available Time: ${res.timeAvailable}  (${res.timeRealitySummary})'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
            pw.Bullet(text: _cleanPdfText('Capital Available Now: ${res.capitalAvailable}  (${res.capitalRealitySummary})'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
            pw.Bullet(text: _cleanPdfText('Initial Risk Capital: ${res.riskCapital}'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
            pw.Padding(
              padding: const pw.EdgeInsets.only(left: 12, top: 2, bottom: 4),
              child: pw.Text(_cleanPdfText('Explanation: ${res.riskCapitalExplanation}'), style: pw.TextStyle(fontSize: 7.5, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
            ),
            pw.Bullet(text: _cleanPdfText('Likely Near-Term Validation Requirement: ${res.likelyValidationCapitalRequired}'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            pw.SizedBox(height: 8),

            // What This Means
            pw.Text(_cleanPdfText('What This Means:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            pw.SizedBox(height: 2),
            pw.Text(_cleanPdfText(res.timeImplication), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey900)),
            pw.SizedBox(height: 8),

            // What Matters Now
            pw.Text(_cleanPdfText('What Matters Now:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900)),
            pw.SizedBox(height: 2),
            ...res.whatMattersNow.map((wm) => pw.Bullet(text: _cleanPdfText(wm), style: const pw.TextStyle(fontSize: 8))),
            pw.SizedBox(height: 8),

            // Recommended Founder Approach
            pw.Text(_cleanPdfText('Recommended Founder Approach:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 2),
            ...res.recommendedApproach.map((rec) => pw.Bullet(text: _cleanPdfText(rec), style: const pw.TextStyle(fontSize: 8))),
            pw.SizedBox(height: 8),

            // Supportive Footer
            pw.Container(
              padding: const pw.EdgeInsets.all(5),
              decoration: const pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.all(pw.Radius.circular(4)),
              ),
              child: pw.Text(_cleanPdfText(res.founderRealityFooter), style: pw.TextStyle(fontSize: 7.5, fontStyle: pw.FontStyle.italic, color: PdfColors.grey800)),
            ),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 9: CUSTOMER & COMMERCIAL VALIDATION =================
            _buildSectionHeaderPDF('Customer & Commercial Validation Ladder'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Validation Stage'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Status'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                ...res.validationLadder.map((step) => pw.TableRow(
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText(step['stage']!), style: const pw.TextStyle(fontSize: 8))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText(step['status']!), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: step['status'] == 'Complete' ? PdfColors.green800 : PdfColors.grey800))),
                  ],
                )),
              ],
            ),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 11: COMMERCIAL ADVISER OPINION =================
            _buildSectionHeaderPDF('Commercial Adviser Opinion'),
            pw.Text(_cleanPdfText('What is encouraging: ${res.founderCapabilityScore <= 6 ? "Strong general commercial and financial capability combined with clear problem definition." : "Strong problem definition, domain experience, and capital discipline."}'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('What requires caution: Ensure non-essential features are delayed until customer willingness to pay is tested.'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('What has not yet been proven: Repeat paid demand and scalable customer acquisition channels.'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('Master Recommendation: ${res.masterRecommendation}'), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 12+: 90-DAY WEEKLY ROADMAP =================
            _buildSectionHeaderPDF('90-Day Weekly Implementation Roadmap'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              columnWidths: const {
                0: pw.FixedColumnWidth(40),
                1: pw.FlexColumnWidth(2.5),
                2: pw.FlexColumnWidth(3.5),
                3: pw.FixedColumnWidth(45),
                4: pw.FlexColumnWidth(2.5),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText('Week'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText('Objective'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText('Key Tasks'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText('Hours'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText('Evidence Produced'), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 1-2', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Problem Discovery', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Draft interview guide; reach out to 10 target prospects', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Target outreach log', style: const pw.TextStyle(fontSize: 7))),
                ]),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 3-4', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Customer Interviews', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Conduct 6 structured interviews; record pain points', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('6 interview transcripts', style: const pw.TextStyle(fontSize: 7))),
                ]),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 5-6', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Concierge MVP Test', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Design manual workflow; run prototype with 3 users', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Pilot feedback logs', style: const pw.TextStyle(fontSize: 7))),
                ]),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 7-8', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Price & Offer Test', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Present pricing terms to 5 prospective customers', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('2 signed LOIs / deposits', style: const pw.TextStyle(fontSize: 7))),
                ]),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 9-10', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Pilot Evaluation', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Measure retention, manual effort, and customer NPS', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Pilot metrics report', style: const pw.TextStyle(fontSize: 7))),
                ]),
                pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('W 11-12', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Commercial Decision', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('Reassess evidence; decide whether to Build, Pivot, or Stop', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('5 hrs/wk', style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text('PitchLab Reassessment', style: const pw.TextStyle(fontSize: 7))),
                ]),
              ],
            ),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= FINAL PAGE: ACTION PLAN & CTA =================
            _buildSectionHeaderPDF('Your PitchLab Action Plan & Next Steps'),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: const pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(_cleanPdfText('Master Recommendation: ${res.masterRecommendation}'), style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                  pw.SizedBox(height: 3),
                  pw.Text(_cleanPdfText('Immediate 7-Day Action: ${res.nextSevenDaysAction}'), style: pw.TextStyle(fontSize: 8.5, color: PdfColors.teal200, fontWeight: pw.FontWeight.bold)),
                ],
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(_cleanPdfText('Top 5 Commercial Priorities:'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            ...res.topFivePriorities.map((p) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 3),
              child: pw.Bullet(
                text: _cleanPdfText('${p['priority']}: ${p['action']} (Success Metric: ${p['metric']})'),
                style: const pw.TextStyle(fontSize: 8),
              ),
            )),
            pw.SizedBox(height: 10),
            // P.A.R.A.-Inspired Idea Portfolio & Decision Gateway (Fix 14)
            pw.Container(
              padding: const pw.EdgeInsets.all(8),
              decoration: const pw.BoxDecoration(color: PdfColors.blue50, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(_cleanPdfText('Idea Portfolio Decision: ${res.decisionState} (Stage: ${res.ventureStage})'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText('Preserved Problem: ${res.underlyingProblem} (${res.problemStatus})'), style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText('Proposed Solution: ${res.currentProposedSolution} (${res.solutionStatus})'), style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText('Portfolio Action: ${res.portfolioAction}'), style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey800)),
                ],
              ),
            ),
            pw.SizedBox(height: 8),
            pw.Container(
              padding: const pw.EdgeInsets.all(8),
              decoration: const pw.BoxDecoration(color: PdfColors.grey100, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(_cleanPdfText('Next Evidence Gateway:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText(res.nextEvidenceGateway), style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey900)),
                  pw.SizedBox(height: 4),
                  pw.Text(_cleanPdfText('When to Return for Reassessment:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText(res.reassessmentTrigger), style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey900)),
                ],
              ),
            ),
            pw.SizedBox(height: 12),
            pw.Text(_cleanPdfText('Your PitchLab score reflects your current level of commercial readiness. It is not a permanent grade on you or your business idea.'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
          ];
        },
      ),
    );

    final bytes = await pdf.save();
    final String filename = buildPdfFilename(rawEvaluation, res.assessmentDate);

    // Save and store PDF report permanently in Firebase Storage
    try {
      final user = FirebaseAuth.instance.currentUser;
      final evalId = rawEvaluation['id'] ?? rawEvaluation['docId'] ?? rawEvaluation['evalId'];
      if (user != null && evalId != null && evalId.toString().isNotEmpty) {
        final storageRef = FirebaseStorage.instance.ref().child('reports/${user.uid}/$filename');
        await storageRef.putData(bytes, SettableMetadata(contentType: 'application/pdf'));
        final downloadUrl = await storageRef.getDownloadURL();
        await FirebaseFirestore.instance.collection('EvaluationScore').doc(evalId.toString()).update({
          'pdfUrl': downloadUrl,
          'pdfFilename': filename,
          'pdfSavedAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      // Non-fatal fallback: PDF remains downloadable locally on device
    }

    await downloadPdfBytes(bytes, filename);
  }

  static String buildPdfFilename(Map<String, dynamic> rawEvaluation, String defaultDate) {
    // 1. Determine Date (YYYY-MM-DD)
    String dateStr = '';
    if (rawEvaluation['meta']?['assessmentDate'] != null && rawEvaluation['meta']['assessmentDate'].toString().trim().isNotEmpty) {
      dateStr = rawEvaluation['meta']['assessmentDate'].toString().trim();
    }
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(dateStr)) {
      dateStr = defaultDate.trim();
    }
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(dateStr)) {
      final now = DateTime.now();
      final y = now.year.toString().padLeft(4, '0');
      final m = now.month.toString().padLeft(2, '0');
      final d = now.day.toString().padLeft(2, '0');
      dateStr = '$y-$m-$d';
    }

    // 2. Locate supplied business name or raw concept input
    String rawInput = '';
    if (rawEvaluation['meta']?['businessName'] != null &&
        rawEvaluation['meta']['businessName'].toString().trim().isNotEmpty &&
        rawEvaluation['meta']['businessName'].toString().trim() != 'My Startup Idea' &&
        rawEvaluation['meta']['businessName'].toString().trim() != 'Idea Summary') {
      rawInput = rawEvaluation['meta']['businessName'].toString().trim();
    } else if (rawEvaluation['idea'] != null && rawEvaluation['idea'].toString().trim().isNotEmpty) {
      rawInput = rawEvaluation['idea'].toString().trim();
    } else if (rawEvaluation['ideaInputs'] is Map && rawEvaluation['ideaInputs']['idea'] != null && rawEvaluation['ideaInputs']['idea'].toString().trim().isNotEmpty) {
      rawInput = rawEvaluation['ideaInputs']['idea'].toString().trim();
    } else if (rawEvaluation['businessIdea'] != null && rawEvaluation['businessIdea'].toString().trim().isNotEmpty) {
      rawInput = rawEvaluation['businessIdea'].toString().trim();
    }

    if (rawInput.isEmpty) {
      return 'PitchLab_Founder_Assessment_$dateStr.pdf';
    }

    // 3. Extract Business or Concept Name Segment
    final String conceptSegment = _extractConceptSegment(rawInput);

    if (conceptSegment.isEmpty || conceptSegment.toLowerCase() == 'founder' || conceptSegment.toLowerCase() == 'idea_summary') {
      return 'PitchLab_Founder_Assessment_$dateStr.pdf';
    }

    return 'PitchLab_${conceptSegment}_Assessment_$dateStr.pdf';
  }

  static String _extractConceptSegment(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return '';

    // Patterns for common sentence filler prefixes
    final sentencePrefixes = [
      RegExp(r"^i\s+want\s+to\s+develop\s+new\s+zealand'?s\s+first\s+commercial\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+develop\s+nz'?s\s+first\s+commercial\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+develop\s+a\s+commercial\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+develop\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+build\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+create\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s+launch\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+want\s+to\s*", caseSensitive: false),
      RegExp(r"^we\s+want\s+to\s*", caseSensitive: false),
      RegExp(r"^we\s+are\s+building\s+an?\s*", caseSensitive: false),
      RegExp(r"^we\s+are\s+developing\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+am\s+building\s+an?\s*", caseSensitive: false),
      RegExp(r"^i\s+am\s+developing\s+an?\s*", caseSensitive: false),
      RegExp(r"^developing\s+an?\s*", caseSensitive: false),
      RegExp(r"^building\s+an?\s*", caseSensitive: false),
      RegExp(r"^creating\s+an?\s*", caseSensitive: false),
      RegExp(r"^a\s+platform\s+for\s*", caseSensitive: false),
      RegExp(r"^a\s+platform\s+that\s*", caseSensitive: false),
      RegExp(r"^an?\s+app\s+for\s*", caseSensitive: false),
      RegExp(r"^an?\s+app\s+that\s*", caseSensitive: false),
      RegExp(r"^a\s+system\s+for\s*", caseSensitive: false),
      RegExp(r"^a\s+service\s+for\s*", caseSensitive: false),
      RegExp(r"^a\s+software\s+for\s*", caseSensitive: false),
      RegExp(r"^my\s+idea\s+is\s+to\s*", caseSensitive: false),
      RegExp(r"^this\s+idea\s+is\s+a\s*", caseSensitive: false),
    ];

    bool isSentence = false;
    for (final rx in sentencePrefixes) {
      if (rx.hasMatch(trimmed)) {
        isSentence = true;
        break;
      }
    }

    final wordsInOriginal = trimmed.split(RegExp(r'\s+'));
    // If founder supplied a clean brand / business name (1-4 words, <= 30 chars, no sentence prefix)
    if (!isSentence && wordsInOriginal.length <= 4 && trimmed.length <= 30) {
      return _sanitizeFilenameSegment(trimmed);
    }

    // Sentence description -> extract 2-5 word concept label
    String cleaned = trimmed;
    for (final rx in sentencePrefixes) {
      cleaned = cleaned.replaceFirst(rx, '');
    }

    final rawTokens = cleaned.split(RegExp(r'[\s\-_]+'));
    final stopWords = {
      'i', 'me', 'my', 'we', 'our', 'want', 'to', 'develop', 'build', 'create', 'launch',
      'a', 'an', 'the', 'first', 'commercial', 'nz', 'nzs', 'new', 'zealand', 'zealands',
      'in', 'of', 'for', 'with', 'and', 'or', 'is', 'that', 'this', 'on', 'at', 'by', 'from',
      'supplying', 'providing', 'delivering', 'offering', 'using', 'based', 'app', 'application',
      'system', 'platform', 'service', 'tool', 'solution'
    };

    final List<String> conceptWords = [];

    for (var token in rawTokens) {
      final cleanToken = token.replaceAll(RegExp(r'[^\w]'), '');
      if (cleanToken.isEmpty) continue;
      if (!stopWords.contains(cleanToken.toLowerCase())) {
        final cap = cleanToken[0].toUpperCase() + cleanToken.substring(1);
        conceptWords.add(cap);
      }
      if (conceptWords.length >= 4) break;
    }

    if (conceptWords.isEmpty) {
      for (var token in rawTokens) {
        final cleanToken = token.replaceAll(RegExp(r'[^\w]'), '');
        if (cleanToken.isNotEmpty) {
          conceptWords.add(cleanToken[0].toUpperCase() + cleanToken.substring(1));
        }
        if (conceptWords.length >= 3) break;
      }
    }

    if (conceptWords.isEmpty) return '';

    return _sanitizeFilenameSegment(conceptWords.join('_'));
  }

  static String _sanitizeFilenameSegment(String input) {
    String s = input
        .replaceAll(RegExp(r'''['"’‘“”\/\:\\\?\*\|\<\>\:\;\,\!\@\#\$\%\^\&\*\(\)\=\+\[\]\{\}]'''), '')
        .replaceAll(RegExp(r'[\s\-_]+'), '_')
        .trim();

    s = s.replaceAll(RegExp(r'^_+|_+$'), '');

    if (s.length > 40) {
      s = s.substring(0, 40).replaceAll(RegExp(r'_+$'), '');
    }

    return s;
  }

  static String _cleanPdfText(String input, {bool isHardware = false}) {
    if (input.isEmpty) return input;
    String s = input
        .replaceAll('’', "'")
        .replaceAll('‘', "'")
        .replaceAll('“', '"')
        .replaceAll('”', '"')
        .replaceAll('—', '-')
        .replaceAll('–', '-')
        .replaceAll('…', '...')
        .replaceAll('•', '-')
        .replaceAll(RegExp(r'[^\x00-\x7F]'), '');

    // FIX: Remove malformed regex artifacts ($1, lock-$1, tax agents$1)
    s = s.replaceAll(r'lock-$1', 'lock-in');
    s = s.replaceAll(r'$1', '');

    // FIX 2: Correct Assessment Confidence labeling
    s = s.replaceAll('Confidence: Moderate Confidence', 'Assessment Confidence: Moderate');
    s = s.replaceAll('Confidence: Low Confidence', 'Assessment Confidence: Low');
    s = s.replaceAll('Confidence: High Confidence', 'Assessment Confidence: High');
    s = s.replaceAll('Confidence: Moderate', 'Assessment Confidence: Moderate');
    s = s.replaceAll('Confidence: Low', 'Assessment Confidence: Low');
    s = s.replaceAll('Confidence: High', 'Assessment Confidence: High');

    // FIX 5: Remove NPS from early stage roadmaps
    s = s.replaceAll(RegExp(r'customer NPS', caseSensitive: false), 'qualitative satisfaction & problem resolution feedback');
    s = s.replaceAll(RegExp(r'NPS score', caseSensitive: false), 'user feedback & continuation willingness');
    s = s.replaceAll(RegExp(r'Net Promoter Score', caseSensitive: false), 'customer referral feedback');
    s = s.replaceAll(RegExp(r'\bNPS\b'), 'user feedback');

    s = s.replaceFirst(RegExp(r'^Advisor Insight:\s*Advisor Insight:\s*', caseSensitive: false), 'Advisor Insight: ');
    s = s.replaceAll('The goal is addresses a genuine commercial problem for The target market includes', 'This concept addresses a genuine commercial problem for the target market');
    s = s.replaceAll('The goal is addresses', 'This concept addresses');
    s = s.replaceAll('Synthesized founder credentials and background support project execution', 'Extracted founder professional experience and background');
    s = s.replaceAll('Synthesized founder credentials', 'Founder professional background');

    // FIX 1: Dynamic non-software/hardware wording adaptation
    if (isHardware) {
      s = s.replaceAll(RegExp(r'Design simple manual service before writing code\.', caseSensitive: false), 'Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.');
      s = s.replaceAll(RegExp(r'Design a simple manual service test before investing in software development\.', caseSensitive: false), 'Develop a simple functional prototype and field test the core concept before investing significantly in product development, tooling or manufacturing.');
      s = s.replaceAll(RegExp(r'before writing code', caseSensitive: false), 'before investing significantly in product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'investing in software development', caseSensitive: false), 'investing in product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'software development', caseSensitive: false), 'product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'Concierge MVP Test', caseSensitive: false), 'Prototype & Field Test');
      s = s.replaceAll(RegExp(r'Concierge MVP', caseSensitive: false), 'Field Test Prototype');
      s = s.replaceAll(RegExp(r'concierge pilot', caseSensitive: false), 'controlled field pilot');
      s = s.replaceAll(RegExp(r'writing code', caseSensitive: false), 'investing in product development & manufacturing');
    }

    s = s.replaceAllMapped(RegExp(r'\b(\w+)\s+\1\b', caseSensitive: false), (match) => match.group(1)!);
    s = s.replaceAll(RegExp(r'\s+'), ' ');
    s = s.replaceAll('..', '.');
    s = s.replaceAll(',.', '.');
    s = s.replaceAll('.,', '.');
    s = s.replaceAll(',,', ',');
    return s.trim();
  }

  static pw.Widget _buildSectionHeaderPDF(String title) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 8, bottom: 8),
      padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      decoration: const pw.BoxDecoration(color: PdfColors.blueGrey100, borderRadius: pw.BorderRadius.all(pw.Radius.circular(4))),
      child: pw.Text(_cleanPdfText(title), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
    );
  }

  static pw.Widget _buildSwotTableCellPDF(String title, List<String> items, PdfColor color) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(_cleanPdfText(title), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: color)),
          pw.SizedBox(height: 4),
          ...items.map((i) => pw.Text(_cleanPdfText('- $i'), style: const pw.TextStyle(fontSize: 8))),
        ],
      ),
    );
  }

  static pw.Widget _buildLcCellPDF(String title, List<String> items) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(_cleanPdfText(title), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
          pw.SizedBox(height: 2),
          ...items.map((i) => pw.Text(_cleanPdfText(i), style: const pw.TextStyle(fontSize: 7))),
        ],
      ),
    );
  }

  static pw.TableRow _buildPdfBmRow(String label, String value) {
    return pw.TableRow(
      children: [
        pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText(label), style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold))),
        pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(_cleanPdfText(value), style: const pw.TextStyle(fontSize: 7.5))),
      ],
    );
  }

  static String _limitConceptTo23Sentences(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return trimmed;
    final sentences = trimmed.split(RegExp(r'(?<=[.!?])\s+')).where((s) => s.trim().isNotEmpty).toList();
    if (sentences.length <= 3) return trimmed;
    return sentences.take(3).join(' ');
  }
}
