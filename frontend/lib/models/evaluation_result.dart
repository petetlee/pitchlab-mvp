/// Strongly-typed Data Model for PitchLab Evaluation Results (Master Redesign).
/// Ensures 100% type safety and prevents null crashes across Web UI and PDF Export.
class EvaluationResult {
  final Map<String, dynamic> raw;

  EvaluationResult(this.raw);

  factory EvaluationResult.fromMap(Map<String, dynamic>? map) {
    return EvaluationResult(map ?? {});
  }

  // Meta
  String get businessName {
    final rawName = raw['idea'] ?? (raw['ideaInputs'] is Map ? raw['ideaInputs']['idea'] : null) ?? raw['businessIdea'] ?? raw['meta']?['businessName'];
    if (rawName is String && rawName.trim().isNotEmpty && rawName != 'My Startup Idea') {
      return rawName.trim();
    }
    return _str(raw['meta']?['businessName'], fallback: 'My Startup Idea');
  }
  String get fullBusinessName => businessName;
  String get shortBusinessName {
    final name = businessName;
    return name.length > 40 ? '${name.substring(0, 40)}...' : name;
  }
  String get conceptSummary => _str(raw['meta']?['conceptSummary'], fallback: 'Commercial Idea Evaluation');
  String get founderName => _str(raw['meta']?['founderName'], fallback: 'Founder');
  String get founderRegion => _str(raw['meta']?['founderRegion'], fallback: 'Global');
  String get assessmentDate => _str(raw['meta']?['assessmentDate'], fallback: DateTime.now().toString().split(' ')[0]);

  // Summary Block
  Map<String, dynamic> get summaryBlock => (raw['summaryBlock'] as Map<String, dynamic>?) ?? {};

