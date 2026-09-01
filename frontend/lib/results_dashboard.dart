import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'models/evaluation_result.dart';
import 'pdf_service.dart';
import 'history_view.dart';

class ResultsDashboard extends StatefulWidget {
  final Map<String, dynamic> evaluation;

  const ResultsDashboard({super.key, required this.evaluation});

  @override
  State<ResultsDashboard> createState() => _ResultsDashboardState();
}

class _ResultsDashboardState extends State<ResultsDashboard> with SingleTickerProviderStateMixin {
  late EvaluationResult result;
  late TabController _tabController;

  String? _selectedViewChanged;
  String? _selectedFinalDecision;
  bool _isSavingDecision = false;

  @override
  void initState() {
    super.initState();
    result = EvaluationResult.fromMap(widget.evaluation);
    _tabController = TabController(length: 8, vsync: this);

    final decisionMap = result.postAssessmentDecision;
    if (decisionMap != null) {
      _selectedViewChanged = decisionMap['viewChanged']?.toString();
      _selectedFinalDecision = decisionMap['finalDecision']?.toString();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1D1D1F),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'PitchLab Commercial Assessment',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
            tooltip: 'Download PDF Report',
            onPressed: () async {
              try {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('📄 Generating Standalone PDF Report...'), duration: Duration(seconds: 2)),
                );
                await PdfService.generateReport(widget.evaluation);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error generating PDF: $e'), backgroundColor: Colors.redAccent),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.history, color: Colors.white),
            tooltip: 'My Ideas & Assessment History',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const HistoryView()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Reassess Idea',
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          _buildHeroHeader(context),
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: const Color(0xFF0071E3),
              unselectedLabelColor: const Color(0xFF86868B),
              indicatorColor: const Color(0xFF0071E3),
              indicatorWeight: 3,
              labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(text: '1. Overview'),
                Tab(text: '2. Scorecard'),
                Tab(text: '3. Business Model'),
                Tab(text: '4. Founder'),
                Tab(text: '5. Validation'),
                Tab(text: '6. Market & Competition'),
                Tab(text: '7. 90-Day Plan'),
                Tab(text: '8. Action Plan'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(context),
                _buildScorecardTab(context),
                _buildBusinessModelTab(context),
                _buildFounderTab(context),
                _buildValidationTab(context),
                _buildMarketTab(context),
                _buildRoadmapTab(context),
                _buildActionPlanTab(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Header & Summary Hero Section
  Widget _buildHeroHeader(BuildContext context) {
    final snap = result.executiveSnapshot;

    return Container(
      width: double.infinity,
      color: const Color(0xFF1D1D1F),
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Your PitchLab Founder Commercial Assessment', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text('${result.conceptSummary} • ${result.assessmentDate} • Baseline Assessment', style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
                  ],
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(color: const Color(0xFF0071E3), borderRadius: BorderRadius.circular(20)),
                      child: Text('Current Stage: ${result.scoreBandName}', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white30)),
                      child: Text(result.masterRecommendation, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF64D2FF))),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Hero Card Layout
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Score Box
                Container(
                  width: 160,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white12)),
                  child: Column(
                    children: [
                      Text('READINESS SCORE', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white60)),
                      const SizedBox(height: 4),
                      Text('${result.overallScore}/100', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text('Current Stage:\n${result.scoreBandName}', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF34C759))),
                      const SizedBox(height: 6),
                      Text('Assessment Confidence: ${result.assessmentConfidence}', style: GoogleFonts.inter(fontSize: 9, color: Colors.white70, fontStyle: FontStyle.italic)),
                    ],
                  ),
                ),
                const SizedBox(width: 20),

                // Verdict & Actions
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFF0071E3).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF0071E3).withValues(alpha: 0.4))),
                        child: Text(result.pitchLabVerdict, style: GoogleFonts.inter(fontSize: 13, color: Colors.white, height: 1.4)),
                      ),
                      const SizedBox(height: 12),

                      // 3 Priority Actions
                      Row(
                        children: result.threePriorityActions.map((action) {
                          return Expanded(
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white10)),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(action['heading']!, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                                  const SizedBox(height: 2),
                                  Text(action['explanation']!, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.inter(fontSize: 10, color: Colors.white70)),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Executive Snapshot Strip
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildSnapshotChip('Recommendation', snap['recommendation']!, Colors.amber.shade300),
                  _buildSnapshotChip('Biggest Strength', snap['biggestStrength']!, Colors.green.shade300),
                  _buildSnapshotChip('Biggest Risk', snap['biggestRisk']!, Colors.red.shade300),
                  _buildSnapshotChip('Biggest Unknown', snap['biggestUnknown']!, Colors.blue.shade300),
                  _buildSnapshotChip('Time Available', snap['timeAvailable']!, Colors.purple.shade300),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(result.progressFraming, style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.white54)),
          ],
        ),
      ),
    );
  }

  Widget _buildSnapshotChip(String label, String value, Color color) {
    return Container(
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label: ', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
          Text(value, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.87))),
        ],
      ),
    );
  }

  Widget _buildPortfolioCard(BuildContext context) {
    Color badgeBg;
    final dec = result.decisionState.toUpperCase();

    if (dec.contains('PURSUE')) {
      badgeBg = const Color(0xFF34C759);
    } else if (dec.contains('INVESTIGATE')) {
      badgeBg = const Color(0xFF0071E3);
    } else if (dec.contains('REFRAME')) {
      badgeBg = const Color(0xFFFF9500);
    } else if (dec.contains('STOP')) {
      badgeBg = const Color(0xFFFF3B30);
    } else {
      badgeBg = const Color(0xFF8E8E93);
    }

    return _buildCard(
      'Idea Portfolio & Decision Gateway',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(6)),
                child: Text('PORTFOLIO DECISION: ${result.decisionState}', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.grey.shade300)),
                child: Text('STAGE: ${result.ventureStage}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.blue.shade50.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.blue.shade200)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('PRESERVED PROBLEM STATEMENT', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
                      const SizedBox(height: 4),
                      Text(result.underlyingProblem, style: GoogleFonts.inter(fontSize: 12, height: 1.3, color: Colors.black87)),
                      const SizedBox(height: 4),
                      Text('Status: ${result.problemStatus}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blue.shade800)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.amber.shade50.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.amber.shade200)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('CURRENT PROPOSED SOLUTION', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900)),
                      const SizedBox(height: 4),
                      Text(result.currentProposedSolution, style: GoogleFonts.inter(fontSize: 12, height: 1.3, color: Colors.black87)),
                      const SizedBox(height: 4),
                      Text('Status: ${result.solutionStatus}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.amber.shade900)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.flag_rounded, size: 16, color: Color(0xFF0071E3)),
                    const SizedBox(width: 6),
                    Text('NEXT EVIDENCE GATEWAY', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
                  ],
                ),
                const SizedBox(height: 4),
                Text(result.nextEvidenceGateway, style: GoogleFonts.inter(fontSize: 12, height: 1.4, color: Colors.black87)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.autorenew_rounded, size: 16, color: Color(0xFF34C759)),
                    const SizedBox(width: 6),
                    Text('REASSESSMENT TRIGGER', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
                  ],
                ),
                const SizedBox(height: 4),
                Text(result.reassessmentTrigger, style: GoogleFonts.inter(fontSize: 12, height: 1.4, color: Colors.black87)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // TAB 1: OVERVIEW
  Widget _buildOverviewTab(BuildContext context) {
    final snap = result.executiveSnapshot;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCard('Executive Summary', Text(result.executiveSummary, style: GoogleFonts.inter(fontSize: 14, height: 1.6, color: const Color(0xFF1D1D1F)))),
            const SizedBox(height: 20),

            // P.A.R.A.-Inspired Idea Portfolio & Decision Gateway Card (Fix 14)
            _buildPortfolioCard(context),
            const SizedBox(height: 20),

            _buildCard('Executive Snapshot Table', Table(
              border: TableBorder.all(color: Colors.grey.shade300, width: 1),
              children: [
                _buildTableRow('Overall Readiness', '${result.overallScore}/100 (${result.scoreBandName})'),
                _buildTableRow('Current Recommendation', snap['recommendation']!),
                _buildTableRow('Biggest Strength', snap['biggestStrength']!),
                _buildTableRow('Biggest Risk', snap['biggestRisk']!),
                _buildTableRow('Biggest Unknown', snap['biggestUnknown']!),
                _buildTableRow('Suggested Timeframe', snap['suggestedValidationPeriod']!),
                _buildTableRow('Capital Position', result.capitalAvailable),
              ],
            )),
            const SizedBox(height: 20),


            _buildCard('Business Model Snapshot', Table(
              border: TableBorder.all(color: Colors.grey.shade300, width: 1),
              columnWidths: const {
                0: FlexColumnWidth(1),
                1: FlexColumnWidth(2.2),
              },
              children: [
                TableRow(
                  decoration: BoxDecoration(color: Colors.grey.shade100),
                  children: [
                    Padding(padding: const EdgeInsets.all(8), child: Text('Business Model Snapshot', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                    Padding(padding: const EdgeInsets.all(8), child: Text('Assessment', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                  ],
                ),
                _buildTableRow('Target Customer', result.bmTargetCustomer),
                _buildTableRow('Core Offering', result.bmCoreOffering),
                _buildTableRow('Customer Problem', result.bmCustomerProblem),
                _buildTableRow('Value Proposition', result.bmValueProposition),
                _buildTableRow('Revenue Model', result.bmRevenueModel),
                _buildTableRow('Customer Acquisition', result.bmCustomerAcquisition),
                _buildTableRow('Key Costs', result.bmKeyCosts),
                _buildTableRow('Commercial Assessment', result.bmCommercialAssessment),
              ],
            )),
            const SizedBox(height: 20),

            _buildWouldInvestorsBiteCard(result),
            const SizedBox(height: 20),

            _buildPostAssessmentDecisionCard(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // TAB 2: SCORECARD
  Widget _buildScorecardTab(BuildContext context) {
    final categories = result.scorecardCategories;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PitchLab Reconciled Scorecard', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
            const SizedBox(height: 8),
            Text('The overall score of ${result.overallScore}/100 is strictly calculated from the sum of these 7 commercial categories.', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF86868B))),
            const SizedBox(height: 20),

            ...categories.map((cat) {
              final pct = cat.scoreAchieved / cat.maxScore;
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                child: ExpansionTile(
                  title: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(cat.label, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text('${cat.scoreAchieved}/${cat.maxScore}', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0071E3))),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: pct, minHeight: 6, backgroundColor: Colors.grey.shade100, valueColor: AlwaysStoppedAnimation(pct > 0.7 ? Colors.green : pct > 0.3 ? Colors.orange : Colors.blue)),
                    ),
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildDetailRow('Evidence Level', cat.evidenceLevel, isTag: true),
                          _buildDetailRow('Why this score', cat.explanation),
                          _buildDetailRow('What is missing', cat.missingEvidence),
                          _buildDetailRow('How to improve', cat.howToImprove, color: const Color(0xFF0071E3)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  // TAB 3: BUSINESS MODEL
  Widget _buildBusinessModelTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Business Model & Commercial Strategy', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),





            _buildCard('Market Insights', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.insights, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Commercial Market Adviser Briefing', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 14),
                ...result.marketInsightsParagraphs.map((para) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    para,
                    style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: const Color(0xFF1D1D1F)),
                  ),
                )),
              ],
            )),
          ],
        ),
      ),
    );
  }

  // TAB 4: FOUNDER
  Widget _buildFounderTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (result.founderBackgroundNarrative.isNotEmpty) ...[
              _buildCard('Founder Capability Summary & Advisory Insights', Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.history_edu, color: Color(0xFF0071E3), size: 20),
                      const SizedBox(width: 8),
                      Text("Synthesized Founder Input & Capability Insights", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    result.founderBackgroundSummary,
                    style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: const Color(0xFF1D1D1F)),
                  ),
                ],
              )),
              const SizedBox(height: 16),
            ],
            _buildCard('Founder Capability & Fit Assessment Breakdown', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.psychology_outlined, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Detailed Score & Evidence Breakdown', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 16),
                Text('Evidence Relied On:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF0071E3))),
                const SizedBox(height: 4),
                Text(result.evidenceReliedOn, style: GoogleFonts.inter(fontSize: 12.5, color: Colors.grey.shade800, height: 1.4)),
                const SizedBox(height: 14),
                Text('Why This Score Was Awarded:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green.shade800)),
                const SizedBox(height: 4),
                Text(result.whyThisScoreWasAwarded, style: GoogleFonts.inter(fontSize: 12.5, color: Colors.grey.shade800, height: 1.4)),
                const SizedBox(height: 14),
                Text('Identified Capability Gaps:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.orange.shade900)),
                const SizedBox(height: 6),
                ...result.capabilityGaps.map((gap) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                      Expanded(child: Text(gap, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800))),
                    ],
                  ),
                )),
                const SizedBox(height: 14),
                Text('Recommended Response to Gaps:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 6),
                ...result.recommendedGapResponses.map((rec) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.arrow_forward, size: 14, color: Color(0xFF0071E3)),
                      const SizedBox(width: 6),
                      Expanded(child: Text(rec, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800))),
                    ],
                  ),
                )),
              ],
            )),
            const SizedBox(height: 16),
            _buildCard('CV Analysis & Founder Credentials', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.badge_outlined, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Extracted Qualifications & Domain Experience', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 12),
                ...result.cvCredentials.map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline, color: Colors.green, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(c, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500))),
                    ],
                  ),
                )),
                const Divider(height: 24),
                Text('Synthesized Founder Strengths:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(result.cvStrengths, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800)),
                const SizedBox(height: 12),
                Text('Alignment with Business Idea:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(result.cvAlignment, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800)),
              ],
            )),
            const SizedBox(height: 16),
            _buildCard('Founder Positioning, Time & Capital Reality', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF2F8FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF0071E3).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Founder Positioning: ${result.founderPositionSummary}', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0071E3))),
                      const SizedBox(height: 4),
                      Text(result.founderMetricsAnalysis, style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF1D1D1F), height: 1.4)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                _buildDetailRow('Weekly Available Time', '${result.timeAvailable} (${result.timeRealitySummary})'),
                _buildDetailRow('Capital Available Now', '${result.capitalAvailable} (${result.capitalRealitySummary})'),
                _buildDetailRow('Initial Risk Capital', result.riskCapital),
                Padding(
                  padding: const EdgeInsets.only(left: 12, top: 2, bottom: 8),
                  child: Text('Explanation: ${result.riskCapitalExplanation}', style: GoogleFonts.inter(fontSize: 11.5, fontStyle: FontStyle.italic, color: Colors.grey.shade700)),
                ),
                _buildDetailRow('Likely Validation Requirement', result.likelyValidationCapitalRequired),

                const Divider(height: 24),
                Text('What This Means:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 4),
                Text(result.timeImplication, style: GoogleFonts.inter(fontSize: 12.5, color: Colors.grey.shade800, height: 1.4)),

                const SizedBox(height: 16),
                Text('What Matters Now:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.orange.shade900)),
                const SizedBox(height: 4),
                ...result.whatMattersNow.map((wm) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                      Expanded(child: Text(wm, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade900))),
                    ],
                  ),
                )),

                const SizedBox(height: 16),
                Text('Recommended Founder Approach:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF0071E3))),
                const SizedBox(height: 4),
                ...result.recommendedApproach.map((rec) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                      Expanded(child: Text(rec, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade900))),
                    ],
                  ),
                )),

                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(result.founderRealityFooter, style: GoogleFonts.inter(fontSize: 11.5, fontStyle: FontStyle.italic, color: Colors.grey.shade800)),
                ),
              ],
            )),
          ],
        ),
      ),
    );
  }

  // TAB 5: VALIDATION
  Widget _buildValidationTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('10-Stage Validation Ladder', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...result.validationLadder.map((step) {
              final isComp = step['status'] == 'Complete';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
                child: Row(
                  children: [
                    Icon(isComp ? Icons.check_circle : Icons.radio_button_unchecked, color: isComp ? Colors.green : Colors.grey),
                    const SizedBox(width: 12),
                    Expanded(child: Text(step['stage']!, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: isComp ? Colors.green.shade50 : Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                      child: Text(step['status']!, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: isComp ? Colors.green.shade800 : Colors.grey.shade700)),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  // TAB 6: MARKET & COMPETITION
  Widget _buildMarketTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCard('Business Theme & Strategic Positioning', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Primary Theme', result.primaryTheme, isTag: true, color: const Color(0xFF0071E3)),
                _buildDetailRow('Secondary Theme', result.secondaryTheme, isTag: true),
                const SizedBox(height: 12),
                Text('Strategic Positioning Analysis:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 4),
                Text(result.strategicPositioning, style: GoogleFonts.inter(fontSize: 12, height: 1.45, color: Colors.grey.shade800)),
                const SizedBox(height: 12),
                Text('Market Category Dynamics:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 4),
                Text(result.marketCategoryDynamics, style: GoogleFonts.inter(fontSize: 12, height: 1.45, color: Colors.grey.shade800)),
                const SizedBox(height: 12),
                Text('Strategic Moat & Long-Term Defensibility:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 4),
                Text(result.strategicMoat, style: GoogleFonts.inter(fontSize: 12, height: 1.45, color: Colors.grey.shade800)),
              ],
            )),
            const SizedBox(height: 20),

            _buildCard('📰 Local Business News & Regional Economic Signals', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.newspaper, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Regional Commercial Climate & Business News Analysis', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  result.localBusinessNews,
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: const Color(0xFF1D1D1F)),
                ),
              ],
            )),
            const SizedBox(height: 20),

            _buildCard('💬 Customer Review Trends & User Sentiment', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.rate_review_outlined, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Market Reviews, Dissatisfaction & Workaround Sentiment', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  result.customerReviewTrends,
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: const Color(0xFF1D1D1F)),
                ),
              ],
            )),
            const SizedBox(height: 20),

            _buildCard('🏛️ Government Policies & Statutory Regulatory Frameworks', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.gavel_outlined, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Local Council Regulations, Planning Laws & Policy Influence', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  result.governmentPolicyInfluence,
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: const Color(0xFF1D1D1F)),
                ),
              ],
            )),
          ],
        ),
      ),
    );
  }

  // TAB 7: 90-DAY PLAN
  Widget _buildRoadmapTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('90-Day Validation Roadmap', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildCard('Phase 1: Days 1–30 — Understand the Problem', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Goal: Confirm whether the problem is frequent, painful and important enough for the target customer to seek a better solution.', style: GoogleFonts.inter(fontSize: 13)),
              ],
            )),
          ],
        ),
      ),
    );
  }

  // TAB 8: ACTION PLAN
  Widget _buildActionPlanTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: MaxWidthContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Your PitchLab Action Plan', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildCard('Top 5 Commercial Priorities', Column(
              children: result.topFivePriorities.map((p) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_box_outline_blank, color: Color(0xFF0071E3), size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p['priority']!, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(p['action']!, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade700)),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.refresh),
                label: const Text('Update My Assessment'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0071E3),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  textStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helpers
  Widget _buildCard(String title, Widget content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }

  Widget _buildSwotBox(String title, List<String> items, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
          const SizedBox(height: 6),
          ...items.map((i) => Text('• $i', style: GoogleFonts.inter(fontSize: 11, color: Colors.black87))),
        ],
      ),
    );
  }

  Widget _buildGridBox(String title, List<String> items) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: const Color(0xFF0071E3))),
          const SizedBox(height: 6),
          ...items.map((i) => Text(i, style: GoogleFonts.inter(fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }

  TableRow _buildTableRow(String label, String value) {
    return TableRow(
      children: [
        Padding(padding: const EdgeInsets.all(8), child: Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
        Padding(padding: const EdgeInsets.all(8), child: Text(value, style: GoogleFonts.inter(fontSize: 12))),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isTag = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text('$label:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey.shade700))),
          Expanded(child: Text(value, style: GoogleFonts.inter(fontSize: 12, fontWeight: isTag ? FontWeight.bold : FontWeight.normal, color: color ?? Colors.black87))),
        ],
      ),
    );
  }

  Widget _buildWouldInvestorsBiteCard(EvaluationResult result) {
    final scorecard = result.ibScorecard;
    final questions = result.ibInvestorQuestions;
    final improvements = result.ibImprovements;

    Color potentialColor = Colors.orange;
    if (result.ibInvestmentPotential.toLowerCase() == 'high') potentialColor = Colors.green;
    if (result.ibInvestmentPotential.toLowerCase() == 'medium') potentialColor = Colors.blue;

    Color recColor = Colors.orange;
    if (result.ibPitchLabRecommendation.toLowerCase().contains('ready')) recColor = Colors.green;
    if (result.ibPitchLabRecommendation.toLowerCase().contains('almost')) recColor = Colors.blue;

    return _buildCard(
      'Commercial Readiness Assessment',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(
              result.ibIntro,
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade800, height: 1.45),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Investor Assessment Scorecard',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
          ),
          const SizedBox(height: 8),
          Table(
            border: TableBorder.all(color: Colors.grey.shade300, width: 1),
            columnWidths: const {
              0: FlexColumnWidth(1.2),
              1: FixedColumnWidth(110),
              2: FlexColumnWidth(2.5),
            },
            children: [
              TableRow(
                decoration: BoxDecoration(color: Colors.grey.shade100),
                children: [
                  Padding(padding: const EdgeInsets.all(8), child: Text('Assessment Area', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                  Padding(padding: const EdgeInsets.all(8), child: Text('Rating (1-5)', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                  Padding(padding: const EdgeInsets.all(8), child: Text('Commentary', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                ],
              ),
              ...scorecard.map((item) {
                final area = item['area']?.toString() ?? 'Area';
                final rating = (item['rating'] as num? ?? 3).toInt().clamp(1, 5);
                final comm = item['commentary']?.toString() ?? '';
                return TableRow(
                  children: [
                    Padding(padding: const EdgeInsets.all(8), child: Text(area, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12))),
                    Padding(
                      padding: const EdgeInsets.all(6),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFFFB300)),
                          ),
                          child: Text(
                            '★  $rating / 5',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              color: const Color(0xFFB78103),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(padding: const EdgeInsets.all(8), child: Text(comm, style: GoogleFonts.inter(fontSize: 12))),
                  ],
                );
              }),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F7),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Overall Investor Interest', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: potentialColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: potentialColor),
                      ),
                      child: Text(
                        'Potential: ${result.ibInvestmentPotential}',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: potentialColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${result.ibOverallInterestScore} / 100',
                  style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: const Color(0xFF0071E3)),
                ),
                const SizedBox(height: 6),
                Text(result.ibOverallInterestExplanation, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.blue.shade50.withOpacity(0.5),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Investment Verdict', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0071E3))),
                const SizedBox(height: 6),
                Text(result.ibInvestmentVerdict, style: GoogleFonts.inter(fontSize: 12, color: Colors.black87, height: 1.45)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Questions Investors Would Ask',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
          ),
          const SizedBox(height: 8),
          ...questions.map((q) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0071E3))),
                Expanded(child: Text(q, style: GoogleFonts.inter(fontSize: 12, height: 1.35))),
              ],
            ),
          )),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border(left: BorderSide(color: Colors.green.shade600, width: 4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Biggest Investment Strength', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green.shade900)),
                      const SizedBox(height: 4),
                      Text(result.ibBiggestStrength, style: GoogleFonts.inter(fontSize: 11.5, color: Colors.green.shade900, height: 1.4)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border(left: BorderSide(color: Colors.amber.shade800, width: 4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Biggest Investment Risk', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber.shade900)),
                      const SizedBox(height: 4),
                      Text(result.ibBiggestRisk, style: GoogleFonts.inter(fontSize: 11.5, color: Colors.amber.shade900, height: 1.4)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'How to Improve Your Investor Appeal',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
          ),
          const SizedBox(height: 8),
          ...improvements.asMap().entries.map((entry) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${entry.key + 1}. ', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: const Color(0xFF0071E3))),
                Expanded(child: Text(entry.value, style: GoogleFonts.inter(fontSize: 12, height: 1.35))),
              ],
            ),
          )),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('PitchLab Recommendation: ', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: recColor,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        result.ibPitchLabRecommendation,
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(result.ibPitchLabRecommendationExplanation, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800, height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildPostAssessmentDecisionCard() {
    final viewOptions = [
      'Much more positive',
      'Slightly more positive',
      'No material change',
      'Slightly more cautious',
      'Much more cautious'
    ];

    final decisionOptions = [
      {'label': 'Pursue', 'color': Colors.green.shade700, 'icon': Icons.play_arrow_rounded},
      {'label': 'Investigate', 'color': const Color(0xFF0071E3), 'icon': Icons.search_rounded},
      {'label': 'Park', 'color': Colors.amber.shade800, 'icon': Icons.pause_rounded},
      {'label': 'Reject', 'color': Colors.red.shade700, 'icon': Icons.stop_rounded},
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.assignment_turned_in_outlined, color: Color(0xFF0071E3), size: 24),
              const SizedBox(width: 10),
              Text(
                'Post-Assessment Decision',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Question 1: Has this assessment changed your view?
          Text('1. Has this assessment changed your view of the idea?', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF1D1D1F))),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: viewOptions.map((opt) {
              final isSelected = _selectedViewChanged == opt;
              return ChoiceChip(
                label: Text(opt, style: GoogleFonts.inter(fontSize: 12, color: isSelected ? Colors.white : const Color(0xFF1D1D1F))),
                selected: isSelected,
                selectedColor: const Color(0xFF0071E3),
                backgroundColor: const Color(0xFFF5F5F7),
                onSelected: (val) {
                  if (val) {
                    setState(() => _selectedViewChanged = opt);
                    if (_selectedFinalDecision != null) {
                      _savePostAssessmentDecision(opt, _selectedFinalDecision!);
                    }
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Question 2: What do you want to do with this idea?
          Text('2. What do you want to do with this idea?', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF1D1D1F))),
          const SizedBox(height: 8),
          Row(
            children: decisionOptions.map((opt) {
              final label = opt['label'] as String;
              final color = opt['color'] as Color;
              final icon = opt['icon'] as IconData;
              final isSelected = _selectedFinalDecision == label;

              return Expanded(
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSelected ? color : const Color(0xFFF5F5F7),
                      foregroundColor: isSelected ? Colors.white : const Color(0xFF1D1D1F),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: isSelected ? color : const Color(0xFFE5E5EA)),
                      ),
                    ),
                    icon: Icon(icon, size: 18),
                    label: Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                    onPressed: () {
                      setState(() => _selectedFinalDecision = label);
                      _savePostAssessmentDecision(_selectedViewChanged ?? 'No material change', label);
                    },
                  ),
                ),
              );
            }).toList(),
          ),
          if (_isSavingDecision) ...[
            const SizedBox(height: 8),
            const Text('Saving decision...', style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ],
      ),
    );
  }

  Future<void> _savePostAssessmentDecision(String viewChanged, String finalDecision) async {
    setState(() => _isSavingDecision = true);
    try {
      final evalId = result.raw['id'] ?? result.raw['inputId'] ?? 'local-eval';
      print('🚀 PitchLab: Saving decision: viewChanged=$viewChanged, finalDecision=$finalDecision, evalId=$evalId');
      
      final callable = FirebaseFunctions.instanceFor(region: "us-central1").httpsCallable('updateIdeaDecision');
      await callable.call({
        'evaluationId': evalId,
        'viewChanged': viewChanged,
        'finalDecision': finalDecision,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Decision saved: $finalDecision ($viewChanged)'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      print('⚠️ PitchLab: Decision save warning (local mode active): $e');
    } finally {
      if (mounted) setState(() => _isSavingDecision = false);
    }
  }
}

class MaxWidthContainer extends StatelessWidget {
  final Widget child;
  const MaxWidthContainer({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: child,
      ),
    );
  }
}
