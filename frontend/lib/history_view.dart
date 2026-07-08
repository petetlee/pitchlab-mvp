import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart'; // Add this for Clipboard
import 'results_dashboard.dart';
import 'evaluation_wizard.dart';

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
            .limit(10)
            .get();
        
        setState(() => _evaluations = query.docs);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading history: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Evaluation History',
          style: GoogleFonts.outfit(color: Colors.black, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _evaluations.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _evaluations.length,
                  itemBuilder: (context, index) {
                    final data = _evaluations[index].data() as Map<String, dynamic>;
                    final date = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
                    final formattedDate = DateFormat('MMM dd, yyyy • HH:mm').format(date);
                    final score = (data['scores']?['overall'] ?? 0) as num;
                    final category = data['category'] ?? 'General';

                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        title: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1D1D1F),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                category.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              formattedDate,
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.black45),
                            ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Text(
                                  'Summary: ',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                                Expanded(
                                  child: Text(
                                    data['executiveSummary'] ?? data['idea'] ?? 'N/A',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            LinearProgressIndicator(
                              value: score / 100,
                              backgroundColor: Colors.grey.shade100,
                              valueColor: AlwaysStoppedAnimation<Color>(_getScoreColor(score)),
                              minHeight: 4,
                            ),
                          ],
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ResultsDashboard(evaluation: data),
                            ),
                          );
                        },
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.refresh, color: Color(0xFF0071E3)),
                              tooltip: 'Re-evaluate',
                              onPressed: () => _reevaluate(context, data),
                            ),
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${score.toInt()}',
                                  style: GoogleFonts.outfit(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: _getScoreColor(score),
                                  ),
                                ),
                                Text(
                                  'SCORE',
                                  style: GoogleFonts.inter(fontSize: 8, color: Colors.black38),
                                ),
                              ],
                            ),
                          ],
                        ),
                        onLongPress: () => _shareEvaluation(_evaluations[index].id, data),
                      ),
                    );
                  },
                ).animate().fadeIn(),
    );
  }

  void _reevaluate(BuildContext context, Map<String, dynamic> historyData) {
    // Extract inputs from history data
    // Note: History data structure contains scores + input fields either top-level or in a nested map
    // Based on index.js, we store ...evaluationData at top level
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EvaluationWizard(
          initialData: {
            'idea': historyData['idea'] ?? '',
            'category': historyData['category'] ?? 'SaaS',
            'problem': historyData['problem'] ?? '',
            'targetMarket': historyData['targetMarket'] ?? '',
            'experience': historyData['experience'] ?? '',
            'capacity': historyData['capacity']?.toString() ?? '',
            'budget': historyData['budget'] ?? '',
            'network': historyData['network'] ?? '',
          },
        ),
      ),
    );
  }

  Future<void> _shareEvaluation(String id, Map<String, dynamic> data) async {
    final bool? shouldShare = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Share Evaluation?'),
        content: const Text('Making this public generates a shareable link.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Make Public & Copy Link')),
        ],
      ),
    );

    if (shouldShare == true) {
      await FirebaseFirestore.instance.collection('EvaluationScore').doc(id).update({'isPublic': true});
      await Clipboard.setData(ClipboardData(text: 'PitchLab Evaluation: https://pitchlab.link/e/$id'));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Link copied to clipboard!')),
        );
      }
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.history, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No Evaluations Yet',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Start your first startup evaluation to see your history here.',
            style: GoogleFonts.inter(color: Colors.black45),
          ),
        ],
      ),
    );
  }

  Color _getScoreColor(num score) {
    if (score >= 80) return Colors.green;
    if (score >= 50) return Colors.orange;
    return Colors.red;
  }
}
