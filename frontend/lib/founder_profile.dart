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

  String _selectedFounderExperience = 'No';
  String _selectedIndustryExperience = '0 years';
  String _selectedTimeCommitment = '0-5 hours/week';

  final TextEditingController _countryController = TextEditingController();
  final TextEditingController _regionController = TextEditingController();
  final TextEditingController _cityController = TextEditingController();
  final TextEditingController _networkController = TextEditingController(text: 'Access to mentors/early customers');

  final List<String> _founderExpOptions = [
    'No',
    'Yes – it closed',
    'Yes – still operating',
    'Yes – successfully sold',
  ];

  final List<String> _industryExpOptions = [
    '0 years',
    '1-2 years',
    '3-5 years',
    '5-10 years',
    '10+ years',
  ];

  final List<String> _timeCommOptions = [
    '0-5 hours/week',
    '5-15 hours/week',
    '15-30 hours/week',
    '30+ hours/week',
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _countryController.dispose();
    _regionController.dispose();
    _cityController.dispose();
    _networkController.dispose();
    super.dispose();
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
          setState(() {
            _selectedFounderExperience = data['founderExperience'] ?? 'No';
            _selectedIndustryExperience = data['industryExperience'] ?? '0 years';
            _selectedTimeCommitment = data['timeCommitment'] ?? '0-5 hours/week';
            _countryController.text = data['locationCountry'] ?? '';
            _regionController.text = data['locationRegion'] ?? '';
            _cityController.text = data['locationCity'] ?? '';
            _networkController.text = data['network'] ?? 'Access to mentors/early customers';
          });
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
        // Map new fields to legacy fields
        final founderExp = _selectedFounderExperience;
        final indExp = _selectedIndustryExperience;
        final legacyExperience = 'Experience: $founderExp. Industry expertise: $indExp';

        int legacyCapacity = 0;
        if (_selectedTimeCommitment.contains('30+')) {
          legacyCapacity = 35;
        } else if (_selectedTimeCommitment.contains('15-30')) {
          legacyCapacity = 20;
        } else if (_selectedTimeCommitment.contains('5-15')) {
          legacyCapacity = 10;
        } else {
          legacyCapacity = 3;
        }

        await FirebaseFirestore.instance
            .collection('FounderProfiles')
            .doc(user.uid)
            .set({
          'founderExperience': founderExp,
          'industryExperience': indExp,
          'timeCommitment': _selectedTimeCommitment,
          'locationCountry': _countryController.text,
          'locationRegion': _regionController.text,
          'locationCity': _cityController.text,
          
          // Legacy fields for backwards compatibility
          'experience': legacyExperience,
          'capacity': legacyCapacity,
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
                      'Your Profile & Metrics',
                      style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'These metrics help us calculate your Founder Readiness Index (FRI) and customize your action plans.',
                      style: GoogleFonts.inter(color: Colors.black54),
                    ),
                    const SizedBox(height: 32),

                    // Location fields
                    _buildSectionHeader('Primary Location'),
                    const SizedBox(height: 12),
                    _buildTextField('Country', 'e.g., New Zealand', _countryController),
                    const SizedBox(height: 16),
                    _buildTextField('State / Province / Region', 'e.g., Auckland', _regionController),
                    const SizedBox(height: 16),
                    _buildTextField('City / District (Optional)', 'e.g., Central Auckland', _cityController, required: false),
                    
                    const SizedBox(height: 32),
                    
                    // Metrics fields
                    _buildSectionHeader('Execution Readiness'),
                    const SizedBox(height: 12),
                    
                    _buildDropdownField(
                      'Founder Experience',
                      _selectedFounderExperience,
                      _founderExpOptions,
                      (val) => setState(() => _selectedFounderExperience = val!),
                    ),
                    const SizedBox(height: 16),
                    
                    _buildDropdownField(
                      'Industry Experience',
                      _selectedIndustryExperience,
                      _industryExpOptions,
                      (val) => setState(() => _selectedIndustryExperience = val!),
                    ),
                    const SizedBox(height: 16),
                    
                    _buildDropdownField(
                      'Time Commitment',
                      _selectedTimeCommitment,
                      _timeCommOptions,
                      (val) => setState(() => _selectedTimeCommitment = val!),
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      'Network Access (Optional)',
                      'e.g., Access to startup mentors and local business networks',
                      _networkController,
                      maxLines: 3,
                      required: false,
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

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
    );
  }

  Widget _buildTextField(String label, String hint, TextEditingController controller, {int maxLines = 1, bool required = true}) {
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
          validator: (value) {
            if (required && (value == null || value.isEmpty)) {
              return 'Please enter $label';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildDropdownField(String label, String selectedValue, List<String> options, ValueChanged<String?> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: const Color(0xFF1D1D1F)),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: selectedValue,
          items: options.map((option) {
            return DropdownMenuItem<String>(
              value: option,
              child: Text(option, style: GoogleFonts.inter()),
            );
          }).toList(),
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF5F5F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}
