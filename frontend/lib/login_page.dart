import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'landing_page.dart';
import 'evaluation_wizard.dart';

class LoginPage extends StatefulWidget {
  final String? prefilledEmail;
  final String? inviteToken;

  const LoginPage({
    super.key,
    this.prefilledEmail,
    this.inviteToken,
  });

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _adminCodeController = TextEditingController();
  bool _isLogin = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.prefilledEmail != null) {
      _emailController.text = widget.prefilledEmail!;
    }
    if (widget.inviteToken != null) {
      _isLogin = false; // Go to signup by default for invitations
    }
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_isLogin) {
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
      } else {
        final credentials = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
        
        final enteredCode = _adminCodeController.text.trim();
        final role = enteredCode == 'PITCHLAB_ADMIN_2026' ? 'admin' : 'user';

        // Create user document with default role
        if (credentials.user != null) {
          await FirebaseFirestore.instance.collection('Users').doc(credentials.user!.uid).set({
            'role': role,
            'createdAt': FieldValue.serverTimestamp(),
            'email': credentials.user!.email,
          }, SetOptions(merge: true));
        }

        // Mark invitation as completed
        if (widget.inviteToken != null) {
          await FirebaseFirestore.instance.collection('Invitations').doc(widget.inviteToken).update({
            'status': 'completed',
            'completedAt': FieldValue.serverTimestamp(),
          });
        }
      }

      if (mounted) {
        if (widget.inviteToken != null) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const EvaluationWizard()),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LandingPage()),
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message ?? 'Authentication failed';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'An unexpected error occurred.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _adminCodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFD),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
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
                  _isLogin ? 'Welcome Back' : 'Create Account',
                  style: GoogleFonts.outfit(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1D1D1F),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isLogin ? 'Log in to continue to PitchLab' : 'Sign up to start evaluating your ideas',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    color: const Color(0xFF86868B),
                  ),
                ),
                const SizedBox(height: 48),
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: GoogleFonts.inter(color: Colors.red.shade700),
                      textAlign: TextAlign.center,
                    ),
                  ),
                TextField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.lock_outline),
                  ),
                  obscureText: true,
                ),
                if (!_isLogin) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: _adminCodeController,
                    decoration: InputDecoration(
                      labelText: 'Admin Code (Optional)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      prefixIcon: const Icon(Icons.admin_panel_settings_outlined),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0071E3),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            _isLogin ? 'Log In' : 'Sign Up',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isLogin = !_isLogin;
                      _errorMessage = null;
                    });
                  },
                  child: Text(
                    _isLogin ? 'Don\'t have an account? Sign up' : 'Already have an account? Log in',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF0071E3),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
