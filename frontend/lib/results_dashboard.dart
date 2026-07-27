import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/evaluation_result.dart';
import 'pdf_service.dart';

class ResultsDashboard extends StatefulWidget {
  final Map<String, dynamic> evaluation;

  const ResultsDashboard({super.key, required this.evaluation});

  @override
  State<ResultsDashboard> createState() => _ResultsDashboardState();
}

class _ResultsDashboardState extends State<ResultsDashboard> with SingleTickerProviderStateMixin {
  late EvaluationResult result;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    result = EvaluationResult.fromMap(widget.evaluation);
    _tabController = TabController(length: 8, vsync: this);
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
            icon: const Icon(Icons.bookmark_outline, color: Colors.white),
            tooltip: 'Save Assessment',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('✅ Assessment saved to your account history!')),
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFF0071E3), borderRadius: BorderRadius.circular(20)),
                  child: Text(result.scoreBandName, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
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
                  width: 140,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white12)),
                  child: Column(
                    children: [
                      Text('READINESS SCORE', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white60)),
                      const SizedBox(height: 4),
                      Text('${result.overallScore}/100', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text(result.scoreBandName, textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF34C759))),
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

            _buildCard('SWOT Preview', Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildSwotBox('Strengths', result.swotStrengths, Colors.teal)),
                const SizedBox(width: 12),
                Expanded(child: _buildSwotBox('Weaknesses', result.swotWeaknesses, Colors.orange)),
                const SizedBox(width: 12),
                Expanded(child: _buildSwotBox('Opportunities', result.swotOpportunities, Colors.blue)),
                const SizedBox(width: 12),
                Expanded(child: _buildSwotBox('Threats', result.swotThreats, Colors.red)),
              ],
            )),
            const SizedBox(height: 20),

            _buildCard('KISS Review Summary', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Keep It Simple and Start Small', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F))),
                const SizedBox(height: 8),
                Text('Smallest Testable Version: ${result.kissSmallestTestableVersion}', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0071E3))),
              ],
            )),
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
            Text('Lean Canvas & Business Architecture', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),

            // Lean Canvas Grid
            GridView.count(
              crossAxisCount: MediaQuery.of(context).size.width > 800 ? 3 : 1,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                _buildGridBox('1. Problem', result.lcProblem),
                _buildGridBox('2. Customer Segments', result.lcCustomerSegments),
                _buildGridBox('3. Unique Value Proposition', [result.lcUniqueValueProp]),
                _buildGridBox('4. Proposed Solution', result.lcProposedSolution),
                _buildGridBox('5. Channels', result.lcChannels),
                _buildGridBox('6. Revenue Streams', result.lcRevenueStreams),
                _buildGridBox('7. Cost Structure', result.lcCostStructure),
                _buildGridBox('8. Key Metrics', result.lcKeyMetrics),
                _buildGridBox('9. Unfair Advantage', [result.lcUnfairAdvantage]),
              ],
            ),
            const SizedBox(height: 24),

            _buildCard('MVP Feasibility & Test Plan', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Format: ${result.mvpFormat}', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('Validation Budget: ${result.mvpBudget}', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade700)),
                const SizedBox(height: 12),
                Text('What to Include:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                ...result.mvpInclude.map((i) => Text('• $i', style: GoogleFonts.inter(fontSize: 12))),
                const SizedBox(height: 8),
                Text('What to Exclude:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.red.shade700)),
                ...result.mvpExclude.map((i) => Text('• $i', style: GoogleFonts.inter(fontSize: 12))),
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
            _buildCard('Founder Time & Capital Reality', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Weekly Availability', result.timeAvailable),
                _buildDetailRow('Capital Available', result.capitalAvailable),
                _buildDetailRow('Initial Risk Capital', result.riskCapital),
                const SizedBox(height: 12),
                Text('Many founders begin while balancing employment or existing commitments. Consistent weekly validation is key.', style: GoogleFonts.inter(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey.shade700)),
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
            _buildCard('Business Theme & Commercial Position', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Primary Theme', result.primaryTheme),
                _buildDetailRow('Secondary Theme', result.secondaryTheme),
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
