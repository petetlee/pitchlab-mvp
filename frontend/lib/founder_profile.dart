import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FounderProfile extends StatefulWidget {
  const FounderProfile({super.key});

  @override
  State<FounderProfile> createState() => _FounderProfileState();
}

class _FounderProfileState extends State<FounderProfile> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isSaving = false;

  final TextEditingController _experienceController = TextEditingController();
  final TextEditingController _capacityController = TextEditingController();
  final TextEditingController _networkController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final doc = await FirebaseFirestore.instance
            .collection('FounderProfiles')
            .doc(user.uid)
            .get();
        
        if (doc.exists) {
          final data = doc.data()!;
          _experienceController.text = data['experience'] ?? '';
          _capacityController.text = data['capacity']?.toString() ?? '';
          _networkController.text = data['network'] ?? '';
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading profile: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await FirebaseFirestore.instance
            .collection('FounderProfiles')
            .doc(user.uid)
            .set({
          'experience': _experienceController.text,
          'capacity': int.tryParse(_capacityController.text) ?? 0,
          'network': _networkController.text,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile saved successfully!')),
          );
          Navigator.pop(context);
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving profile: $e')),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Founder Profile',
          style: GoogleFonts.outfit(color: Colors.black, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Metrics',
                      style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'These metrics help us calculate your Founder Readiness Index (FRI) and tailor your action plans.',
                      style: GoogleFonts.inter(color: Colors.black54),
                    ),
                    const SizedBox(height: 32),
                    
                    _buildField(
                      'Relevant Experience',
                      'e.g., 5 years in SaaS / Full-stack Developer',
                      _experienceController,
                      maxLines: 3,
                    ),
                    const SizedBox(height: 24),
                    
                    _buildField(
                      'Capacity (Hours/Week)',
                      'e.g., 20',
                      _capacityController,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 24),
                    
                    _buildField(
                      'Network Access',
                      'e.g., Access to 10 angel investors / 5 startup mentors',
                      _networkController,
                      maxLines: 3,
                    ),
                    
                    const SizedBox(height: 48),
                    
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D1D1F),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isSaving
                            ? const CircularProgressIndicator(color: Colors.white)
                            : Text(
                                'Save Profile',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(),
            ),
    );
  }

  Widget _buildField(String label, String hint, TextEditingController controller, {int maxLines = 1, TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: Colors.black26),
            filled: true,
            fillColor: const Color(0xFFF5F5F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          style: GoogleFonts.inter(),
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter $label';
            }
            return null;
          },
        ),
      ],
    );
  }
}
