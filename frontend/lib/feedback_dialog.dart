import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FeedbackDialog extends StatefulWidget {
  final String? evalId;
  final String? ideaName;

  const FeedbackDialog({
    super.key,
    this.evalId,
    this.ideaName,
  });

  @override
  State<FeedbackDialog> createState() => _FeedbackDialogState();
}

class _FeedbackDialogState extends State<FeedbackDialog> {
  int _overallValueRating = 4;
  int _accuracyRating = 4;
  String _decisionValue = 'Yes';
  String _recommendation = 'Yes';
  bool _willingToFollowUp = false;

  final TextEditingController _bestPartController = TextEditingController();
  final TextEditingController _missingWrongController = TextEditingController();
  final TextEditingController _contactController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void dispose() {
    _bestPartController.dispose();
    _missingWrongController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  Future<void> _submitFeedback() async {
    setState(() => _isSubmitting = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await FirebaseFirestore.instance.collection('BetaFeedback').add({
          'userId': user.uid,
          'userEmail': user.email,
          'evalId': widget.evalId ?? '',
          'ideaName': widget.ideaName ?? '',
          'betaCohort': 'first50',
          'overallValueRating': _overallValueRating,
          'accuracyRating': _accuracyRating,
          'decisionValue': _decisionValue,
          'recommendation': _recommendation,
          'bestPart': _bestPartController.text.trim(),
          'missingOrWrong': _missingWrongController.text.trim(),
          'willingToFollowUp': _willingToFollowUp,
          'followUpContact': _willingToFollowUp ? _contactController.text.trim() : '',
          'createdAt': FieldValue.serverTimestamp(),
        });
      }

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Thank you! Your feedback helps shape PitchLab.', style: GoogleFonts.inter()),
            backgroundColor: const Color(0xFF0071E3),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not submit feedback: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _buildStarRating(String label, int currentRating, ValueChanged<int> onSelect) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
        const SizedBox(height: 6),
        Row(
          children: List.generate(5, (index) {
            final starVal = index + 1;
            return IconButton(
              iconSize: 28,
              padding: const EdgeInsets.only(right: 4),
              constraints: const BoxConstraints(),
              icon: Icon(
                starVal <= currentRating ? Icons.star_rounded : Icons.star_outline_rounded,
                color: starVal <= currentRating ? Colors.amber.shade600 : Colors.grey.shade400,
              ),
              onPressed: () => onSelect(starVal),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildChoiceSelector(String label, String selectedVal, List<String> options, ValueChanged<String> onSelect) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: options.map((opt) {
            final isSelected = opt == selectedVal;
            return ChoiceChip(
              label: Text(opt, style: GoogleFonts.inter(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? Colors.white : Colors.black87)),
              selected: isSelected,
              selectedColor: const Color(0xFF0071E3),
              backgroundColor: Colors.grey.shade100,
              onSelected: (_) => onSelect(opt),
            );
          }).toList(),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF0071E3).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.rate_review_outlined, color: Color(0xFF0071E3)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Beta Feedback', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
                Text('Help us improve PitchLab Early Access', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStarRating('1. Overall Value: How useful was this assessment?', _overallValueRating, (v) => setState(() => _overallValueRating = v)),
              const SizedBox(height: 16),
              _buildStarRating('2. Accuracy: How well did PitchLab understand your idea?', _accuracyRating, (v) => setState(() => _accuracyRating = v)),
              const SizedBox(height: 16),
              _buildChoiceSelector(
                '3. Decision Impact: Did this help you think differently about pursuing your idea?',
                _decisionValue,
                ['Yes', 'Somewhat', 'No'],
                (v) => setState(() => _decisionValue = v),
              ),
              const SizedBox(height: 16),
              Text('4. What was the most useful part of your assessment?', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
              const SizedBox(height: 6),
              TextField(
                controller: _bestPartController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'e.g., The customer validation steps and legal pre-feasibility analysis...',
                  hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade400),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                ),
                style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF1D1D1F)),
              ),
              const SizedBox(height: 16),
              Text('5. What felt inaccurate, confusing or missing?', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F))),
              const SizedBox(height: 6),
              TextField(
                controller: _missingWrongController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'e.g., Market sizing section could have more specific Kiwi industry trends...',
                  hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade400),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                ),
                style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF1D1D1F)),
              ),
              const SizedBox(height: 16),
              _buildChoiceSelector(
                '6. Would you recommend PitchLab to a fellow founder?',
                _recommendation,
                ['Yes', 'Maybe', 'No'],
                (v) => setState(() => _recommendation = v),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: _willingToFollowUp,
                    onChanged: (val) => setState(() => _willingToFollowUp = val ?? false),
                    activeColor: const Color(0xFF0071E3),
                  ),
                  Expanded(
                    child: Text(
                      'I am open to a brief 10-minute follow-up call to share deeper feedback.',
                      style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade800),
                    ),
                  ),
                ],
              ),
              if (_willingToFollowUp) ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _contactController,
                  decoration: InputDecoration(
                    labelText: 'Preferred Contact Email / Phone',
                    hintText: 'e.g. founder@example.co.nz',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF1D1D1F)),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
          child: Text('Skip for Now', style: GoogleFonts.inter(color: Colors.grey.shade600)),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitFeedback,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0071E3),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: _isSubmitting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text('Submit Beta Feedback', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
