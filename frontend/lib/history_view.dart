import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'results_dashboard.dart';
import 'pdf_service.dart';
import 'saved_drafts_widget.dart';

class HistoryView extends StatefulWidget {
  const HistoryView({super.key});

  @override
  State<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<HistoryView> {
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  List<QueryDocumentSnapshot> _evaluations = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = null;
    });
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final query = await FirebaseFirestore.instance
            .collection('EvaluationScore')
            .where('userId', isEqualTo: user.uid)
            .orderBy('createdAt', descending: true)
            .limit(20)
            .get();
        
        if (mounted) {
          setState(() {
            _evaluations = query.docs;
            _isLoading = false;
            _hasError = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _evaluations = [];
            _isLoading = false;
            _hasError = false;
          });
        }
      }
    } catch (e, stack) {
      debugPrint('PitchLab History: Failed to load evaluation history: $e\n$stack');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = 'We couldn’t load your assessment history. Please try again.';
        });
      }
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
          mainAxisSize: MainAxisSize.min,
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                'My Ideas & Assessment History',
                style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
            Text(
              'PitchLab Portfolio & Decision Gateway',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
          : _hasError
              ? _buildErrorState()
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
                              const SavedDraftsWidget(),
                              const SizedBox(height: 12),
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
                                      child: const Icon(Icons.auto_graph, color: Color(0xFF0071E3), size: 24),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Founder Assessment Archive',
                                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Review your past evaluations, open interactive score breakdowns, or export investor-ready PDF summaries.',
                                            style: GoogleFonts.inter(color: Colors.grey.shade600, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _evaluations.length,
                                separatorBuilder: (context, index) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final doc = _evaluations[index];
                                  final data = doc.data() as Map<String, dynamic>;
                                  
                                  final ideaName = data['ideaName'] ?? data['title'] ?? 'Untitled Idea';
                                  final oneLiner = data['oneLiner'] ?? data['problem'] ?? 'No description provided';
                                  final score = data['overallScore'] ?? 0;
                                  final scoreBand = data['scoreBand'] ?? 'Pending';
                                  
                                  DateTime? createdDate;
                                  if (data['createdAt'] is Timestamp) {
                                    createdDate = (data['createdAt'] as Timestamp).toDate();
                                  } else if (data['createdAt'] is String) {
                                    createdDate = DateTime.tryParse(data['createdAt']);
                                  }

                                  final formattedDate = createdDate != null 
                                      ? DateFormat('d MMM yyyy, h:mm a').format(createdDate)
                                      : 'Recently evaluated';

                                  return Card(
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      side: BorderSide(color: Colors.grey.shade200),
                                    ),
                                    color: Colors.white,
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      ideaName,
                                                      style: GoogleFonts.outfit(
                                                        fontSize: 18,
                                                        fontWeight: FontWeight.bold,
                                                        color: const Color(0xFF1D1D1F),
                                                      ),
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Row(
                                                      children: [
                                                        Icon(Icons.calendar_today_outlined, size: 12, color: Colors.grey.shade500),
                                                        const SizedBox(width: 4),
                                                        Text(
                                                          formattedDate,
                                                          style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500),
                                                        ),
                                                        if (data['archetype'] != null) ...[
                                                          const SizedBox(width: 8),
                                                          Container(
                                                            width: 3,
                                                            height: 3,
                                                            decoration: BoxDecoration(
                                                              color: Colors.grey.shade400,
                                                              shape: BoxShape.circle,
                                                            ),
                                                          ),
                                                          const SizedBox(width: 8),
                                                          Text(
                                                            data['archetype'].toString(),
                                                            style: GoogleFonts.inter(
                                                              fontSize: 11,
                                                              fontWeight: FontWeight.w500,
                                                              color: const Color(0xFF0071E3),
                                                            ),
                                                          ),
                                                        ],
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),
                                          Text(
                                            oneLiner,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade700, height: 1.3),
                                          ),
                                          const SizedBox(height: 14),
                                          Wrap(
                                            alignment: WrapAlignment.spaceBetween,
                                            crossAxisAlignment: WrapCrossAlignment.center,
                                            spacing: 12,
                                            runSpacing: 10,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                decoration: BoxDecoration(
                                                  color: _getScoreColor(score).withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(8),
                                                  border: Border.all(
                                                    color: _getScoreColor(score).withValues(alpha: 0.3),
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Text(
                                                      '$score/100',
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
                                              Wrap(
                                                spacing: 8,
                                                runSpacing: 8,
                                                children: [
                                                  OutlinedButton.icon(
                                                    onPressed: () async {
                                                      final messenger = ScaffoldMessenger.of(context);
                                                      try {
                                                        messenger.showSnackBar(
                                                          const SnackBar(content: Text('📄 Preparing PDF Report...'), duration: Duration(seconds: 2)),
                                                        );
                                                        await PdfService.generateReport(data);
                                                      } catch (e) {
                                                        messenger.showSnackBar(
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

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.sync_problem_outlined, size: 48, color: Colors.red.shade700),
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to Load History',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'We couldn’t load your assessment history. Please try again.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadHistory,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0071E3),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
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
