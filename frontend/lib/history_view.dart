import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'results_dashboard.dart';
import 'evaluation_wizard.dart';
import 'pdf_service.dart';

class HistoryView extends StatefulWidget {
  const HistoryView({super.key});

  @override
  State<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<HistoryView> {
  bool _isLoading = true;
  List<QueryDocumentSnapshot> _evaluations = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final query = await FirebaseFirestore.instance
            .collection('EvaluationScore')
            .where('userId', isEqualTo: user.uid)
            .orderBy('createdAt', descending: true)
            .limit(20)
            .get();
        
        setState(() => _evaluations = query.docs);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading history: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1D1D1F),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'My Ideas & Assessment History',
              style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Text(
              'PitchLab Portfolio & Decision Gateway',
              style: GoogleFonts.inter(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh History',
            onPressed: _loadHistory,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF0071E3)))
          : _evaluations.isEmpty
              ? _buildEmptyState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 900),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            margin: const EdgeInsets.only(bottom: 20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade200),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0071E3).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.folder_special_outlined, color: Color(0xFF0071E3)),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Your Founder Idea Portfolio',
                                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF1D1D1F)),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Select any submission to view full assessment metrics, download PDF reports, or re-evaluate with updated inputs.',
                                        style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _evaluations.length,
                            itemBuilder: (context, index) {
                              final data = _evaluations[index].data() as Map<String, dynamic>;
                              data['docId'] = _evaluations[index].id;
                              final date = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
                              final formattedDate = DateFormat('MMM dd, yyyy • HH:mm').format(date);
                              final score = (data['overallScore'] ?? data['scores']?['overall'] ?? 0) as num;
                              final category = data['category'] ?? 'General Startup';
                              final ideaTitle = (data['idea'] ?? data['businessName'] ?? 'Untitled Business Concept').toString().trim();
                              final scoreBand = data['scoreBandName'] ?? data['scoreBand']?['name'] ?? 'Assessed';
                              final recommendation = data['masterRecommendation'] ?? 'INVESTIGATE';

                              return Card(
                                elevation: 0,
                                margin: const EdgeInsets.only(bottom: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(color: Colors.grey.shade300),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(18),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF1D1D1F),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              category.toUpperCase(),
                                              style: GoogleFonts.inter(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF0071E3).withValues(alpha: 0.1),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              recommendation,
                                              style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF0071E3), fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            formattedDate,
                                            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        ideaTitle,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17, color: const Color(0xFF1D1D1F)),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        data['executiveSummary'] ?? data['problem'] ?? 'Commercial assessment complete.',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade700, height: 1.3),
                                      ),
                                      const SizedBox(height: 14),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: _getScoreColor(score).withValues(alpha: 0.1),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: _getScoreColor(score).withValues(alpha: 0.3)),
                                            ),
                                            child: Row(
                                              children: [
                                                Text(
                                                  '${score.toInt()}/100',
                                                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: _getScoreColor(score)),
                                                ),
                                                const SizedBox(width: 8),
                                                Text(
                                                  '($scoreBand)',
                                                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade800),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Spacer(),
                                          OutlinedButton.icon(
                                            onPressed: () async {
                                              try {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  const SnackBar(content: Text('📄 Preparing PDF Report...'), duration: Duration(seconds: 2)),
                                                );
                                                await PdfService.generateReport(data);
                                              } catch (e) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(content: Text('Could not download PDF: $e'), backgroundColor: Colors.redAccent),
                                                );
                                              }
                                            },
                                            icon: const Icon(Icons.picture_as_pdf_outlined, size: 16),
                                            label: Text('PDF Report', style: GoogleFonts.inter(fontSize: 12)),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: const Color(0xFF0071E3),
                                              side: BorderSide(color: const Color(0xFF0071E3).withValues(alpha: 0.4)),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton.icon(
                                            onPressed: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) => ResultsDashboard(evaluation: data),
                                                ),
                                              );
                                            },
                                            icon: const Icon(Icons.analytics_outlined, size: 16),
                                            label: Text('View Assessment', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: const Color(0xFF1D1D1F),
                                              foregroundColor: Colors.white,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ).animate().fadeIn(),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lightbulb_outline, size: 48, color: Color(0xFF0071E3)),
          ),
          const SizedBox(height: 16),
          Text(
            'No Idea Submissions Yet',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Run your first commercial evaluation to build your idea portfolio.',
            style: GoogleFonts.inter(color: Colors.black54, fontSize: 13),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.add, size: 18),
            label: Text('Assess an Idea Now', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0071E3),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  Color _getScoreColor(num score) {
    if (score >= 70) return const Color(0xFF34C759);
    if (score >= 40) return Colors.orange.shade800;
    return const Color(0xFFFF3B30);
  }
}
