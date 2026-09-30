import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'evaluation_wizard.dart';
import 'founder_profile.dart';
import 'history_view.dart';
import 'login_page.dart';
import 'admin_dashboard.dart';
import 'public_idea_view.dart';
import 'private_share_view.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  bool _isAdmin = false;

  @override
  void initState() {
    super.initState();
    _checkAdminStatus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPublicAndShareTokens();
      _checkInviteToken();
    });
  }

  void _checkPublicAndShareTokens() {
    final publicId = Uri.base.queryParameters['publicIdea'];
    if (publicId != null && publicId.isNotEmpty) {
      print('🚀 PitchLab: Found publicIdea in URL: $publicId');
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => PublicIdeaView(publicId: publicId)),
        );
      }
      return;
    }

    final shareToken = Uri.base.queryParameters['shareToken'];
    if (shareToken != null && shareToken.isNotEmpty) {
      print('🚀 PitchLab: Found shareToken in URL: $shareToken');
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => PrivateShareView(shareToken: shareToken)),
        );
      }
      return;
    }
  }

  Future<void> _checkAdminStatus() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null && !user.isAnonymous) {
      final doc = await FirebaseFirestore.instance.collection('Users').doc(user.uid).get();
      if (doc.exists && doc.data()?['role'] == 'admin') {
        if (mounted) {
          setState(() {
            _isAdmin = true;
          });
        }
      }
    }
  }

  Future<void> _checkInviteToken() async {
    final token = Uri.base.queryParameters['inviteToken'];
    if (token == null || token.isEmpty) return;

    print('🚀 PitchLab: Found inviteToken in URL: $token');

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Validating invitation...'),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final doc = await FirebaseFirestore.instance.collection('Invitations').doc(token).get();
      if (mounted) {
        Navigator.pop(context); // Dismiss loading dialog
      }

      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>;
        final email = data['email'] as String? ?? '';
        final status = data['status'] as String? ?? 'pending';

        if (status == 'pending') {
          print('🚀 PitchLab: Invitation valid for $email. Navigating to signup page.');
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => LoginPage(
                  prefilledEmail: email,
                  inviteToken: token,
                ),
              ),
            );
          }
        } else {
          _showInviteError('This invitation has already been completed.');
        }
      } else {
        _showInviteError('Invalid invitation link.');
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Dismiss loading dialog
      }
      _showInviteError('Error validating invitation: $e');
    }
  }

  void _showInviteError(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Invitation Error', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _handleNavigation(BuildContext context, Widget destination) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.isAnonymous) {
      // If user is anonymous, let's sign them out to enforce real accounts for testing.
      if (user?.isAnonymous ?? false) {
        FirebaseAuth.instance.signOut();
      }
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => destination),
      );
    }
  }

  Future<void> _handleWizardNavigation(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.isAnonymous) {
      if (user?.isAnonymous ?? false) {
        await FirebaseAuth.instance.signOut();
      }
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
      return;
    }

    if (_isAdmin) {
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const EvaluationWizard()),
        );
      }
      return;
    }

    // Show loading spinner
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      if (context.mounted) {
        Navigator.pop(context); // Dismiss loading spinner
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const EvaluationWizard()),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Dismiss loading spinner
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error checking evaluation status: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    print('🚀 PitchLab: LandingPage.build() called');
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isAdmin)
            TextButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AdminDashboard()),
                );
              },
              icon: const Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
              label: const Text('Admin Portal', style: TextStyle(color: Colors.deepPurple)),
            ),
          if (FirebaseAuth.instance.currentUser != null)
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.grey),
              onPressed: () async {
                await FirebaseAuth.instance.signOut();
                if (mounted) {
                  setState(() {
                    _isAdmin = false;
                  });
                }
              },
            ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Official PitchLab Brand Logo Artwork
                Container(
                  constraints: const BoxConstraints(maxWidth: 780),
                  child: Image.asset(
                    'assets/logo.png',
                    height: 360,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.rocket_launch,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          'PitchLab',
                          style: GoogleFonts.outfit(
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1D1D1F),
                            letterSpacing: -1.0,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Validate your startup idea in minutes, not months',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            color: const Color(0xFF86868B),
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ).animate().scale(delay: 200.ms).fadeIn(delay: 300.ms),
                
                const SizedBox(height: 48),
                
                // CTA Button
                ElevatedButton(
                  onPressed: () => _handleWizardNavigation(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0071E3),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 20,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    'Evaluate My Idea',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ).animate().fadeIn(delay: 800.ms).scale(),
                
                const SizedBox(height: 16),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Expanded(
                      child: _buildSecondaryButton(
                        context, 
                        'Founder Profile', 
                        Icons.person_outline, 
                        () => _handleNavigation(context, const FounderProfile())
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildSecondaryButton(
                        context, 
                        'View History', 
                        Icons.history, 
                        () => _handleNavigation(context, const HistoryView())
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 900.ms),
                
                const SizedBox(height: 24),
                
                // PitchLab Privacy Guarantee Banner (User-Facing Privacy Notice)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF0071E3).withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shield_outlined, color: Color(0xFF0071E3), size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'PitchLab Privacy Guarantee',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF1D1D1F)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Your business idea is private by default. PitchLab administrators can see your account name, email address, User ID and number of submissions, but they cannot browse your private idea details, answers, scores or reports. You decide whether to keep your idea private, share it privately or publish selected information publicly.',
                        style: GoogleFonts.inter(fontSize: 11.5, height: 1.4, color: Colors.grey.shade800),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 950.ms),

                const SizedBox(height: 20),
                
                // Small Tagline
                Text(
                  'Powered by Google-native AI orchestration.',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: const Color(0xFFAEAEB2),
                  ),
                ).animate().fadeIn(delay: 1000.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryButton(BuildContext context, String label, IconData icon, VoidCallback onPressed) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF1D1D1F),
        side: BorderSide(color: Colors.grey.shade300),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
