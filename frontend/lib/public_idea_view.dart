import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

class PublicIdeaView extends StatefulWidget {
  final String publicId;

  const PublicIdeaView({super.key, required this.publicId});

  @override
  State<PublicIdeaView> createState() => _PublicIdeaViewState();
}

class _PublicIdeaViewState extends State<PublicIdeaView> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _publicProfile;

  @override
  void initState() {
    super.initState();
    _fetchPublicProfile();
  }

  Future<void> _fetchPublicProfile() async {
    setState(() => _isLoading = true);
    try {
      final doc = await FirebaseFirestore.instance
          .collection('PublicIdeaProfiles')
          .doc(widget.publicId)
          .get();

      if (!doc.exists) {
        setState(() {
          _errorMessage = 'This public idea profile does not exist or has been removed.';
          _isLoading = false;
        });
        return;
      }

      final data = doc.data() as Map<String, dynamic>;
      final isPublished = data['isPublished'] == true;
      final status = data['status'] ?? 'active';

      if (!isPublished || status != 'active') {
        setState(() {
          _errorMessage = 'This idea profile is no longer publicly available.';
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _publicProfile = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading public idea profile: $e';
        _isLoading = false;
      });
    }
  }

  void _showContactFounderDialog() {
    if (_publicProfile == null) return;
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final messageController = TextEditingController();
    String selectedSeeking = (_publicProfile!['seeking'] as List?)?.firstOrNull?.toString() ?? 'General Inquiry';
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.mail_outline, color: Color(0xFF0071E3)),
              const SizedBox(width: 8),
              Text('Contact Founder', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 450,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Your message will be relayed through PitchLab. Your inquiry will be forwarded directly to the founder without disclosing their email address.',
                      style: GoogleFonts.inter(fontSize: 12, color: Colors.blue.shade900),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    style: GoogleFonts.inter(color: const Color(0xFF1D1D1F)),
                    decoration: const InputDecoration(
                      labelText: 'Your Name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailController,
                    style: GoogleFonts.inter(color: const Color(0xFF1D1D1F)),
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Your Email Address',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: selectedSeeking,
                    style: GoogleFonts.inter(color: const Color(0xFF1D1D1F)),
                    decoration: const InputDecoration(
                      labelText: 'Inquiry Category',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Feedback', child: Text('Providing Feedback')),
                      DropdownMenuItem(value: 'Co-founder', child: Text('Co-founder Interest')),
                      DropdownMenuItem(value: 'Technical partner', child: Text('Technical Partnership')),
                      DropdownMenuItem(value: 'Commercial partner', child: Text('Commercial Partnership')),
                      DropdownMenuItem(value: 'Investor or funder', child: Text('Investment / Funding Inquiry')),
                      DropdownMenuItem(value: 'Customer validation', child: Text('Customer Validation')),
                      DropdownMenuItem(value: 'Licensing opportunity', child: Text('Licensing Interest')),
                      DropdownMenuItem(value: 'Buyer for the idea', child: Text('Acquisition / Buyer Interest')),
                      DropdownMenuItem(value: 'General Inquiry', child: Text('General Inquiry')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedSeeking = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: messageController,
                    style: GoogleFonts.inter(color: const Color(0xFF1D1D1F)),
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Message to Founder',
                      hintText: 'Introduce yourself and describe your interest...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final name = nameController.text.trim();
                      final email = emailController.text.trim();
                      final message = messageController.text.trim();
                      if (email.isEmpty || message.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please provide your email address and message.')),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);
                      try {
                        await FirebaseFunctions.instanceFor(region: 'us-central1')
                            .httpsCallable('sendPublicContactExpression')
                            .call({
                          'publicId': widget.publicId,
                          'senderName': name,
                          'senderEmail': email,
                          'seekingCategory': selectedSeeking,
                          'message': message,
                        });

                        if (context.mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Message sent to founder via PitchLab Relay!')),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to send message: $e')),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0071E3),
                foregroundColor: Colors.white,
              ),
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Send Message'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1D1D1F),
        elevation: 0,
        title: Text(
          'PitchLab Public Idea Profile',
          style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share, color: Colors.white),
            tooltip: 'Share Public Link',
            onPressed: () {
              final link = Uri.base.toString();
              Clipboard.setData(ClipboardData(text: link));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Public idea link copied to clipboard!')),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF0071E3)))
          : _errorMessage != null
              ? _buildErrorState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 800),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildProfileHeader(),
                          const SizedBox(height: 20),
                          _buildProfileContent(),
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
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'Public Profile Unavailable',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'This profile cannot be accessed.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    final title = _publicProfile!['publicTitle'] ?? 'Untitled Idea';
    final identity = _publicProfile!['displayedIdentity'] ?? 'Anonymous Founder';
    final category = _publicProfile!['category'] ?? 'General Startup';
    final stage = _publicProfile!['stage'] ?? 'Idea Stage';
    final allowContact = _publicProfile!['allowContact'] == true;

    return Container(
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
                  stage,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70),
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(
                    identity,
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 16),
          if (allowContact)
            ElevatedButton.icon(
              onPressed: _showContactFounderDialog,
              icon: const Icon(Icons.mail, size: 16),
              label: Text('Contact Founder via PitchLab Relay', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0071E3),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProfileContent() {
    final summary = _publicProfile!['publicSummary'] ?? '';
    final problem = _publicProfile!['problem'] ?? '';
    final solution = _publicProfile!['solution'] ?? '';
    final targetMarket = _publicProfile!['targetMarket'] ?? '';
    final seekingList = (_publicProfile!['seeking'] as List?)?.cast<String>() ?? [];
    final includeScore = _publicProfile!['includeScore'] == true;
    final score = _publicProfile!['overallScore'];
    final scoreBand = _publicProfile!['scoreBandName'];
    final includeInsights = _publicProfile!['includeInsights'] == true;
    final insights = (_publicProfile!['selectedInsights'] as List?)?.cast<String>() ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (includeScore && score != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF0071E3).withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0071E3).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$score/100',
                    style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF0071E3)),
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Verified PitchLab Assessment Score', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 2),
                    Text('Stage: ${scoreBand ?? 'Assessed'}', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
        ],

        if (summary.isNotEmpty) ...[
          _buildCard('Executive Overview', Text(summary, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
          const SizedBox(height: 16),
        ],

        if (problem.isNotEmpty) ...[
          _buildCard('Problem Addressed', Text(problem, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
          const SizedBox(height: 16),
        ],

        if (solution.isNotEmpty) ...[
          _buildCard('Proposed Solution', Text(solution, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
          const SizedBox(height: 16),
        ],

        if (targetMarket.isNotEmpty) ...[
          _buildCard('Target Market & Geography', Text(targetMarket, style: GoogleFonts.inter(fontSize: 14, height: 1.5, color: const Color(0xFF1D1D1F)))),
          const SizedBox(height: 16),
        ],

        if (seekingList.isNotEmpty) ...[
          _buildCard('What the Founder Is Seeking', Wrap(
            spacing: 8,
            runSpacing: 8,
            children: seekingList.map((tag) => Chip(
              label: Text(tag, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0071E3))),
              backgroundColor: const Color(0xFF0071E3).withValues(alpha: 0.1),
              side: BorderSide.none,
            )).toList(),
          )),
          const SizedBox(height: 16),
        ],

        if (includeInsights && insights.isNotEmpty) ...[
          _buildCard('Selected Assessment Insights', Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: insights.map((insight) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF34C759)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(insight, style: GoogleFonts.inter(fontSize: 13, height: 1.4))),
                ],
              ),
            )).toList(),
          )),
        ],
      ],
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
