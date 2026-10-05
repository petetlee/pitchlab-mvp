import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'results_dashboard.dart';

class PrivateShareView extends StatefulWidget {
  final String shareToken;

  const PrivateShareView({super.key, required this.shareToken});

  @override
  State<PrivateShareView> createState() => _PrivateShareViewState();
}

class _PrivateShareViewState extends State<PrivateShareView> {
  bool _isLoading = true;
  String? _errorMessage;
  String? _scope;
  Map<String, dynamic>? _content;

  @override
  void initState() {
    super.initState();
    _fetchSharedContent();
  }

  Future<void> _fetchSharedContent() async {
    setState(() => _isLoading = true);
    try {
      final result = await FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable('getPrivateSharedContent')
          .call({'shareToken': widget.shareToken});

      final data = result.data as Map<dynamic, dynamic>?;
      if (data != null && data['success'] == true) {
        setState(() {
          _scope = data['scope'] as String?;
          _content = Map<String, dynamic>.from(data['content'] as Map);
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Invalid share link or access revoked.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll(RegExp(r'\[.*?\]'), '').trim();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1D1D1F),
        elevation: 0,
        title: Text(
          'Privately Shared Idea Assessment',
          style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF0071E3)))
          : _errorMessage != null
              ? _buildErrorState()
              : _scope == 'complete_report'
                  ? ResultsDashboard(evaluation: _content!)
                  : _buildSummaryState(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.link_off, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'Shared Link Unavailable',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'This private share link is no longer available.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryState() {
    final title = _content!['ideaTitle'] ?? _content!['publicTitle'] ?? 'Shared Business Concept';
    final category = _content!['category'] ?? 'General Startup';
    final overallScore = _content!['overallScore'] ?? 50;
    final scoreBand = _content!['scoreBandName'] ?? 'Assessed';
    final recommendation = _content!['masterRecommendation'] ?? 'Validate';
    final summary = _content!['executiveSummary'] ?? '';
    final verdict = _content!['pitchLabVerdict'] ?? '';
    final topStrengths = (_content!['topStrengths'] as List?)?.cast<String>() ?? [];
    final topPriorities = (_content!['topPrioritiesNow'] as List?)?.cast<String>() ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1D1D1F),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0071E3),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            category.toUpperCase(),
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            recommendation,
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      title,
                      style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('READINESS SCORE', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white60)),
                              Text('$overallScore/100', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                              Text('Stage: $scoreBand', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF34C759))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              if (verdict.isNotEmpty) ...[
                _buildCard('PitchLab Commercial Verdict', Text(verdict, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
                const SizedBox(height: 16),
              ],

              if (summary.isNotEmpty) ...[
                _buildCard('Executive Summary', Text(summary, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
                const SizedBox(height: 16),
              ],

              if (topStrengths.isNotEmpty) ...[
                _buildCard('Top Identified Strengths', Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: topStrengths.map((s) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF34C759)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(s, style: GoogleFonts.inter(fontSize: 13, height: 1.4))),
                      ],
                    ),
                  )).toList(),
                )),
                const SizedBox(height: 16),
              ],

              if (topPriorities.isNotEmpty) ...[
                _buildCard('Immediate Validation Priorities', Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: topPriorities.map((p) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.arrow_forward, size: 16, color: Color(0xFF0071E3)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(p, style: GoogleFonts.inter(fontSize: 13, height: 1.4))),
                      ],
                    ),
                  )).toList(),
                )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard(String title, Widget content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: const Color(0xFF1D1D1F))),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }
}
