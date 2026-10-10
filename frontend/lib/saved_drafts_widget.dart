import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'evaluation_wizard.dart';

class SavedDraftsWidget extends StatefulWidget {
  final VoidCallback? onDraftsUpdated;
  const SavedDraftsWidget({super.key, this.onDraftsUpdated});

  @override
  State<SavedDraftsWidget> createState() => _SavedDraftsWidgetState();
}

class _SavedDraftsWidgetState extends State<SavedDraftsWidget> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _drafts = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDrafts();
  }

  Future<void> _fetchDrafts() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.isAnonymous) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _drafts = [];
        });
      }
      return;
    }

    try {
      final callable = FirebaseFunctions.instanceFor(region: "us-central1")
          .httpsCallable('getUserDrafts');
      final response = await callable.call();
      final data = response.data as Map<String, dynamic>? ?? {};
      final rawList = data['drafts'] as List<dynamic>? ?? [];

      if (mounted) {
        setState(() {
          _drafts = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      print('PitchLab: Error fetching user drafts: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load drafts: $e';
        });
      }
    }
  }

  Future<void> _deleteDraft(String draftId, String ideaName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Saved Draft', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text(
          'Are you sure you want to delete the draft "$ideaName"? This action cannot be undone.',
          style: GoogleFonts.inter(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            child: const Text('Delete Draft'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final callable = FirebaseFunctions.instanceFor(region: "us-central1")
          .httpsCallable('deleteEvaluationDraft');
      await callable.call({'draftId': draftId});

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Draft deleted successfully.')),
        );
        _fetchDrafts();
        widget.onDraftsUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting draft: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  void _resumeDraft(Map<String, dynamic> draft) {
    final formData = Map<String, dynamic>.from(draft['formData'] as Map? ?? {});
    final currentStep = draft['currentStep'] as int? ?? 0;
    final draftId = draft['draftId'] as String;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EvaluationWizard(
          initialData: formData,
          initialStep: currentStep,
          draftId: draftId,
        ),
      ),
    ).then((_) {
      _fetchDrafts();
      widget.onDraftsUpdated?.call();
    });
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('dd MMM yyyy, h:mm a').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.isAnonymous) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F7),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            const Icon(Icons.cloud_queue, color: Color(0xFF0071E3), size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Save & Resume Across Devices',
                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Sign in to save incomplete assessments and continue on any device. Drafts are saved for 90 days after your last save.',
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.black87),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (_drafts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.bookmark_outline, color: Color(0xFF0071E3), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Saved Drafts (In Progress)',
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0071E3).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_drafts.length}/3 Active Drafts',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0071E3)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Drafts are saved for 90 days after your last save.',
            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
          ),
          const SizedBox(height: 14),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _drafts.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final draft = _drafts[index];
              final ideaName = draft['ideaName'] as String? ?? 'Untitled Assessment';
              final updatedAt = draft['updatedAt'] as String? ?? '';
              final daysRemaining = draft['daysRemaining'] as int? ?? 90;
              final draftId = draft['draftId'] as String;

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade100,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.edit_note, size: 14, color: Colors.amber.shade900),
                              const SizedBox(width: 4),
                              Text(
                                'In Progress',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            ideaName,
                            style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.grey, size: 20),
                          tooltip: 'Delete draft',
                          onPressed: () => _deleteDraft(draftId, ideaName),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.access_time, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          'Last saved: ${_formatDate(updatedAt)}',
                          style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade700),
                        ),
                        const Spacer(),
                        Text(
                          'Expires in $daysRemaining days',
                          style: GoogleFonts.inter(fontSize: 11, color: daysRemaining < 10 ? Colors.redAccent : Colors.grey.shade600, fontWeight: daysRemaining < 10 ? FontWeight.bold : FontWeight.normal),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _resumeDraft(draft),
                        icon: const Icon(Icons.play_arrow, size: 18),
                        label: Text('Continue Assessment', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0071E3),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Utility function to check draft limits before starting a new assessment
Future<bool> checkDraftLimitAndPrompt({
  required BuildContext context,
  required VoidCallback onContinueNew,
}) async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null || user.isAnonymous) {
    onContinueNew();
    return true;
  }

  try {
    final callable = FirebaseFunctions.instanceFor(region: "us-central1")
        .httpsCallable('getUserDrafts');
    final response = await callable.call();
    final data = response.data as Map<String, dynamic>? ?? {};
    final drafts = (data['drafts'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();

    if (drafts.length >= 3) {
      if (!context.mounted) return false;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Active Draft Limit Reached (3/3)',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You currently have 3 saved in-progress assessments. To start a new assessment, please resume an existing draft or delete one.',
                style: GoogleFonts.inter(fontSize: 13.5, height: 1.4, color: Colors.black87),
              ),
              const SizedBox(height: 16),
              Text(
                'Your Active Drafts:',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 200),
                child: SingleChildScrollView(
                  child: Column(
                    children: drafts.map((d) {
                      final title = d['ideaName'] as String? ?? 'Untitled Draft';
                      final draftId = d['draftId'] as String;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(dialogContext);
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => EvaluationWizard(
                                      initialData: Map<String, dynamic>.from(d['formData'] as Map? ?? {}),
                                      initialStep: d['currentStep'] as int? ?? 0,
                                      draftId: draftId,
                                    ),
                                  ),
                                );
                              },
                              child: const Text('Resume', style: TextStyle(fontSize: 12)),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                              onPressed: () async {
                                Navigator.pop(dialogContext);
                                try {
                                  final delCallable = FirebaseFunctions.instanceFor(region: "us-central1")
                                      .httpsCallable('deleteEvaluationDraft');
                                  await delCallable.call({'draftId': draftId});
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Draft deleted.')),
                                    );
                                  }
                                } catch (_) {}
                              },
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
      return false;
    } else {
      onContinueNew();
      return true;
    }
  } catch (e) {
    print('PitchLab: Error checking draft limits: $e');
    onContinueNew();
    return true;
  }
}
