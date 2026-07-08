import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'pdf_service.dart';

class ResultsDashboard extends StatelessWidget {
  final Map<String, dynamic> evaluation;

  const ResultsDashboard({super.key, required this.evaluation});

  @override
  Widget build(BuildContext context) {
    print('🚀 PitchLab: ResultsDashboard rendering 13-section report');

    final summary = evaluation['summaryBlock'] as Map<String, dynamic>? ?? {};
    final whyScore = evaluation['whyThisScore'] as Map<String, dynamic>? ?? {};
    final topPriorities = summary['topPrioritiesNow'] as List<dynamic>? ?? []; // Extracted from summaryBlock in v4

    final scores = evaluation['scores'] as Map<String, dynamic>? ?? {};
    final decStatus = evaluation['decisionStatus'] as Map<String, dynamic>? ?? {};
    final tear = evaluation['tearDetails'] as Map<String, dynamic>? ?? {};
    final fMetrics = evaluation['founderMetrics'] as Map<String, dynamic>? ?? {};
    final market = evaluation['marketAssessment'] as Map<String, dynamic>? ?? {};
    final String marketAnalysis = market['analysis']?.toString() ?? market.toString();
    final String marketPattern = market['marketPatternSummary']?.toString() ?? '';
    final comparables = evaluation['realWorldComparables'] as Map<String, dynamic>? ?? {};

    final mvp = evaluation['mvpFeasibility'] as Map<String, dynamic>? ?? {};
    final risks = evaluation['keyRisks'] as List<dynamic>? ?? [];
    final whatNot = evaluation['whatNotToBuild'] as List<dynamic>? ?? [];
    final plan30 = evaluation['thirtyDayPlan'] as Map<String, dynamic>? ?? {};
    final finalRec = evaluation['finalRecommendation'] as Map<String, dynamic>? ?? {};
    final String executiveSummary = evaluation['executiveSummary']?.toString() ?? '';
    final int overallScore = (summary['overallReadinessScore'] is num) ? (summary['overallReadinessScore'] as num).toInt() : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 280,
            floating: false,
            pinned: true,
            backgroundColor: const Color(0xFF1D1D1F),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: _buildTopGradientHeader(overallScore, decStatus),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
                onPressed: () => PdfService.generateReport(evaluation),
                tooltip: 'Export to PDF',
              ),
              const SizedBox(width: 8),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Front Page Summary Block (The Answer)
                  _buildSummaryBlock(summary, overallScore),
                  const SizedBox(height: 80),

                  // 2. Why This Score? (Business Logic)
                  _buildSectionTitle('Why This Score?'),
                  const SizedBox(height: 16),
                  _buildWhyThisScore(whyScore),
                  const SizedBox(height: 80),

                  // 3. Executive Summary (Advisor Overview)
                  _buildSectionTitle('Executive Summary'),
                  const SizedBox(height: 16),
                  _buildCardText(executiveSummary),
                  const SizedBox(height: 80),

                  // 4. Detailed Score Breakdown
                  _buildSectionTitle('Detailed Score Breakdown'),
                  const SizedBox(height: 24),
                  _buildScoreBreakdown(scores),
                  const SizedBox(height: 80),

                  // 5. T.E.A.R. Evaluation
                  _buildSectionTitle('T.E.A.R. Strategic Analysis'),
                  const SizedBox(height: 24),
                  _buildTearGrid(tear),
                  const SizedBox(height: 80),

                  // 6. Founder Metrics
                  _buildSectionTitle('Founder Metrics & Readiness'),
                  const SizedBox(height: 16),
                  _buildCardText(fMetrics['analysis']?.toString() ?? ''),
                  const SizedBox(height: 16),
                  _buildInfoBox('Founder Position Summary', fMetrics['founderPositionSummary']?.toString() ?? '', Icons.person_search_rounded),
                  const SizedBox(height: 80),

                  // 7. Market and Customer Assessment
                  _buildSectionTitle('Market & Customer Assessment'),
                  const SizedBox(height: 16),
                  _buildCardText(marketAnalysis),
                  if (marketPattern.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildInfoBox('Market Pattern Summary', marketPattern, Icons.analytics_outlined),
                  ],
                  const SizedBox(height: 80),

                  // 8. Real-World Comparables (Precedent Analysis)
                  _buildSectionTitle('Real-World Comparables'),
                  const SizedBox(height: 24),
                  _buildRealWorldComparables(comparables),
                  const SizedBox(height: 80),

                  // 9. MVP Feasibility
                  _buildSectionTitle(r'MVP Feasibility (< $5k NZD)'),
                  const SizedBox(height: 24),
                  _buildMvpSection(mvp),
                  const SizedBox(height: 80),

