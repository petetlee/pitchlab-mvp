import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PdfService {
  static Future<void> generateReport(Map<String, dynamic> evaluation) async {
    final pdf = pw.Document();
    
    final summary = evaluation['summaryBlock'] as Map<String, dynamic>? ?? {};
    final whyScore = evaluation['whyThisScore'] as Map<String, dynamic>? ?? {};
    final topPriorities = summary['topPrioritiesNow'] as List<dynamic>? ?? [];
    final String executiveSummary = evaluation['executiveSummary']?.toString() ?? '';
    final String marketAnalysis = evaluation['marketAssessment']?['analysis']?.toString() ?? '';
    final String marketPattern = evaluation['marketAssessment']?['marketPatternSummary']?.toString() ?? '';
    final comparables = evaluation['realWorldComparables'] as Map<String, dynamic>? ?? {};

    final scores = evaluation['scores'] as Map<String, dynamic>? ?? {};
    final int overallScore = (scores['overall'] is num) ? (scores['overall'] as num).toInt() : 0;
    final decStatus = evaluation['decisionStatus'] as Map<String, dynamic>? ?? {};
    final tear = evaluation['tearDetails'] as Map<String, dynamic>? ?? {};
    final fMetrics = evaluation['founderMetrics'] as Map<String, dynamic>? ?? {};
    final mvp = evaluation['mvpFeasibility'] as Map<String, dynamic>? ?? {};
    final risks = evaluation['keyRisks'] as List<dynamic>? ?? [];
    final whatNot = evaluation['whatNotToBuild'] as List<dynamic>? ?? [];
    final nextActions = evaluation['nextActions'] as List<dynamic>? ?? [];
    final plan30 = evaluation['thirtyDayPlan'] as Map<String, dynamic>? ?? {};
    final finalRec = evaluation['finalRecommendation'] as Map<String, dynamic>? ?? {};

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return [
            // PAGE 1: V5 PREMIUM SUMMARY DASHBOARD
            pw.Header(
              level: 0,
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('PitchLab Commercial Evaluation', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                      pw.Text('MVP Version 5 - Final Refinement • Advisor-Led', style: pw.TextStyle(fontSize: 9, color: PdfColors.grey600, letterSpacing: 1.2)),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: const pw.BoxDecoration(color: PdfColors.black, borderRadius: pw.BorderRadius.all(pw.Radius.circular(8))),
                    child: pw.Text(summary['decisionStatus']?.toString().toUpperCase() ?? 'ANALYZED', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.white, letterSpacing: 1)),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 32),

            // Score & Ruthless Callouts
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  flex: 1,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(20),
                    decoration: pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16))),
                    child: pw.Column(
                      children: [
                        pw.Text('READINESS SCORE', style: pw.TextStyle(fontSize: 7, color: PdfColors.blueGrey100, fontWeight: pw.FontWeight.bold, letterSpacing: 1.5)),
                        pw.Text('$overallScore/100', style: pw.TextStyle(fontSize: 42, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.Expanded(
                  flex: 2,
                  child: pw.Column(
                    children: [
                      _buildSummaryCalloutPDF("BIGGEST RISK TO THIS IDEA", summary['biggestRiskToThisIdea']?.toString() ?? 'N/A', PdfColors.red900),
                      pw.SizedBox(height: 12),
                      _buildSummaryCalloutPDF("DO THIS BEFORE BUILDING MORE", summary['doThisBeforeBuildingMore']?.toString() ?? 'N/A', PdfColors.indigo900),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 32),

            // V5 Priorities & Strengths
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(child: _buildSummaryListPDF("TOP STRENGTHS", summary['topStrengths'] as List<dynamic>? ?? [], PdfColors.teal900)),
                pw.SizedBox(width: 32),
                pw.Expanded(child: _buildSummaryListPDF("TOP PRIORITIES NOW", topPriorities, PdfColors.blueGrey800)),
              ],
            ),
            pw.Divider(height: 60, color: PdfColors.grey300, thickness: 0.5),

            // 4. Why This Score?
            _buildSectionHeader('4. Why This Score?'),
            pw.Container(
              padding: const pw.EdgeInsets.all(16),
              decoration: pw.BoxDecoration(color: PdfColors.grey100, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(10)), border: pw.Border.all(color: PdfColors.grey300)),
              child: pw.Column(
                children: [
                  _buildWhyRowPDF("Strongest Area", whyScore['strongestArea']?.toString() ?? ''),
                  _buildWhyRowPDF("Weakest Area", whyScore['weakestArea']?.toString() ?? ''),
                  _buildWhyRowPDF("Main Drag on Score", whyScore['mainDragOnScore']?.toString() ?? ''),
                  _buildWhyRowPDF("Fastest Way to Improve", whyScore['fastestWayToImprove']?.toString() ?? ''),
                ]
              )
            ),
            pw.SizedBox(height: 48),

            // 5. Executive Summary
            _buildSectionHeader('5. Executive Summary'),
            pw.Text(executiveSummary, style: const pw.TextStyle(fontSize: 11, lineSpacing: 1.6)),
            pw.SizedBox(height: 48),

            // 6. Score Breakdown
            _buildSectionHeader('6. Detailed Score Breakdown'),
            _buildScoreBreakdownTable(scores),
            pw.SizedBox(height: 48),

            // 7. TEAR
            _buildSectionHeader('7. T.E.A.R. Strategic Analysis'),
            _buildTearSection('THEME', tear['theme'] ?? 'N/A'),
            _buildTearSection('EVIDENCE', tear['evidence'] ?? 'N/A'),
            _buildTearSection('ANALYSIS', tear['analysis'] ?? 'N/A'),
            _buildTearSection('RECOMMENDATION', tear['recommendation'] ?? 'N/A'),
            pw.SizedBox(height: 48),

            // 8. Founder Metrics
            _buildSectionHeader('8. Founder Metrics & Constraints'),
            pw.Text(fMetrics['analysis']?.toString() ?? '', style: const pw.TextStyle(fontSize: 10, lineSpacing: 1.4)),
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: const pw.BoxDecoration(color: PdfColors.blueGrey100),
              child: pw.Text("Founder Position: ${fMetrics['founderPositionSummary']}", style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
            ),
            pw.SizedBox(height: 48),

            // 9. Market Assessment
            _buildSectionHeader('9. Market & Customer Assessment'),
            pw.Text(marketAnalysis, style: const pw.TextStyle(fontSize: 10, lineSpacing: 1.5)),
            pw.SizedBox(height: 12),
            pw.Container(
                padding: const pw.EdgeInsets.all(10),
                decoration: const pw.BoxDecoration(color: PdfColors.blueGrey50),
                child: pw.Text("Market Pattern: $marketPattern", style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
              ),
            pw.SizedBox(height: 48),

            // 10. Real-World Comparables [V5 Final]
            _buildSectionHeader('10. Real-World Comparables'),
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(child: _buildComparablesColPDF("SUCCESS ANALOGUES", comparables['successes'] as List<dynamic>? ?? [], PdfColors.teal50)),
                pw.SizedBox(width: 20),
                pw.Expanded(child: _buildComparablesColPDF("FAILURE ANALOGUES", comparables['failures'] as List<dynamic>? ?? [], PdfColors.red50)),
              ],
            ),
            pw.SizedBox(height: 16),
            pw.Container(
              padding: const pw.EdgeInsets.all(16),
              decoration: pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text("ADVISOR INTERPRETATION", style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey300, letterSpacing: 1.2)),
                  pw.SizedBox(height: 6),
                  pw.Text(comparables['marketInterpretation']?.toString() ?? 'N/A', style: const pw.TextStyle(fontSize: 10, color: PdfColors.white, lineSpacing: 1.4)),
                ]
              )
            ),
            pw.SizedBox(height: 48),

            // 11. MVP Feasibility
            _buildSectionHeader(r'11. MVP Feasibility (< $5k NZD)'),
            pw.Text('Verdict: ${mvp['verdict']}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
            pw.SizedBox(height: 8),
            pw.Text('Suggested Format: ${mvp['suggestedFormat']}', style: const pw.TextStyle(fontSize: 10)),
            pw.SizedBox(height: 8),
            pw.Text('What to exclude (Phase 1):', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.red800)),
            ...(mvp['whatToExclude'] as List<dynamic>? ?? []).map((e) => pw.Bullet(text: e.toString(), style: const pw.TextStyle(fontSize: 9))),
            pw.SizedBox(height: 48),

            // 12. Key Risks
            _buildSectionHeader('12. Key Risks & Critical Gaps'),
            ...risks.map((r) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 10),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                   pw.Text("- ${r['name']}: ${r['whyItMatters']}", style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                   pw.Padding(padding: const pw.EdgeInsets.only(left: 12), child: pw.Text("Remediation: ${r['whatToProveOrFix']}", style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic, color: PdfColors.red800))),
                ]
              )
            )),
            pw.SizedBox(height: 48),

            // 13. What Not to Build
            _buildSectionHeader('13. What NOT To Build Yet'),
            ...whatNot.map((w) => pw.Bullet(text: w.toString(), style: pw.TextStyle(fontSize: 10, color: PdfColors.red700, fontWeight: pw.FontWeight.bold))),
            pw.SizedBox(height: 48),

            // 14. 30-Day Plan
            _buildSectionHeader('14. 30-Day Validation Plan'),
            _buildPlanWeekPDF('Week 1: ${plan30['week1']?['objective'] ?? ''}', plan30['week1'] as Map<String, dynamic>? ?? {}),
            pw.SizedBox(height: 12),
            _buildPlanWeekPDF('Week 2: ${plan30['week2']?['objective'] ?? ''}', plan30['week2'] as Map<String, dynamic>? ?? {}),
            pw.SizedBox(height: 12),
            _buildPlanWeekPDF('Week 3: ${plan30['week3']?['objective'] ?? ''}', plan30['week3'] as Map<String, dynamic>? ?? {}),
            pw.SizedBox(height: 12),
            _buildPlanWeekPDF('Week 4: ${plan30['week4']?['objective'] ?? ''}', plan30['week4'] as Map<String, dynamic>? ?? {}),
            pw.SizedBox(height: 48),

            // 15. Final Recommendation
            _buildSectionHeader('15. Final Recommendation (Advisor Verdict)'),
            pw.Container(
              padding: const pw.EdgeInsets.all(24),
              decoration: pw.BoxDecoration(color: PdfColors.blueGrey900, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16))),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                   pw.Text(finalRec['recommendation']?.toString().toUpperCase() ?? '', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                   pw.SizedBox(height: 12),
                   pw.Text(finalRec['why']?.toString() ?? '', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey400, lineSpacing: 1.5)),
                   pw.Divider(height: 32, thickness: 0.5, color: PdfColors.grey700),
                   _buildBackRecCalloutPDF("UNRESOLVED ISSUE", finalRec['biggestIssue'], PdfColors.red200),
                   pw.SizedBox(height: 10),
                   _buildBackRecCalloutPDF("PATH FORWARD", finalRec['pathForward'], PdfColors.green200),
                   pw.SizedBox(height: 10),
                   _buildBackRecCalloutPDF("CRITICAL WARNING", finalRec['explicitWarning'], PdfColors.orange200),
                ]
              )
            )
          ];
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  static pw.Widget _buildSectionHeader(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Text(title, style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
    );
  }

  static pw.Widget _buildTearSection(String title, String content) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 6),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11, color: PdfColors.blueGrey700)),
          pw.Text(content, style: const pw.TextStyle(fontSize: 11, lineSpacing: 1.3)),
        ],
      ),
    );
  }

  static pw.Widget _buildPlanWeekPDF(String title, Map<String, dynamic> week) {
     return pw.Padding(
       padding: const pw.EdgeInsets.only(bottom: 8),
       child: pw.Column(
         crossAxisAlignment: pw.CrossAxisAlignment.start,
         children: [
            pw.Text("$title: ${week['objective']?.toString() ?? ''}", style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
            ...(week['tasks'] as List<dynamic>? ?? []).map((t) => pw.Bullet(text: t.toString(), style: const pw.TextStyle(fontSize: 10))),
            pw.Text("Result: ${week['expectedResult']?.toString() ?? ''}", style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
         ]
       )
     );
  }

  static pw.Widget _buildScoreBreakdownTable(Map<String, dynamic> scores) {
    final breakdown = [
      ['Category', 'Pts', 'Explanation', 'Action'],
      ['Idea Clarity', scores['ideaClarity']?['score']?.toString() ?? '0', scores['ideaClarity']?['explanation']?.toString() ?? '', scores['ideaClarity']?['improvementAction']?.toString() ?? ''],
      ['Problem Strength', scores['problemStrength']?['score']?.toString() ?? '0', scores['problemStrength']?['explanation']?.toString() ?? '', scores['problemStrength']?['improvementAction']?.toString() ?? ''],
      ['Founder Fit', scores['founderFit']?['score']?.toString() ?? '0', scores['founderFit']?['explanation']?.toString() ?? '', scores['founderFit']?['improvementAction']?.toString() ?? ''],
      ['Market Attract', scores['marketAttractiveness']?['score']?.toString() ?? '0', scores['marketAttractiveness']?['explanation']?.toString() ?? '', scores['marketAttractiveness']?['improvementAction']?.toString() ?? ''],
      ['MVP Feasibility', scores['mvpFeasibility']?['score']?.toString() ?? '0', scores['mvpFeasibility']?['explanation']?.toString() ?? '', scores['mvpFeasibility']?['improvementAction']?.toString() ?? ''],
      ['Execute Readiness', scores['executionReadiness']?['score']?.toString() ?? '0', scores['executionReadiness']?['explanation']?.toString() ?? '', scores['executionReadiness']?['improvementAction']?.toString() ?? ''],
      ['Validate Readiness', scores['validationReadiness']?['score']?.toString() ?? '0', scores['validationReadiness']?['explanation']?.toString() ?? '', scores['validationReadiness']?['improvementAction']?.toString() ?? ''],
    ];

    return pw.TableHelper.fromTextArray(
      headers: breakdown[0],
      data: breakdown.sublist(1),
      headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
      cellStyle: const pw.TextStyle(fontSize: 9),
      headerDecoration: const pw.BoxDecoration(color: PdfColors.grey300),
      cellPadding: const pw.EdgeInsets.all(4),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(0.8),
        2: const pw.FlexColumnWidth(4),
        3: const pw.FlexColumnWidth(3),
      }
    );
  }

  static pw.Widget _buildSummaryCalloutPDF(String title, String content, PdfColor color) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: PdfColors.white,
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
        border: pw.Border.all(color: color, width: 1.5),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(title, style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: color, letterSpacing: 1.2)),
          pw.SizedBox(height: 4),
          pw.Text(content, style: const pw.TextStyle(fontSize: 9, color: PdfColors.black, lineSpacing: 1.3)),
        ],
      ),
    );
  }

  static pw.Widget _buildSummaryListPDF(String title, List<dynamic> items, PdfColor headerBgColor) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          width: double.infinity,
          decoration: pw.BoxDecoration(color: headerBgColor, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4))),
          child: pw.Text(title, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white, letterSpacing: 1.2)),
        ),
        pw.SizedBox(height: 8),
        ...items.map((item) => pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 6),
          child: pw.Bullet(text: item.toString(), style: const pw.TextStyle(fontSize: 9, color: PdfColors.black)),
        )),
      ],
    );
  }

  static pw.Widget _buildWhyRowPDF(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 120,
            child: pw.Text(label, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
          ),
          pw.Expanded(
            child: pw.Text(value, style: const pw.TextStyle(fontSize: 9, color: PdfColors.black)),
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildComparablesColPDF(String title, List<dynamic> items, PdfColor bgColor) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(color: bgColor, borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8))),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(title, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900, letterSpacing: 1.2)),
          pw.SizedBox(height: 8),
          ...items.map((item) {
            final name = item['name']?.toString() ?? 'Unknown';
            final desc = item['whatTheyDid']?.toString() ?? '';
            final lesson = item['whyItSucceeded']?.toString() ?? item['whatWentWrong']?.toString() ?? '';
            return pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 8),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text("• $name", style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
                  pw.Text(desc, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  pw.Text("Lesson: $lesson", style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey800)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  static pw.Widget _buildBackRecCalloutPDF(String label, dynamic value, PdfColor color) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(label, style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: color, letterSpacing: 1.2)),
        pw.SizedBox(height: 2),
        pw.Text(value?.toString() ?? '', style: const pw.TextStyle(fontSize: 9, color: PdfColors.white, lineSpacing: 1.3)),
      ],
    );
  }
}
