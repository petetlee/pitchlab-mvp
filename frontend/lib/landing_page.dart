import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
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
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _contactKey = GlobalKey();
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

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToContact() {
    final contactContext = _contactKey.currentContext;
    if (contactContext != null) {
      Scrollable.ensureVisible(
        contactContext,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    } else if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  Future<void> _launchContactUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      print('❌ PitchLab: Could not launch $url: $e');
    }
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

  User? get _currentUser {
    try {
      return FirebaseAuth.instance.currentUser;
    } catch (_) {
      return null;
    }
  }

  Future<void> _checkAdminStatus() async {
    try {
      final user = _currentUser;
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
    } catch (_) {}
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
    final bool isMobile = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: InkWell(
          onTap: () {
            if (_scrollController.hasClients) {
              _scrollController.animateTo(
                0,
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeOut,
              );
            }
          },
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.rocket_launch, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                'PitchLab',
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1D1D1F),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            key: const ValueKey('nav_contact_button'),
            onPressed: _scrollToContact,
            child: Text(
              'Contact',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0071E3),
              ),
            ),
          ),
          if (_isAdmin)
            TextButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AdminDashboard()),
                );
              },
              icon: const Icon(Icons.admin_panel_settings, color: Colors.deepPurple, size: 16),
              label: const Text('Admin Portal', style: TextStyle(color: Colors.deepPurple)),
            ),
          if (_currentUser != null)
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.grey),
              tooltip: 'Sign Out',
              onPressed: () async {
                await FirebaseAuth.instance.signOut();
                if (mounted) {
                  setState(() {
                    _isAdmin = false;
                  });
                }
              },
            ),
          const SizedBox(width: 12),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          controller: _scrollController,
          padding: EdgeInsets.symmetric(horizontal: isMobile ? 16.0 : 24.0, vertical: 16.0),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Official PitchLab Brand Logo Artwork
                  Container(
                    constraints: const BoxConstraints(maxWidth: 780),
                    child: Image.asset(
                      'assets/logo.png',
                      height: isMobile ? 240 : 360,
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
                              fontSize: isMobile ? 36 : 48,
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
                              fontSize: isMobile ? 16 : 18,
                              color: const Color(0xFF86868B),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().scale(delay: 200.ms).fadeIn(delay: 300.ms),

                  const SizedBox(height: 36),

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

                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: isMobile
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildSecondaryButton(
                                context,
                                'Founder Profile',
                                Icons.person_outline,
                                () => _handleNavigation(context, const FounderProfile()),
                              ),
                              const SizedBox(height: 10),
                              _buildSecondaryButton(
                                context,
                                'View History',
                                Icons.history,
                                () => _handleNavigation(context, const HistoryView()),
                              ),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Expanded(
                                child: _buildSecondaryButton(
                                  context,
                                  'Founder Profile',
                                  Icons.person_outline,
                                  () => _handleNavigation(context, const FounderProfile()),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildSecondaryButton(
                                  context,
                                  'View History',
                                  Icons.history,
                                  () => _handleNavigation(context, const HistoryView()),
                                ),
                              ),
                            ],
                          ),
                  ).animate().fadeIn(delay: 900.ms),

                  const SizedBox(height: 24),

                  // PitchLab Privacy Guarantee Banner (User-Facing Privacy Notice)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 680),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF0071E3).withValues(alpha: 0.3)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.shield_outlined, color: Color(0xFF0071E3), size: 18),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  'PitchLab Privacy Guarantee',
                                  style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: const Color(0xFF1D1D1F),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Your business idea is private by default. PitchLab administrators can see your account name, email address, User ID and number of submissions, but they cannot browse your private idea details, answers, scores or reports. You decide whether to keep your idea private, share it privately or publish selected information publicly.',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              height: 1.4,
                              color: Colors.grey.shade800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(delay: 950.ms),

                  const SizedBox(height: 36),

                  // Contact Peter Lee Section
                  _buildContactSection(context, isMobile).animate().fadeIn(delay: 1000.ms),

                  const SizedBox(height: 48),

                  // Footer
                  _buildFooter(context).animate().fadeIn(delay: 1050.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContactSection(BuildContext context, bool isMobile) {
    final emailTile = _buildContactTile(
      key: const ValueKey('contact_email_link'),
      icon: Icons.email_outlined,
      label: 'Email: Peter@PNC.co.nz',
      onTap: () => _launchContactUrl('mailto:Peter@PNC.co.nz'),
      isMobile: isMobile,
    );

    final phoneTile = _buildContactTile(
      key: const ValueKey('contact_phone_link'),
      icon: Icons.phone_outlined,
      label: 'Phone: 022 533 6867',
      onTap: () => _launchContactUrl('tel:+64225336867'),
      isMobile: isMobile,
    );

    return Container(
      key: _contactKey,
      constraints: const BoxConstraints(maxWidth: 680),
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 24, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0071E3).withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.mail_outline,
              color: Color(0xFF0071E3),
              size: 26,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Contact Peter Lee',
            style: GoogleFonts.outfit(
              fontSize: isMobile ? 22 : 24,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1D1D1F),
              letterSpacing: -0.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Have a question about PitchLab or feedback to share? Get in touch.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF86868B),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          if (isMobile)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                emailTile,
                const SizedBox(height: 12),
                phoneTile,
              ],
            )
          else
            Wrap(
              spacing: 16,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              children: [
                emailTile,
                phoneTile,
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildContactTile({
    required Key key,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required bool isMobile,
  }) {
    return Material(
      color: const Color(0xFFF5F5F7),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        key: key,
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        hoverColor: const Color(0xFF0071E3).withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            mainAxisSize: isMobile ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: const Color(0xFF0071E3),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0071E3),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Column(
      children: [
        Divider(color: Colors.grey.shade200, height: 1),
        const SizedBox(height: 20),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 8,
          children: [
            TextButton(
              key: const ValueKey('footer_contact_link'),
              onPressed: _scrollToContact,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF0071E3),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Contact',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF0071E3),
                ),
              ),
            ),
            Text('•', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
            Text(
              'Peter Lee • Auckland, NZ',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: const Color(0xFF86868B),
              ),
            ),
            Text('•', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
            Text(
              'Powered by Google-native AI orchestration.',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: const Color(0xFFAEAEB2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
      ],
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
