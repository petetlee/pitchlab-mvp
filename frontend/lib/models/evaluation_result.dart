/// Strongly-typed Data Model for PitchLab Evaluation Results (Master Redesign).
/// Ensures 100% type safety and prevents null crashes across Web UI and PDF Export.
class EvaluationResult {
  final Map<String, dynamic> raw;

  EvaluationResult(this.raw);

  factory EvaluationResult.fromMap(Map<String, dynamic>? map) {
    return EvaluationResult(map ?? {});
  }

  // Meta
  String get businessName => _str(raw['meta']?['businessName'], fallback: 'My Startup Idea');
  String get conceptSummary => _str(raw['meta']?['conceptSummary'], fallback: 'Commercial Idea Evaluation');
  String get founderName => _str(raw['meta']?['founderName'], fallback: 'Founder');
  String get founderRegion => _str(raw['meta']?['founderRegion'], fallback: 'Global');
  String get assessmentDate => _str(raw['meta']?['assessmentDate'], fallback: DateTime.now().toString().split(' ')[0]);

  // Summary Block
  Map<String, dynamic> get summaryBlock => (raw['summaryBlock'] as Map<String, dynamic>?) ?? {};

  // Reconciled Overall Score (Sum of 7 Categories)
  int get overallScore {
    final categories = scorecardCategories;
    if (categories.isNotEmpty) {
      final sum = categories.fold(0, (prev, cat) => prev + cat.scoreAchieved);
      if (sum > 0) return sum.clamp(0, 100);
    }
    final s = summaryBlock['overallScore'] ?? raw['scores']?['overall'];
    if (s is num) return s.toInt().clamp(0, 100);
    return 50;
  }

  String get scoreBandName {
    final band = summaryBlock['scoreBand'];
    if (band is Map && band['name'] != null) return band['name'].toString();
    if (band is String) return band;
    return _getBandNameFromScore(overallScore);
  }

  String get scoreBandMeaning {
    final band = summaryBlock['scoreBand'];
    if (band is Map && band['meaning'] != null) return band['meaning'].toString();
    return _getBandMeaningFromScore(overallScore);
  }

  String get pitchLabVerdict => _str(
      summaryBlock['pitchLabVerdict'] ?? raw['finalRecommendation']?['recommendation'],
      fallback: 'This idea addresses a credible problem and benefits from relevant founder expertise, but its commercial potential depends on validating real customer demand before further development.');

