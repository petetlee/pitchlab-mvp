import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
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
        build: (pw.Context context) {
          return [
            // ================= PAGE 1: EXECUTIVE DECISION SUMMARY =================
            pw.Container(
              padding: const pw.EdgeInsets.only(bottom: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blueGrey900, width: 1)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(_cleanPdfText('PitchLab Founder Commercial Assessment'), style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                      pw.Text(_cleanPdfText('Independent Commercial Assessment & Staged Action Roadmap'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
                    child: pw.Text(_cleanPdfText('Current Stage: ${res.scoreBandName}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
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
                            pw.Text(_cleanPdfText('Confidence: ${res.assessmentConfidence}'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
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

            // 3 Priority Actions
            _buildSectionHeaderPDF('Three Immediate Priority Actions'),
            ...res.threePriorityActions.map((act) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 5),
              child: pw.Bullet(
                text: _cleanPdfText('${act['heading']}: ${act['explanation']} (Outcome: ${act['outcome']})'),
                style: const pw.TextStyle(fontSize: 8.5),
              ),
            )),
            pw.SizedBox(height: 14),

            // Executive Summary
            _buildSectionHeaderPDF('Executive Summary'),
            pw.Text(_cleanPdfText(res.executiveSummary), style: const pw.TextStyle(fontSize: 8.5, lineSpacing: 1.35)),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Note: This assessment reflects the current level of commercial evidence, not a permanent judgment on the founder or business idea.'), style: pw.TextStyle(fontSize: 7.5, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

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

            // ================= PAGE 3: SWOT ANALYSIS =================
            _buildSectionHeaderPDF('SWOT Analysis & Commercial Synthesis'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              children: [
                pw.TableRow(children: [
                  _buildSwotTableCellPDF('Strengths', res.swotStrengths, PdfColors.teal900),
                  _buildSwotTableCellPDF('Weaknesses', res.swotWeaknesses, PdfColors.orange900),
                ]),
                pw.TableRow(children: [
                  _buildSwotTableCellPDF('Opportunities', res.swotOpportunities, PdfColors.blue900),
                  _buildSwotTableCellPDF('Threats', res.swotThreats, PdfColors.red900),
                ]),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Commercial Synthesis Interpretation: ${res.swotInterpretation}'), style: const pw.TextStyle(fontSize: 8.5, lineSpacing: 1.3)),
            pw.Divider(height: 24, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 4: LEAN CANVAS =================
            _buildSectionHeaderPDF('Lean Canvas Architecture'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              children: [
                pw.TableRow(children: [
                  _buildLcCellPDF('1. Problem', res.lcProblem),
                  _buildLcCellPDF('2. Customer Segments', res.lcCustomerSegments),
                  _buildLcCellPDF('3. Unique Value Prop', [res.lcUniqueValueProp]),
                ]),
                pw.TableRow(children: [
                  _buildLcCellPDF('4. Proposed Solution', res.lcProposedSolution),
                  _buildLcCellPDF('5. Channels', res.lcChannels),
                  _buildLcCellPDF('6. Revenue Streams', res.lcRevenueStreams),
                ]),
                pw.TableRow(children: [
                  _buildLcCellPDF('7. Cost Structure', res.lcCostStructure),
                  _buildLcCellPDF('8. Key Metrics', res.lcKeyMetrics),
                  _buildLcCellPDF('9. Unfair Advantage', [res.lcUnfairAdvantage]),
                ]),
              ],
            ),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 5: KISS REVIEW & MVP FEASIBILITY =================
            _buildSectionHeaderPDF('Keep It Simple and Start Small (KISS Review)'),
            pw.Bullet(text: _cleanPdfText('Keep: ${res.kissKeep.join(", ")}'), style: const pw.TextStyle(fontSize: 9)),
            pw.Bullet(text: _cleanPdfText('Simplify: ${res.kissSimplify.join(", ")}'), style: const pw.TextStyle(fontSize: 9)),
            pw.Bullet(text: _cleanPdfText('Delay: ${res.kissDelay.join(", ")}'), style: const pw.TextStyle(fontSize: 9)),
            pw.Bullet(text: _cleanPdfText('Smallest Testable Version: ${res.kissSmallestTestableVersion}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 12),
            _buildSectionHeaderPDF('MVP Feasibility Stack'),
            pw.Text(_cleanPdfText('Format: ${res.mvpFormat} | Validation Budget: ${res.mvpBudget}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.Text(_cleanPdfText('Inclusions: ${res.mvpInclude.join(", ")}'), style: const pw.TextStyle(fontSize: 8)),
            pw.Text(_cleanPdfText('Exclusions: ${res.mvpExclude.join(", ")}'), style: const pw.TextStyle(fontSize: 8)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 6: BUSINESS THEME =================
            _buildSectionHeaderPDF('Business Theme & Strategic Positioning'),
            pw.Text(_cleanPdfText('Primary Theme: ${res.primaryTheme} | Secondary Theme: ${res.secondaryTheme}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 7 & 8: FOUNDER & REALITY =================
            _buildSectionHeaderPDF('Time, Capital & Founder Execution Reality'),
            pw.Bullet(text: _cleanPdfText('Weekly Available Hours: ${res.timeAvailable}'), style: const pw.TextStyle(fontSize: 9)),
            pw.Bullet(text: _cleanPdfText('Available Capital: ${res.capitalAvailable}'), style: const pw.TextStyle(fontSize: 9)),
            pw.Bullet(text: _cleanPdfText('Initial Risk Capital: ${res.riskCapital}'), style: const pw.TextStyle(fontSize: 9)),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Note: Many founders begin while balancing employment or existing commitments. Consistent progress is more important than unrealistic full-time expectations during early validation.'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

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
            pw.Text(_cleanPdfText('What is encouraging: Strong problem definition, domain experience, and capital discipline.'), style: const pw.TextStyle(fontSize: 8.5)),
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
            pw.Container(
              padding: const pw.EdgeInsets.all(8),
              decoration: const pw.BoxDecoration(color: PdfColors.grey100, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(_cleanPdfText('When to Return for Reassessment:'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                  pw.SizedBox(height: 2),
                  pw.Text(_cleanPdfText('Return to PitchLab after completing 6 customer interviews or 3 concierge pilot tests to update your evidence level and unlock your updated Commercial Readiness Score.'), style: const pw.TextStyle(fontSize: 7.5)),
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
    final String cleanBizName = _cleanPdfText(res.businessName).replaceAll(RegExp(r'[^\w\s-]'), '').replaceAll(' ', '_');
    final String filename = 'PitchLab_${cleanBizName}_Founder_Commercial_Assessment_${res.assessmentDate}.pdf';
    await downloadPdfBytes(bytes, filename);
  }

  static String _cleanPdfText(String input) {
    return input
        .replaceAll('’', "'")
        .replaceAll('‘', "'")
        .replaceAll('“', '"')
        .replaceAll('”', '"')
        .replaceAll('—', '-')
        .replaceAll('–', '-')
        .replaceAll('…', '...')
        .replaceAll('•', '-')
        .replaceAll(RegExp(r'[^\x00-\x7F]'), ''); // Ensure 100% ASCII font compatibility
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
}