  // Reconciled Overall Score (Sum of 7 Categories)
  int get overallScore {
    final direct = raw['overallScore'] ?? summaryBlock['overallScore'] ?? summaryBlock['overallReadinessScore'] ?? raw['scores']?['overall'];
    if (direct is num && direct > 0) {
      return direct.toInt().clamp(0, 100);
    }
    final categories = scorecardCategories;
    if (categories.isNotEmpty) {
      final sum = categories.fold(0, (prev, cat) => prev + cat.scoreAchieved);
      if (sum > 0) return sum.clamp(0, 100);
    }
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

  String get masterRecommendation {
    final rec = raw['masterRecommendation'] ?? raw['finalRecommendation']?['recommendation'] ?? summaryBlock['decisionStatus'];
    if (rec is String && rec.trim().isNotEmpty && rec != 'N/A') {
      return rec.trim();
    }
    final score = overallScore;
    if (score >= 85) return 'Proceed';
    if (score >= 70) return 'Proceed with Controlled Validation';
    if (score >= 40) return 'Validate Before Building';
    return 'Validate Before Building';
  }

  String get assessmentConfidence {
    final conf = raw['assessmentConfidence'];
    if (conf is String && conf.isNotEmpty) {
      final clean = conf.replaceAll('Confidence:', '').replaceAll('Confidence', '').trim();
      if (clean.isNotEmpty) return clean;
    }
    return 'Moderate';
  }

  bool get isNuclear {
    final text = '${raw['idea'] ?? ''} ${raw['category'] ?? ''} ${raw['businessName'] ?? ''} ${raw['problem'] ?? ''}'.toLowerCase();
    const nuclearKeywords = ['nuclear', 'atomic', 'reactor', 'fission', 'smr', 'radiation'];
    return nuclearKeywords.any((kw) => text.contains(kw));
  }

  bool get isHardware {
    final text = '${raw['idea'] ?? ''} ${raw['category'] ?? ''} ${raw['businessName'] ?? ''}'.toLowerCase();
    const hardwareKeywords = [
      'hardware', 'device', 'physical', 'mooring', 'rope', 'pest', 'rodent', 'solar',
      'boat', 'vessel', 'enclosure', 'sensor', 'electrified', 'mechanical', 'machine',
      'prototype', 'housing', 'manufacturing', 'tooling', 'marine'
    ];
    return hardwareKeywords.any((kw) => text.contains(kw));
  }

  String get pitchLabVerdict {
    final v = _cleanNarrativeText(_str(summaryBlock['pitchLabVerdict'] ?? raw['finalRecommendation']?['why'], fallback: ''));
    if (v.isNotEmpty && v.split('.').where((s) => s.trim().isNotEmpty).length >= 2) {
      return v;
    }
    final strength = executiveSnapshot['biggestStrength'] ?? 'Strong founder domain alignment and clear problem definition';
    final risk = executiveSnapshot['biggestRisk'] ?? 'Uncertain customer payment commitment prior to direct validation';
    return _cleanNarrativeText('This concept addresses a genuine market opportunity with $strength. However, empirical proof of customer demand and willingness to pay remains unconfirmed. The key commercial risk centers around $risk. The founder should complete structured customer discovery interviews and secure initial pilot commitments before deploying development capital.');
  }

  List<Map<String, String>> get threePriorityActions {
    final list = summaryBlock['threePriorityActions'] ?? raw['threePriorityActions'];
    if (list is List && list.isNotEmpty) {
      final parsed = list.map((item) {
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

      // Ensure no raw software terms leak into nuclear or hardware concepts
      final combined = parsed.map((e) => (e['explanation'] ?? '') + ' ' + (e['heading'] ?? '')).join(' ').toLowerCase();
      final hasSoftwareLeak = combined.contains('concierge') || combined.contains('writing code') || combined.contains('software development');
      if (!hasSoftwareLeak && (!isNuclear || combined.contains('statutory') || combined.contains('legal') || combined.contains('regulatory'))) {
        return parsed;
      }
    }

    if (isNuclear) {
      return [
        {
          'heading': '1. Verify Statutory & Legal Permissibility',
          'explanation': 'Obtain specialist legal advice to evaluate statutory prerequisites under the Radiation Safety Act 2016, Resource Management Act 1991, and Atomic Energy Act 1945 (distinguishing land-based commercial power generation from the New Zealand Nuclear Free Zone Act 1987 warship and weapon prohibitions).',
          'outcome': 'Formal written opinion from specialist legal and regulatory counsel.'
        },
        {
          'heading': '2. Specialist Technical & Regulatory Pre-Feasibility',
          'explanation': 'Engage qualified nuclear engineers, grid infrastructure specialists, and environmental regulatory consultants to map mandatory safety, site, grid connection, and statutory prerequisites.',
          'outcome': 'Technical pre-feasibility gap assessment and regulatory compliance roadmap.'
        },
        {
          'heading': '3. Capital Requirements & Public Policy Assessment',
          'explanation': 'Evaluate extreme multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment prior to commercial scoping.',
          'outcome': 'Formal Pre-Feasibility Recommendation & Risk Gateway Report.'
        }
      ];
    }

    if (isHardware) {
      return [
        {
          'heading': '1. Functional Prototype & Lab Testing',
          'explanation': 'Build a simple low-cost physical prototype to test core mechanical and electronic functionality in real-world conditions.',
          'outcome': 'Functional prototype test log and performance data.'
        },
        {
          'heading': '2. Customer Field Pilots',
          'explanation': 'Deploy 3-5 prototype units with target operators for hands-on feedback and durability testing.',
          'outcome': 'Signed pilot feedback reports and product revision specs.'
        },
        {
          'heading': '3. Manufacturing & Unit Economics Analysis',
          'explanation': 'Source component suppliers and calculate Bill of Materials (BOM) to verify gross margin targets.',
          'outcome': 'Validated BOM cost model and supplier terms.'
        }
      ];
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
      'biggestStrength': _str(snap['biggestStrength'] ?? summaryBlock['biggestStrength'] ?? raw['actionPlan']?['biggestStrength'], fallback: ((overallScore <= 45) ? 'Strong general commercial and financial capability combined with clear problem definition.' : 'Strong founder domain expertise and deep problem understanding.')),
      'biggestRisk': _str(snap['biggestRisk'] ?? summaryBlock['biggestRiskToThisIdea'], fallback: 'Uncertain customer willingness to pay prior to direct validation.'),
      'biggestUnknown': _str(snap['biggestUnknown'] ?? raw['actionPlan']?['biggestUnknown'], fallback: 'Whether customers will switch from their current manual workarounds.'),
      'suggestedValidationPeriod': _str(snap['suggestedValidationPeriod'], fallback: '90 Days'),
      'timeAvailable': _str(snap['timeAvailable'] ?? raw['founderAssessment']?['timeReality']?['weeklyAvailableHours'], fallback: '5-10 hours/week')
    };
  }

  String get progressFraming => _str(summaryBlock['progressFraming'], fallback: 'Your score reflects your idea’s current level of commercial readiness. It is not a permanent grade on you or your business.');

  String get executiveSummary => _str(raw['executiveSummary'], fallback: 'This commercial assessment synthesizes your business idea, target market, founder capabilities, and validation readiness into an actionable roadmap.');

  // Scorecard (7 Categories)
  Map<String, dynamic> get scorecardMap => (raw['scorecard'] as Map<String, dynamic>?) ?? (raw['scores'] as Map<String, dynamic>?) ?? {};

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
        evidenceLevel: _str(item['evidenceLevel'], fallback: (key == 'founderCapabilityFit' ? (scoreAchieved >= 13 ? 'Strong Evidence' : (scoreAchieved >= 10 ? 'Partial Evidence' : (scoreAchieved >= 4 ? 'Limited Evidence' : 'Not yet evidenced'))) : (scoreAchieved > max * 0.7 ? 'Strong Evidence' : scoreAchieved > max * 0.3 ? 'Partial Evidence' : 'Not yet evidenced'))),
        explanation: _str(item['explanation'] ?? item['assessment'], fallback: 'Evaluated based on submitted inputs and evidence level.'),
        missingEvidence: _str(item['missingEvidence'], fallback: 'Empirical data quantifying customer demand and market boundaries.'),
        howToImprove: _str(item['howToImprove'] ?? item['improvementAction'], fallback: 'Conduct structured customer discovery interviews with ideal personas.'),
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

  // Business Model Snapshot
  Map<String, dynamic> get businessModelSnapshot => (raw['businessModelSnapshot'] as Map<String, dynamic>?) ?? {};
  String get bmTargetCustomer => _str(businessModelSnapshot['targetCustomer'] ?? raw['targetMarket'] ?? raw['market'], fallback: 'Target customer segment defined');
  String get bmCoreOffering => _str(businessModelSnapshot['coreOffering'] ?? raw['idea'], fallback: 'Core product concept');
  String get bmCustomerProblem => _str(businessModelSnapshot['customerProblem'] ?? raw['problem'], fallback: 'Customer problem defined');
  String get bmValueProposition => _str(businessModelSnapshot['valueProposition'] ?? leanCanvas['uniqueValueProp'], fallback: 'Proactive, automated solution addressing customer friction');
  String get bmRevenueModel => _str(businessModelSnapshot['revenueModel'] ?? raw['revenueModel'], fallback: 'Predictable monthly subscription / SaaS model');
  String get bmCustomerAcquisition => _str(businessModelSnapshot['customerAcquisition'] ?? raw['network'], fallback: 'Direct outreach & network referrals');
  String get bmKeyCosts => _str(businessModelSnapshot['keyCosts'] ?? raw['budget'], fallback: 'Initial software development & hosting');
  String get bmCommercialAssessment => _str(businessModelSnapshot['commercialAssessment'] ?? pitchLabVerdict, fallback: 'Logical business model addressing a clear workflow problem.');

  // Market Insights (NEW SECTION)
  Map<String, dynamic> get marketInsightsMap => (raw['marketInsights'] as Map<String, dynamic>?) ?? {};

  String get marketLandscape => _str(
    marketInsightsMap['marketLandscape'],
    fallback: 'The broader market operates within an evolving commercial landscape shaped by changing customer requirements and regional market dynamics.'
  );

  String get demandDrivers => _str(
    marketInsightsMap['demandDrivers'],
    fallback: 'Demand is primarily driven by operational cost pressures, efficiency needs, and changing customer expectations across the sector.'
  );

  String get competitionAlternatives => _str(
    marketInsightsMap['competitionAlternatives'],
    fallback: 'The founder competes against established market incumbents, existing manual workarounds, and alternative commercial providers.'
  );

  String get commercialReality => _str(
    marketInsightsMap['commercialReality'],
    fallback: 'A critical distinction exists between large underlying market demand and the commercially accessible opportunity for this specific solution.'
  );

  String get localBusinessNews => _str(
    marketInsightsMap['localBusinessNews'],
    fallback: 'Local business news highlights rising operational cost pressures, inflation on business inputs (+2.9%), and digital compliance demands across regional operators.'
  );

  String get customerReviewTrends => _str(
    marketInsightsMap['customerReviewTrends'],
    fallback: 'Customer reviews across incumbent options reveal ongoing dissatisfaction with complex pricing, lack of automated workflows, and slow customer support.'
  );

  String get governmentPolicyInfluence => _str(
    marketInsightsMap['governmentPolicyInfluence'],
    fallback: 'Local government policies and national statutory frameworks govern resource consents, fast-track approvals, and regional compliance mandates.'
  );

  List<String> get marketInsightsParagraphs => [
    marketLandscape,
    demandDrivers,
    competitionAlternatives,
    commercialReality,
    localBusinessNews,
    customerReviewTrends,
    governmentPolicyInfluence,
  ];

  // Future Trends & Market Direction
  Map<String, dynamic> get futureTrendsMap => (raw['futureTrends'] as Map<String, dynamic>?) ?? {};

  String get futureOutlook {
    final val = _str(futureTrendsMap['futureOutlook'], fallback: '').toUpperCase();
    if (['STRONG', 'POSITIVE', 'NEUTRAL', 'UNCERTAIN', 'NEGATIVE'].contains(val)) return val;
    final score = trendAlignmentScore;
    if (score >= 8) return 'STRONG';
    if (score >= 6) return 'POSITIVE';
    if (score >= 4) return 'NEUTRAL';
    if (score >= 2) return 'UNCERTAIN';
    return 'NEGATIVE';
  }

  int get trendAlignmentScore {
    final numVal = futureTrendsMap['trendAlignmentScore'] ?? raw['scores']?['futureTrends']?['trendAlignmentScore'];
    if (numVal is num) return numVal.toInt().clamp(1, 10);
    return 7;
  }

  String get forecastConfidence {
    final val = _str(futureTrendsMap['forecastConfidence'], fallback: 'Medium');
    if (['High', 'Medium', 'Low'].contains(val)) return val;
    return 'Medium';
  }

  String get whereMarketIsHeading => _str(
    futureTrendsMap['whereMarketIsHeading'],
    fallback: 'Macro structural trends, digital workflow adoption, and evolving regulatory compliance requirements are creating steady multi-year momentum for this opportunity.'
  );

  List<String> get tailwinds {
    final list = futureTrendsMap['tailwinds'];
    if (list is List && list.isNotEmpty) return list.map((e) => e.toString()).toList();
    return [
      'Accelerating digital adoption and demand for automated workflow tools.',
      'Evolving regulatory compliance mandates requiring audited reporting.',
      'Growing pressure on businesses to reduce operational overhead.'
    ];
  }

  List<String> get headwinds {
    final list = futureTrendsMap['headwinds'];
    if (list is List && list.isNotEmpty) return list.map((e) => e.toString()).toList();
    return [
      'Customer inertia and reluctance to change entrenched manual routines.',
      'Potential entry of larger incumbent software platforms into adjacent features.'
    ];
  }

  String get futureTrendsDecisionGuidance => _str(
    futureTrendsMap['founderDecisionGuidance'],
    fallback: 'Focus on rapid low-cost customer discovery and validation to lock in early adopter commitment before investing heavily in full development.'
  );

  List<String> get adjacentOpportunities {
    final list = futureTrendsMap['adjacentOpportunities'];
    if (list is List && list.isNotEmpty) return list.map((e) => e.toString()).take(3).toList();
    return [
      'Automated compliance reporting module for regional regulatory bodies.',
      'White-label partner integration for existing industry service providers.'
    ];
  }

  // Would Investors Bite?
  Map<String, dynamic> get investorBite => (raw['investorBite'] as Map<String, dynamic>?) ?? {};

  String get ibIntro => _str(
    investorBite['introduction'],
    fallback: 'If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers.'
  );

  int get ibOverallInterestScore {
    final s = investorBite['overallInterestScore'];
    if (s is num) return s.toInt().clamp(0, 100);
    return overallScore;
  }

  String get ibInvestmentPotential => _str(
    investorBite['investmentPotential'],
    fallback: overallScore >= 75 ? 'High' : overallScore >= 50 ? 'Medium' : 'Low'
  );

  String get ibOverallInterestExplanation => _str(
    investorBite['overallInterestExplanation'],
    fallback: pitchLabVerdict
  );

  String get ibInvestmentVerdict => _str(
    investorBite['investmentVerdict'],
    fallback: 'This opportunity addresses a genuine market problem and demonstrates commercial potential. The business model is logical and the founder possesses relevant experience. However, investors would expect stronger evidence of customer demand before committing capital. Completing customer interviews, securing early users and validating pricing would substantially strengthen the investment proposition.'
  );

  List<Map<String, dynamic>> get ibScorecard {
    final rawData = investorBite['scorecard'];
    List<dynamic> list = [];
    if (rawData is List) {
      list = rawData;
    } else if (rawData is Map) {
      list = rawData.entries.map((e) {
        if (e.value is Map) {
          return {'area': e.key, ...Map<String, dynamic>.from(e.value as Map)};
        }
        return {'area': e.key, 'commentary': e.value.toString()};
      }).toList();
    }

    if (list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          final area = _str(item['area'] ?? item['name'] ?? item['title'], fallback: 'Commercial Area');
          int rating = 3;
          final rRaw = item['rating'] ?? item['score'] ?? item['ratingScore'] ?? item['stars'];
          if (rRaw is num) {
            rating = rRaw.toInt();
          } else if (rRaw != null) {
            final parsed = int.tryParse(rRaw.toString().replaceAll(RegExp(r'[^0-9]'), ''));
            if (parsed != null && parsed > 0) rating = parsed;
          }
          if (rating > 5) {
            rating = ((rating / 100.0) * 5).round();
          }
          rating = rating.clamp(1, 5);

          return {
            'area': area,
            'rating': rating,
            'commentary': _str(item['commentary'] ?? item['explanation'] ?? item['description'], fallback: 'Evaluated based on current commercial evidence.')
          };
        }
        return {'area': 'Assessment Area', 'rating': 3, 'commentary': item.toString()};
      }).toList();
    }

    // Dynamic fallback scorecard calculated from category scores
    final cList = scorecardCategories;
    int getRatingForCategory(String categoryKey, double defaultPct) {
      final match = cList.firstWhere(
        (c) => c.key == categoryKey || c.label.toLowerCase().contains(categoryKey.toLowerCase()),
        orElse: () => ScorecardCategory(key: '', label: '', scoreAchieved: 0, maxScore: 15, evidenceLevel: '', explanation: '', missingEvidence: '', howToImprove: ''),
      );
      if (match.maxScore > 0 && match.scoreAchieved > 0) {
        final pct = match.scoreAchieved / match.maxScore;
        return (pct * 5).round().clamp(1, 5);
      }
      return (defaultPct * 5).round().clamp(1, 5);
    }

    return [
      {'area': 'Problem Worth Solving', 'rating': getRatingForCategory('problemCustomerClarity', 0.7), 'commentary': 'Problem urgency and target customer definition.'},
      {'area': 'Market Opportunity', 'rating': getRatingForCategory('marketCommercialOpportunity', 0.7), 'commentary': 'Addressable market reach and commercial space.'},
      {'area': 'Competitive Advantage', 'rating': getRatingForCategory('competitivePosition', 0.6), 'commentary': 'Differentiation against existing workarounds.'},
      {'area': 'Business Model', 'rating': getRatingForCategory('businessModelWillingnessToPay', 0.7), 'commentary': 'Monetization logic and margin structure.'},
      {'area': 'Founder Capability', 'rating': getRatingForCategory('founderCapabilityFit', 0.8), 'commentary': 'Domain background and operational fit.'},
      {'area': 'Customer Validation', 'rating': getRatingForCategory('customerValidation', 0.4), 'commentary': 'Empirical proof of real customer demand.'},
      {'area': 'Scalability', 'rating': getRatingForCategory('executionReadiness', 0.6), 'commentary': 'Capacity to grow without proportional linear cost.'},
      {'area': 'Investment Readiness', 'rating': (overallScore / 100 * 5).round().clamp(1, 5), 'commentary': 'Overall evidence maturity for capital allocation.'},
    ];
  }

