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
                      pw.Text(_cleanPdfText('PitchLab Founder Commercial Assessment'), style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                      pw.Text(_cleanPdfText('Independent Assessment of Your Business Idea & Commercial Next Steps'), style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const pw.BoxDecoration(color: PdfColors.blue900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(6))),
                    child: pw.Text(_cleanPdfText(res.scoreBandName.toUpperCase()), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 16),

            // Score & Verdict Row
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  flex: 1,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(16),
                    decoration: const pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: pw.BorderRadius.all(pw.Radius.circular(12))),
                    child: pw.Column(
                      children: [
                        pw.Text(_cleanPdfText('READINESS SCORE'), style: pw.TextStyle(fontSize: 8, color: PdfColors.blueGrey100, fontWeight: pw.FontWeight.bold)),
                        pw.Text('${res.overallScore}/100', style: pw.TextStyle(fontSize: 32, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                        pw.SizedBox(height: 4),
                        pw.Text(_cleanPdfText(res.scoreBandName), textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 10, color: PdfColors.green300, fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 16),
                pw.Expanded(
                  flex: 2,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(_cleanPdfText('PitchLab Verdict:'), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                      pw.SizedBox(height: 4),
                      pw.Text(_cleanPdfText(res.pitchLabVerdict), style: const pw.TextStyle(fontSize: 9, lineSpacing: 1.3)),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 16),

            // 3 Priority Actions
            _buildSectionHeaderPDF('Three Priority Actions'),
            ...res.threePriorityActions.map((act) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 6),
              child: pw.Bullet(
                text: _cleanPdfText('${act['heading']}: ${act['explanation']} (Outcome: ${act['outcome']})'),
                style: const pw.TextStyle(fontSize: 9),
              ),
            )),
            pw.SizedBox(height: 16),

            // Executive Summary
            _buildSectionHeaderPDF('Executive Summary'),
            pw.Text(_cleanPdfText(res.executiveSummary), style: const pw.TextStyle(fontSize: 9, lineSpacing: 1.4)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 2: SCORECARD =================
            _buildSectionHeaderPDF('PitchLab Reconciled Scorecard (7 Categories)'),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Scoring Category'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Score'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Evidence Level'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('Missing Evidence & Improvement Action'), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                ...res.scorecardCategories.map((cat) => pw.TableRow(
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText(cat.label), style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('${cat.scoreAchieved}/${cat.maxScore}', style: const pw.TextStyle(fontSize: 8))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText(cat.evidenceLevel), style: const pw.TextStyle(fontSize: 8))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(_cleanPdfText('${cat.missingEvidence} ${cat.howToImprove}'), style: const pw.TextStyle(fontSize: 8))),
                  ],
                )),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Total Score Reconciliation: Sum of categories = ${res.overallScore}/100.'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

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
            pw.Text(_cleanPdfText('SWOT Interpretation: ${res.swotInterpretation}'), style: const pw.TextStyle(fontSize: 9, lineSpacing: 1.3)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

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
            pw.Text(_cleanPdfText('What is encouraging: Strong problem definition and domain background.'), style: const pw.TextStyle(fontSize: 9)),
            pw.Text(_cleanPdfText('What requires caution: Ensure non-essential features are delayed until customer willingness to pay is tested.'), style: const pw.TextStyle(fontSize: 9)),
            pw.Text(_cleanPdfText('Current Recommendation: ${res.executiveSnapshot['recommendation']}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= PAGE 12+: 90-DAY ROADMAP =================
            _buildSectionHeaderPDF('90-Day Validation Roadmap'),
            pw.Text(_cleanPdfText('Phase 1: Days 1-30 - Understand the Problem'), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.Bullet(text: _cleanPdfText('Goal: Confirm whether the problem is frequent and painful enough to seek a better solution.'), style: const pw.TextStyle(fontSize: 8)),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Phase 2: Days 31-60 - Test the Solution'), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.Bullet(text: _cleanPdfText('Goal: Determine whether target customers consider the proposed solution valuable enough to trial.'), style: const pw.TextStyle(fontSize: 8)),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Phase 3: Days 61-90 - Validate Demand'), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.Bullet(text: _cleanPdfText('Goal: Gather sufficient evidence to decide whether further build investment is commercially justified.'), style: const pw.TextStyle(fontSize: 8)),
            pw.Divider(height: 32, color: PdfColors.grey300, thickness: 0.5),

            // ================= FINAL PAGE: ACTION PLAN =================
            _buildSectionHeaderPDF('Your PitchLab Action Plan'),
            pw.Text(_cleanPdfText('Current Recommendation: ${res.executiveSnapshot['recommendation']}'), style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.indigo900)),
            pw.SizedBox(height: 8),
            pw.Text(_cleanPdfText('Top 5 Commercial Priorities:'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            ...res.topFivePriorities.map((p) => pw.Bullet(
              text: _cleanPdfText('${p['priority']}: ${p['action']} (Target: ${p['metric']})'),
              style: const pw.TextStyle(fontSize: 8),
            )),
            pw.SizedBox(height: 12),
            pw.Text(_cleanPdfText('Your Next 7 Days: ${res.nextSevenDaysAction}'), style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
            pw.SizedBox(height: 16),
            pw.Text(_cleanPdfText('Your PitchLab score is a measure of current commercial readiness, not a permanent grade on you or your business idea.'), style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
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