                  // 10. Key Risks & Gaps
                  _buildSectionTitle('Key Risks & Critical Gaps'),
                  const SizedBox(height: 24),
                  _buildRisksList(risks),
                  const SizedBox(height: 80),

                  // 11. What Not to Build Yet
                  _buildSectionTitle('What NOT To Build Yet'),
                  const SizedBox(height: 24),
                  _buildSimpleList(whatNot, icon: Icons.do_not_disturb_on, color: Colors.red[700]!),
                  const SizedBox(height: 80),

                  // 12. 30-Day Validation Plan
                  _buildSectionTitle('30-Day Validation Plan'),
                  const SizedBox(height: 24),
                  _buildThirtyDayPlan(plan30),
                  const SizedBox(height: 80),

                  // 13. Final Recommendation (Advisor Verdict)
                  _buildSectionTitle('Final Recommendation'),
                  const SizedBox(height: 24),
                  _buildFinalRecommendation(finalRec),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.outfit(
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: const Color(0xFF1D1D1F),
      ),
    ).animate().fadeIn(delay: 200.ms).moveY(begin: 10, end: 0);
  }

  Widget _buildCardText(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Text(
        text.replaceAll('**', '').trim(),
        style: GoogleFonts.inter(fontSize: 15, color: const Color(0xFF424245), height: 1.6),
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildInfoBox(String title, String content, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9), // Slate 100
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.blue[600], size: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: const Color(0xFF1E293B))),
                const SizedBox(height: 6),
                Text(content, style: GoogleFonts.inter(color: const Color(0xFF475569), height: 1.5, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhyThisScore(Map<String, dynamic> whyScore) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          _buildWhyRow("Strongest Area", whyScore['strongestArea']?.toString() ?? 'N/A', Icons.star_border_purple500_rounded, Colors.green),
          const Divider(height: 32),
          _buildWhyRow("Weakest Area", whyScore['weakestArea']?.toString() ?? 'N/A', Icons.trending_down_rounded, Colors.red),
          const Divider(height: 32),
          _buildWhyRow("Main Drag", whyScore['mainDragOnScore']?.toString() ?? 'N/A', Icons.anchor_rounded, Colors.orange),
          const Divider(height: 32),
          _buildWhyRow("Fastest Improvement", whyScore['fastestWayToImprove']?.toString() ?? 'N/A', Icons.bolt_rounded, Colors.blue),
        ],
      ),
    );
  }

  Widget _buildWhyRow(String label, String value, IconData icon, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF64748B))),
              const SizedBox(height: 4),
              Text(value, style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF1E293B), height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }
  Widget _buildScoreBreakdown(Map<String, dynamic> scores) {
    final entries = scores.entries.where((e) => e.key != 'overall' && e.value is Map).toList();
    
    return Column(
      children: entries.map((entry) {
        final key = entry.key;
        final val = entry.value as Map<String, dynamic>;
        final s = val['score'] ?? 0;
        final exp = val['assessment'] ?? '';
        final action = val['improvementAction'] ?? '';
        
        final String label = _getScoreLabel(key);
        
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15, color: const Color(0xFF1D1D1F)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('$s pts', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.blue[700])),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(exp, style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF475569), height: 1.4)),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.arrow_upward, color: Colors.green, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(action, style: GoogleFonts.inter(fontSize: 13, color: Colors.green[800], fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTearGrid(Map<String, dynamic> tear) {
    return Column(
      children: [
        _buildTearCard('T', 'Theme', tear['theme'] ?? 'N/A', Colors.amber),
        const SizedBox(height: 12),
        _buildTearCard('E', 'Evidence', tear['evidence'] ?? 'N/A', Colors.blue),
        const SizedBox(height: 12),
        _buildTearCard('A', 'Analysis', tear['analysis'] ?? 'N/A', Colors.purple),
        const SizedBox(height: 12),
        _buildTearCard('R', 'Recommendation', tear['recommendation'] ?? 'N/A', Colors.green),
      ],
    );
  }

  Widget _buildTearCard(String letter, String title, String content, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(letter, style: GoogleFonts.outfit(fontSize: 40, fontWeight: FontWeight.w900, color: color.withOpacity(0.2))),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title.toUpperCase(), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: color, letterSpacing: 1.2)),
                const SizedBox(height: 6),
                Text(content, style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF424245), height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMvpSection(Map<String, dynamic> mvp) {
    final String verdict = mvp['verdict']?.toString() ?? 'Unknown';
    final Color vColor = verdict.toLowerCase().contains('not') ? Colors.red : (verdict.toLowerCase().contains('partially') ? Colors.orange : Colors.green);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.gavel, color: vColor),
              const SizedBox(width: 8),
              Text(
                'MVP Phase 5',
                style: GoogleFonts.outfit(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'SHARP • FAST • ADVISOR-LED',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue[400],
                  letterSpacing: 2.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text("FORMAT", style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(mvp['suggestedFormat']?.toString() ?? 'N/A', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          
          Text("INDICATIVE COMPONENTS", style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 4),
          ...(mvp['indicativeComponents'] as List<dynamic>? ?? []).map((c) => Text("• $c", style: GoogleFonts.inter(fontSize: 14, height: 1.5))),
          const SizedBox(height: 16),
          
          Text("MUST EXCLUDE IN PHASE 1", style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red)),
          const SizedBox(height: 4),
          ...(mvp['whatToExclude'] as List<dynamic>? ?? []).map((c) => Text("• $c", style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: Colors.red[800]))),
          const SizedBox(height: 16),

          Text("COST COMMENTARY", style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(mvp['estimatedCostCommentary']?.toString() ?? 'N/A', style: GoogleFonts.inter(fontSize: 14, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildFinalRecommendation(Map<String, dynamic> rec) {
    final status = rec['recommendation']?.toString() ?? 'Analyzing';
    final why = rec['why']?.toString() ?? '';
    final issue = rec['biggestIssue']?.toString() ?? '';
    final move = rec['pathForward']?.toString() ?? '';
    final warning = rec['explicitWarning']?.toString() ?? '';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF1D1D1F), // Dark Graphite
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 40, offset: const Offset(0, 20)),
        ],
      ),
      padding: const EdgeInsets.all(48),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("ADVISOR VERDICT", style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white38, letterSpacing: 2.5)),
          const SizedBox(height: 20),
          Text(status.toUpperCase(), style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, height: 1.1)),
          const SizedBox(height: 24),
          Text(why, style: GoogleFonts.inter(fontSize: 16, color: Colors.white.withOpacity(0.85), height: 1.6, fontWeight: FontWeight.w400)),
          const Divider(height: 64, thickness: 1, color: Colors.white10),
          
          _buildRecCardItem("UNRESOLVED ISSUE", issue, Colors.red[300]!, Icons.gpp_maybe_rounded),
          const SizedBox(height: 24),
          _buildRecCardItem("PATH FORWARD", move, Colors.green[300]!, Icons.directions_run_rounded),
          const SizedBox(height: 24),
          _buildRecCardItem("CRITICAL WARNING", warning, Colors.orange[300]!, Icons.error_outline_rounded),
        ],
      ),
    );
  }

  Widget _buildRecCardItem(String label, String value, Color color, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(width: 20),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: color.withOpacity(0.9), letterSpacing: 1.8)),
              const SizedBox(height: 6),
              Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white, height: 1.45)),
            ],
          ),
        ),
      ],
    );
  }

  String _getScoreLabel(String key) {
    switch (key) {
      case 'ideaClarity':
        return 'Idea Clarity';
      case 'problemStrength':
        return 'Problem Strength';
      case 'founderFit':
        return 'Founder Fit';
      case 'marketAttractiveness':
        return 'Market Attractiveness';
      case 'mvpFeasibility':
        return 'MVP Feasibility';
      case 'executionReadiness':
        return 'Execution Readiness';
      case 'validationReadiness':
        return 'Validation Readiness';
      default:
        return key;
    }
  }

  Widget _buildTopGradientHeader(int score, Map<String, dynamic> status) {
    final state = status['state']?.toString() ?? 'Analyzing';
    final explanation = status['explanation']?.toString() ?? '';
    final nextMilestone = status['nextMilestone']?.toString() ?? '';

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1D1D1F), Color(0xFF2C2C2E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'READINESS INDEX',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.5),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$score / 100',
                    style: GoogleFonts.outfit(fontSize: 72, fontWeight: FontWeight.bold, color: Colors.white, height: 1),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  state.toUpperCase(),
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            explanation,
            style: GoogleFonts.inter(fontSize: 14, color: Colors.white70, height: 1.4),
          ),
          if (nextMilestone.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Next Milestone: $nextMilestone',
              style: GoogleFonts.inter(fontSize: 12, color: Colors.blueAccent, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryBlock(Map<String, dynamic> summary, int score) {
    final String risk = summary['biggestRiskToThisIdea']?.toString() ?? 'N/A';
    final String cta = summary['doThisBeforeBuildingMore']?.toString() ?? 'N/A';
    final strengths = summary['topStrengths'] as List<dynamic>? ?? [];
    final priorities = summary['topPrioritiesNow'] as List<dynamic>? ?? [];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.star, color: Colors.amber, size: 24),
              const SizedBox(width: 8),
              Text(
                'EXECUTIVE OVERVIEW',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSummaryItem('BIGGEST RISK', risk, Colors.red[700]!, Icons.gpp_maybe_rounded),
          const Divider(height: 32),
          _buildSummaryItem('CRITICAL NEXT STEP', cta, Colors.blue[700]!, Icons.play_arrow_rounded),
          const Divider(height: 32),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('TOP STRENGTHS', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    ...strengths.map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Text('• ${s.toString()}', style: GoogleFonts.inter(fontSize: 13, height: 1.4)),
                    )),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('IMMEDIATE PRIORITIES', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    ...priorities.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Text('• ${p.toString()}', style: GoogleFonts.inter(fontSize: 13, height: 1.4)),
                    )),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String title, String content, Color color, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: color, letterSpacing: 1.2)),
              const SizedBox(height: 4),
              Text(content, style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF1D1D1F), height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRealWorldComparables(Map<String, dynamic> comparables) {
    final successes = comparables['successes'] as List<dynamic>? ?? [];
    final failures = comparables['failures'] as List<dynamic>? ?? [];
    final String interpretation = comparables['marketInterpretation']?.toString() ?? 'N/A';

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildComparablesColumn('SUCCESS ANALOGUES', successes, Colors.teal[50]!, Colors.teal[800]!),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildComparablesColumn('FAILURE ANALOGUES', failures, Colors.red[50]!, Colors.red[800]!),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1D1D1F),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ADVISOR INTERPRETATION',
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2),
              ),
              const SizedBox(height: 8),
              Text(
                interpretation,
                style: GoogleFonts.inter(fontSize: 14, color: Colors.white, height: 1.5),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildComparablesColumn(String title, List<dynamic> items, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: textColor, letterSpacing: 1.2),
          ),
          const SizedBox(height: 16),
          ...items.map((item) {
            final name = item['name']?.toString() ?? 'Unknown';
            final desc = item['whatTheyDid']?.toString() ?? '';
            final lesson = item['whyItSucceeded']?.toString() ?? item['whatWentWrong']?.toString() ?? '';
            return Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF1D1D1F)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF424245), height: 1.4),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Lesson: $lesson',
                    style: GoogleFonts.inter(fontSize: 12, fontStyle: FontStyle.italic, color: textColor, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildRisksList(List<dynamic> risks) {
    return Column(
      children: risks.map((risk) {
        final name = risk['name']?.toString() ?? 'Unknown Risk';
        final why = risk['whyItMatters']?.toString() ?? '';
        final fix = risk['whatToProveOrFix']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15, color: const Color(0xFF1D1D1F)),
              ),
              const SizedBox(height: 8),
              Text(
                why,
                style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF475569), height: 1.4),
              ),
              if (fix.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified, color: Colors.blue, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Remediation: $fix',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.blue[800], fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSimpleList(List<dynamic> items, {required IconData icon, required Color color}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        children: items.map((item) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.toString(),
                    style: GoogleFonts.inter(fontSize: 15, color: const Color(0xFF424245), height: 1.4),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildThirtyDayPlan(Map<String, dynamic> plan) {
    return Column(
      children: [
        _buildWeekCard('WEEK 1', plan['week1'] as Map<String, dynamic>? ?? {}),
        const SizedBox(height: 16),
        _buildWeekCard('WEEK 2', plan['week2'] as Map<String, dynamic>? ?? {}),
        const SizedBox(height: 16),
        _buildWeekCard('WEEK 3', plan['week3'] as Map<String, dynamic>? ?? {}),
        const SizedBox(height: 16),
        _buildWeekCard('WEEK 4', plan['week4'] as Map<String, dynamic>? ?? {}),
      ],
    );
  }

  Widget _buildWeekCard(String title, Map<String, dynamic> week) {
    final objective = week['objective']?.toString() ?? 'N/A';
    final tasks = week['tasks'] as List<dynamic>? ?? [];
    final result = week['expectedResult']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue[600], letterSpacing: 1.2),
              ),
              if (objective.isNotEmpty)
                Expanded(
                  child: Text(
                    'Objective: $objective',
                    textAlign: TextAlign.end,
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF1D1D1F)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          ...tasks.map((task) => Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(task.toString(), style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF424245))),
                ),
              ],
            ),
          )),
          if (result.isNotEmpty) ...[
            const Divider(height: 24),
            Text(
              'Deliverable: $result',
              style: GoogleFonts.inter(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey[600]),
            ),
          ],
        ],
      ),
    );
  }
}