  List<String> get ibInvestorQuestions => _list(
    investorBite['investorQuestions'],
    fallback: [
      'How do you know customers will actually pay for this solution?',
      'What stops an established competitor from copying your core feature set?',
      'What empirical evidence proves that the customer problem is urgent and frequent?',
      'What is your specific, low-cost customer acquisition strategy?',
      'What key operational milestones will you achieve before seeking external funding?',
      'Why are you uniquely positioned as the best founder to solve this problem?'
    ]
  );

  String get ibBiggestStrength => _str(
    investorBite['biggestStrength'],
    fallback: 'Deep industry experience combined with a clearly defined customer problem.'
  );

  String get ibBiggestRisk => _str(
    investorBite['biggestRisk'],
    fallback: 'The concept currently lacks sufficient empirical market validation and customer payment proof.'
  );

  List<String> get ibImprovements => _list(
    investorBite['improvements'],
    fallback: [
      'Conduct 15-20 structured customer discovery interviews.',
      'Build a simple manual concierge MVP to test workflow adoption.',
      'Validate pricing terms directly with prospective buyers.',
      'Secure signed Letters of Intent or early pilot commitments.'
    ]
  );

  String get ibPitchLabRecommendation {
    final rec = investorBite['pitchLabRecommendation'];
    if (rec is String && rec.isNotEmpty) return rec;
    if (overallScore >= 80) return 'Ready to Pitch';
    if (overallScore >= 65) return 'Almost Ready';
    if (overallScore >= 45) return 'Needs More Validation';
    return 'Early Stage Idea';
  }

