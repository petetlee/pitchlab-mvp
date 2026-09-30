import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'dart:convert';
import 'dart:typed_data';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'results_dashboard.dart';
import 'cv_picker_helper.dart';
import 'history_view.dart';

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

  // Live Submission Progress Tracking
  String? _submissionId;
  int _currentStageIndex = 1;
  String _currentStageName = 'Validating your submission';
  int _progressPercentage = 15;
  int _elapsedSeconds = 0;
  Timer? _elapsedTimer;
  StreamSubscription<DocumentSnapshot>? _progressSubscription;
  bool _hasSubmissionError = false;
  String? _submissionErrorMessage;

  void _startSubmissionProgress(String submissionId) {
    _submissionId = submissionId;
    _currentStageIndex = 1;
    _currentStageName = 'Validating your submission';
    _progressPercentage = 15;
    _elapsedSeconds = 0;
    _hasSubmissionError = false;
    _submissionErrorMessage = null;

    _elapsedTimer?.cancel();
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted && _isLoading && !_hasSubmissionError) {
        setState(() {
          _elapsedSeconds++;
        });
        if (_elapsedSeconds > 180 && !_hasSubmissionError) {
          _handleSubmissionError("Assessment processing timed out. Please try submitting again.");
        }
      }
    });

    _progressSubscription?.cancel();
    _progressSubscription = FirebaseFirestore.instance
        .collection('SubmissionProgress')
        .doc(submissionId)
        .snapshots()
        .listen((snapshot) {
      if (!snapshot.exists || !mounted) return;
      final data = snapshot.data();
      if (data == null) return;

      final stageIdx = data['stageIndex'] as int? ?? 1;
      final stageName = data['stageName'] as String? ?? 'Analysing your idea...';
      final percentage = data['percentage'] as int? ?? 15;
      final status = data['status'] as String? ?? 'in_progress';

      if (status == 'failed') {
        _handleSubmissionError(data['error']?.toString() ?? 'Evaluation process encountered an issue.');
        return;
      }

      setState(() {
        _currentStageIndex = stageIdx;
        _currentStageName = stageName;
        _progressPercentage = percentage;
      });
    }, onError: (err) {
      print('PitchLab: SubmissionProgress stream error: $err');
    });
  }

  void _handleSubmissionError(String message) {
    _elapsedTimer?.cancel();
    _progressSubscription?.cancel();
    if (mounted) {
      setState(() {
        _hasSubmissionError = true;
        _submissionErrorMessage = message;
      });
    }
  }

  void _resetSubmissionState() {
    _elapsedTimer?.cancel();
    _progressSubscription?.cancel();
    if (mounted) {
      setState(() {
        _isLoading = false;
        _hasSubmissionError = false;
        _submissionErrorMessage = null;
        _elapsedSeconds = 0;
      });
    }
  }

  String _formatElapsedTime(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  // Founder Predictions (Pre-Assessment Layer)
  double _predOverallConfidence = 75.0;
  double _predProblemStrength = 7.0;
  double _predDifferentiation = 7.0;
  double _predCompetitionDifficulty = 5.0;
  double _predCustomerDemand = 7.0;
  final TextEditingController _predStatedRiskController = TextEditingController();

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
    
    // Founder Background Narrative & CV
    'founderBackgroundNarrative': '',
    'founderBackgroundWordCount': 0,
    'cvBase64': '',
    'cvFileName': '',
  };

  // Quota & Submission Limit Management (MVP_IDEA_SUBMISSION_LIMIT = 3)
  bool _isAdmin = false;
  int _quotaUsed = 0;
  bool _quotaLoading = true;

  @override
  void initState() {
    super.initState();
    _checkQuota();
    
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

  Future<void> _checkQuota() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
        final isAdmin = userDoc.exists && userDoc.data()?['role'] == 'admin';

        final existingScores = await FirebaseFirestore.instance
            .collection('EvaluationScore')
            .where('userId', isEqualTo: user.uid)
            .get();

        final used = existingScores.docs.length;

        if (mounted) {
          setState(() {
            _isAdmin = isAdmin;
            _quotaUsed = used;
            _quotaLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _quotaLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _quotaLoading = false);
    }
  }

  void _showLimitReachedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.lock_clock, color: Colors.orange, size: 24),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                "You've reached your PitchLab MVP limit",
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
              "You've completed your 3 available idea assessments during the PitchLab testing stage. You can still review and compare your existing ideas and assessments.\n\nThank you for helping us test PitchLab.",
              style: GoogleFonts.inter(fontSize: 13.5, height: 1.4, color: Colors.black87),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0071E3).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Color(0xFF0071E3), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Your typed idea description has been saved in your form inputs so no work is lost.",
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF0071E3), fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close', style: GoogleFonts.inter(color: Colors.grey.shade700)),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const HistoryView()),
              );
            },
            icon: const Icon(Icons.folder_special_outlined, size: 16),
            label: Text('View My Ideas & History', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1D1D1F),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _elapsedTimer?.cancel();
    _progressSubscription?.cancel();
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
      'key': 'founderBackgroundNarrative',
      'title': 'Your Background and Experience',
      'subtitle': 'Tell us about your background, experience and motivation for pursuing this business idea. Why do you believe you are well placed to develop it?',
      'type': 'founderBackground',
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
              if (key == 'founderBackgroundNarrative') {
                _formData['founderBackgroundWordCount'] = _countWords(val.recognizedWords);
              }
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
    final String submissionId = '${DateTime.now().millisecondsSinceEpoch}_${(1000 + (9000 * 0.5)).toInt()}';
    _formData['submissionId'] = submissionId;

    setState(() => _isLoading = true);
    _startSubmissionProgress(submissionId);
    
    // Map the new fields to backwards compatible fields for database/backend legacy support
    final narrative = _formData['founderBackgroundNarrative']?.toString() ?? '';
    final wordCount = narrative.trim().isEmpty ? 0 : narrative.trim().split(RegExp(r'\s+')).length;
    _formData['founderBackgroundWordCount'] = wordCount;

    final founderExp = _formData['founderExperience'] ?? '';
    final indExp = _formData['industryExperience'] ?? '';
    _formData['experience'] = 'Founder Background Narrative: $narrative. Experience: $founderExp. Industry expertise: $indExp';

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

    _formData['founderPredictions'] = {
      'overallConfidence': _predOverallConfidence.round(),
      'problemStrength': _predProblemStrength.round(),
      'differentiation': _predDifferentiation.round(),
      'competitionDifficulty': _predCompetitionDifficulty.round(),
      'customerDemand': _predCustomerDemand.round(),
      'statedBiggestRisk': _predStatedRiskController.text.trim(),
    };

    print('🚀 PitchLab: _formData being submitted: $_formData');
    
    // Front-end Pre-submission Quota Guard
    if (!_isAdmin && _quotaUsed >= 3) {
      _resetSubmissionState();
      _showLimitReachedDialog();
      return;
    }

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

      _formData['userId'] = user?.uid ?? 'anonymous-user';

      print('🚀 PitchLab: Calling pitchLabEvaluation (us-central1)...');
      final callable = FirebaseFunctions.instanceFor(region: "us-central1")
          .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));
      final result = await callable.call(_formData);
      print('✅ PitchLab: Function call successful. Data: ${result.data}');
      
      if (!mounted) return;
      
      _progressSubscription?.cancel();
      _elapsedTimer?.cancel();
      setState(() {
        _currentStageIndex = 5;
        _currentStageName = 'Assessment complete!';
        _progressPercentage = 100;
      });

      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ResultsDashboard(
            evaluation: Map<String, dynamic>.from(result.data),
          ),
        ),
      );
      return;
    } catch (e) {
      print('❌ PitchLab SUBMISSION ERROR: $e');
      if (!mounted) return;

      final errStr = e.toString();
      if (errStr.contains('MVP_LIMIT_EXCEEDED') || errStr.contains('resource-exhausted') || errStr.contains('3 available idea assessments')) {
        _resetSubmissionState();
        _showLimitReachedDialog();
        return;
      }

      // Fail-safe recovery: Automatically clear auth state, re-authenticate anonymously, and retry once
      try {
        print('⚠️ PitchLab: Submission exception encountered. Re-authenticating anonymously and retrying...');
        await FirebaseAuth.instance.signOut();
        final freshCred = await FirebaseAuth.instance.signInAnonymously();
        _formData['userId'] = freshCred.user?.uid ?? 'anonymous-user';

        final retryCallable = FirebaseFunctions.instanceFor(region: "us-central1")
            .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));
        final retryResult = await retryCallable.call(_formData);
        print('✅ PitchLab: Retry successful! Data: ${retryResult.data}');

        if (!mounted) return;
        _progressSubscription?.cancel();
        _elapsedTimer?.cancel();
        setState(() {
          _currentStageIndex = 5;
          _currentStageName = 'Assessment complete!';
          _progressPercentage = 100;
        });

        await Future.delayed(const Duration(milliseconds: 300));
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
        print('❌ PitchLab Callable Retry Error: $retryError');
        print('🚀 PitchLab: Activating Direct HTTP POST Fallback to emulator endpoint...');
        try {
          final bool isLocalHost = kIsWeb && (Uri.base.host == 'localhost' || Uri.base.host == '127.0.0.1' || Uri.base.host.startsWith('192.168.'));
          final String host = kIsWeb
              ? (Uri.base.host.isNotEmpty ? Uri.base.host : '127.0.0.1')
              : '10.0.2.2';
          final Uri httpUrl = isLocalHost
              ? Uri.parse('http://$host:5001/demo-pitchlab/us-central1/pitchLabEvaluation')
              : Uri.parse('https://us-central1-antigravity-pitchlab.cloudfunctions.net/pitchLabEvaluation');
          print('🚀 PitchLab: Sending direct HTTP POST fallback to $httpUrl...');
          final httpRes = await http.post(
            httpUrl,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'data': _formData}),
          ).timeout(const Duration(seconds: 300));

          print('🚀 PitchLab: Direct HTTP Status Code: ${httpRes.statusCode}');
          if (httpRes.statusCode == 200) {
            final resJson = jsonDecode(httpRes.body);
            final rawData = resJson['result'] ?? resJson['data'] ?? resJson;
            final evalMap = Map<String, dynamic>.from(rawData);
            print('✅ PitchLab: Direct HTTP Fallback successful! Score: ${evalMap['overallScore']}');

            if (!mounted) return;
            _progressSubscription?.cancel();
            _elapsedTimer?.cancel();
            setState(() {
              _currentStageIndex = 5;
              _currentStageName = 'Assessment complete!';
              _progressPercentage = 100;
            });

            await Future.delayed(const Duration(milliseconds: 300));
            if (!mounted) return;

            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => ResultsDashboard(
                  evaluation: evalMap,
                ),
              ),
            );
            return;
          }
        } catch (httpErr) {
          print('❌ PitchLab Direct HTTP Fallback Error: $httpErr');
        }
      }
      
      String friendlyError = 'Submission failed: $e';
      if (e.toString().contains('unauthenticated')) {
        friendlyError = 'Authentication Error: Your session expired or was reset by the server emulator. Please try again.';
      } else if (e.toString().contains('firebase_functions/internal') || e.toString().contains('internal')) {
        friendlyError = 'An unexpected server issue occurred during processing. Please tap "Try Again".';
      }
      
      _handleSubmissionError(friendlyError);
    }
  }

  Widget _buildProgressScreen() {
    final stages = [
      {'index': 1, 'name': 'Validating your submission'},
      {'index': 2, 'name': 'Researching your idea'},
      {'index': 3, 'name': 'Analysing the opportunity'},
      {'index': 4, 'name': 'Preparing your assessment'},
      {'index': 5, 'name': 'Finalising your report'},
    ];

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: _hasSubmissionError
                      ? Colors.red.shade50
                      : const Color(0xFF0071E3).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!_hasSubmissionError)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF0071E3),
                        ),
                      )
                    else
                      const Icon(Icons.error_outline, size: 16, color: Colors.redAccent),
                    const SizedBox(width: 8),
                    Text(
                      _hasSubmissionError ? "SUBMISSION ISSUE" : "ANALYSIS IN PROGRESS",
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _hasSubmissionError ? Colors.redAccent : const Color(0xFF0071E3),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            _hasSubmissionError ? "Processing Delayed" : "PitchLab Engine Working",
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1D1D1F),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _hasSubmissionError
                ? "We encountered a temporary issue while analysing your idea."
                : "PitchLab is analysing your idea. Please keep this window open.",
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF86868B),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 28),

          if (!_hasSubmissionError) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    _currentStageName,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF1D1D1F),
                    ),
                  ),
                ),
                Text(
                  '$_progressPercentage%',
                  style: GoogleFonts.outfit(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0071E3),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                height: 10,
                child: LinearProgressIndicator(
                  value: _progressPercentage / 100.0,
                  backgroundColor: const Color(0xFFE5E5EA),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0071E3)),
                ),
              ),
            ),
            const SizedBox(height: 28),

            Column(
              children: stages.map((stg) {
                final stgIndex = stg['index'] as int;
                final stgName = stg['name'] as String;

                final isCompleted = stgIndex < _currentStageIndex || _progressPercentage >= 100;
                final isCurrent = stgIndex == _currentStageIndex && _progressPercentage < 100;

                Color iconBg = const Color(0xFFF5F5F7);
                Color iconColor = const Color(0xFF86868B);
                Color textColor = const Color(0xFF86868B);
                FontWeight fontWeight = FontWeight.normal;

                if (isCompleted) {
                  iconBg = const Color(0xFF34C759).withOpacity(0.15);
                  iconColor = const Color(0xFF34C759);
                  textColor = const Color(0xFF1D1D1F);
                  fontWeight = FontWeight.w500;
                } else if (isCurrent) {
                  iconBg = const Color(0xFF0071E3).withOpacity(0.15);
                  iconColor = const Color(0xFF0071E3);
                  textColor = const Color(0xFF0071E3);
                  fontWeight = FontWeight.bold;
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: iconBg,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: isCompleted
                              ? Icon(Icons.check, size: 18, color: iconColor)
                              : isCurrent
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Color(0xFF0071E3),
                                      ),
                                    )
                                  : Text(
                                      '$stgIndex',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: iconColor,
                                      ),
                                    ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          stgName,
                          style: GoogleFonts.inter(
                            fontSize: 14.5,
                            fontWeight: fontWeight,
                            color: textColor,
                          ),
                        ),
                      ),
                      if (isCompleted)
                        Text(
                          "Done",
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: const Color(0xFF34C759),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.timer_outlined, size: 18, color: Color(0xFF86868B)),
                  const SizedBox(width: 8),
                  Text(
                    "Elapsed processing time: ${_formatElapsedTime(_elapsedSeconds)}",
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF424245),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        "Assessment Could Not Complete",
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          color: Colors.red.shade900,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _submissionErrorMessage ?? "An unexpected delay occurred while contacting the server.",
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.red.shade900,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Don't worry: All your typed responses and uploaded CV documents are safely preserved.",
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.red.shade700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _resetSubmissionState,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: Color(0xFFE5E5EA)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Back to Form',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1D1D1F),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _resetSubmissionState();
                      _submitEvaluation();
                    },
                    icon: const Icon(Icons.refresh, size: 18),
                    label: Text(
                      'Try Again',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: const Color(0xFF0071E3),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
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

  bool _showGuidancePanel = false;

  int _countWords(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }

  Widget _buildFounderBackgroundSelector() {
    const key = 'founderBackgroundNarrative';
    if (!_controllers.containsKey(key)) {
      _controllers[key] = TextEditingController(text: _formData[key] ?? '');
    }
    final controller = _controllers[key]!;
    final text = controller.text;
    final wordCount = _countWords(text);

    final cvFileName = _formData['cvFileName'] ?? '';
    final hasCv = cvFileName.isNotEmpty;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Please provide as much relevant information as you can. This helps PitchLab understand the experience, skills, knowledge, relationships and motivation you bring to the idea.',
            style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF424245), height: 1.4),
          ),
          const SizedBox(height: 12),

          // Expandable Guidance Panel
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E5EA)),
            ),
            child: ExpansionTile(
              initiallyExpanded: _showGuidancePanel,
              onExpansionChanged: (exp) => setState(() => _showGuidancePanel = exp),
              title: Text(
                'What should I include in my response?',
                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, color: const Color(0xFF0071E3)),
              ),
              subtitle: Text(
                'View 12 suggested topics to help structure your response',
                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('You may wish to include:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 8),
                      ...[
                        'Your employment, professional or business background.',
                        'Relevant industry or sector experience.',
                        'Previous businesses, projects or ventures you have started, managed or supported.',
                        'Professional qualifications, training or technical skills.',
                        'Your experience with the problem this idea is intended to solve.',
                        'Your understanding of the target customer.',
                        'Any existing relationships with potential customers, suppliers, advisers or industry partners.',
                        'Relevant sales, marketing, financial, leadership, technology or operational experience.',
                        'Why you want to pursue this particular business idea.',
                        'Any personal experience or insight that led you to identify the opportunity.',
                        'The strengths or advantages you believe you bring.',
                        'Any important capability gaps or areas where you may need support.',
                      ].map((bullet) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0071E3))),
                            Expanded(child: Text(bullet, style: GoogleFonts.inter(fontSize: 12, height: 1.3))),
                          ],
                        ),
                      )),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Main Multiline Text Area with Voice Dictation (Microphone)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Written Response',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF1D1D1F)),
              ),
              InkWell(
                onTap: () => _listen(key),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _isListening ? Colors.red.shade50 : const Color(0xFFF0F7FF),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _isListening ? Colors.red : const Color(0xFF0071E3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isListening ? Icons.mic : Icons.mic_none,
                        size: 14,
                        color: _isListening ? Colors.red : const Color(0xFF0071E3),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isListening ? 'Listening...' : 'Voice Dictate',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _isListening ? Colors.red : const Color(0xFF0071E3),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF9F9FB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _isListening ? Colors.red : const Color(0xFFE5E5EA)),
            ),
            child: TextField(
              controller: controller,
              onChanged: (val) {
                setState(() {
                  _formData[key] = val;
                  _formData['founderBackgroundWordCount'] = _countWords(val);
                });
              },
              maxLines: null,
              minLines: 8,
              style: GoogleFonts.inter(fontSize: 15, height: 1.5),
              decoration: InputDecoration(
                hintText: 'For example: I have worked in this industry for eight years and have direct experience with the problem this business will solve. My background includes managing customers, preparing budgets and leading operational projects. I already know several potential customers who may be willing to test the idea. I am motivated to pursue this because...',
                hintStyle: GoogleFonts.inter(fontSize: 14, color: const Color(0xFFA1A1A6)),
                contentPadding: const EdgeInsets.all(16),
                border: InputBorder.none,
                suffixIcon: IconButton(
                  icon: Icon(
                    _isListening ? Icons.mic : Icons.mic_none,
                    color: _isListening ? Colors.red : const Color(0xFF0071E3),
                  ),
                  onPressed: () => _listen(key),
                  tooltip: _isListening ? 'Stop listening' : 'Start voice dictation',
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Word & Character Counter Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$wordCount words (recommended: 150+ words)',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: wordCount >= 150 ? FontWeight.w600 : FontWeight.w400,
                  color: wordCount >= 150 ? Colors.green.shade700 : const Color(0xFF86868B),
                ),
              ),
              Text(
                '${controller.text.length} chars (approx 2,500 words max)',
                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
              ),
            ],
          ),

          // Non-blocking warning if < 150 words
          if (wordCount > 0 && wordCount < 150) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFFE082)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 16, color: Colors.amber),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Adding more detail about your relevant experience, customer knowledge and motivation will help PitchLab produce a more accurate founder assessment.',
                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF5D4037)),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Optional CV Upload Section Directly Beneath
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E5EA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.badge_outlined, color: Color(0xFF0071E3), size: 20),
                    const SizedBox(width: 8),
                    Text('Upload Your CV or Résumé — Optional', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'You may upload your CV or résumé to provide additional information about your qualifications and employment history. 🔒 Privacy Guarantee: CVs are processed in-memory during your assessment only and are NEVER saved or stored on our servers.',
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF6E6E73), height: 1.3),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton.icon(
                      onPressed: _pickCV,
                      icon: Icon(hasCv ? Icons.check_circle : Icons.upload_file, size: 16),
                      label: Text(hasCv ? 'Change CV ($cvFileName)' : 'Upload CV (PDF/DOCX)'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: hasCv ? Colors.green.shade700 : const Color(0xFF0071E3),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    if (hasCv) ...[
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _formData['cvBase64'] = '';
                            _formData['cvFileName'] = '';
                          });
                        },
                        child: const Text('Remove CV', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Privacy Note
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.lock_outline, size: 14, color: Color(0xFF86868B)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'PitchLab uses this information only to assess your relevant founder capability, experience and fit with the business idea. It is not intended to judge you personally or require a traditional employment-style background.',
                  style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF86868B), fontStyle: FontStyle.italic),
                ),
              ),
            ],
          ),
        ],
      ),
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
              color: hasFile ? const Color(0xFFF0F7FF) : const Color(0xFFF5F5F7),
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
                  hasFile ? Icons.check_circle_outline : Icons.cloud_upload_outlined,
                  size: 64,
                  color: hasFile ? const Color(0xFF34C759) : const Color(0xFF0071E3),
                ),
                const SizedBox(height: 16),
                Text(
                  hasFile ? 'CV Attached: $fileName' : 'Upload Your Founder CV or Résumé (Optional)',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: const Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  hasFile
                      ? 'CV Attached (In-Memory Only). 🔒 Your CV is processed live for this assessment and will not be saved or stored.'
                      : 'Attach your CV (PDF, DOC, DOCX up to 10MB) to enrich your assessment. 🔒 In-Memory Only: Files are never saved to server storage.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: const Color(0xFF86868B),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _pickCV,
                  icon: Icon(hasFile ? Icons.swap_horiz : Icons.upload_file, size: 20),
                  label: Text(hasFile ? 'Change CV File' : 'Select CV File (PDF / DOCX)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: hasFile ? const Color(0xFF34C759) : const Color(0xFF0071E3),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                if (hasFile) ...[
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _formData['cvBase64'] = '';
                        _formData['cvFileName'] = '';
                        _selectedCvBytes = null;
                        _selectedCvName = null;
                      });
                    },
                    icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                    label: const Text('Remove File', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF9F9FB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E5EA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield_outlined, size: 20, color: Color(0xFF0071E3)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Your CV is processed securely by PitchLab AI to extract domain expertise and credentials. It is never shared or stored externally.',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF6E6E73), height: 1.4),
                  ),
                ),
              ],
            ),
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
          ? SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 640),
                    child: _buildProgressScreen(),
                  ),
                ),
              ),
            )
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
                      Row(
                        children: [
                          Text(
                            'Step ${index + 1} of ${_questions.length}',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF0071E3),
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _isAdmin
                                  ? Colors.deepPurple.shade50
                                  : _quotaUsed >= 3
                                      ? Colors.red.shade50
                                      : Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _isAdmin
                                    ? Colors.deepPurple.shade200
                                    : _quotaUsed >= 3
                                        ? Colors.red.shade200
                                        : Colors.blue.shade200,
                              ),
                            ),
                            child: Text(
                              _isAdmin
                                  ? 'Admin Account • Unlimited'
                                  : _quotaUsed >= 3
                                      ? 'MVP Limit: 3 of 3 used (0 remaining)'
                                      : 'Idea submissions: ${_quotaUsed} of 3 used (${3 - _quotaUsed} remaining)',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _isAdmin
                                    ? Colors.deepPurple.shade700
                                    : _quotaUsed >= 3
                                        ? Colors.red.shade700
                                        : const Color(0xFF0071E3),
                              ),
                            ),
                          ),
                        ],
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
                              ] else if (question['type'] == 'founderBackground') ...[
                                _buildFounderBackgroundSelector(),
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

  Widget _buildPredictionsSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tell us how you currently see the opportunity before PitchLab independently assesses it.',
          style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF424245), height: 1.4),
        ),
        const SizedBox(height: 20),

        // Question 1 — Overall confidence (0-100)
        _buildSliderCard(
          title: '1. Overall Idea Strength',
          subtitle: 'How strong do you currently believe this business idea is?',
          value: _predOverallConfidence,
          min: 0,
          max: 100,
          divisions: 100,
          label: '${_predOverallConfidence.round()}/100',
          minLabel: '0 (Very Weak)',
          maxLabel: '100 (Exceptional)',
          onChanged: (val) => setState(() => _predOverallConfidence = val),
        ),
        const SizedBox(height: 16),

        // Question 2 — Problem strength (1-10)
        _buildSliderCard(
          title: '2. Customer Problem Severity',
          subtitle: 'How serious and urgent do you believe the customer problem is?',
          value: _predProblemStrength,
          min: 1,
          max: 10,
          divisions: 9,
          label: '${_predProblemStrength.round()}/10',
          minLabel: '1 (Minor Pain)',
          maxLabel: '10 (Severe Pain)',
          onChanged: (val) => setState(() => _predProblemStrength = val),
        ),
        const SizedBox(height: 16),

        // Question 3 — Differentiation (1-10)
        _buildSliderCard(
          title: '3. Solution Differentiation',
          subtitle: 'How different is your solution from existing alternatives?',
          value: _predDifferentiation,
          min: 1,
          max: 10,
          divisions: 9,
          label: '${_predDifferentiation.round()}/10',
          minLabel: '1 (Similar to existing)',
          maxLabel: '10 (Highly Unique)',
          onChanged: (val) => setState(() => _predDifferentiation = val),
        ),
        const SizedBox(height: 16),

        // Question 4 — Competition Difficulty (1-10)
        _buildSliderCard(
          title: '4. Competitive Environment Difficulty',
          subtitle: 'How difficult do you believe the competitive environment will be?',
          value: _predCompetitionDifficulty,
          min: 1,
          max: 10,
          divisions: 9,
          label: '${_predCompetitionDifficulty.round()}/10',
          minLabel: '1 (Easy / Low Competition)',
          maxLabel: '10 (Intense Competition)',
          onChanged: (val) => setState(() => _predCompetitionDifficulty = val),
        ),
        const SizedBox(height: 16),

        // Question 5 — Customer demand (1-10)
        _buildSliderCard(
          title: '5. Customer Willingness to Pay',
          subtitle: 'How confident are you that customers will pay for this solution?',
          value: _predCustomerDemand,
          min: 1,
          max: 10,
          divisions: 9,
          label: '${_predCustomerDemand.round()}/10',
          minLabel: '1 (Uncertain)',
          maxLabel: '10 (Highly Confident)',
          onChanged: (val) => setState(() => _predCustomerDemand = val),
        ),
        const SizedBox(height: 16),

        // Question 6 — Biggest Risk (text)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F7),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E5EA)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '6. Biggest Risk (Optional)',
                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, color: const Color(0xFF1D1D1F)),
              ),
              const SizedBox(height: 4),
              Text(
                'What do you think is the single biggest reason this idea might fail? (Max 250 characters)',
                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _predStatedRiskController,
                maxLength: 250,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'e.g., Customers reluctant to switch or high initial acquisition cost...',
                  hintStyle: GoogleFonts.inter(color: const Color(0xffC7C7CC), fontSize: 14),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE5E5EA)),
                  ),
                ),
                style: GoogleFonts.inter(fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSliderCard({
    required String title,
    required String subtitle,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required String label,
    required String minLabel,
    required String maxLabel,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, color: const Color(0xFF1D1D1F)),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0071E3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  label,
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF86868B)),
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            activeColor: const Color(0xFF0071E3),
            inactiveColor: const Color(0xFFE5E5EA),
            onChanged: onChanged,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(minLabel, style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF86868B))),
              Text(maxLabel, style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF86868B))),
            ],
          ),
        ],
      ),
    );
  }
}