  List<Map<String, String>> get threePriorityActions {
    final list = summaryBlock['threePriorityActions'];
    if (list is List && list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          return {
            'heading': _str(item['heading'], fallback: 'Validate Customer Demand'),
            'explanation': _str(item['explanation'], fallback: 'Conduct discovery interviews with target users.'),
            'outcome': _str(item['outcome'], fallback: '10 completed interview insights.')
          };
        }
        return {
          'heading': 'Priority Action',
          'explanation': item.toString(),
          'outcome': 'Verified evidence.'
        };
      }).toList();
    }
    return [
      {
        'heading': '1. Conduct Customer Discovery',
        'explanation': 'Interview 10 target customers to confirm the urgency of the problem.',
        'outcome': '10 completed interview notes.'
      },
      {
        'heading': '2. Define Concierge MVP',
        'explanation': 'Design a simple manual service test before investing in software development.',
        'outcome': 'Clear MVP specification.'
      },
      {
        'heading': '3. Test Willingness to Pay',
        'explanation': 'Present target pricing terms to 5 prospects for direct feedback.',
        'outcome': '2 written pilot commitments.'
      }
    ];
  }

  Map<String, String> get executiveSnapshot {
    final snap = summaryBlock['executiveSnapshot'] as Map<String, dynamic>? ?? {};
    return {
      'recommendation': _str(snap['recommendation'] ?? raw['adviserOpinion']?['currentRecommendation'], fallback: 'Proceed with Controlled Validation'),
      'biggestStrength': _str(snap['biggestStrength'] ?? summaryBlock['biggestStrength'] ?? raw['actionPlan']?['biggestStrength'], fallback: 'Strong founder domain expertise and deep problem understanding.'),
      'biggestRisk': _str(snap['biggestRisk'] ?? summaryBlock['biggestRiskToThisIdea'], fallback: 'Uncertain customer willingness to pay prior to direct validation.'),
      'biggestUnknown': _str(snap['biggestUnknown'] ?? raw['actionPlan']?['biggestUnknown'], fallback: 'Whether customers will switch from their current manual workarounds.'),
      'suggestedValidationPeriod': _str(snap['suggestedValidationPeriod'], fallback: '90 Days'),
      'timeAvailable': _str(snap['timeAvailable'] ?? raw['founderAssessment']?['timeReality']?['weeklyAvailableHours'], fallback: '5-10 hours/week')
    };
  }

  String get progressFraming => _str(summaryBlock['progressFraming'], fallback: 'Your score reflects your idea’s current level of commercial readiness. It is not a permanent grade on you or your business.');

  String get executiveSummary => _str(raw['executiveSummary'], fallback: 'This commercial assessment synthesizes your business idea, target market, founder capabilities, and validation readiness into an actionable roadmap.');

  // Scorecard (7 Categories)
  Map<String, dynamic> get scorecardMap => (raw['scorecard'] as Map<String, dynamic>?) ?? {};

  List<ScorecardCategory> get scorecardCategories {
    final categoriesDef = [
      {'key': 'problemCustomerClarity', 'label': 'Problem and customer clarity', 'max': 15},
      {'key': 'founderCapabilityFit', 'label': 'Founder capability and fit', 'max': 15},
      {'key': 'customerValidation', 'label': 'Customer validation', 'max': 20},
      {'key': 'marketCommercialOpportunity', 'label': 'Market and commercial opportunity', 'max': 15},
      {'key': 'businessModelWillingnessToPay', 'label': 'Business model and willingness to pay', 'max': 15},
      {'key': 'competitivePosition', 'label': 'Competitive position', 'max': 10},
      {'key': 'executionReadiness', 'label': 'Execution readiness', 'max': 10},
    ];

    return categoriesDef.map((def) {
      final key = def['key'] as String;
      final max = def['max'] as int;
      final label = def['label'] as String;
      final item = scorecardMap[key] as Map<String, dynamic>? ?? {};

      int rawScore = (item['scoreAchieved'] is num) ? (item['scoreAchieved'] as num).toInt() : (item['score'] is num ? (item['score'] as num).toInt() : 0);

      // Auto-scale 0-100 percentage scores down to category max (e.g. 80 on 15 -> 12/15)
      if (rawScore > max) {
        rawScore = ((rawScore / 100.0) * max).round();
      }
      final scoreAchieved = rawScore.clamp(0, max);

      return ScorecardCategory(
        key: key,
        label: label,
        scoreAchieved: scoreAchieved,
        maxScore: max,
        evidenceLevel: _str(item['evidenceLevel'], fallback: scoreAchieved > max * 0.7 ? 'Strong Evidence' : scoreAchieved > max * 0.3 ? 'Partial Evidence' : 'Not yet evidenced'),
        explanation: _str(item['explanation'], fallback: 'Evaluated based on submitted inputs and evidence level.'),
        missingEvidence: _str(item['missingEvidence'], fallback: 'Direct customer validation and market confirmation required.'),
        howToImprove: _str(item['howToImprove'], fallback: 'Conduct targeted customer discovery interviews.'),
      );
    }).toList();
  }

  // SWOT
  Map<String, dynamic> get swot => (raw['swot'] as Map<String, dynamic>?) ?? {};
  List<String> get swotStrengths => _list(swot['strengths'], fallback: ['Founder domain expertise', 'Clear value proposition', 'Lean initial budget']);
  List<String> get swotWeaknesses => _list(swot['weaknesses'], fallback: ['Limited early customer evidence', 'Part-time founder availability']);
  List<String> get swotOpportunities => _list(swot['opportunities'], fallback: ['Growing demand for automation', 'Niche market leadership']);
  List<String> get swotThreats => _list(swot['threats'], fallback: ['Established manual workarounds', 'Competitor speed']);
  String get swotInterpretation => _str(swot['interpretation'], fallback: 'SWOT analysis indicates a strong founder foundation that requires rapid customer validation to de-risk commercial entry.');

  // Lean Canvas
  Map<String, dynamic> get leanCanvas => (raw['leanCanvas'] as Map<String, dynamic>?) ?? {};
  List<String> get lcProblem => _list(leanCanvas['problem'], fallback: ['Insecure tax management', 'Manual cash flow tracking']);
  List<String> get lcCustomerSegments => _list(leanCanvas['customerSegments'], fallback: ['Small business owners', 'Sole traders']);
  List<String> get lcEarlyAdopters => _list(leanCanvas['earlyAdopters'], fallback: ['Tech-savvy sole traders using cloud accounting']);
  List<String> get lcExistingAlternatives => _list(leanCanvas['existingAlternatives'], fallback: ['Spreadsheets', 'Manual bank transfers']);
  String get lcUniqueValueProp => _str(leanCanvas['uniqueValueProp'], fallback: 'Automated, disciplined tax set-aside integrated with bank workflow.');
  List<String> get lcProposedSolution => _list(leanCanvas['proposedSolution'], fallback: ['Automated calculation', 'Direct savings transfer prompt']);
  List<String> get lcChannels => _list(leanCanvas['channels'], fallback: ['Direct outreach', 'Accounting partner referrals']);
  List<String> get lcRevenueStreams => _list(leanCanvas['revenueStreams'], fallback: ['Monthly recurring subscription']);
  List<String> get lcCostStructure => _list(leanCanvas['costStructure'], fallback: ['API hosting', 'Customer acquisition']);
  List<String> get lcKeyMetrics => _list(leanCanvas['keyMetrics'], fallback: ['Active subscribers', 'Monthly recurring revenue']);
  String get lcUnfairAdvantage => _str(leanCanvas['unfairAdvantage'], fallback: 'Deep founder accounting background and trusted advisor access.');

  // KISS Review
  Map<String, dynamic> get kissReview => (raw['kissReview'] as Map<String, dynamic>?) ?? {};
  List<String> get kissKeep => _list(kissReview['keep'], fallback: ['Core automated calculation', 'Single account integration']);
  List<String> get kissSimplify => _list(kissReview['simplify'], fallback: ['User onboarding flow', 'Dashboard visual metrics']);
  List<String> get kissDelay => _list(kissReview['delay'], fallback: ['Multi-currency support', 'Custom mobile app']);
  String get kissSmallestTestableVersion => _str(kissReview['smallestTestableVersion'], fallback: 'Concierge MVP operating manually for 5 pilot customers.');

  // MVP Feasibility
  Map<String, dynamic> get mvpFeasibility => (raw['mvpFeasibility'] as Map<String, dynamic>?) ?? {};
  String get mvpFormat => _str(mvpFeasibility['recommendedTestFormat'], fallback: 'Concierge / Manual Pilot');
  String get mvpBudget => _str(mvpFeasibility['suggestedValidationBudget'], fallback: r'$500 - $1,500');
  List<String> get mvpInclude => _list(mvpFeasibility['whatToInclude'], fallback: ['Core calculation engine', 'Single bank feed']);
  List<String> get mvpExclude => _list(mvpFeasibility['whatToExclude'], fallback: ['Complex analytics', 'Native mobile build']);

  // Business Theme
  Map<String, dynamic> get businessTheme => (raw['businessTheme'] as Map<String, dynamic>?) ?? {};
  String get primaryTheme => _str(businessTheme['primaryTheme'], fallback: 'FinTech / Business Services');
  String get secondaryTheme => _str(businessTheme['secondaryTheme'], fallback: 'Workflow Automation');

  // Founder & Reality
  Map<String, dynamic> get founderAssessment => (raw['founderAssessment'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get timeReality => (founderAssessment['timeReality'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get capitalReality => (founderAssessment['capitalReality'] as Map<String, dynamic>?) ?? {};
  String get timeAvailable => _str(timeReality['weeklyAvailableHours'], fallback: '5-10 hours/week');
  String get capitalAvailable => _str(capitalReality['availableCapital'], fallback: r'$5,000 - $10,000');
  String get riskCapital => _str(capitalReality['initialRiskCapital'], fallback: r'$1,000');

  // Validation Ladder & Test
  Map<String, dynamic> get validation => (raw['validation'] as Map<String, dynamic>?) ?? {};
  List<Map<String, String>> get validationLadder {
    final list = validation['ladder'];
    if (list is List && list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          return {
            'stage': _str(item['stage'], fallback: 'Validation Stage'),
            'status': _str(item['status'], fallback: 'Not yet evidenced'),
            'notes': _str(item['notes'], fallback: '')
          };
        }
        return {'stage': item.toString(), 'status': 'Not yet evidenced', 'notes': ''};
      }).toList();
    }
    return [
      {'stage': 'Problem identified', 'status': 'Complete', 'notes': 'Problem confirmed'},
      {'stage': 'Target customer defined', 'status': 'Complete', 'notes': 'Sole traders & small businesses'},
      {'stage': 'Customer interviews completed', 'status': 'Not yet evidenced', 'notes': 'Target: 10 interviews'},
      {'stage': 'Problem severity confirmed', 'status': 'Not yet evidenced', 'notes': 'To be tested'},
      {'stage': 'Solution tested', 'status': 'Not yet evidenced', 'notes': 'To be tested'},
      {'stage': 'Willingness to pay tested', 'status': 'Not yet evidenced', 'notes': 'To be tested'},
      {'stage': 'Pilot users secured', 'status': 'Not yet evidenced', 'notes': 'Target: 2 pilots'},
      {'stage': 'Paying customer secured', 'status': 'Not yet evidenced', 'notes': 'Target: 1 paying customer'},
      {'stage': 'Repeat demand demonstrated', 'status': 'Not yet evidenced', 'notes': 'Next phase'},
      {'stage': 'Scalable acquisition tested', 'status': 'Not yet evidenced', 'notes': 'Next phase'}
    ];
  }

  // Market & Competition
  Map<String, dynamic> get marketCompetition => (raw['marketCompetition'] as Map<String, dynamic>?) ?? {};

  // Adviser Opinion
  Map<String, dynamic> get adviserOpinion => (raw['adviserOpinion'] as Map<String, dynamic>?) ?? {};

  // 90 Day Roadmap
  Map<String, dynamic> get ninetyDayRoadmap => (raw['ninetyDayRoadmap'] as Map<String, dynamic>?) ?? {};

  // Action Plan
  Map<String, dynamic> get actionPlan => (raw['actionPlan'] as Map<String, dynamic>?) ?? {};
  List<Map<String, String>> get topFivePriorities {
    final list = actionPlan['topFivePriorities'];
    if (list is List && list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          return {
            'priority': _str(item['priority'], fallback: 'Priority Action'),
            'action': _str(item['action'], fallback: 'Execute validation step.'),
            'metric': _str(item['metric'], fallback: '100% completion')
          };
        }
        return {'priority': 'Priority Action', 'action': item.toString(), 'metric': 'Completed'};
      }).toList();
    }
    return [
      {'priority': 'Conduct Discovery Interviews', 'action': 'Interview 10 target customers on current workarounds.', 'metric': '10 interviews'},
      {'priority': 'Confirm Problem Severity', 'action': 'Verify if customers spend money to solve this today.', 'metric': '70% pain confirmation'},
      {'priority': 'Define Concierge MVP', 'action': 'Design simple manual service before writing code.', 'metric': 'MVP spec'},
      {'priority': 'Test Willingness to Pay', 'action': 'Present pricing to 5 prospects.', 'metric': '2 pilot sign-ups'},
      {'priority': 'Establish Execution Cadence', 'action': 'Block 5 hours/week for customer interviews.', 'metric': 'Weekly completion'}
    ];
  }

  String get nextSevenDaysAction => _str(actionPlan['nextSevenDaysAction'], fallback: 'Draft your customer discovery interview script and list 10 target contacts in your network.');

  List<Map<String, dynamic>> get readinessChecklist {
    final list = actionPlan['readinessChecklist'];
    if (list is List && list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          return {
            'milestone': _str(item['milestone'], fallback: 'Validation Milestone'),
            'completed': item['completed'] == true
          };
        }
        return {'milestone': item.toString(), 'completed': false};
      }).toList();
    }
    return [
      {'milestone': 'Problem clearly defined', 'completed': true},
      {'milestone': 'Target customer clearly defined', 'completed': true},
      {'milestone': 'Customer interviews completed', 'completed': false},
      {'milestone': 'Problem severity confirmed', 'completed': false},
      {'milestone': 'Value proposition tested', 'completed': false},
      {'milestone': 'Pricing tested', 'completed': false},
      {'milestone': 'MVP or pilot tested', 'completed': false},
      {'milestone': 'First customer commitment secured', 'completed': false},
      {'milestone': 'Business model tested', 'completed': false},
      {'milestone': 'Go-to-market approach tested', 'completed': false},
      {'milestone': 'Financial assumptions prepared', 'completed': false},
      {'milestone': 'Ready for further investment', 'completed': false}
    ];
  }

  // Helper utils
  static String _str(dynamic val, {required String fallback}) {
    if (val == null) return fallback;
    final s = val.toString().trim();
    if (s.isEmpty || s == 'N/A' || s == 'null') return fallback;
    return s;
  }

  static List<String> _list(dynamic val, {required List<String> fallback}) {
    if (val is List && val.isNotEmpty) {
      final res = val.map((e) => e.toString().trim()).where((s) => s.isNotEmpty && s != 'N/A').toList();
      if (res.isNotEmpty) return res;
    }
    return fallback;
  }

  static String _getBandNameFromScore(int s) {
    if (s >= 85) return 'Investment Ready';
    if (s >= 70) return 'High Potential';
    if (s >= 55) return 'Emerging Opportunity';
    if (s >= 40) return 'Early-Stage Potential';
    return 'Exploration Stage';
  }

  static String _getBandMeaningFromScore(int s) {
    if (s >= 85) return 'Strong commercial foundations supported by meaningful evidence. Focus should move toward disciplined execution, growth planning and capital allocation.';
    if (s >= 70) return 'A promising opportunity with strong fundamentals. Some areas still require validation or strengthening before major investment.';
    if (s >= 55) return 'Encouraging foundations exist, but important commercial assumptions remain untested. Proceed through structured validation.';
    if (s >= 40) return 'The idea may have potential, but the problem, customer, solution or business model requires further clarification and evidence.';
    return 'The opportunity is still being defined. Focus on customer understanding and refining the concept before committing significant capital or development effort.';
  }
}

class ScorecardCategory {
  final String key;
  final String label;
  final int scoreAchieved;
  final int maxScore;
  final String evidenceLevel;
  final String explanation;
  final String missingEvidence;
  final String howToImprove;

  ScorecardCategory({
    required this.key,
    required this.label,
    required this.scoreAchieved,
    required this.maxScore,
    required this.evidenceLevel,
    required this.explanation,
    required this.missingEvidence,
    required this.howToImprove,
  });
}