  String get ibPitchLabRecommendationExplanation => _str(
    investorBite['pitchLabRecommendationExplanation'],
    fallback: 'Focus on validating customer demand and securing early proof of willingness to pay before raising external capital.'
  );

  // KISS Review
  Map<String, dynamic> get kissReview => (raw['kissReview'] as Map<String, dynamic>?) ?? {};
  List<String> get kissKeep => _list(kissReview['keep'], fallback: isHardware ? ['Core physical mechanism', 'Basic enclosure'] : ['Core workflow engine', 'Single integration']);
  List<String> get kissSimplify => _list(kissReview['simplify'], fallback: isHardware ? ['Manual activation switch', 'Visual indicator'] : ['User onboarding flow', 'Dashboard visual metrics']);
  List<String> get kissDelay => _list(kissReview['delay'], fallback: isHardware ? ['Production tooling', 'Multi-model variants'] : ['Multi-currency support', 'Custom mobile app']);
  String get kissSmallestTestableVersion => _str(kissReview['smallestTestableVersion'], fallback: isHardware ? '3-unit functional hardware prototype deployed for 30-day field trial.' : 'Concierge MVP operating manually for 5 pilot customers.');

  // MVP Feasibility
  Map<String, dynamic> get mvpFeasibility => (raw['mvpFeasibility'] as Map<String, dynamic>?) ?? {};
  String get mvpFormat => _str(mvpFeasibility['recommendedTestFormat'], fallback: isHardware ? 'Functional Hardware Prototype / Field Trial' : 'Concierge / Manual Pilot');
  String get mvpBudget => _str(mvpFeasibility['suggestedValidationBudget'], fallback: r'$500 - $1,500');
  List<String> get mvpInclude => _list(mvpFeasibility['whatToInclude'], fallback: isHardware ? ['Core physical mechanism', 'Basic enclosure', 'Essential electronic functionality', 'Field trial testing'] : ['Core workflow engine', 'Primary user interface']);
  List<String> get mvpExclude => _list(mvpFeasibility['whatToExclude'], fallback: isHardware ? ['Production tooling', 'Mass-manufacturing optimisation', 'Final certification', 'Non-essential features'] : ['Complex analytics', 'Native mobile build']);

  // Business Theme & Strategic Positioning
  Map<String, dynamic> get businessTheme => (raw['businessTheme'] as Map<String, dynamic>?) ?? {};
  String get primaryTheme => _str(businessTheme['primaryTheme'], fallback: isHardware ? 'Hardware & Physical Product Innovation' : 'B2B Software & Business Services');
  String get secondaryTheme => _str(businessTheme['secondaryTheme'], fallback: isHardware ? 'Field Trial Validation & Asset Protection' : 'Workflow Efficiency & Automation');
  String get strategicPositioning => _str(
    businessTheme['strategicPositioning'],
    fallback: 'Positions as a high-efficiency specialized solution directly targeting operational pain points. De-risks adoption by delivering immediate physical and functional value.'
  );
  String get marketCategoryDynamics => _str(
    businessTheme['marketCategoryDynamics'],
    fallback: 'Driven by market demand for durable, low-maintenance asset protection and automated operational tools.'
  );
  String get strategicMoat => _str(
    businessTheme['strategicMoat'],
    fallback: 'Proprietary design mechanics, domain experience, and direct field trial relationships.'
  );

