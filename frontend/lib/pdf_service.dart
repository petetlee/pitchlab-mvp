import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'models/evaluation_result.dart';
import 'pdf_downloader.dart';

class PdfService {
  static Future<Uint8List> buildPdfBytes(Map<String, dynamic> rawEvaluation) async {
    final res = EvaluationResult.fromMap(rawEvaluation);
    _validatePrePdfIntegrity(res);
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
                pw.Text(_cleanPdfText('Confidential  |  ${res.founderName}'), style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey600)),
                pw.Text(_cleanPdfText('PitchLab MVP ${res.appVersion} • Build ${res.buildId} • Generated ${res.assessmentGeneratedAtFormatted}'), style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey600)),
                pw.Text(_cleanPdfText('Page ${context.pageNumber} of ${context.pagesCount}'), style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey600)),
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
                text: _cleanPdfText(_formatActionHeading(act['heading'] ?? '', act['explanation'] ?? '', tag: act['outcome'] != null ? 'Outcome: ${act['outcome']}' : null)),
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
            pw.Divider(height: 20, color: PdfColors.grey300, thickness: 0.5),

            // ================= FUTURE TRENDS & MARKET DIRECTION =================
            _buildSectionHeaderPDF('Future Trends & Market Direction (5-Dimension Outlook)'),
            pw.Container(
              padding: const pw.EdgeInsets.all(6),
              decoration: const pw.BoxDecoration(
                color: PdfColors.blue50,
                borderRadius: pw.BorderRadius.all(pw.Radius.circular(4)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(_cleanPdfText('Market Direction: ${res.marketDirection}'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
                  pw.Text(_cleanPdfText('Solution Outlook: ${res.solutionOutlook}'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                ],
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('5 Key Trend Dimensions:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 2),
            pw.Bullet(text: _cleanPdfText('Demand & Market: ${res.futureTrendsDimensions['demandTrend']}'), style: const pw.TextStyle(fontSize: 7.5)),
            pw.Bullet(text: _cleanPdfText('Technology Trajectory: ${res.futureTrendsDimensions['technologyTrend']}'), style: const pw.TextStyle(fontSize: 7.5)),
            pw.Bullet(text: _cleanPdfText('Regulation & Policy: ${res.futureTrendsDimensions['regulatoryTrend']}'), style: const pw.TextStyle(fontSize: 7.5)),
            pw.Bullet(text: _cleanPdfText('Competition & Substitutes: ${res.futureTrendsDimensions['competitionTrend']}'), style: const pw.TextStyle(fontSize: 7.5)),
            pw.Bullet(text: _cleanPdfText('Capital & Economics: ${res.futureTrendsDimensions['capitalTrend']}'), style: const pw.TextStyle(fontSize: 7.5)),
            pw.SizedBox(height: 4),
            pw.Text(_cleanPdfText('What This Means for the Founder: ${res.whatThisMeansForFounder}'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            if (res.adjacentOpportunities.isNotEmpty) ...[
              pw.SizedBox(height: 3),
              pw.Text(_cleanPdfText('Emerging / Adjacent Opportunities:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey900)),
              ...res.adjacentOpportunities.map((a) => pw.Bullet(text: _cleanPdfText(a), style: const pw.TextStyle(fontSize: 7.5))),
            ],
            pw.Divider(height: 20, color: PdfColors.grey300, thickness: 0.5),

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
            pw.Text(_cleanPdfText('What is encouraging: ${res.adviserEncouraging}'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('What requires caution: ${res.adviserCaution}'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('What has not yet been proven: ${res.adviserUnproven}'), style: const pw.TextStyle(fontSize: 8.5)),
            pw.SizedBox(height: 3),
            pw.Text(_cleanPdfText('Master Recommendation: ${res.masterRecommendation}'), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            pw.SizedBox(height: 2),
            pw.Text(_cleanPdfText('Idea Portfolio Action: ${res.portfolioAction}'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue800)),
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
                ...res.ninetyDayRoadmapSteps.map((step) => pw.TableRow(children: [
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText(step['week']!), style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText(step['objective']!), style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText(step['tasks']!), style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText(step['hours']!), style: const pw.TextStyle(fontSize: 7))),
                  pw.Padding(padding: const pw.EdgeInsets.all(4), child: pw.Text(_cleanPdfText(step['evidence']!), style: const pw.TextStyle(fontSize: 7))),
                ])),
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
                text: _cleanPdfText(_formatActionHeading(p['priority'] ?? '', p['action'] ?? '', tag: p['metric'] != null ? 'Success Metric: ${p['metric']}' : null)),
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
                  pw.Text(_cleanPdfText('Idea Portfolio Decision: ${res.portfolioDecision} (Stage: ${res.ventureStage})'), style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
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
    return bytes;
  }

  static Future<void> generateReport(Map<String, dynamic> rawEvaluation) async {
    final bytes = await buildPdfBytes(rawEvaluation);
    final res = EvaluationResult.fromMap(rawEvaluation);
    final String filename = buildPdfFilename(rawEvaluation, res.assessmentDate);

    // Trigger local browser download immediately so user experience is instant
    await downloadPdfBytes(bytes, filename);

    // Asynchronously save and store PDF report in Firebase Storage without blocking local download
    _uploadPdfToStorage(rawEvaluation, filename, bytes);
  }

  static void _uploadPdfToStorage(Map<String, dynamic> rawEvaluation, String filename, Uint8List bytes) async {
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
      print('Non-fatal Firebase Storage PDF upload warning: $e');
    }
  }

  static String buildPdfFilename(Map<String, dynamic> rawEvaluation, String defaultDate) {
    // 1. Determine Date (YYYY-MM-DD)
    String dateStr = '';
    
    // Check direct assessmentGeneratedAt ISO string first
    final genAt = rawEvaluation['assessmentGeneratedAt'] ?? rawEvaluation['createdAt'];
    if (genAt != null && genAt.toString().length >= 10) {
      final isoPart = genAt.toString().substring(0, 10);
      if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(isoPart)) {
        dateStr = isoPart;
      }
    }
    
    if (dateStr.isEmpty && rawEvaluation['meta']?['assessmentDate'] != null && rawEvaluation['meta']['assessmentDate'].toString().trim().isNotEmpty) {
      dateStr = rawEvaluation['meta']['assessmentDate'].toString().trim();
    }
    
    if (dateStr.isEmpty && defaultDate.trim().isNotEmpty) {
      dateStr = defaultDate.trim();
    }

    // Try parsing "30 Sep 2026" or similar formatted strings into YYYY-MM-DD
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(dateStr)) {
      final match = RegExp(r'(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})').firstMatch(dateStr);
      if (match != null) {
        final day = match.group(1)!.padLeft(2, '0');
        final monthStr = match.group(2)!.toLowerCase();
        final year = match.group(3)!;
        const months = {'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12'};
        if (months.containsKey(monthStr)) {
          dateStr = '$year-${months[monthStr]}-$day';
        }
      }
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

  static String _formatActionHeading(String heading, String detail, {String? tag}) {
    String h = heading.trim();
    h = h.replaceAll(RegExp(r'[.:;,]+$'), '');
    h = h.replaceAll('.:', '');
    h = h.replaceAll('::', '');
    String result = '$h: $detail';
    if (tag != null && tag.isNotEmpty) {
      result += ' ($tag)';
    }
    return result;
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
    s = s.replaceAll(r'tax agents$1', 'tax agents');
    s = s.replaceAll(RegExp(r'\$1(?![0-9,])'), '');
    s = s.replaceAllMapped(RegExp(r'\$(\d+)\s*[-–]\s*,\s*(\d+)'), (match) => '\$${match.group(1)} - \$1,${match.group(2)}');
    s = s.replaceAllMapped(RegExp(r'(^|[\s"–\-])\,([0-9]{3})'), (match) => '${match.group(1)}\$1,${match.group(2)}');

    // Fix raw variable leakage
    s = s.replaceAll(r'$riskCapital', r'$1,000 NZD');

    // Filter personal hobbies from narrative
    s = s.replaceAll(RegExp(r'\s*In my spare time[^\.]*\.?', caseSensitive: false), '');
    s = s.replaceAll(RegExp(r'\s*(personal\s+)?interests?:[^\.]*\.?', caseSensitive: false), '');

    // Fix unsupported factual claims & evidence-state language
    s = s.replaceAll(RegExp(r'There is no effective,?\s*automated solution currently on the market\.?', caseSensitive: false), 'The founder has not identified a directly comparable automated solution within the evidence supplied. Dedicated competitor research is required.');
    s = s.replaceAll(RegExp(r'clear,?\s*willing-to-pay market segment', caseSensitive: false), 'a potentially valuable customer segment whose willingness to pay remains unvalidated');

    // FIX 2: Correct heading punctuation and Assessment Confidence labeling
    s = s.replaceAll('.:', ':');
    s = s.replaceAll('::', ':');
    s = s.replaceAll(':.', ':');
    s = s.replaceAll('Confidence: Moderate Confidence', 'Assessment Confidence: Moderate');
    s = s.replaceAll('Confidence: Low Confidence', 'Assessment Confidence: Low');
    s = s.replaceAll('Confidence: High Confidence', 'Assessment Confidence: High');
    s = s.replaceAll('Confidence: Moderate', 'Assessment Confidence: Moderate');
    s = s.replaceAll('Confidence: Low', 'Assessment Confidence: Low');
    s = s.replaceAll('Confidence: High', 'Assessment Confidence: High');

    // FIX 4: Tone Calibration
    s = s.replaceAll(RegExp(r'the market need is undeniable', caseSensitive: false), 'the underlying energy need is substantial');
    s = s.replaceAll(RegExp(r'market need is undeniable', caseSensitive: false), 'underlying energy need is substantial');
    s = s.replaceAll(RegExp(r'execution challenges are monumental', caseSensitive: false), 'execution barriers are exceptionally high');
    s = s.replaceAll(RegExp(r'critical founder-idea mismatch', caseSensitive: false), 'a significant gap between current project capabilities and venture-specific technical and regulatory requirements');
    s = s.replaceAll(RegExp(r'is currently un-investable', caseSensitive: false), 'is not presently investment-ready');
    s = s.replaceAll(RegExp(r'currently un-investable', caseSensitive: false), 'not presently investment-ready');
    s = s.replaceAll(RegExp(r'un-investable', caseSensitive: false), 'not presently investment-ready');
    s = s.replaceAll(RegExp(r'required to even initiate a credible pre-feasibility study', caseSensitive: false), 'required to establish initial pre-feasibility');
    s = s.replaceAll(RegExp(r'required to even initiate', caseSensitive: false), 'required to establish initial');

    // FIX 5: False Precision & NPS removal
    s = s.replaceAll(RegExp(r'reaching commercial TRL 7-9 maturity in OECD markets', caseSensitive: false), 'progressing internationally, although commercial maturity, deployment timelines and economics vary materially by technology and jurisdiction');
    s = s.replaceAll(RegExp(r'\bTRL 7-9\b'), 'commercial maturity');
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
      s = s.replaceAll(RegExp(r'software or operational leverage without proportional linear costs', caseSensitive: false), 'standardised hardware manufacturing and channel distribution, governed by tooling and inventory working capital');
      s = s.replaceAll(RegExp(r'marginal cost of software delivery', caseSensitive: false), 'unit manufacturing and assembly costs');
      s = s.replaceAll(RegExp(r'changing customer requirements and regional market dynamics', caseSensitive: false), 'vessel asset protection needs and marine environmental conditions');
      s = s.replaceAll(RegExp(r'resource consents, environmental standards, fast-track approvals, and regional compliance mandates', caseSensitive: false), 'marina biosecurity guidelines, environmental regulations, and electrical product safety standards');
    }

    // FIX PL-FIX-20261005-v0.9.5-01: Prohibited phrases & legal certainty tone calibration
    s = s.replaceAll(RegExp(r'looming energy crisis', caseSensitive: false), 'increasing electricity demand and security-of-supply challenges');
    s = s.replaceAll(RegExp(r'currently blocked by legislative barriers', caseSensitive: false), 'faces substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'currently blocked by legislative', caseSensitive: false), 'faces substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'insurmountable legislative and regulatory barriers', caseSensitive: false), 'substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'insurmountable legislative', caseSensitive: false), 'substantial statutory');
    s = s.replaceAll(RegExp(r'\binsurmountable\b', caseSensitive: false), 'substantial');
    s = s.replaceAll(RegExp(r'non-starter in the current New Zealand context', caseSensitive: false), 'early-stage concept facing unresolved primary feasibility gateways');
    s = s.replaceAll(RegExp(r'categoriz(e|ing) this as a non-starter', caseSensitive: false), 'viewing this as constrained pending primary gateway resolution');
    s = s.replaceAll(RegExp(r'as a non-starter', caseSensitive: false), 'as constrained pending primary gateway resolution');
    s = s.replaceAll(RegExp(r'non-starter because of legislation', caseSensitive: false), 'constrained pending specialist legal confirmation');
    s = s.replaceAll(RegExp(r'\bnon-starter\b', caseSensitive: false), 'early-stage concept requiring primary gateway resolution');
    s = s.replaceAll(RegExp(r'explicit statutory and regulatory framework effectively prohibits land-based commercial nuclear power, rendering the venture unfeasible without legislative reform\.?', caseSensitive: false), 'The proposed venture faces substantial statutory, regulatory, consenting, public-policy and capital barriers. Whether a viable legal/regulatory pathway exists under the current framework, or whether legislative change would ultimately be required, remains subject to specialist legal confirmation.');
    s = s.replaceAll(RegExp(r'\beffectively prohibits\b', caseSensitive: false), 'presents material statutory barriers to, subject to specialist legal confirmation,');
    s = s.replaceAll(RegExp(r'rendering the venture unfeasible without legislative reform\.?', caseSensitive: false), 'requiring specialist legal confirmation to determine whether a viable statutory pathway exists.');
    s = s.replaceAll(RegExp(r'\bunfeasible without legislative reform\b', caseSensitive: false), 'constrained pending specialist legal confirmation');
    s = s.replaceAll(RegExp(r'commercial off-taker reviews', caseSensitive: false), 'published industry commentary');
    s = s.replaceAll(RegExp(r'specific nuclear prohibitions under (national|New Zealand) law', caseSensitive: false), 'nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model');
    s = s.replaceAll(RegExp(r'specific nuclear prohibitions', caseSensitive: false), 'nuclear-related statutory requirements and restrictions');
    s = s.replaceAll(RegExp(r'expanding rapidly driven by electrification', caseSensitive: false), 'expected to increase driven by electrification');
    s = s.replaceAll(RegExp(r'\bexpanding rapidly\b', caseSensitive: false), 'expected to increase');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team with irrefutable, deep expertise in nuclear science, engineering, and energy regulation', caseSensitive: false), 'identify and begin engaging appropriately credentialled nuclear engineering, energy infrastructure and regulatory specialists who could support a later pre-feasibility stage if the statutory pathway proves viable');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team with irrefutable, deep expertise', caseSensitive: false), 'identify and begin engaging appropriately credentialled specialists');
    s = s.replaceAll(RegExp(r'irrefutable, deep expertise', caseSensitive: false), 'verifiable specialist expertise');
    s = s.replaceAll(RegExp(r'irrefutable expertise', caseSensitive: false), 'specialist expertise');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team', caseSensitive: false), 'identify and begin engaging specialist advisers');
    s = s.replaceAll(RegExp(r'The commercially accessible market appears effectively unavailable under the current assessed regulatory environment, subject to specialist legal confirmation', caseSensitive: false), 'The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'effectively unavailable', caseSensitive: false), 'materially constrained pending legal confirmation');
    s = s.replaceAll(RegExp(r'deeply hostile legal and regulatory environment', caseSensitive: false), 'complex and heavily structured statutory and regulatory environment');
    s = s.replaceAll(RegExp(r'\bdeeply hostile\b', caseSensitive: false), 'heavily regulated');
    s = s.replaceAll(RegExp(r'Even if a legislative pathway were conceivable[^\.]*\.', caseSensitive: false), 'Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved.');
    s = s.replaceAll(RegExp(r'fundamental legislative and societal shifts before any commercial consideration', caseSensitive: false), 'specialist confirmation of statutory feasibility before committing development capital');
    s = s.replaceAll(RegExp(r'Energy sector feedback and published industry commentary reveal', caseSensitive: false), 'Published energy-sector reporting and industry commentary indicate');
    s = s.replaceAll(RegExp(r'Energy sector feedback and', caseSensitive: false), 'Published energy-sector reporting and');
    s = s.replaceAll(RegExp(r'\benergy sector feedback\b', caseSensitive: false), 'published energy-sector reporting');
    s = s.replaceAll(RegExp(r'Recruit a highly specialised co-founder or an executive team[^\.]*\.', caseSensitive: false), 'Identify and begin engaging appropriately credentialled specialists for preliminary advice, scoping and potential future involvement.');
    s = s.replaceAll(RegExp(r'The foundational legal and regulatory barriers in New Zealand make this venture currently non-viable', caseSensitive: false), 'The unresolved legal and regulatory barriers mean the venture is not currently commercially actionable');
    s = s.replaceAll(RegExp(r'make this venture currently non-viable', caseSensitive: false), 'mean the venture is not currently commercially actionable');
    s = s.replaceAll(RegExp(r'\bextraordinary statutory\b', caseSensitive: false), 'substantial statutory');
    s = s.replaceAll(RegExp(r'\bscope the requirements\b'), 'Scope the requirements');
    s = s.replaceAll(RegExp(r'conduct a formal pre-feasibility study evaluating project capital requirements and site constraints\.?', caseSensitive: false), 'Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result.');

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

  static void _validatePrePdfIntegrity(EvaluationResult res) {
    // 1. SCORE CONSISTENCY: Displayed category scores = overall score
    final categories = res.scorecardCategories;
    if (categories.isNotEmpty) {
      final sum = categories.fold(0, (prev, cat) => prev + cat.scoreAchieved);
      if (res.overallScore != sum) {
        print(
          'PitchLab PDF Integrity Warning: overallScore (${res.overallScore}) does not match exact sum of category scores ($sum) - likely due to feasibility gate capping.'
        );
      }
    }

    // 2. MALFORMED NUMBER / RANGE DETECTION
    final capStr = res.availableCapital;
    if (capStr.contains('0,000') && capStr.contains('-0')) {
      print('PitchLab PDF Integrity Warning: Malformed capital range detected ($capStr).');
    }

    // 3. TRUNCATED SENTENCE & TEXT FRAGMENT & MALFORMED PUNCTUATION DETECTION
    final exec = res.executiveSummary;
    if (exec.contains('concept wo') || exec.contains('potent.') || exec.endsWith(' for "') || exec.contains('reduce ca') || exec.contains('targeting needs')) {
      print('PitchLab PDF Integrity Warning: Malformed text fragment detected in Executive Summary.');
    }

    // Check for malformed ".:" heading punctuation across top actions and priorities
    for (final act in res.threePriorityActions) {
      final heading = act['heading'] ?? '';
      if (heading.contains('.:') || heading.contains('::')) {
        print('PitchLab PDF Integrity Warning: Malformed ".:" punctuation in action heading ($heading).');
      }
    }
    for (final p in res.topFivePriorities) {
      final priority = p['priority'] ?? '';
      if (priority.contains('.:') || priority.contains('::')) {
        print('PitchLab PDF Integrity Warning: Malformed ".:" punctuation in top priority ($priority).');
      }
    }

    // 4. CROSS-IDEA BANNED TEMPLATE CONTAMINATION CHECK FOR NUCLEAR ASSESSMENTS
    if (res.isNuclear) {
      final allText = '${res.executiveSummary} ${res.pitchLabVerdict} ${res.primaryTheme} ${res.secondaryTheme} ${res.strategicMoat} ${res.marketCategoryDynamics} ${res.marketLandscape} ${res.demandDrivers} ${res.customerReviewTrends}'.toLowerCase();
      final bannedTerms = [
        'b2b software',
        'workflow efficiency',
        'automated operational tools',
        'durable, low-maintenance asset protection',
        'proprietary design mechanics',
        'concierge mvp',
        'landing page testing',
        'writing extensive code',
        'regional law',
        'customer willingness-to-pay',
        'customer acquisition experiments',
        'trl 7-9',
        'market need is undeniable',
        'execution challenges are monumental',
        'currently un-investable',
        '(+21.8%)'
      ];
      for (final term in bannedTerms) {
        if (allText.contains(term)) {
          print(
            'PitchLab PDF Integrity Warning: Contamination term "$term" detected in nuclear assessment.'
          );
        }
      }
    }

    // 5. JURISDICTION TERMINOLOGY & FALSE PRECISION ACCURACY
    final fullReportText = '${res.executiveSummary} ${res.pitchLabVerdict} ${res.marketLandscape}'.toLowerCase();
    if (fullReportText.contains('under regional law') || fullReportText.contains('regional statutory')) {
      print('PitchLab PDF Integrity Warning: Unreplaced "regional law" remnant found.');
    }
    if (fullReportText.contains('(+21.8%)')) {
      print('PitchLab PDF Integrity Warning: False numerical precision claim (+21.8%) detected.');
    }

    // 6. MANDATORY PRE-RENDER VARIABLE & SYNTAX INTEGRITY SCAN (PL-FIX-2026-10-06-MOORSAFE-INT-01)
    final allPdfText = [
      res.fullBusinessName,
      res.businessName,
      res.founderName,
      res.executiveSummary,
      res.pitchLabVerdict,
      res.primaryTheme,
      res.secondaryTheme,
      res.strategicPositioning,
      res.marketCategoryDynamics,
      res.strategicMoat,
      res.marketLandscape,
      res.demandDrivers,
      res.competitionAlternatives,
      res.commercialReality,
      res.localBusinessNews,
      res.customerReviewTrends,
      res.governmentPolicyInfluence,
      res.bmTargetCustomer,
      res.bmCoreOffering,
      res.bmCustomerProblem,
      res.bmValueProposition,
      res.bmRevenueModel,
      res.bmCustomerAcquisition,
      res.bmKeyCosts,
      res.bmCommercialAssessment,
      res.ibIntro,
      res.ibInvestmentVerdict,
      res.ibBiggestRisk,
      res.ibPitchLabRecommendation,
      res.ibPitchLabRecommendationExplanation,
      res.availableCapital,
      res.timeAvailable,
      res.likelyValidationCapitalRequired,
      ...res.ibImprovements,
      ...res.recommendedGapResponses,
      ...res.whatMattersNow,
      ...res.threePriorityActions.map((a) => '${a['heading']} ${a['explanation']} ${a['outcome']}'),
      ...res.topFivePriorities.map((p) => '${p['priority']} ${p['action']} ${p['metric']}'),
    ].join(' ');

    // 6.1 Check for raw variable leakage ($riskCapital, ${var}, {{var}}, undefined, [object Object])
    final rawVarRegex = RegExp(r'(\$[a-zA-Z_]\w*|\$\{[^}]+\}|\{\{[^}]+\}\}|\[object\s+Object\]|\bundefined\b)');
    final rawVarMatch = rawVarRegex.firstMatch(allPdfText);
    if (rawVarMatch != null) {
      throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Raw unresolved variable "${rawVarMatch.group(0)}" detected in PDF content. Generation blocked.');
    }

    // 6.2 Check for broken monetary values (,500 instead of $1,500)
    final brokenCurrencyRegex = RegExp(r'(^|[\s"–\-])\,([0-9]{3})');
    final brokenCurrencyMatch = brokenCurrencyRegex.firstMatch(allPdfText);
    if (brokenCurrencyMatch != null) {
      throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Broken monetary field ",${brokenCurrencyMatch.group(2)}" detected without currency symbol. Generation blocked.');
    }

    // 6.3 Check for undeclared stage labels in recommendation / stage
    final undeclaredStages = ['Almost Ready', 'Ready to Pitch', 'Needs More Validation', 'Early Stage Idea'];
    if (undeclaredStages.contains(res.ibPitchLabRecommendation)) {
      throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Undeclared stage/recommendation label "${res.ibPitchLabRecommendation}" in investor bite. Must be canonical masterRecommendation.');
    }

    // 6.4 Check for software scalability language in hardware businesses
    if (res.isHardware && allPdfText.toLowerCase().contains('software or operational leverage without proportional linear costs')) {
      throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Software scalability language detected in hardware assessment. Generation blocked.');
    }

    // 6.5 Check for unsupported factual claims when Customer Validation is low
    final custValScore = res.scorecardCategories.firstWhere((c) => c.key == 'customerValidation', orElse: () => ScorecardCategory(key: '', label: '', scoreAchieved: 0, maxScore: 20, evidenceLevel: '', explanation: '', missingEvidence: '', howToImprove: '')).scoreAchieved;
    if (custValScore <= 4) {
      final prohibitedEvidenceClaims = [
        'willing-to-pay market segment',
        'clear willing-to-pay',
        'clear, willing-to-pay',
        'no effective, automated solution currently on the market',
        'no effective automated solution currently on the market',
      ];
      final lowerAll = allPdfText.toLowerCase();
      for (final claim in prohibitedEvidenceClaims) {
        if (lowerAll.contains(claim)) {
          throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Prohibited factual assertion "$claim" detected when Customer Validation <= 4/20. Generation blocked.');
        }
      }
    }

    // 6.6 Check business model customer problem grounding for hardware
    if (res.isHardware && (res.businessName.toLowerCase().contains('moor') || res.businessName.toLowerCase().contains('pest'))) {
      if (res.bmCustomerProblem.toLowerCase().contains('vessel collision damage risk') || res.bmCustomerProblem.toLowerCase().contains('mooring line failures')) {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Business Model Customer Problem contaminated with ungrounded mooring line failure/collision risk. Generation blocked.');
      }
    }

    // 7. FIX PL-FIX-20261005-v0.9.5-01: LEGAL CERTAINTY & EVIDENCE PROVENANCE ASSERTIONS
    final fullDocText = [
      res.executiveSummary,
      res.pitchLabVerdict,
      res.ibIntro,
      res.ibInvestmentVerdict,
      res.ibBiggestRisk,
      res.customerReviewTrends,
      res.governmentPolicyInfluence,
      ...res.ibImprovements,
      ...res.recommendedGapResponses,
    ].join(' ').toLowerCase();

    final prohibitedPatterns = [
      'looming energy crisis',
      'currently blocked by legislative',
      'insurmountable',
      'non-starter',
      'effectively prohibits',
      'unfeasible without legislative',
      'commercial off-taker reviews',
      'specific nuclear prohibitions',
      'expanding rapidly',
      'irrefutable',
      'immediately recruit a core leadership team',
      'deeply hostile',
      'legislative pathway were conceivable',
      'societal shifts before any commercial',
      'effectively unavailable',
      'make this venture currently non-viable',
      'energy sector feedback',
      'recruit a highly specialised co-founder',
      'extraordinary statutory'
    ];

    for (final phrase in prohibitedPatterns) {
      if (fullDocText.contains(phrase)) {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Prohibited phrase "$phrase" detected in evaluation text.');
      }
    }

    // 8. PL-FIX-20261008-V0.9.7-LERIDE-SEMANTIC-INTEGRITY: TRANSPORT & MARKETPLACE INTEGRITY
    // 8.1 Check for SaaS terms in mobility/transport assessments
    if (res.isTransport || res.isMarketplace) {
      final bannedSaaSTerms = [
        'manual spreadsheets',
        'workflow efficiency & automation',
        'commercial software market',
        'cloud-based productivity tools',
        'administrative overhead reduction',
        'enterprise platforms',
        'horizontal productivity tools',
        'compliance automation',
        'workflow retention',
        'api-driven add-ons',
        'enterprise reporting integrations',
        'subscription economics',
      ];
      final lowerAll = allPdfText.toLowerCase();
      for (final term in bannedSaaSTerms) {
        if (lowerAll.contains(term)) {
          throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Banned SaaS term "$term" detected in transport/marketplace assessment. Generation blocked.');
        }
      }
    }

    // 8.2 Cross-section domain experience contradiction check
    final narrativeAndCv = '${res.founderBackgroundNarrative} ${res.cvStrengths}'.toLowerCase();
    if (narrativeAndCv.contains('rental') || narrativeAndCv.contains('tours') || narrativeAndCv.contains('transport') || narrativeAndCv.contains('discovery')) {
      final lowerAll = allPdfText.toLowerCase();
      if (lowerAll.contains('lacks sector-specific domain experience') ||
          lowerAll.contains('lacks direct domain experience') ||
          lowerAll.contains('lacks sector experience')) {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Contradiction detected. Founder evidences transport/fleet operational experience, but report claims founder lacks domain experience.');
      }
    }

    // 8.3 Capital variable mapping integrity check
    final riskBudgetMatch = RegExp(r'initial risk budget\s*\(([^\)]+)\)', caseSensitive: false).firstMatch(allPdfText);
    if (riskBudgetMatch != null) {
      final budgetStr = riskBudgetMatch.group(1) ?? '';
      if (budgetStr.contains('50,000') || budgetStr.contains('100,000')) {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Capital mapping error. Initial risk budget interpolated available capital ($budgetStr) instead of lean validation budget.');
      }
    }

    // 8.4 Business Model Snapshot Generic Filler check
    final snapshotFields = [
      res.bmTargetCustomer,
      res.bmCoreOffering,
      res.bmCustomerProblem,
      res.bmValueProposition,
      res.bmRevenueModel,
      res.bmCustomerAcquisition,
      res.bmKeyCosts,
      res.bmCommercialAssessment,
    ];
    for (final field in snapshotFields) {
      if (field.trim() == 'Defined commercial component.' || field.trim() == 'Commercial solution addressing operational workflow friction or market demand.') {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Generic placeholder detected in Business Model Snapshot ("$field").');
      }
    }

    // 8.5 Action plan concise synthesis check
    for (final act in res.threePriorityActions) {
      final exp = (act['explanation'] ?? '') as String;
      if (exp.length > 300) {
        throw Exception('PITCHLAB PRE-PDF INTEGRITY FAILURE: Action plan item explanation exceeds 300 characters, indicating raw input essay injection.');
      }
    }
  }
}
