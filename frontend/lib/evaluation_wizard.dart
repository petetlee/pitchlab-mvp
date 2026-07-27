import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'dart:convert';
import 'dart:typed_data';
import 'results_dashboard.dart';
import 'cv_picker_helper.dart';

class EvaluationWizard extends StatefulWidget {
  final Map<String, dynamic>? initialData;
  const EvaluationWizard({super.key, this.initialData});

  @override
  State<EvaluationWizard> createState() => _EvaluationWizardState();
}

class _EvaluationWizardState extends State<EvaluationWizard> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isLoading = false;
  final Map<String, TextEditingController> _controllers = {};
  stt.SpeechToText? _speech;
  bool _isListening = false;
  double _confidence = 1.0;

  Uint8List? _selectedCvBytes;
  String? _selectedCvName;

  final Map<String, dynamic> _formData = {
    'idea': '',
    'category': 'General',
    'problem': '',
    'targetMarket': '',
    // Backwards compatibility legacy fields
    'experience': '',
    'capacity': '',
    'network': 'Access to mentors/early customers',
    
    // New telemetry fields
    'marketScope': '',
    'locationCountry': '',
    'locationRegion': '',
    'locationCity': '',
    'investmentCommitment': '',
    'timeCommitment': '',
    'customerValidation': '',
    'founderExperience': '',
    'industryExperience': '',
    'founderMotivation': '',
    'biggestObstacle': '',
    'businessStage': '',
    'fundingPreference': '',
    'successDefinition': '',
    
    // CV Attachments
    'cvBase64': '',
    'cvFileName': '',
  };

  @override
  void initState() {
    super.initState();
    
    // Initialize form data with initialData if provided
    if (widget.initialData != null) {
      widget.initialData!.forEach((key, value) {
        if (_formData.containsKey(key)) {
          _formData[key] = value;
        }
      });
    }

    for (var q in _questions) {
      if (q['key'] != null && q['type'] == 'text') {
        final initialValue = _formData[q['key']!]?.toString() ?? '';
        _controllers[q['key']!] = TextEditingController(text: initialValue);
      }
    }
    _speech = stt.SpeechToText();
    if (widget.initialData == null) {
      _loadFounderProfile();
    }
  }

  Future<void> _loadFounderProfile() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final doc = await FirebaseFirestore.instance
          .collection('FounderProfiles')
          .doc(user.uid)
          .get();
      
      if (doc.exists && mounted) {
        final data = doc.data()!;
        setState(() {
          _formData['founderExperience'] = data['founderExperience'] ?? '';
          _formData['industryExperience'] = data['industryExperience'] ?? '';
          _formData['timeCommitment'] = data['timeCommitment'] ?? '';
          
          _formData['locationCountry'] = data['locationCountry'] ?? '';
          _formData['locationRegion'] = data['locationRegion'] ?? '';
          _formData['locationCity'] = data['locationCity'] ?? '';
        });
      }
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    _pageController.dispose();
    super.dispose();
  }

  final List<Map<String, dynamic>> _questions = [
    {
      'key': 'idea',
      'title': 'Your Idea',
      'subtitle': 'Describe your new business or product idea with as much detail as possible.',
      'hint': 'e.g., An Uber-like service for pet grooming.',
      'type': 'text',
    },
    {
      'key': 'problem',
      'title': 'The Problem',
      'subtitle': 'What pain point are you solving?',
      'hint': 'e.g., Pet owners struggle to find reliable groomers on short notice.',
      'type': 'text',
    },
    {
      'key': 'targetMarket',
      'title': 'The Market',
      'subtitle': 'Who are your primary customers? Who are your main competitors? Is the market new, growing or mature?',
      'hint': 'e.g., Primary: SMBs & tax agents. Competitors: Xero, MYOB. Market: Growing digital compliance sector.',
      'type': 'text',
    },
    {
      'key': 'marketScope',
      'title': 'Market Scope',
      'subtitle': 'Who will your business primarily serve?',
      'type': 'options',
      'options': [
        'Local customers',
        'Regional customers',
        'National customers',
        'International customers',
      ],
    },
    {
      'key': 'location',
      'title': 'Primary Location (Optional)',
      'subtitle': 'Where will this business primarily operate? (All fields are optional)',
      'type': 'location',
    },
    {
      'key': 'investmentCommitment',
      'title': 'Initial Investment',
      'subtitle': 'How much are you willing to invest initially to get this business started?',
      'type': 'options',
      'options': [
        r'$0–$500',
        r'$500–$2,500',
        r'$2,500–$5,000',
        r'$5,000–$10,000',
        r'$10,000–$25,000',
        r'$25,000–$50,000',
        r'$50,000–$100,000',
        'More than \$100,000',
      ],
    },
    {
      'key': 'timeCommitment',
      'title': 'Time Commitment',
      'subtitle': 'How many hours per week can you consistently dedicate to this business over the next six months?',
      'type': 'options',
      'options': [
        '0-5 hours/week',
        '5-15 hours/week',
        '15-30 hours/week',
        '30+ hours/week',
      ],
    },
    {
      'key': 'customerValidation',
      'title': 'Customer Validation',
      'subtitle': 'Approximately how many potential customers have you spoken to about this idea?',
      'type': 'options',
      'options': [
        '0 potential customers',
        '1-5 potential customers',
        '6-20 potential customers',
        '21-50 potential customers',
        '51-100 potential customers',
        'More than 100 potential customers',
      ],
    },
    {
      'key': 'founderExperience',
      'title': 'Founder Experience',
      'subtitle': 'Have you started or owned a business before?',
      'type': 'options',
      'options': [
        'No',
        'Yes – it closed',
        'Yes – still operating',
        'Yes – successfully sold',
      ],
    },
    {
      'key': 'industryExperience',
      'title': 'Industry Experience',
      'subtitle': 'How many years of experience do you have in this industry?',
      'type': 'options',
      'options': [
        '0 years',
        '1-2 years',
        '3-5 years',
        '5-10 years',
        '10+ years',
      ],
    },
    {
      'key': 'founderMotivation',
      'title': 'Motivation',
      'subtitle': 'What is your primary reason for starting this business?',
      'type': 'options',
      'options': [
        'Replace my salary',
        'Create a scale business',
        'Create passive income',
        'Solve a personal problem',
        'Passion project',
        'Other',
      ],
    },
    {
      'key': 'biggestObstacle',
      'title': 'Biggest Obstacle',
      'subtitle': 'What is currently the biggest thing preventing you from moving forward?',
      'type': 'options',
      'options': [
        'Funding',
        'Time',
        'Confidence',
        'Customers',
        'Marketing',
        'Technical skills',
        'Finding a co-founder',
        'Regulations',
        'Other',
      ],
    },
    {
      'key': 'businessStage',
      'title': 'Business Stage',
      'subtitle': 'Which stage best describes your business today?',
      'type': 'options',
      'options': [
        'Just an idea',
        'Researching',
        'Building an MVP',
        'Testing with customers',
        'First paying customers',
        'Growing revenue',
      ],
    },
    {
      'key': 'fundingPreference',
      'title': 'Funding Preference',
      'subtitle': 'If you needed additional funding, where would you look first?',
      'type': 'options',
      'options': [
        'Personal savings',
        'Friends and family',
        'Bank loan',
        'Government grant',
        'Angel investor',
        'Venture capital',
        'Crowdfunding',
        'Other',
      ],
    },
    {
      'key': 'successDefinition',
      'title': 'Success Definition',
      'subtitle': 'What would success look like for you?',
      'type': 'options',
      'options': [
        'Replace my salary',
        'Earn additional income',
        'Lifestyle business',
        'Sell the business',
        'Build a national company',
        'Build a global company',
      ],
    },
    {
      'key': 'cvUpload',
      'title': 'Upload Your CV / Resume (Optional)',
      'subtitle': 'Uploading your CV helps PitchLab extract your founder credentials, leadership background, and technical expertise to deliver deeper, personalized recommendations.',
      'type': 'cv',
    }
  ];

  void _nextStep() {
    if (_currentStep < _questions.length - 1) {
      _pageController.nextPage(
        duration: 400.ms,
        curve: Curves.easeInOutCubic,
      );
      setState(() {
        _currentStep++;
      });
    } else {
      _submitEvaluation();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: 400.ms,
        curve: Curves.easeInOutCubic,
      );
      setState(() {
        _currentStep--;
      });
    }
  }

  void _listen(String? key) async {
    _speech ??= stt.SpeechToText();
    if (!_isListening) {
      bool available = await _speech!.initialize(
        onStatus: (val) => print('onStatus: $val'),
        onError: (val) => print('onError: $val'),
      );
      if (available) {
        setState(() => _isListening = true);
        _speech!.listen(
          onResult: (val) => setState(() {
            if (key != null && _controllers.containsKey(key)) {
              _controllers[key]!.text = val.recognizedWords;
              _formData[key] = val.recognizedWords;
            }
            if (val.hasConfidenceRating && val.confidence > 0) {
              _confidence = val.confidence;
            }
          }),
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech!.stop();
    }
  }

  Future<void> _submitEvaluation() async {
    setState(() => _isLoading = true);
    
    // Map the new fields to backwards compatible fields for database/backend legacy support
    final founderExp = _formData['founderExperience'] ?? '';
    final indExp = _formData['industryExperience'] ?? '';
    _formData['experience'] = 'Experience: $founderExp. Industry expertise: $indExp';

    final timeComm = _formData['timeCommitment'] ?? '';
    if (timeComm.contains('30+')) {
      _formData['capacity'] = '35';
    } else if (timeComm.contains('15-30')) {
      _formData['capacity'] = '20';
    } else if (timeComm.contains('5-15')) {
      _formData['capacity'] = '10';
    } else {
      _formData['capacity'] = '3';
    }

    final investComm = _formData['investmentCommitment'] ?? '';
    _formData['budget'] = '$investComm NZD';

    print('🚀 PitchLab: _formData being submitted: $_formData');
    
    try {
      var user = FirebaseAuth.instance.currentUser;
      print('🚀 PitchLab: Submitting evaluation. Current User: ${user?.uid}');
      
      if (user != null) {
        try {
          print('🚀 PitchLab: Forcing token refresh to ensure propagation...');
          await user.getIdToken(true);
        } catch (tokenError) {
          print('⚠️ PitchLab: Token refresh failed (likely Emulator restart): $tokenError');
          print('⚠️ PitchLab: Forcing sign out to clear corrupt token state...');
          await FirebaseAuth.instance.signOut();
          user = null;
        }
      }

      if (user == null) {
        try {
          print('🚀 PitchLab: Signing in anonymously for evaluation submission...');
          final userCred = await FirebaseAuth.instance.signInAnonymously();
          user = userCred.user;
        } catch (authErr) {
          print('⚠️ PitchLab: Anonymous sign in failed: $authErr');
        }
      }

      print('🚀 PitchLab: Calling pitchLabEvaluation (us-central1)...');
      final callable = FirebaseFunctions.instanceFor(region: "us-central1")
          .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));
      final result = await callable.call(_formData);
      print('✅ PitchLab: Function call successful. Data: ${result.data}');
      
      if (!mounted) return;
      
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ResultsDashboard(
            evaluation: Map<String, dynamic>.from(result.data),
          ),
        ),
      );
    } catch (e) {
      print('❌ PitchLab SUBMISSION ERROR: $e');
      if (!mounted) return;

      // Handle stale emulator auth tokens by automatically clearing session and retrying
      if (e.toString().contains('unauthenticated') || e.toString().contains('UNAUTHENTICATED') || e.toString().contains('permission-denied')) {
        try {
          print('⚠️ PitchLab: Stale emulator token detected. Automatically refreshing Auth and retrying submission...');
          await FirebaseAuth.instance.signOut();
          await FirebaseAuth.instance.signInAnonymously();

          final retryCallable = FirebaseFunctions.instanceFor(region: "us-central1")
              .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));
          final retryResult = await retryCallable.call(_formData);
          print('✅ PitchLab: Retry successful! Data: ${retryResult.data}');

          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => ResultsDashboard(
                evaluation: Map<String, dynamic>.from(retryResult.data),
              ),
            ),
          );
          return;
        } catch (retryError) {
          print('❌ PitchLab Retry Error: $retryError');
        }
      }
      
      String friendlyError = 'Submission failed: $e';
      if (e.toString().contains('unauthenticated')) {
        friendlyError = 'Authentication Error: Your session expired or was reset by the server emulator. Please submit again.';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(friendlyError),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickCV() async {
    try {
      final cvResult = await pickCvFile();

      if (cvResult == null) {
        // User cancelled file picker dialog
        return;
      }

      final extension = cvResult.name.contains('.') ? cvResult.name.split('.').last.toLowerCase() : '';
      if (!['pdf', 'doc', 'docx'].contains(extension)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Invalid file format. Please upload a PDF, DOC, or DOCX document.'),
              backgroundColor: Colors.orangeAccent,
            ),
          );
        }
        return;
      }

      // Check max file size (10 MB limit)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (cvResult.size > maxSizeBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Selected CV file exceeds the 10MB limit. Please select a smaller file.'),
              backgroundColor: Colors.orangeAccent,
            ),
          );
        }
        return;
      }

      _selectedCvBytes = cvResult.bytes;
      _selectedCvName = cvResult.name;
      final base64String = base64Encode(cvResult.bytes);

      setState(() {
        _formData['cvBase64'] = base64String;
        _formData['cvFileName'] = cvResult.name;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('CV attached: ${cvResult.name}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking CV: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Widget _buildOptionsSelector(Map<String, dynamic> question) {
    final key = question['key']!;
    final List<String> options = List<String>.from(question['options']!);
    final selectedValue = _formData[key] ?? '';

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: options.length,
      itemBuilder: (context, index) {
        final option = options[index];
        final isSelected = selectedValue == option;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () {
              setState(() {
                _formData[key] = option;
              });
              Future.delayed(const Duration(milliseconds: 300), () {
                _nextStep();
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFF2F8FF) : const Color(0xFFF5F5F7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? const Color(0xFF0071E3) : Colors.transparent,
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      option,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: isSelected ? const Color(0xFF0071E3) : const Color(0xFF1D1D1F),
                      ),
                    ),
                  ),
                  if (isSelected)
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF0071E3),
                    ),
                ],
              ),
            ),
          ),
        ).animate().fadeIn(delay: (index * 50).ms);
      },
    );
  }

  Widget _buildLocationSelector() {
    return Column(
      children: [
        _buildLocationField('Country (Optional)', 'locationCountry', 'e.g., New Zealand'),
        const SizedBox(height: 16),
        _buildLocationField('State / Province / Region (Optional)', 'locationRegion', 'e.g., Auckland'),
        const SizedBox(height: 16),
        _buildLocationField('City / District (Optional)', 'locationCity', 'e.g., Central Auckland'),
      ],
    );
  }

  Widget _buildLocationField(String label, String key, String hint) {
    if (!_controllers.containsKey(key)) {
      _controllers[key] = TextEditingController(text: _formData[key] ?? '');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _controllers[key],
          onChanged: (val) {
            setState(() {
              _formData[key] = val;
            });
          },
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: const Color(0xffC7C7CC)),
            filled: true,
            fillColor: const Color(0xFFF5F5F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          style: GoogleFonts.inter(fontSize: 16),
        ),
      ],
    );
  }

  Widget _buildCVUploadSelector() {
    final fileName = _formData['cvFileName'] ?? '';
    final hasFile = fileName.isNotEmpty;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F7),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: hasFile ? const Color(0xFF0071E3) : const Color(0xFFE5E5EA),
                style: BorderStyle.solid,
                width: 2,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  hasFile ? Icons.insert_drive_file : Icons.cloud_upload_outlined,
                  size: 64,
                  color: hasFile ? const Color(0xFF0071E3) : const Color(0xFF86868B),
                ),
                const SizedBox(height: 16),
                Text(
                  hasFile ? fileName : 'Upload your CV / Resume',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: const Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  hasFile ? 'CV loaded successfully' : 'Accepted formats: PDF, DOC, DOCX (PDF preferred)',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: const Color(0xFF86868B),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _pickCV,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0071E3),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(hasFile ? 'Change File' : 'Choose File'),
                ),
                if (hasFile) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _formData['cvBase64'] = '';
                        _formData['cvFileName'] = '';
                      });
                    },
                    child: const Text('Remove File', style: TextStyle(color: Colors.redAccent)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              const Icon(Icons.info_outline, size: 16, color: Color(0xFF86868B)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Your CV is processed securely to extract relevant industry background and personalize recommendations.',
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: (_currentStep + 1) / _questions.length,
            backgroundColor: const Color(0xFFE5E5EA),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0071E3)),
            minHeight: 8,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : PageView.builder(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _questions.length,
              itemBuilder: (context, index) {
                final question = _questions[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Step ${index + 1} of ${_questions.length}',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF0071E3),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ).animate().fadeIn(),
                      const SizedBox(height: 8),
                      Text(
                        question['title']!,
                        style: GoogleFonts.outfit(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1D1D1F),
                        ),
                      ).animate().fadeIn().moveX(begin: -10, end: 0),
                      const SizedBox(height: 12),
                      Text(
                        question['subtitle']!,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          color: const Color(0xFF86868B),
                        ),
                      ).animate().fadeIn(delay: 100.ms),
                      const SizedBox(height: 32),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (question['type'] == 'text') ...[
                                TextField(
                                  controller: _controllers[question['key']],
                                  onChanged: (val) => _formData[question['key']!] = val,
                                  decoration: InputDecoration(
                                    hintText: question['hint'],
                                    hintStyle: GoogleFonts.inter(color: const Color(0xffC7C7CC)),
                                    enabledBorder: const UnderlineInputBorder(
                                      borderSide: BorderSide(color: Color(0xFFE5E5EA)),
                                    ),
                                    focusedBorder: const UnderlineInputBorder(
                                      borderSide: BorderSide(color: Color(0xFF0071E3), width: 2),
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _isListening ? Icons.mic : Icons.mic_none,
                                        color: _isListening ? Colors.red : const Color(0xFF0071E3),
                                      ),
                                      onPressed: () => _listen(question['key']),
                                    ),
                                  ),
                                  style: GoogleFonts.inter(fontSize: 20),
                                  maxLines: null,
                                  autofocus: true,
                                ).animate().fadeIn(delay: 200.ms),
                              ] else if (question['type'] == 'options') ...[
                                _buildOptionsSelector(question),
                              ] else if (question['type'] == 'location') ...[
                                _buildLocationSelector(),
                              ] else if (question['type'] == 'cv') ...[
                                _buildCVUploadSelector(),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          if (_currentStep > 0)
                            Expanded(
                              flex: 1,
                              child: Container(
                                height: 56,
                                margin: const EdgeInsets.only(right: 12),
                                child: OutlinedButton(
                                  onPressed: _previousStep,
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFE5E5EA)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: Text(
                                    'Back',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF1D1D1F),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          Expanded(
                            flex: 2,
                            child: SizedBox(
                              height: 56,
                              child: ElevatedButton(
                                onPressed: _nextStep,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1D1D1F),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  index == _questions.length - 1 ? 'Get My Score' : 'Continue',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ).animate().fadeIn(delay: 300.ms),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