  // CV Analysis
  Map<String, dynamic> get cvAnalysis => (raw['cvAnalysis'] as Map<String, dynamic>?) ?? {};
  bool get hasCvAnalysis => cvAnalysis.isNotEmpty;
  List<String> get cvCredentials {
    final list = _list(cvAnalysis['extractedCredentials'], fallback: []);
    if (list.isNotEmpty && !list.any((s) => s.contains('Relevant professional domain') || s.contains('Synthesized founder credentials'))) {
      return list.map<String>((s) => _cleanNarrativeText(s)).toList();
    }
    final cvText = _str(raw['founderCvExtractedText'] ?? raw['experience'], fallback: '');
    final narrative = founderBackgroundNarrative;
    return _extractSpecificCredentials(cvText, narrative);
  }

  static List<String> _extractSpecificCredentials(String cvText, String narrative) {
    final combined = '$cvText $narrative'.toLowerCase();
    final List<String> creds = [];
    if (combined.contains('chartered accountant') || combined.contains('caanz') || combined.contains(' ca ')) {
      creds.add('Chartered Accountant (CA / CAANZ)');
    }
    if (combined.contains('bachelor of commerce') || combined.contains('bcom')) {
      creds.add('Bachelor of Commerce (BCom)');
    }
    if (combined.contains('xero certified') || combined.contains('xero')) {
      creds.add('Xero Certified Advisor & Accounting Systems Specialist');
    }
    if (combined.contains('finance manager') || combined.contains('clever core')) {
      creds.add('Finance Manager / Senior Financial Leadership Experience');
    }
    if (combined.contains('director') || combined.contains('senior partner') || combined.contains('partner')) {
      creds.add('Senior Commercial Partner & Executive Advisory Background');
    }
    if (combined.contains('manufacturing') || combined.contains('off-site') || combined.contains('d365') || combined.contains('hyperion')) {
      creds.add('Manufacturing, ERP (D365) & Operational Systems Management');
    }
    if (combined.contains('20+') || combined.contains('years') || combined.contains('tax')) {
      creds.add('20+ Years Senior Commercial, Tax & Business Advisory Experience');
    }
    if (creds.isNotEmpty) return creds;
    return ['Identified Domain Background & Industry Context', 'Commercial & Operational Capability'];
  }

  String get cvStrengths => _str(cvAnalysis['founderStrengthsFromCV'], fallback: 'Extensive domain expertise, professional background, and direct access to target market customers.');
  String get cvAlignment => _str(cvAnalysis['alignmentWithBusinessIdea'], fallback: 'Founder background directly supports problem insight and de-risks initial concept execution.');

  // Founder Background Narrative & 4-Part Explanation
  String get founderBackgroundNarrative => _str(raw['founderBackgroundNarrative'], fallback: '');
  String get founderBackgroundSummary {
    final narrative = founderBackgroundNarrative.trim();
    if (narrative.isEmpty) {
      return 'The founder brings relevant industry context and background experience to support early concept validation.';
    }
    final String cleanFitReason = whyThisScoreWasAwarded.isNotEmpty ? whyThisScoreWasAwarded : 'relevant domain background and professional context to lead product validation.';
    final String cleanEvidence = evidenceReliedOn.isNotEmpty ? evidenceReliedOn : 'submitted founder experience and background credentials.';

    if (founderCapabilityScore <= 6) {
      return _cleanNarrativeText('Advisor Insight: Based on $cleanEvidence, $cleanFitReason While the founder possesses valuable transferable commercial capability, direct venture-specific domain experience and technical capability remain key gaps to address.');
    }
    return _cleanNarrativeText('Advisor Insight: Based on $cleanEvidence, $cleanFitReason This provides relevant commercial authority, operational insight, and customer reach to support concept validation.');
  }
  Map<String, dynamic> get founderCapabilityExplanation => (raw['founderCapabilityExplanation'] as Map<String, dynamic>?) ?? {};
  String get evidenceReliedOn => _str(founderCapabilityExplanation['evidenceReliedOn'], fallback: 'Founder experience, domain background, and customer access.');
  String get whyThisScoreWasAwarded => _str(founderCapabilityExplanation['whyThisScoreWasAwarded'], fallback: 'Recognises relevant domain knowledge and commercial capability.');
  List<String> get capabilityGaps => _list(founderCapabilityExplanation['capabilityGaps'], fallback: isHardware ? ['Mass manufacturing setup', 'Industrial design tooling'] : ['Software development build', 'Digital marketing reach']);
  List<String> get recommendedGapResponses => _list(founderCapabilityExplanation['recommendedResponse'], fallback: isHardware ? ['Engage an industrial design contractor for prototype enclosure', 'Partner with a local electronics manufacturer'] : ['Contract a specialist software developer for the MVP', 'Engage an advisory mentor for growth']);

  // Helper for Founder Capability Score
  int get founderCapabilityScore {
    final item = scorecardMap['founderCapabilityFit'] as Map<String, dynamic>? ?? {};
    if (item.containsKey('scoreAchieved') && item['scoreAchieved'] is num) {
      return (item['scoreAchieved'] as num).toInt();
    }
    if (item.containsKey('score') && item['score'] is num) {
      return (item['score'] as num).toInt();
    }
    final match = scorecardCategories.firstWhere(
      (c) => c.key == 'founderCapabilityFit',
      orElse: () => ScorecardCategory(key: 'founderCapabilityFit', label: 'Founder capability and fit', scoreAchieved: 0, maxScore: 15, evidenceLevel: '', explanation: '', missingEvidence: '', howToImprove: ''),
    );
    return match.scoreAchieved;
  }

  // Founder Metrics & Reality
  Map<String, dynamic> get founderMetrics => (raw['founderMetrics'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get founderAssessment => (raw['founderAssessment'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get timeReality => (founderAssessment['timeReality'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get capitalReality => (founderAssessment['capitalReality'] as Map<String, dynamic>?) ?? {};

  // Deterministic Founder Positioning derived directly from reconciled Founder Capability score
  String get founderPositionSummary {
    final aiSummary = _str(founderMetrics['founderPositionSummary'] ?? founderAssessment['founderPositionSummary'], fallback: '');
    if (aiSummary == 'Well Positioned' || aiSummary == 'Workable With Constraints' || aiSummary == 'Important Gaps to Address' || aiSummary == 'Material Founder Constraints') {
      return aiSummary;
    }

    final score = founderCapabilityScore;
    if (score >= 12) {
      return 'Well Positioned';
    } else if (score >= 7) {
      return 'Workable With Constraints';
    } else if (score >= 4) {
      return 'Important Gaps to Address';
    } else {
      return 'Material Founder Constraints';
    }
  }

  String get founderMetricsAnalysis {
    final aiAnalysis = _str(founderMetrics['analysis'] ?? founderAssessment['analysis'], fallback: '');
    if (aiAnalysis.isNotEmpty && !aiAnalysis.toLowerCase().contains("constrained") && !aiAnalysis.toLowerCase().contains("lack")) {
      return aiAnalysis;
    }
    if (founderCapabilityScore >= 12) {
      return 'The founder possesses suitable credentials and background to execute early validation for this opportunity.';
    } else if (founderCapabilityScore >= 7) {
      return 'The founder brings relevant commercial capability and motivation. Current constraints are manageable with disciplined, stage-aware validation.';
    } else if (founderCapabilityScore >= 4) {
      return 'The founder demonstrates general commercial skills, but specific domain or technical capability gaps need attention or partners as validation progresses.';
    }
    return 'Material execution constraints exist; the founder should focus on securing technical/domain partners or refining the venture scope before committing capital.';
  }

  // Stage-Aware Time & Capital Reality Getters
  String get timeRealitySummary {
    final t = timeAvailable.toLowerCase();
    if (t.contains('0-5') || t.contains('0–5') || t.contains('0 to 5') || t.contains('3')) {
      return 'Limited but workable for early validation.';
    } else if (t.contains('5-10') || t.contains('5–10') || t.contains('5 to 10') || t.contains('5-15') || t.contains('10')) {
      return 'Practical early-stage commitment.';
    } else if (t.contains('10-20') || t.contains('10–20') || t.contains('15-30') || t.contains('20')) {
      return 'Strong part-time capacity.';
    } else {
      return 'High execution capacity.';
    }
  }

  String get timeImplication {
    final t = timeAvailable.toLowerCase();
    if (t.contains('0-5') || t.contains('0–5') || t.contains('0 to 5') || t.contains('3')) {
      return 'At 0–5 hours per week, progress will need to be highly focused. This is enough to investigate the opportunity and test the most important assumptions, but probably not enough to simultaneously build, market and operate a full business. Concentrate initially on validation rather than execution.';
    } else if (t.contains('5-10') || t.contains('5–10') || t.contains('5 to 10') || t.contains('5-15') || t.contains('10')) {
      return 'Five to ten focused hours each week can support meaningful validation and steady progress. You should be able to conduct customer discovery, test the commercial model and progressively develop the concept without requiring an unrealistic full-time commitment.';
    } else if (t.contains('10-20') || t.contains('10–20') || t.contains('15-30') || t.contains('20')) {
      return 'This provides meaningful capacity to move beyond research into structured validation, prototype development and early market testing, provided you maintain clear priorities.';
    } else {
      return 'High weekly availability provides significant execution runway. Note that time alone does not compensate for weak execution, poor founder-market fit or unvalidated commercial assumptions.';
    }
  }

  String get capitalRealitySummary {
    final cap = capitalAvailable;
    if (cap.contains(r'$0') || cap.contains('500') || cap.contains('2,500')) {
      return 'Suitable for lean validation (interviews, surveys, landing-page testing), but likely insufficient for major product development, tooling or launch costs.';
    } else if (cap.contains('5,000') || cap.contains('10,000')) {
      return 'Workable for initial MVP prototype development, customer validation, and pilot testing.';
    }
    return 'Sufficient initial capital to execute validation and early pilot operations.';
  }

  String get category => _str(raw['category'], fallback: '');

  String get likelyValidationCapitalRequired {
    final aiVal = _str(founderAssessment['likelyValidationCapitalRequired'] ?? raw['likelyValidationCapitalRequired'], fallback: '');
    if (aiVal.isNotEmpty) return aiVal;
    final catLower = category.toLowerCase();
    if (isNuclear || catLower.contains('energy') || catLower.contains('infrastructure')) {
      return r'$5,000 – $25,000+ NZD (Specialist Legal & Regulatory Feasibility)';
    } else if (isHardware || catLower.contains('marine') || catLower.contains('hardware')) {
      return r'$1,500 – $5,000 NZD (Physical Prototype & Supplier Quotes)';
    }
    return r'$300 – $1,500 NZD (Lean Customer Discovery & Landing Page Testing)';
  }

  String get riskCapitalExplanation =>
      'Risk capital means money the founder could afford to commit to investigating the opportunity without relying on the business succeeding or immediately recovering that investment. The objective at this stage is to invest enough to obtain better evidence before committing substantially more capital.';

  List<String> get whatMattersNow {
    final aiList = (raw['whatMattersNow'] as List?)?.map((e) => e.toString()).toList();
    if (aiList != null && aiList.isNotEmpty) return aiList;

    final t = timeAvailable.toLowerCase();
    final isLowTime = t.contains('0-5') || t.contains('0–5') || t.contains('3');
    final cap = capitalAvailable;
    final isLowCap = cap.contains(r'$0') || cap.contains('500') || cap.contains('2,500');

    return [
      isLowTime
          ? 'Your available time is limited (0–5 hrs/wk), but sufficient for early validation—provided your weekly scope remains strictly focused on 1 priority objective.'
          : 'Your available time allows steady progress; maintain disciplined focus on direct customer validation before expanding product features.',
      isLowCap
          ? 'Your initial risk budget ($riskCapital) can support early customer research and landing page testing, but major development costs must be delayed until willingness-to-pay is proven.'
          : 'Your initial budget is workable for prototype development; preserve capital for customer acquisition experiments rather than premature tooling.',
      founderCapabilityScore <= 6
          ? 'Specialist technical, manufacturing or domain capability can be sourced via advisors, contractors or partners later; it does not need to be personally solved by the founder prior to customer validation.'
          : 'Core founder capabilities are well aligned for early stage execution; focus on testing customer demand assumptions.',
    ];
  }

  List<String> get notAPriorityYet {
    final aiList = (raw['notAPriorityYet'] as List?)?.map((e) => e.toString()).toList();
    if (aiList != null && aiList.isNotEmpty) return aiList;

    return [
      'Raising substantial external capital: The stronger immediate objective is determining whether target customers genuinely experience the problem and would pay for the proposed solution.',
      'Building a full technical team or company infrastructure: First validate underlying customer demand and commercial unit economics before committing to long-term operational overhead.',
    ];
  }

  List<String> get recommendedApproach {
    final aiList = (raw['recommendedApproach'] as List?)?.map((e) => e.toString()).toList();
    if (aiList != null && aiList.isNotEmpty) return aiList;

    final t = timeAvailable.toLowerCase();
    final isLowTime = t.contains('0-5') || t.contains('0–5') || t.contains('3');

    return [
      isLowTime
          ? 'Select ONE major validation objective each week and batch founder work into 1–2 focused sessions.'
          : 'Structure weekly validation sprints around direct customer interviews and prototype feedback.',
      'Avoid building unnecessary product features or writing extensive code before customer willingness-to-pay is validated.',
      'Concentrate on testing the highest-risk business assumptions first (problem severity and customer willingness-to-pay).',
      'Maintain a 90-day execution horizon to ensure steady, consistent progress without founder burnout.',
    ];
  }

  String get founderRealityFooter =>
      'Founder Reality: Most businesses begin around existing work, family and financial commitments. Early progress is more dependent on choosing the right priorities and consistently testing the idea than immediately working full-time or committing significant capital.';

  // P.A.R.A.-Inspired Idea Portfolio & Decision System (Fix 14)
  Map<String, dynamic> get portfolioMeta => (raw['portfolioMeta'] as Map<String, dynamic>?) ?? {};
  String get decisionState => _str(portfolioMeta['decisionState'], fallback: masterRecommendation);
  String get ventureStage => _str(portfolioMeta['ventureStage'], fallback: scoreBandName);

  Map<String, dynamic> get problemVsSolution => (portfolioMeta['problemVsSolution'] as Map<String, dynamic>?) ?? {};
  String get underlyingProblem => _str(problemVsSolution['underlyingProblem'], fallback: _str(raw['problem'], fallback: 'Observed customer pain point'));
  String get currentProposedSolution => _str(problemVsSolution['currentProposedSolution'], fallback: businessName);
  String get problemStatus => _str(problemVsSolution['problemStatus'], fallback: isNuclear ? 'Worth Investigating (Problem Preserved)' : 'Worth Investigating');
  String get solutionStatus => _str(problemVsSolution['solutionStatus'], fallback: isNuclear ? 'Infeasible in Current Formulation' : 'Viable Candidate');
  String get portfolioAction => _str(problemVsSolution['portfolioAction'], fallback: 'Preserve the problem statement while exploring alternative solutions or target geographies.');

  String get nextEvidenceGateway {
    final metaGateway = _str(portfolioMeta['nextEvidenceGateway'], fallback: '');
    if (metaGateway.isNotEmpty) return metaGateway;
    if (isNuclear) return 'Establish statutory, legal and public-policy feasibility with qualified specialists.';
    if (isHardware) return 'Produce physical proof-of-concept prototype & obtain manufacturer unit cost estimates.';
    return 'Conduct 10 customer discovery interviews & validate prototype interactive workflow.';
  }

  String get reassessmentTrigger {
    final metaTrigger = _str(portfolioMeta['reassessmentTrigger'], fallback: '');
    if (metaTrigger.isNotEmpty) return metaTrigger;
    if (isNuclear) return 'Return when statutory legislation or preliminary legal advice confirms a viable regulatory pathway.';
    return 'Return after completing 10 discovery calls and securing 3 LOIs or pre-orders.';
  }

  // Prioritize exact user questionnaire choices
  String get timeAvailable {
    final userChoice = _str(raw['timeCommitment'], fallback: '');
    if (userChoice.isNotEmpty && userChoice.contains('hours')) {
      return userChoice;
    }
    final cap = _str(raw['capacity'], fallback: '');
    if (cap == '35') return '30+ hours/week';
    if (cap == '20') return '15-30 hours/week';
    if (cap == '10') return '5-15 hours/week';
    if (cap == '3') return '0-5 hours/week';
    return _str(founderMetrics['weeklyAvailableHours'] ?? timeReality['weeklyAvailableHours'], fallback: '15-30 hours/week');
  }

  String get capitalAvailable {
    final userChoice = raw['investmentCommitment'] ?? raw['budget'];
    final aiChoice = founderMetrics['availableCapital'] ?? capitalReality['availableCapital'];
    return _formatCapitalValue(userChoice?.toString(), aiChoice?.toString());
  }

  String get riskCapital {
    final invest = capitalAvailable;
    if (invest.contains(r'$0') || invest.contains('500')) {
      return r'$500 NZD';
    } else if (invest.contains('2,500')) {
      return r'$1,000 NZD';
    } else if (invest.contains('5,000') || invest.contains('10,000')) {
      return r'$2,500 NZD';
    } else if (invest.contains('25,000') || invest.contains('50,000') || invest.contains('100,000')) {
      return r'$5,000 NZD';
    }
    return _str(founderMetrics['initialRiskCapital'] ?? capitalReality['initialRiskCapital'], fallback: r'$1,000 NZD');
  }

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
            'priority': _cleanNarrativeText(_str(item['priority'], fallback: 'Priority Action'), isHardware: isHardware),
            'action': _cleanNarrativeText(_str(item['action'], fallback: 'Execute validation step.'), isHardware: isHardware),
            'metric': _cleanNarrativeText(_str(item['metric'], fallback: '100% completion'), isHardware: isHardware)
          };
        }
        return {'priority': 'Priority Action', 'action': _cleanNarrativeText(item.toString(), isHardware: isHardware), 'metric': 'Completed'};
      }).toList();
    }
    if (isHardware) {
      return [
        {'priority': 'Conduct Discovery Interviews', 'action': 'Interview 10 target vessel owners or commercial operators on current pest issues.', 'metric': '10 interviews'},
        {'priority': 'Confirm Problem Severity', 'action': 'Verify if boat owners incur costly pest damage today and pay for deterrent solutions.', 'metric': '70% pain confirmation'},
        {'priority': 'Develop & Test Field Prototype', 'action': 'Develop a basic functional prototype and test the core deterrent mechanism in a marine environment.', 'metric': 'Prototype field test'},
        {'priority': 'Test Willingness to Pay', 'action': 'Present product specs and estimated pricing to 5 marina prospects.', 'metric': '2 pilot commitments'},
        {'priority': 'Establish Execution Cadence', 'action': 'Block 5-10 hours/week dedicated strictly to prototype testing and customer discovery.', 'metric': 'Weekly completion'}
      ];
    }
    return [
      {'priority': 'Conduct Discovery Interviews', 'action': 'Interview 10 target customers on current workarounds.', 'metric': '10 interviews'},
      {'priority': 'Confirm Problem Severity', 'action': 'Verify if customers spend money to solve this today.', 'metric': '70% pain confirmation'},
      {'priority': 'Define Concierge MVP', 'action': 'Design simple manual service before investing in software development.', 'metric': 'MVP spec'},
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

  // Format capital value cleanly matching user questionnaire
  static String _formatCapitalValue(String? inputVal, String? aiVal) {
    String raw = (inputVal ?? '').trim();
    if (raw.isEmpty || raw.toLowerCase() == 'n/a' || raw.toLowerCase() == 'null') {
      raw = (aiVal ?? '').trim();
    }
    if (raw.isEmpty || raw.toLowerCase() == 'n/a' || raw.toLowerCase() == 'null') {
      return r'$5,000–$10,000 NZD';
    }

    String s = raw.replaceAll(RegExp(r'nzd', caseSensitive: false), '').replaceAll(r'$', '').trim();
    final rangeMatch = RegExp(r'([0-9,\s]+)(?:[–-]|to)([0-9,\s]+)', caseSensitive: false).firstMatch(s);
    if (rangeMatch != null) {
      final n1 = int.tryParse(rangeMatch.group(1)!.replaceAll(',', '').trim());
      final n2 = int.tryParse(rangeMatch.group(2)!.replaceAll(',', '').trim());
      if (n1 != null && n2 != null) {
        return '\$$n1–\$$n2 NZD';
      }
    }

    if (s.toLowerCase().contains('more than') || s.contains('+')) {
      final n = int.tryParse(s.replaceAll(RegExp(r'[^0-9]'), ''));
      if (n != null) {
        return 'More than \$$n NZD';
      }
    }

    final n = int.tryParse(s.replaceAll(',', '').trim());
    if (n != null && n >= 0) {
      return '\$$n NZD';
    }

    return '\$${raw.replaceAll(RegExp(r'NZD', caseSensitive: false), '').trim()} NZD';
  }

  // Helper utils
  static String _cleanNarrativeText(String input, {bool isHardware = false}) {
    if (input.isEmpty) return input;
    String s = input.trim();

    // FIX: Remove malformed regex artifacts ($1, lock-$1, tax agents$1)
    s = s.replaceAll(r'lock-$1', 'lock-in');
    s = s.replaceAll(r'$1', '');

    // FIX 5: Remove NPS from early stage roadmaps
    s = s.replaceAll(RegExp(r'customer NPS', caseSensitive: false), 'qualitative satisfaction & problem resolution feedback');
    s = s.replaceAll(RegExp(r'NPS score', caseSensitive: false), 'user feedback & continuation willingness');
    s = s.replaceAll(RegExp(r'Net Promoter Score', caseSensitive: false), 'customer referral feedback');
    s = s.replaceAll(RegExp(r'\bNPS\b'), 'user feedback');

    s = s.replaceFirst(RegExp(r'^Advisor Insight:\s*Advisor Insight:\s*', caseSensitive: false), 'Advisor Insight: ');
    s = s.replaceAll('Synthesized founder credentials and background support project execution', 'Extracted founder professional experience and background');
    s = s.replaceAll('Synthesized founder credentials', 'Founder professional background');
    s = s.replaceAll('The goal is addresses a genuine commercial problem for The target market includes', 'This concept addresses a genuine commercial problem for the target market');
    s = s.replaceAll('The goal is addresses', 'This concept addresses');

    // FIX 1: Dynamic non-software/hardware wording adaptation
    if (isHardware) {
      s = s.replaceAll(RegExp(r'Design simple manual service before writing code\.', caseSensitive: false), 'Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.');
      s = s.replaceAll(RegExp(r'Design a simple manual service test before investing in software development\.', caseSensitive: false), 'Develop a simple functional prototype and field test the core concept before investing significantly in product development, tooling or manufacturing.');
      s = s.replaceAll(RegExp(r'before writing code', caseSensitive: false), 'before investing significantly in product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'investing in software development', caseSensitive: false), 'investing in product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'software development', caseSensitive: false), 'product development, prototyping, tooling or manufacturing');
      s = s.replaceAll(RegExp(r'Concierge MVP Test', caseSensitive: false), 'Prototype & Field Test');
      s = s.replaceAll(RegExp(r'Concierge MVP', caseSensitive: false), 'Field Test Prototype');
      s = s.replaceAll(RegExp(r'concierge pilot', caseSensitive: false), 'controlled field pilot');
      s = s.replaceAll(RegExp(r'writing code', caseSensitive: false), 'investing in product development & manufacturing');
    }

    // Fix 3 Root Cause: Dart replaceAllMapped for duplicate words
    s = s.replaceAllMapped(RegExp(r'\b(\w+)\s+\1\b', caseSensitive: false), (match) => match.group(1)!);
    s = s.replaceAll(RegExp(r'\s+'), ' ');
    s = s.replaceAll('..', '.');
    s = s.replaceAll(',.', '.');
    s = s.replaceAll('.,', '.');
    s = s.replaceAll(',,', ',');
    s = s.replaceAll(RegExp(r'\s([,\.\?!])'), r'$1');
    return s.trim();
  }

  Map<String, dynamic> get founderPredictions {
    if (raw['founderPredictions'] is Map) {
      return Map<String, dynamic>.from(raw['founderPredictions']);
    }
    if (raw['founderEvidenceGap'] is Map && raw['founderEvidenceGap']['founderPredictions'] is Map) {
      return Map<String, dynamic>.from(raw['founderEvidenceGap']['founderPredictions']);
    }
    return {
      'overallConfidence': 75,
      'problemStrength': 7,
      'differentiation': 7,
      'competitionDifficulty': 5,
      'customerDemand': 7,
      'statedBiggestRisk': ''
    };
  }

  Map<String, dynamic> get founderEvidenceGap {
    if (raw['founderEvidenceGap'] is Map) {
      return Map<String, dynamic>.from(raw['founderEvidenceGap']);
    }
    return {};
  }

  List<Map<String, dynamic>> get blindSpots {
    final gapMap = founderEvidenceGap;
    if (gapMap['blindSpots'] is List) {
      return List<Map<String, dynamic>>.from(
        (gapMap['blindSpots'] as List).map((e) => Map<String, dynamic>.from(e as Map))
      );
    }
    return [];
  }

  List<Map<String, dynamic>> get positiveSurprises {
    final gapMap = founderEvidenceGap;
    if (gapMap['positiveSurprises'] is List) {
      return List<Map<String, dynamic>>.from(
        (gapMap['positiveSurprises'] as List).map((e) => Map<String, dynamic>.from(e as Map))
      );
    }
    return [];
  }

  Map<String, dynamic>? get postAssessmentDecision {
    if (raw['postAssessmentDecision'] is Map) {
      return Map<String, dynamic>.from(raw['postAssessmentDecision']);
    }
    return null;
  }

  static String _str(dynamic val, {required String fallback}) {
    if (val == null) return fallback;
    final s = val.toString().trim();
    if (s.isEmpty || s == 'N/A' || s == 'null') return fallback;
    return _cleanNarrativeText(s);
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
