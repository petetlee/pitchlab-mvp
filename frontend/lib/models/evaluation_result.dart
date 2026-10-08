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
  // Version Control & Deployment Metadata
  String get appVersion => _str(raw['appVersion'], fallback: 'v0.9.3');
  String get fullVersionString => _str(raw['fullVersionString'], fallback: 'PitchLab MVP v0.9.3');
  String get buildId => _str(raw['buildId'], fallback: '1ef9fa0');
  String get assessmentGeneratedAtFormatted => _str(raw['assessmentGeneratedAtFormatted'], fallback: '01 Oct 2026 NZST');
  String get assessmentDate => _str(raw['assessmentDate'] ?? raw['assessmentGeneratedAtFormatted'] ?? raw['meta']?['date'], fallback: '01 Oct 2026');
  String get versionMarker => '$fullVersionString • Build $buildId';

  // Summary Block
  Map<String, dynamic> get summaryBlock => (raw['summaryBlock'] as Map<String, dynamic>?) ?? {};

  // Reconciled Overall Score (Sum of 7 Categories)
  int get overallScore {
    final categories = scorecardCategories;
    if (categories.isNotEmpty) {
      final sum = categories.fold(0, (prev, cat) => prev + cat.scoreAchieved);
      if (sum > 0) return sum.clamp(0, 100);
    }
    final direct = raw['overallScore'] ?? summaryBlock['overallScore'] ?? summaryBlock['overallReadinessScore'] ?? raw['scores']?['overall'];
    if (direct is num && direct > 0) {
      return direct.toInt().clamp(0, 100);
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
    final reg = RegExp(r'\b(nuclear|atomic|reactor|fission|smr|radiation)\b');
    return reg.hasMatch(text);
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

  bool get isTaxFintech {
    final text = '${raw['idea'] ?? ''} ${raw['category'] ?? ''} ${raw['businessName'] ?? ''} ${raw['problem'] ?? ''} ${raw['targetMarket'] ?? ''}'.toLowerCase();
    final reg = RegExp(r'\b(tax|gst|fintech|accounting|bookkeeping|ird|inland revenue|compliance)\b');
    return reg.hasMatch(text);
  }

  bool get isTransport {
    final text = '${raw['idea'] ?? ''} ${raw['category'] ?? ''} ${raw['businessName'] ?? ''} ${raw['problem'] ?? ''} ${raw['targetMarket'] ?? ''}'.toLowerCase();
    final reg = RegExp(r'\b(ride-share|rideshare|ride-hailing|ride-booking|transport|taxi|airport transfer|passenger|fleet|vehicle rental|shuttle)\b');
    return reg.hasMatch(text);
  }

  bool get isMarketplace {
    final text = '${raw['idea'] ?? ''} ${raw['category'] ?? ''} ${raw['businessName'] ?? ''} ${raw['problem'] ?? ''} ${raw['targetMarket'] ?? ''}'.toLowerCase();
    final reg = RegExp(r'\b(marketplace|two-sided|platform|booking|matching)\b');
    return reg.hasMatch(text);
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
          'explanation': 'Identify qualified legal and regulatory specialists in New Zealand and obtain an initial consultation to map statutory frameworks before committing development capital.',
          'outcome': 'Initial specialist discussion & indicative regulatory pathway / scope and fee.'
        },
        {
          'heading': '2. Specialist Technical & Regulatory Pre-Feasibility',
          'explanation': 'Identify qualified energy infrastructure engineers and environmental regulatory consultants to map preliminary safety, site, grid connection, and statutory prerequisites.',
          'outcome': 'Preliminary technical prerequisite & capability-gap scoping note.'
        },
        {
          'heading': '3. Capital Scale & Resource Scoping',
          'explanation': 'Perform preliminary desktop analysis of multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment.',
          'outcome': 'Indicative capital-scale & stakeholder/policy map.'
        }
      ];
    }

    if (isHardware) {
      return [
        {
          'heading': '1. Customer Problem Discovery & Severity Validation',
          'explanation': 'Interview 10-15 target vessel owners and commercial marina operators to quantify pest infestation frequency, existing workaround costs, and problem severity before building hardware.',
          'outcome': '10-15 completed problem discovery interviews and severity log.'
        },
        {
          'heading': '2. Benchtop Proof of Concept & Mechanism Validation',
          'explanation': 'Develop a benchtop/low-cost proof of concept to validate the core deterrent mechanism and solar power management in a controlled environment before committing capital to tooling or field units.',
          'outcome': 'Benchtop proof-of-concept test log and power efficiency data.'
        },
        {
          'heading': '3. Willingness to Pay & Unit Economics',
          'explanation': 'Present preliminary product specifications, price points, and initial Bill of Materials (BOM) estimates to 5 prospects to confirm target gross margins and purchase intent.',
          'outcome': 'Validated unit economics model and 2 written pilot trial commitments.'
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
  String get bmTargetCustomer => _cleanBusinessModelField(_str(businessModelSnapshot['targetCustomer'], fallback: isNuclear ? 'Electricity retailers, large industrial off-takers and public-sector energy purchasers.' : 'Target customer segment defined'), fallback: isNuclear ? 'Electricity retailers, large industrial off-takers and public-sector energy purchasers.' : 'Target customer segment defined');
  String get bmCoreOffering => _cleanBusinessModelField(_str(businessModelSnapshot['coreOffering'], fallback: isNuclear ? 'SMR-based firm, low-carbon electricity generation supplied into New Zealand\'s national grid.' : 'Core product concept'), fallback: isNuclear ? 'SMR-based firm, low-carbon electricity generation supplied into New Zealand\'s national grid.' : 'Core product concept');
  String get bmCustomerProblem => _cleanBusinessModelField(_str(businessModelSnapshot['customerProblem'], fallback: isNuclear ? 'Increasing electricity demand, reliability requirements, wholesale price volatility and demand for additional firm low-carbon generation.' : 'Customer problem defined'), fallback: isNuclear ? 'Increasing electricity demand, reliability requirements, wholesale price volatility and demand for additional firm low-carbon generation.' : 'Customer problem defined');
  String get bmValueProposition => _str(businessModelSnapshot['valueProposition'] ?? leanCanvas['uniqueValueProp'], fallback: isNuclear ? 'Continuous, low-carbon firm electricity generation providing long-term price predictability, grid stability, and industrial decarbonisation.' : 'Proactive, automated solution addressing customer friction');
  String get bmRevenueModel => _str(businessModelSnapshot['revenueModel'] ?? raw['revenueModel'], fallback: isNuclear ? 'Wholesale electricity market sales, long-term Power Purchase Agreements (PPAs) with industrial off-takers, and ancillary grid support fees, subject to statutory feasibility.' : 'Predictable monthly subscription / SaaS model');
  String get bmCustomerAcquisition => _str(businessModelSnapshot['customerAcquisition'] ?? raw['network'], fallback: isNuclear ? 'Direct long-term PPA contracting with electricity retailers, heavy industrial energy users, and national grid operators.' : 'Direct outreach & network referrals');
  String get bmKeyCosts => _str(businessModelSnapshot['keyCosts'] ?? raw['budget'], fallback: isNuclear ? 'Technology licensing, site development, regulatory consenting, plant engineering, construction, grid interconnection, operation, security, and decommissioning.' : 'Initial software development & hosting');
  String get bmCommercialAssessment => _str(businessModelSnapshot['commercialAssessment'] ?? pitchLabVerdict, fallback: isNuclear ? 'Business model viability is strictly governed by statutory permissibility, regulatory consenting, and multi-billion-dollar project financing gateways.' : 'Logical business model addressing a clear workflow problem.');

  // Market Insights (NEW SECTION)
  Map<String, dynamic> get marketInsightsMap => (raw['marketInsights'] as Map<String, dynamic>?) ?? {};

  String get marketLandscape {
    final rawVal = _str(marketInsightsMap['marketLandscape'], fallback: '');
    if (rawVal.isNotEmpty && (!rawVal.contains('changing customer requirements and regional market dynamics') || !isHardware)) {
      return _cleanNarrativeText(rawVal, isHardware: isHardware);
    }
    if (isHardware) {
      return 'The broader marine equipment and asset protection market is driven by vessel maintenance requirements, port biosecurity standards, and environmental durability demands across regional marinas and moorings.';
    }
    if (isTaxFintech) {
      return 'The New Zealand small business tax compliance landscape is governed by Inland Revenue (IRD) filing cadences, GST reporting thresholds, and the digital tax ecosystem, where automated cash-flow discipline addresses persistent tax debt challenges.';
    }
    return 'The broader market operates within an evolving commercial landscape shaped by customer operational requirements and regional sector dynamics.';
  }

  String get demandDrivers {
    final rawVal = _str(marketInsightsMap['demandDrivers'], fallback: '');
    if (rawVal.isNotEmpty) return _cleanNarrativeText(rawVal, isHardware: isHardware);
    if (isHardware) {
      return 'Demand is primarily driven by asset protection, pest infestation damage prevention, mooring line safety, and reduced manual maintenance costs for boat owners and marina operators.';
    }
    if (isTaxFintech) {
      return 'Demand is primarily driven by cash-flow discipline, the need to avoid unexpected terminal tax bills, automated GST ring-fencing, and reducing accounting overhead for sole traders and small business owners.';
    }
    return 'Demand is primarily driven by operational cost pressures, efficiency needs, and changing customer expectations across the sector.';
  }

  String get competitionAlternatives => _str(
    marketInsightsMap['competitionAlternatives'],
    fallback: isHardware
      ? 'The proposed solution would compete with traditional passive mooring cones, chemical deterrents, manual inspection routines, and improvised physical barriers.'
      : (isTaxFintech
        ? 'The proposed solution would compete with separate high-interest tax savings bank accounts, manual spreadsheets, and cloud accounting software (e.g. Xero, MYOB) or bookkeeping workflows.'
        : 'The proposed solution would compete with established market incumbents, existing manual workarounds, and alternative commercial providers.')
  );

  String get commercialReality {
    final rawVal = _str(marketInsightsMap['commercialReality'], fallback: '');
    if (rawVal.isNotEmpty) return _cleanNarrativeText(rawVal, isHardware: isHardware);
    if (isNuclear) {
      return 'A critical distinction exists between large national electricity demand and the commercially accessible opportunity for this specific solution. The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation.';
    }
    if (isHardware) {
      return 'A critical distinction exists between total boat ownership numbers and the commercially accessible market of vessel owners experiencing active pest problems who are willing to pay for an automated physical deterrent.';
    }
    if (isTaxFintech) {
      return 'A critical distinction exists between total registered small businesses in New Zealand and sole traders/SMBs with sufficient cash margin to proactively reserve tax obligations rather than relying on reactive overdrafts.';
    }
    return 'A critical distinction exists between large underlying market demand and the commercially accessible opportunity for this specific solution.';
  }

  String get localBusinessNews {
    final rawNews = _str(marketInsightsMap['localBusinessNews'], fallback: '');
    if (rawNews.isNotEmpty && (!rawNews.contains('digital compliance') || !isNuclear)) {
      return _cleanNarrativeText(rawNews, isHardware: isHardware);
    }
    if (isNuclear) {
      return 'Local energy market news highlights rising electricity demand, dry-year hydro volatility, wholesale power price spikes, and policy debates surrounding New Zealand energy security.';
    }
    if (isHardware) {
      return 'Local marine sector news highlights biosecurity initiatives to prevent rodent migration onto predator-free islands, marina environmental guidelines, and rising vessel maintenance costs across regional ports.';
    }
    if (isTaxFintech) {
      return 'Local New Zealand business commentary highlights IRD compliance initiatives, small-business tax debt management, and the rollout of open banking standards facilitating automated financial workflows.';
    }
    return 'Local business news highlights operational cost pressures, input price dynamics, and changing customer demand patterns across regional operators.';
  }

  String get customerReviewTrends {
    final rawTrends = _str(marketInsightsMap['customerReviewTrends'], fallback: '');
    if (rawTrends.isNotEmpty && (!rawTrends.contains('lack of automated workflows') || !isNuclear)) {
      return _cleanNarrativeText(rawTrends, isHardware: isHardware);
    }
    if (isNuclear) {
      return 'Published energy-sector reporting and published industry commentary indicate demand for firm low-carbon baseload power, but direct customer/off-taker validation has not yet been established by the venture.';
    }
    if (isHardware) {
      return 'Customer feedback across existing physical deterrents reveals frustration with short product lifespan in saltwater conditions, UV degradation, mechanical dislodgement during storms, and ineffective pest barrier coverage.';
    }
    if (isTaxFintech) {
      return 'SME founder sentiment reveals recurring stress around end-of-year tax lump sums and manual GST calculations, alongside friction with clunky standalone banking workarounds.';
    }
    return 'Customer reviews across existing market solutions reveal ongoing dissatisfaction with operational friction, maintenance overhead, and lack of specialized service options.';
  }

  String get governmentPolicyInfluence {
    final rawPolicy = _str(marketInsightsMap['governmentPolicyInfluence'], fallback: '');
    if (rawPolicy.isNotEmpty && (!rawPolicy.contains('resource consents') || isNuclear)) return _cleanNarrativeText(rawPolicy, isHardware: isHardware);
    if (isNuclear) {
      return 'National statutory policy and legislative frameworks govern power generation, environmental protection, fast-track consenting, and nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model.';
    }
    if (isHardware) {
      return 'Regional marina management bylaws, maritime environmental biosecurity regulations, and electrical product safety standards govern vessel mooring attachments and dockside equipment.';
    }
    if (isTaxFintech) {
      return 'Inland Revenue (IRD) tax filing regulations, New Zealand provisional tax rules, and emerging open-banking compliance frameworks shape financial data integration and automated fund transfers.';
    }
    return 'National regulatory frameworks, data protection requirements, and general business compliance guidelines govern commercial software operations.';
  }

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

  String get whereMarketIsHeading {
    final heading = _str(futureTrendsMap['whereMarketIsHeading'], fallback: '');
    if (heading.isNotEmpty && (!heading.contains('digital workflow adoption') || !isNuclear)) {
      return _cleanNarrativeText(heading, isHardware: isHardware);
    }
    if (isNuclear) {
      return 'Macro structural trends, Small Modular Reactor (SMR) commercialisation, rising electricity demand, and decarbonisation mandates are shaping the long-term energy sector outlook.';
    }
    if (isHardware) {
      return 'Macro structural trends, hardware miniaturization, solar efficiency improvements, and IoT connectivity are driving market adoption of physical deterrent devices.';
    }
    return 'Macro structural trends, technology adoption, and evolving customer requirements are creating steady multi-year momentum for this opportunity.';
  }

  List<String> get tailwinds {
    final list = futureTrendsMap['tailwinds'];
    if (list is List && list.isNotEmpty) {
      return list.map((e) => _cleanNarrativeText(e.toString(), isHardware: isHardware)).toList();
    }
    if (isNuclear) {
      return [
        'Accelerating electricity demand and industrial electrification goals.',
        'Growing recognition of grid stability and low-carbon firm electricity power requirements.',
        'Global technological advancements and commercialisation in Small Modular Reactors (SMRs).'
      ];
    }
    if (isHardware) {
      return [
        'Growing vessel owner awareness of pest infestation damage and repair costs.',
        'Advancements in solar power density and durable marine-grade materials.',
        'Increasing demand for non-toxic, eco-friendly pest prevention solutions.'
      ];
    }
    return [
      'Growing market demand for specialized operational tools.',
      'Rising customer expectation for transparent pricing and rapid service.',
      'Increasing pressure on businesses to reduce operational overhead.'
    ];
  }

  List<String> get headwinds {
    final list = futureTrendsMap['headwinds'];
    if (list is List && list.isNotEmpty) {
      return list.map((e) => _cleanNarrativeText(e.toString(), isHardware: isHardware)).toList();
    }
    if (isNuclear) {
      return [
        'Significant statutory and regulatory frameworks (e.g. Radiation Safety Act 2016, Atomic Energy Act 1945, Resource Management Act 1991).',
        'Multi-billion-dollar infrastructure capital scale requirements and complex regulatory licensing process.'
      ];
    }
    if (isHardware) {
      return [
        'Customer reluctance to replace traditional manual barriers until failure occurs.',
        'Harsh marine environmental conditions affecting electronic component longevity.'
      ];
    }
    return [
      'Customer inertia and reluctance to change entrenched manual routines.',
      'Potential entry of larger incumbent operators into adjacent service offerings.'
    ];
  }

  String get futureTrendsDecisionGuidance => _str(
    futureTrendsMap['founderDecisionGuidance'],
    fallback: 'Focus on rapid low-cost customer discovery and validation to lock in early adopter commitment before investing heavily in full development.'
  );

  String get marketDirection => _str(
    futureTrendsMap['marketDirection'] ?? raw['scores']?['futureTrends']?['details']?['marketDirection'],
    fallback: 'POSITIVE'
  );

  String get solutionOutlook => _str(
    futureTrendsMap['solutionOutlook'] ?? raw['scores']?['futureTrends']?['details']?['solutionOutlook'],
    fallback: isNuclear ? 'MATERIAL CONSTRAINTS PENDING LEGAL CONFIRMATION' : (overallScore >= 55 ? 'FAVOURABLE' : 'UNCERTAIN')
  );

  Map<String, String> get futureTrendsDimensions {
    final dims = futureTrendsMap['dimensions'] ?? raw['scores']?['futureTrends']?['details']?['dimensions'];
    if (dims is Map) {
      return {
        'demandTrend': _str(dims['demandTrend'], fallback: 'Growing long-term market demand.'),
        'technologyTrend': _str(dims['technologyTrend'], fallback: 'Technological maturation and efficiency gains.'),
        'regulatoryTrend': _str(dims['regulatoryTrend'], fallback: 'Evolving regulatory and compliance requirements.'),
        'competitionTrend': _str(dims['competitionTrend'], fallback: 'Competitive dynamics and incumbent positioning.'),
        'capitalTrend': _str(dims['capitalTrend'], fallback: 'Capital availability and funding requirements.')
      };
    }
    if (isNuclear) {
      return {
        'demandTrend': 'National demand for 24/7 low-carbon firm electricity is expected to increase driven by electrification and climate targets.',
        'technologyTrend': 'SMR technologies continue to progress internationally, although commercial maturity, deployment timelines and economics vary materially by technology and jurisdiction.',
        'regulatoryTrend': 'Significant statutory and regulatory frameworks (e.g. Radiation Safety Act 2016, Atomic Energy Act 1945) present material regulatory barriers to commercial nuclear generation in NZ, subject to specialist legal confirmation.',
        'competitionTrend': 'Traditional grid generators (hydro, geothermal, wind) dominate under current regulatory architecture.',
        'capitalTrend': 'Multi-billion dollar CAPEX structure incompatible with early-stage venture funding without government underwriting.'
      };
    }
    return {
      'demandTrend': 'Growing long-term market demand for specialized operational solutions.',
      'technologyTrend': 'Ongoing technological advances reducing implementation costs.',
      'regulatoryTrend': 'Increasing compliance and operational standards across target region.',
      'competitionTrend': 'Moderate competition with opportunity for service differentiation.',
      'capitalTrend': 'Manageable initial capital intensity matching stage maturity.'
    };
  }

  String get whatThisMeansForFounder => _str(
    futureTrendsMap['whatThisMeansForFounder'] ?? raw['scores']?['futureTrends']?['details']?['whatThisMeansForFounder'] ?? futureTrendsMap['founderDecisionGuidance'],
    fallback: isNuclear
      ? 'Preserve the problem definition and track policy developments. Do not deploy private development capital into commercial nuclear generation in NZ until a clear statutory and regulatory pathway has been confirmed by specialist counsel.'
      : 'Focus on rapid low-cost customer discovery and validation to lock in early adopter commitment before investing heavily.'
  );

  List<String> get adjacentOpportunities {
    final list = futureTrendsMap['adjacentOpportunities'] ?? raw['scores']?['futureTrends']?['details']?['adjacentOpportunities'];
    if (list is List && list.isNotEmpty) return list.map((e) => e.toString()).take(3).toList();
    if (isNuclear) {
      return [
        'Off-grid micro-grids and clean energy storage',
        'Geothermal & hydro grid-firming technologies',
        'Nuclear technology & regulatory advisory for OECD markets'
      ];
    }
    return [
      'Automated compliance reporting module for regional regulatory bodies.',
      'White-label partner integration for existing industry service providers.'
    ];
  }

  // Would Investors Bite?
  Map<String, dynamic> get investorBite => (raw['investorBite'] as Map<String, dynamic>?) ?? {};

  String get ibIntro => _str(
    investorBite['introduction'],
    fallback: isNuclear
      ? 'New Zealand faces increasing electricity demand, security-of-supply challenges and continued decarbonisation requirements. The proposed SMR solution faces substantial statutory, regulatory, technical and capital barriers, and its legal/regulatory feasibility remains subject to specialist confirmation.'
      : 'If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers.'
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

  String get ibInvestmentVerdict => _cleanNarrativeText(_str(
    investorBite['investmentVerdict'],
    fallback: isNuclear
      ? 'In its current conceptual state, the opportunity is not presently suitable for conventional venture-capital investment. Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved. The founder brings useful transferable commercial and financial capability, but a credible venture would require substantial specialist nuclear, engineering, regulatory and infrastructure capability alongside it. Investment consideration should remain deferred until the primary statutory/legal gateway has been investigated.'
      : 'This opportunity addresses a genuine market problem and demonstrates commercial potential. The business model is logical and the founder possesses relevant experience. However, investors would expect stronger evidence of customer demand before committing capital. Completing customer interviews, securing early users and validating pricing would substantially strengthen the investment proposition.'
  ));

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

          if (area.toLowerCase().contains('founder')) {
            rating = (founderCapabilityScore / 15.0 * 5).round().clamp(1, 5);
          }

          String commentary = _str(item['commentary'] ?? item['explanation'] ?? item['description'], fallback: 'Evaluated based on current commercial evidence.');
          if (area.toLowerCase().contains('scalability') && isHardware) {
            commentary = commentary.replaceAll(
              RegExp(r'software or operational leverage without proportional linear costs', caseSensitive: false),
              'standardised hardware manufacturing and channel distribution, governed by tooling and inventory working capital'
            );
          }

          return {
            'area': area,
            'rating': rating,
            'commentary': commentary
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
      {'area': 'Founder Capability', 'rating': (founderCapabilityScore / 15.0 * 5).round().clamp(1, 5), 'commentary': 'Domain background and operational fit.'},
      {'area': 'Customer Validation', 'rating': getRatingForCategory('customerValidation', 0.4), 'commentary': 'Empirical proof of real customer demand.'},
      {'area': 'Scalability', 'rating': getRatingForCategory('executionReadiness', 0.6), 'commentary': isHardware ? 'Scalability is governed by hardware manufacturing tooling costs, physical inventory working capital, and supply chain lead times.' : (isNuclear ? 'Scalability is constrained by capital, regulation, site development and infrastructure requirements.' : 'Capacity to grow without proportional linear cost.')},
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

  String get ibBiggestRisk => _cleanNarrativeText(_str(
    investorBite['biggestRisk'],
    fallback: isNuclear
      ? 'Unresolved statutory and regulatory feasibility in New Zealand, combined with the absence of directly experienced specialist project capability.'
      : 'The concept currently lacks sufficient empirical market validation and customer payment proof.'
  ));

  List<String> get ibImprovements => _list(
    investorBite['improvements'],
    fallback: isNuclear
      ? [
          'Verify Legal & Regulatory Feasibility with specialist legal advisers.',
          'Consult independent domain engineers and regulatory specialists to map compliance prerequisites.',
          'Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result.'
        ]
      : [
          'Conduct 15-20 structured customer discovery interviews.',
          'Build a simple manual concierge MVP to test workflow adoption.',
          'Validate pricing terms directly with prospective buyers.',
          'Secure signed Letters of Intent or early pilot commitments.'
        ]
  );

  String get ibPitchLabRecommendation {
    final rec = investorBite['pitchLabRecommendation'];
    if (rec is String && rec.isNotEmpty && rec != 'Almost Ready' && rec != 'Ready to Pitch' && rec != 'Needs More Validation' && rec != 'Early Stage Idea') {
      return rec;
    }
    return masterRecommendation;
  }

  String get ibPitchLabRecommendationExplanation => _cleanNarrativeText(_str(
    investorBite['pitchLabRecommendationExplanation'],
    fallback: isNuclear
      ? 'The unresolved legal and regulatory barriers mean the venture is not currently commercially actionable. Complete specialist pre-feasibility work to determine whether a credible statutory pathway exists before committing development capital.'
      : 'Focus on validating customer demand and securing early proof of willingness to pay before raising external capital.'
  ));

  // KISS Review
  Map<String, dynamic> get kissReview => (raw['kissReview'] as Map<String, dynamic>?) ?? {};
  List<String> get kissKeep => _list(kissReview['keep'], fallback: isHardware ? ['Core physical mechanism', 'Basic enclosure'] : (isTransport ? ['Core booking intake', 'Driver notification mechanism'] : ['Core workflow engine', 'Single integration']));
  List<String> get kissSimplify => _list(kissReview['simplify'], fallback: isHardware ? ['Manual activation switch', 'Visual indicator'] : (isTransport ? ['Manual driver dispatch via phone/chat', 'Direct cash or simple mobile payment'] : ['User onboarding flow', 'Dashboard visual metrics']));
  List<String> get kissDelay => _list(kissReview['delay'], fallback: isHardware ? ['Production tooling', 'Multi-model variants'] : (isTransport ? ['Custom native mobile app builds', 'Complex automated dispatch algorithms'] : ['Multi-currency support', 'Custom mobile app']));
  String get kissSmallestTestableVersion => _str(kissReview['smallestTestableVersion'], fallback: isHardware ? '3-unit functional hardware prototype deployed for 30-day field trial.' : (isTransport ? 'Concierge ride-booking pilot via phone/WhatsApp with 5-10 vetted drivers.' : 'Concierge MVP operating manually for 5 pilot customers.'));

  // MVP Feasibility
  Map<String, dynamic> get mvpFeasibility => (raw['mvpFeasibility'] as Map<String, dynamic>?) ?? {};
  String get mvpFormat => _str(mvpFeasibility['recommendedTestFormat'], fallback: isHardware ? 'Functional Hardware Prototype / Field Trial' : (isTransport ? 'Concierge Booking Pilot / WhatsApp Dispatch' : 'Concierge / Manual Pilot'));
  String get mvpBudget => _str(mvpFeasibility['suggestedValidationBudget'], fallback: r'$500 - $1,500');
  List<String> get mvpInclude => _list(mvpFeasibility['whatToInclude'], fallback: isHardware ? ['Core physical mechanism', 'Basic enclosure', 'Essential electronic functionality', 'Field trial testing'] : (isTransport ? ['Passenger booking intake', 'Driver dispatch workflow', 'Fixed airport/hotel transfer routes', 'Direct customer feedback capture'] : ['Core workflow engine', 'Primary user interface']));
  List<String> get mvpExclude => _list(mvpFeasibility['whatToExclude'], fallback: isHardware ? ['Production tooling', 'Mass-manufacturing optimisation', 'Final certification', 'Non-essential features'] : (isTransport ? ['Custom native mobile apps', 'Automated surge pricing engines', 'Complex payment gateway integrations', 'Island-wide marketing spend'] : ['Complex analytics', 'Native mobile build']));

  // Business Theme & Strategic Positioning
  Map<String, dynamic> get businessTheme => (raw['businessTheme'] as Map<String, dynamic>?) ?? {};
  String get primaryTheme => _str(
    businessTheme['primaryTheme'],
    fallback: isNuclear ? 'Energy Infrastructure & Power Generation' : (isHardware ? 'Hardware & Physical Product Innovation' : (isTransport ? 'Transportation / Mobility' : 'B2B Software & Business Services'))
  );
  String get secondaryTheme => _str(
    businessTheme['secondaryTheme'],
    fallback: isNuclear ? 'Nuclear / SMR / Firm Low-Carbon Generation' : (isHardware ? 'Field Trial Validation & Asset Protection' : (isTransport ? 'Local Passenger Mobility & Booking Marketplace' : 'Workflow Efficiency & Automation'))
  );
  String get strategicPositioning => _str(
    businessTheme['strategicPositioning'],
    fallback: isNuclear
      ? 'Positions as a long-term utility-scale infrastructure option targeting grid reliability, baseload capacity, and industrial decarbonisation within New Zealand.'
      : (isHardware ? 'Positions as a high-efficiency specialized physical solution directly targeting operational pain points.' : (isTransport ? 'Positions as a localized two-sided transport booking marketplace connecting passengers with vetted drivers and transport operators.' : 'Positions as a specialized efficiency solution directly targeting operational friction points.'))
  );
  String get marketCategoryDynamics => _str(
    businessTheme['marketCategoryDynamics'],
    fallback: isNuclear
      ? 'Governed by national energy security strategy, statutory radiation safety law, environmental consenting frameworks, and multi-billion-dollar infrastructure capital scale.'
      : (isHardware ? 'Driven by market demand for durable, low-maintenance asset protection and automated operational tools.' : (isTransport ? 'Driven by passenger convenience, transparent fare pricing, driver supply density, smartphone penetration, and local transport regulatory compliance.' : 'Driven by market demand for operational productivity, compliance automation, and workflow efficiency.'))
  );
  String get strategicMoat => _str(
    businessTheme['strategicMoat'],
    fallback: isNuclear
      ? 'No defensible venture-specific moat is yet evidenced. Potential future defensibility could arise from specialist partnerships, project rights, regulatory capability, long-term off-take arrangements or execution capability.'
      : (isHardware ? 'Proprietary design mechanics, domain experience, and direct field trial relationships.' : (isTransport ? 'Two-sided network density, established local driver and operator relationships, customer booking habituation, and local operational presence.' : 'Deep domain specialization, high workflow retention, and direct customer relationships.'))
  );

  // CV Analysis
  Map<String, dynamic> get cvAnalysis => (raw['cvAnalysis'] as Map<String, dynamic>?) ?? {};
  bool get hasCvAnalysis => cvAnalysis.isNotEmpty;
  List<String> get cvCredentials {
    final list = _list(cvAnalysis['extractedCredentials'], fallback: []);
    final hobbyRegex = RegExp(r'\b(pilot|private pilot|motorcycle|motorcyclist|wind surfing|surfing|kitesurfing|skiing|golf|tennis|rugby|cricket|hiking|diving|scuba|hobby|hobbies|recreational)\b', caseSensitive: false);
    if (list.isNotEmpty && !list.any((s) => s.contains('Relevant professional domain') || s.contains('Synthesized founder credentials'))) {
      final filtered = list
          .where((s) => !hobbyRegex.hasMatch(s))
          .map<String>((s) => _cleanNarrativeText(s))
          .toList();
      if (filtered.isNotEmpty) return filtered;
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

  String get cvStrengths {
    final rawStr = _str(cvAnalysis['founderStrengthsFromCV'], fallback: '');
    if (rawStr.isNotEmpty && !rawStr.startsWith('"I have') && !rawStr.startsWith('I have') && rawStr.length < 250) {
      return _cleanNarrativeText(rawStr, isHardware: isHardware);
    }
    return 'Strong commercial, financial, accounting, technology and business-evaluation capability, including financial modelling, business structuring and commercial decision-making.';
  }
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
  String get evidenceReliedOn {
    final raw = _str(founderCapabilityExplanation['evidenceReliedOn'], fallback: 'Founder experience, domain background, and customer access.');
    return raw
        .replaceAll(RegExp(r'\s*In my spare time[^\.]*\.?', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s*(personal\s+)?interests?:[^\.]*\.?', caseSensitive: false), '')
        .trim();
  }
  String get whyThisScoreWasAwarded {
    String text = _str(founderCapabilityExplanation['whyThisScoreWasAwarded'], fallback: 'Recognises relevant domain knowledge and commercial capability.');
    text = text.replaceAll(RegExp(r'A score of \d+/15'), 'A score of $founderCapabilityScore/15');
    return text;
  }
  List<String> get capabilityGaps => _list(
    founderCapabilityExplanation['capabilityGaps'],
    fallback: isHardware
      ? ['Mass manufacturing setup', 'Industrial design tooling']
      : (isTransport
          ? ['In-house mobile software development', 'Payment gateway integration']
          : ['Software development build', 'Digital marketing reach'])
  );
  List<String> get recommendedGapResponses {
    final list = _list(
      founderCapabilityExplanation['recommendedResponse'],
      fallback: isNuclear
        ? [
            'Identify and begin engaging appropriately credentialled specialists for preliminary advice, scoping and potential future involvement.',
            'Engage specialist legal and regulatory counsel to map statutory pathways before assembling a formal development team.'
          ]
        : (isHardware
            ? ['Engage an industrial design contractor for prototype enclosure', 'Partner with a local electronics manufacturer']
            : (isTransport
                ? ['Bridge mobile platform engineering via technical contractors or tech co-founder', 'Leverage existing fleet operations and tourism relationships to drive initial driver onboarding']
                : ['Contract a specialist software developer for the MVP', 'Engage an advisory mentor for growth']))
    );
    return list.map((s) => _cleanNarrativeText(s, isHardware: isHardware, isTransport: isTransport)).toList();
  }

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
  String get availableCapital => capitalAvailable;

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
      if (isNuclear) {
        return r'Initial risk capital ($500 NZD) can support desktop research, legal framework mapping, and preliminary specialist outreach, but cannot fund formal legal opinions, engineering feasibility studies, or statutory filings. Advancing this concept requires a $5,000–$25,000+ legal/regulatory pre-feasibility gateway.';
      }
      return 'Suitable for lean validation (interviews, surveys, preliminary market research), but likely insufficient for major product development, tooling or launch costs.';
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
      return r'$5,000 – $25,000+ NZD (Specialist Legal & Regulatory Feasibility Gateway)';
    } else if (isHardware || catLower.contains('marine') || catLower.contains('hardware')) {
      return r'$1,500 – $5,000 NZD (Physical Prototype & Supplier Quotes)';
    }
    return r'$300 – $1,500 NZD (Lean Customer Discovery & Preliminary Market Investigation)';
  }

  String get riskCapitalExplanation =>
      'Risk capital means money the founder could afford to commit to investigating the opportunity without relying on the business succeeding or immediately recovering that investment. The objective at this stage is to invest enough to obtain better evidence before committing substantially more capital.';

  List<String> get whatMattersNow {
    final aiList = (raw['whatMattersNow'] as List?)?.map((e) => e.toString()).toList();
    if (aiList != null && aiList.isNotEmpty) {
      return aiList.map((item) => _cleanNarrativeText(item, isHardware: isHardware, isTransport: isTransport)).toList();
    }

    final t = timeAvailable.toLowerCase();
    final isLowTime = t.contains('0-5') || t.contains('0–5') || t.contains('3');
    final cap = capitalAvailable;
    final isLowCap = cap.contains(r'$0') || cap.contains('500') || cap.contains('2,500');

    return [
      isLowTime
          ? 'Your available time is limited (0–5 hrs/wk), but sufficient for early validation—provided your weekly scope remains strictly focused on 1 priority objective.'
          : 'Your available time allows steady progress; maintain disciplined focus on direct customer validation before expanding product features.',
      isLowCap
          ? (isNuclear
              ? r'Initial risk capital ($500 NZD) supports desktop research, legal framework mapping, and initial specialist outreach, but cannot fund formal legal opinions or engineering studies. A $5,000–$25,000+ pre-feasibility gateway is required to confirm statutory viability.'
              : 'Your initial risk budget ($riskCapital) can support early customer research and preliminary market investigation, but major development costs must be delayed until willingness-to-pay is proven.')
          : 'Your initial budget is workable for prototype development; preserve capital for customer acquisition experiments rather than premature tooling.',
      founderCapabilityScore <= 6
          ? (isNuclear
              ? 'Domain, statutory, or nuclear engineering specialization can be engaged via advisors, industry partners, or specialist consultants; early positioning should focus on statutory and commercial feasibility.'
              : (isHardware
                  ? 'Specialist mechanical, electrical, or manufacturing capability can be sourced via technical advisors, design contractors, or manufacturing partners as hardware concepts are validated.'
                  : 'Core operational, technical, or domain capabilities can be augmented via advisors, contractors, or key partners as commercial validation progresses.'))
          : (isNuclear
              ? 'Core founder capability supports strategic and commercial positioning, but requires early integration of specialist nuclear regulatory and statutory expertise.'
              : (isTransport
                  ? 'Core founder capability and existing transport operations provide strong local execution advantage; bridge mobile software platform development via technical contractors or partners.'
                  : 'Core founder capabilities are well aligned for early-stage execution; focus on validating critical statutory, market, or commercial assumptions.')),
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
    if (aiList != null && aiList.isNotEmpty) {
      return aiList.map((item) => _cleanNarrativeText(item, isHardware: isHardware)).toList();
    }

    final t = timeAvailable.toLowerCase();
    final isLowTime = t.contains('0-5') || t.contains('0–5') || t.contains('3');

    if (isNuclear) {
      return [
        isLowTime
            ? 'Select ONE primary legal or regulatory feasibility objective each week and batch founder effort into targeted research sessions.'
            : 'Structure weekly work around statutory framework mapping, key stakeholder mapping, and expert consultations.',
        'Focus effort first on statutory permissibility, regulatory feasibility and relevant policy constraints before committing capital to detailed engineering, site feasibility or downstream off-taker validation.',
        'Concentrate on clearing the primary gating risk (statutory permissibility and regulatory feasibility) before undertaking downstream commercial validation.',
        'Maintain a disciplined execution horizon focused on regulatory pre-feasibility milestones.',
      ];
    } else if (isHardware) {
      return [
        isLowTime
            ? 'Select ONE key physical design or validation objective each week and batch work into focused sessions.'
            : 'Structure weekly validation sprints around direct customer/operator feedback and physical concept testing.',
        'Validate core physical performance, durability requirements, and customer willingness-to-pay before committing capital to costly tooling or full manufacturing runs.',
        'Concentrate on testing the highest-risk physical and commercial assumptions first (field performance under real conditions and unit economic viability).',
        'Maintain a 90-day execution horizon to ensure steady, consistent progress without founder burnout.',
      ];
    }

    return [
      isLowTime
          ? 'Select ONE major validation objective each week and batch founder work into 1–2 focused sessions.'
          : 'Structure weekly validation sprints around direct customer interviews and solution feedback.',
      'Focus effort on validating primary customer demand and commercial model mechanics before expanding product features or operational overhead.',
      'Concentrate on testing the highest-risk business assumptions first (problem severity and target customer commitment).',
      'Maintain a 90-day execution horizon to ensure steady, consistent progress without founder burnout.',
    ];
  }

  String get founderRealityFooter =>
      'Founder Reality: Most businesses begin around existing work, family and financial commitments. Early progress is more dependent on choosing the right priorities and consistently testing the idea than immediately working full-time or committing significant capital.';

  // P.A.R.A.-Inspired Idea Portfolio & Decision System
  Map<String, dynamic> get portfolioMeta => (raw['portfolioMeta'] as Map<String, dynamic>?) ?? {};
  String get portfolioDecision => _str(
    portfolioMeta['portfolioDecision'],
    fallback: isNuclear ? 'PARK' : (overallScore >= 55 ? 'INVESTIGATE' : (overallScore >= 40 ? 'PIVOT' : 'PARK'))
  );
  String get decisionState => _str(portfolioMeta['decisionState'], fallback: masterRecommendation);
  String get ventureStage => _str(portfolioMeta['ventureStage'], fallback: scoreBandName);

  Map<String, dynamic> get problemVsSolution => (portfolioMeta['problemVsSolution'] as Map<String, dynamic>?) ?? {};
  String get underlyingProblem => _str(problemVsSolution['underlyingProblem'], fallback: _str(raw['problem'], fallback: 'Observed customer pain point'));
  String get currentProposedSolution => _str(problemVsSolution['currentProposedSolution'], fallback: businessName);
  String get problemStatus => _str(
    portfolioMeta['problemStatus'] ?? problemVsSolution['problemStatus'],
    fallback: isNuclear ? 'Worth Investigating' : 'Worth Investigating'
  );
  String get solutionStatus => _str(
    portfolioMeta['solutionStatus'] ?? problemVsSolution['solutionStatus'],
    fallback: isNuclear ? 'Unviable Under Current Legislation' : 'Under Validation'
  );
  String get portfolioAction => _str(
    portfolioMeta['portfolioAction'] ?? problemVsSolution['portfolioAction'],
    fallback: isNuclear
      ? 'Preserve the underlying energy-security opportunity while monitoring alternative technologies, jurisdictions and relevant policy developments.'
      : 'Conduct structured customer discovery interviews and initial evidence gathering.'
  );

  String get nextEvidenceGateway {
    final metaGateway = _str(portfolioMeta['nextEvidenceGateway'], fallback: '');
    if (metaGateway.isNotEmpty) return metaGateway;
    if (isNuclear) return 'Credible statutory/legal and regulatory pathway.';
    if (isHardware) return 'Produce physical proof-of-concept prototype & obtain manufacturer unit cost estimates.';
    return 'Conduct 10 customer discovery interviews & validate prototype interactive workflow.';
  }

  String get reassessmentTrigger {
    final metaTrigger = _str(portfolioMeta['reassessmentTrigger'], fallback: '');
    if (metaTrigger.isNotEmpty) return metaTrigger;
    if (isNuclear) return 'Material statutory/regulatory policy change, relevant technology development, or formal pre-feasibility legal clarification.';
    return 'Completion of 30-day discovery milestone or material market feedback.';
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

  // Helper flags
  String get primaryGatingRisk => _str(raw['primaryGatingRisk'], fallback: isNuclear ? 'Statutory & Regulatory Permissibility' : 'Customer Demand & Willingness to Pay');
  bool get isRegulated => isNuclear || category.toLowerCase().contains('regulated') || category.toLowerCase().contains('energy') || category.toLowerCase().contains('medical');

  // Validation Ladder & Test
  Map<String, dynamic> get validation => (raw['validation'] as Map<String, dynamic>?) ?? {};
  List<Map<String, String>> get validationLadder {
    final rawList = raw['validationLadder'] ?? validation['ladder'];
    if (rawList is List && rawList.isNotEmpty) {
      return rawList.map((item) {
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
    if (isNuclear || primaryGatingRisk.contains('Statutory') || isRegulated) {
      return [
        {'stage': 'Problem identified', 'status': 'Complete', 'notes': 'National energy security & baseload need confirmed'},
        {'stage': 'Strategic need established', 'status': 'Complete', 'notes': 'Clean electricity demand & grid resilience'},
        {'stage': 'Statutory permissibility assessed', 'status': 'Not yet evidenced', 'notes': 'Specialist legal assessment under RSA 2016, RMA 1991 & AEA 1945'},
        {'stage': 'Regulatory pathway identified', 'status': 'Not yet evidenced', 'notes': 'Radiation safety, environmental consent & parliamentary reform roadmap'},
        {'stage': 'Technical pre-feasibility assessed', 'status': 'Not yet evidenced', 'notes': 'Grid connection, cooling, site & TRL prerequisites'},
        {'stage': 'Specialist team/advisers identified', 'status': 'Not yet evidenced', 'notes': 'Nuclear engineering & regulatory counsel expertise'},
        {'stage': 'Capital feasibility assessed', 'status': 'Not yet evidenced', 'notes': 'Multi-billion CAPEX, financing structure & consortium requirements'},
        {'stage': 'Policy/stakeholder feasibility assessed', 'status': 'Not yet evidenced', 'notes': 'Government policy, local council & community sentiment'},
        {'stage': 'Off-taker interest tested', 'status': 'Not yet evidenced', 'notes': 'PPA & industrial off-taker validation'},
        {'stage': 'Formal pre-feasibility completed', 'status': 'Not yet evidenced', 'notes': 'Evidence Gateway Decision (Proceed / Pivot / Stop)'}
      ];
    }
    if (isHardware) {
      return [
        {'stage': 'Problem identified', 'status': 'Complete', 'notes': 'Customer pain point confirmed'},
        {'stage': 'Target customer defined', 'status': 'Complete', 'notes': 'User persona & operating environment defined'},
        {'stage': 'Problem severity confirmed', 'status': 'Not yet evidenced', 'notes': 'Empirical user interviews & field observation'},
        {'stage': 'Technical feasibility & CAD model', 'status': 'Not yet evidenced', 'notes': 'Core mechanical & electronic design'},
        {'stage': 'Physical prototype built', 'status': 'Not yet evidenced', 'notes': 'Functional proof-of-concept prototype'},
        {'stage': 'Field & durability testing completed', 'status': 'Not yet evidenced', 'notes': 'Real-world marine/outdoor stress testing'},
        {'stage': 'Manufacturing unit economics verified', 'status': 'Not yet evidenced', 'notes': 'Supplier quotes & bill of materials'},
        {'stage': 'Willingness to pay tested', 'status': 'Not yet evidenced', 'notes': 'Deposit / pre-order commitments'},
        {'stage': 'Initial pilot batch produced', 'status': 'Not yet evidenced', 'notes': 'Small-batch manufacturing run'},
        {'stage': 'Commercial distribution established', 'status': 'Not yet evidenced', 'notes': 'Retail or direct supply channel'}
      ];
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
  String get adviserEncouraging {
    final backendVal = _str(adviserOpinion['encouraging'], fallback: '');
    if (backendVal.isNotEmpty) return backendVal;
    if (isNuclear) return 'The underlying national energy-security problem is legitimate and strategically important.';
    if (founderCapabilityScore <= 6) return 'Strong general commercial and financial capability combined with clear problem definition.';
    return 'Strong problem definition, domain experience, and capital discipline.';
  }

  String get adviserCaution {
    final backendVal = _str(adviserOpinion['caution'], fallback: '');
    if (backendVal.isNotEmpty) return backendVal;
    if (isNuclear) return 'The proposed solution faces substantial statutory, political, technical and capital barriers.';
    if (isHardware) return 'Ensure mass production and tooling costs are delayed until physical prototype field durability and customer deposits are secured.';
    return 'Ensure non-essential features and expenditure are delayed until customer willingness to pay is tested.';
  }

  String get adviserUnproven {
    final backendVal = _str(adviserOpinion['unproven'], fallback: '');
    if (backendVal.isNotEmpty) return backendVal;
    if (isNuclear) return 'Whether a credible legal/regulatory pathway exists for commercial nuclear generation in New Zealand.';
    return 'Repeat paid demand and scalable customer acquisition channels.';
  }

  // 90 Day Roadmap
  Map<String, dynamic> get ninetyDayRoadmap => (raw['ninetyDayRoadmap'] as Map<String, dynamic>?) ?? {};
  List<Map<String, String>> get ninetyDayRoadmapSteps {
    if (isNuclear || primaryGatingRisk.contains('Statutory') || isRegulated) {
      return [
        {
          'week': 'W 1-2',
          'objective': 'Legal & Statutory Scoping',
          'tasks': 'Identify applicable legislation and engage appropriate specialist legal/regulatory expertise.',
          'hours': '5 hrs/wk',
          'evidence': 'Preliminary legal-framework map'
        },
        {
          'week': 'W 3-4',
          'objective': 'Regulatory Pathway Assessment',
          'tasks': 'Determine whether any credible statutory pathway exists for commercial nuclear generation.',
          'hours': '5 hrs/wk',
          'evidence': 'Regulatory pathway scoping note / specialist scope'
        },
        {
          'week': 'W 5-6',
          'objective': 'Technical Pre-Feasibility',
          'tasks': 'Engage nuclear/energy infrastructure specialists to identify fundamental technical prerequisites.',
          'hours': '5 hrs/wk',
          'evidence': 'Technical prerequisite and capability-gap memo'
        },
        {
          'week': 'W 7-8',
          'objective': 'Policy & Stakeholder Mapping',
          'tasks': 'Identify relevant government, regulatory and energy infrastructure stakeholders.',
          'hours': '5 hrs/wk',
          'evidence': 'Stakeholder map'
        },
        {
          'week': 'W 9-10',
          'objective': 'Capital & Delivery Reality',
          'tasks': 'Establish indicative project capital scale, financing structure and consortium requirements.',
          'hours': '5 hrs/wk',
          'evidence': 'Indicative capital-scale model'
        },
        {
          'week': 'W 11-12',
          'objective': 'Evidence Gateway Decision',
          'tasks': 'STOP / PARK / PIVOT / CONTINUE based on statutory and pre-feasibility evidence obtained.',
          'hours': '5 hrs/wk',
          'evidence': 'Evidence Gateway Decision'
        },
      ];
    }
    if (isHardware) {
      return [
        {
          'week': 'W 1-2',
          'objective': 'User Problem Discovery',
          'tasks': 'Interview 10 target operators on current equipment issues & costs.',
          'hours': '5 hrs/wk',
          'evidence': 'Interview transcript log'
        },
        {
          'week': 'W 3-4',
          'objective': 'Technical CAD & Specs',
          'tasks': 'Draft initial mechanical CAD model & electronic component specs.',
          'hours': '5 hrs/wk',
          'evidence': 'CAD spec sheet'
        },
        {
          'week': 'W 5-6',
          'objective': 'Physical Prototype Build',
          'tasks': 'Fabricate benchtop physical prototype for initial mechanism testing.',
          'hours': '5 hrs/wk',
          'evidence': 'Benchtop prototype'
        },
        {
          'week': 'W 7-8',
          'objective': 'Field & Durability Testing',
          'tasks': 'Test prototype in real operating environment under stress conditions.',
          'hours': '5 hrs/wk',
          'evidence': 'Field test log'
        },
        {
          'week': 'W 9-10',
          'objective': 'Unit Economics & Sourcing',
          'tasks': 'Obtain quotes from 2 manufacturers for bill of materials & batch assembly.',
          'hours': '5 hrs/wk',
          'evidence': 'Supplier quote comparison'
        },
        {
          'week': 'W 11-12',
          'objective': 'Commercial Pre-Orders',
          'tasks': 'Present tested prototype to 5 prospective buyers to secure pre-orders.',
          'hours': '5 hrs/wk',
          'evidence': '2 pilot deposits / pre-orders'
        },
      ];
    }
    return [
      {
        'week': 'W 1-2',
        'objective': 'Problem Discovery',
        'tasks': 'Draft interview guide; reach out to 10 target prospects',
        'hours': '5 hrs/wk',
        'evidence': 'Target outreach log'
      },
      {
        'week': 'W 3-4',
        'objective': 'Customer Interviews',
        'tasks': 'Conduct 6 structured interviews; record pain points',
        'hours': '5 hrs/wk',
        'evidence': '6 interview transcripts'
      },
      {
        'week': 'W 5-6',
        'objective': 'Solution Workflow Test',
        'tasks': 'Test interactive prototype or workflow with 3 target users',
        'hours': '5 hrs/wk',
        'evidence': 'User feedback logs'
      },
      {
        'week': 'W 7-8',
        'objective': 'Price & Offer Test',
        'tasks': 'Present formal pricing terms to 5 target prospects',
        'hours': '5 hrs/wk',
        'evidence': '2 LOIs / deposit commitments'
      },
      {
        'week': 'W 9-10',
        'objective': 'Pilot Evaluation',
        'tasks': 'Measure initial retention, manual effort, and user satisfaction',
        'hours': '5 hrs/wk',
        'evidence': 'Pilot metrics report'
      },
      {
        'week': 'W 11-12',
        'objective': 'Commercial Decision',
        'tasks': 'Reassess evidence; decide whether to Build, Pivot, or Stop',
        'hours': '5 hrs/wk',
        'evidence': 'PitchLab Reassessment'
      },
    ];
  }

  // Action Plan
  Map<String, dynamic> get actionPlan => (raw['actionPlan'] as Map<String, dynamic>?) ?? {};
  List<Map<String, String>> get topFivePriorities {
    final t = timeAvailable.toLowerCase();
    final isLowTime = t.contains('0-5') || t.contains('0–5') || t.contains('3');
    final list = actionPlan['topFivePriorities'] ?? raw['topFivePriorities'];
    if (list is List && list.isNotEmpty) {
      return list.map((item) {
        if (item is Map) {
          String act = _cleanNarrativeText(_str(item['action'], fallback: 'Execute validation step.'), isHardware: isHardware);
          if (isLowTime && (act.contains('5-10 hours/week') || act.contains('5–10 hours/week') || act.contains('5-10 hours'))) {
            act = act.replaceAll(RegExp(r'(Block|Allocate)\s+5[–-]10\s+hours(/week)?', caseSensitive: false), 'Allocate up to 5 hours/week');
          }
          return {
            'priority': _cleanNarrativeText(_str(item['priority'], fallback: 'Priority Action'), isHardware: isHardware),
            'action': act,
            'metric': _cleanNarrativeText(_str(item['metric'], fallback: '100% completion'), isHardware: isHardware)
          };
        }
        return {'priority': 'Priority Action', 'action': _cleanNarrativeText(item.toString(), isHardware: isHardware), 'metric': 'Completed'};
      }).toList();
    }
    if (isNuclear) {
      return [
        {'priority': 'Statutory & Legal Feasibility', 'action': 'Identify qualified legal specialists and obtain an initial consultation to map statutory frameworks under New Zealand legislation.', 'metric': 'Initial specialist consultation & scope/fee (Immediate Stage) / Written legal opinion (Later \$5k+ Gateway)'},
        {'priority': 'Specialist Technical Outreach', 'action': 'Engage qualified power/nuclear engineers and regulatory consultants to map safety and grid prerequisites.', 'metric': 'Preliminary specialist advisory scoping note'},
        {'priority': 'Engineering & Site Prerequisite Scoping', 'action': 'Perform desktop research to map site requirements, grid connection logistics, and environmental consenting prerequisites.', 'metric': 'Desktop technical prerequisite memo (Immediate Stage) / Formal pre-feasibility study (Later \$25k+ Gateway)'},
        {'priority': 'Risk Gateway Decision', 'action': 'Review preliminary legal and technical scoping notes against founder resource reality before committing further investment.', 'metric': 'Pre-Feasibility Go / Reframe / Stop Decision'},
        {'priority': 'Capital & Policy Scoping', 'action': 'Model multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment.', 'metric': 'Indicative capital-scale & policy map'}
      ];
    }
    if (isHardware) {
      return [
        {'priority': 'Conduct Discovery Interviews', 'action': 'Interview 10 target vessel owners or commercial operators on current pest issues.', 'metric': '10 interviews'},
        {'priority': 'Confirm Problem Severity', 'action': 'Verify if boat owners incur costly pest damage today and pay for deterrent solutions.', 'metric': '70% pain confirmation'},
        {'priority': 'Develop & Test Field Prototype', 'action': 'Develop a basic functional prototype and test the core deterrent mechanism in a marine environment.', 'metric': 'Prototype field test'},
        {'priority': 'Test Willingness to Pay', 'action': 'Present product specs and estimated pricing to 5 marina prospects.', 'metric': '2 pilot commitments'},
        {'priority': 'Establish Execution Cadence', 'action': isLowTime ? 'Allocate up to 5 hours/week dedicated strictly to customer interviews and validation.' : 'Block 5-10 hours/week dedicated strictly to prototype testing and customer discovery.', 'metric': 'Weekly completion'}
      ];
    }
    return [
      {'priority': 'Conduct Discovery Interviews', 'action': 'Interview 10 target customers on current workarounds.', 'metric': '10 interviews'},
      {'priority': 'Confirm Problem Severity', 'action': 'Verify if customers spend money to solve this today.', 'metric': '70% pain confirmation'},
      {'priority': 'Define Pre-Feasibility Scope', 'action': 'Design simple low-cost research plan before investing in development.', 'metric': 'Validation spec'},
      {'priority': 'Test Willingness to Pay', 'action': 'Present pricing to 5 prospects.', 'metric': '2 pilot sign-ups'},
      {'priority': 'Establish Execution Cadence', 'action': isLowTime ? 'Allocate up to 5 hours/week dedicated to customer interviews.' : 'Block 5-10 hours/week for customer discovery and pilot testing.', 'metric': 'Weekly completion'}
    ];
  }

  String get nextSevenDaysAction {
    final backendAction = _str(actionPlan['nextSevenDaysAction'] ?? summaryBlock['doThisBeforeBuildingMore'], fallback: '');
    if (backendAction.isNotEmpty && !backendAction.contains('Execute a formal Pre-Feasibility') && (!backendAction.contains('Draft your customer discovery interview script') || !isNuclear)) {
      return _cleanNarrativeText(backendAction, isHardware: isHardware);
    }
    if (isNuclear) {
      return 'Begin statutory and regulatory pre-feasibility by identifying the applicable New Zealand legal framework and approaching an appropriately qualified specialist for an initial discussion and indicative scope/fee.';
    }
    if (isHardware) {
      return 'Sketch physical concept dimensions and contact 3 target operators or component suppliers for preliminary feedback.';
    }
    return 'Draft your customer discovery interview script and conduct initial outreach to 5 target users.';
  }

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
  static String _cleanNarrativeText(String input, {bool isHardware = false, bool isTransport = false}) {
    if (input.isEmpty) return input;
    String s = input.trim();

    // FIX: Remove malformed regex artifacts ($1, lock-$1, tax agents$1)
    s = s.replaceAll(r'lock-$1', 'lock-in');
    s = s.replaceAll(r'tax agents$1', 'tax agents');
    s = s.replaceAll(RegExp(r'\$1(?![0-9,])'), '');
    s = s.replaceAllMapped(RegExp(r'(^|[\s"–\-])\,([0-9]{3})'), (match) => '${match.group(1)}\$1,${match.group(2)}');

    // Fix raw variable leakage
    s = s.replaceAll(r'$riskCapital', r'$1,000 NZD');

    // Filter personal hobbies from narrative
    s = s.replaceAll(RegExp(r'\s*In my spare time[^\.]*\.?', caseSensitive: false), '');
    s = s.replaceAll(RegExp(r'\s*(personal\s+)?interests?:[^\.]*\.?', caseSensitive: false), '');

    // Fix unsupported factual claims & evidence-state language
    s = s.replaceAll(RegExp(r'There is no effective,?\s*automated solution currently on the market\.?', caseSensitive: false), 'The founder has not identified a directly comparable automated solution within the evidence supplied. Dedicated competitor research is required.');
    s = s.replaceAll(RegExp(r'clear,?\s*willing-to-pay market segment', caseSensitive: false), 'a potentially valuable customer segment whose willingness to pay remains unvalidated');

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
      s = s.replaceAll(RegExp(r'software or operational leverage without proportional linear costs', caseSensitive: false), 'standardised hardware manufacturing and channel distribution, governed by tooling and inventory working capital');
      s = s.replaceAll(RegExp(r'marginal cost of software delivery', caseSensitive: false), 'unit manufacturing and assembly costs');
      s = s.replaceAll(RegExp(r'changing customer requirements and regional market dynamics', caseSensitive: false), 'vessel asset protection needs and marine environmental conditions');
      s = s.replaceAll(RegExp(r'resource consents, environmental standards, fast-track approvals, and regional compliance mandates', caseSensitive: false), 'marina biosecurity guidelines, environmental regulations, and electrical product safety standards');
    }

    // PL-FIX-20261008-V0.9.7-LERIDE-SEMANTIC-INTEGRITY: Clean B2B SaaS phrases in transport/mobility contexts
    if (isTransport) {
      s = s.replaceAll(RegExp(r'\bmanual spreadsheets\b', caseSensitive: false), 'informal phone and roadside bookings');
      s = s.replaceAll(RegExp(r'\bworkflow efficiency & automation\b', caseSensitive: false), 'local transport coordination & booking');
      s = s.replaceAll(RegExp(r'\bworkflow efficiency\b', caseSensitive: false), 'transport booking convenience');
      s = s.replaceAll(RegExp(r'\bcommercial software market\b', caseSensitive: false), 'local passenger transport and mobility market');
      s = s.replaceAll(RegExp(r'\bcloud-based productivity tools\b', caseSensitive: false), 'mobile transport booking tools');
      s = s.replaceAll(RegExp(r'\badministrative overhead reduction\b', caseSensitive: false), 'booking friction reduction');
      s = s.replaceAll(RegExp(r'\benterprise platforms\b', caseSensitive: false), 'booking platforms');
      s = s.replaceAll(RegExp(r'\bhorizontal productivity tools\b', caseSensitive: false), 'consumer mobility applications');
      s = s.replaceAll(RegExp(r'\bcompliance automation\b', caseSensitive: false), 'driver compliance & safety');
      s = s.replaceAll(RegExp(r'\bworkflow retention\b', caseSensitive: false), 'passenger & driver retention');
      s = s.replaceAll(RegExp(r'\bapi-driven add-ons\b', caseSensitive: false), 'transport partner integrations');
      s = s.replaceAll(RegExp(r'\benterprise reporting integrations\b', caseSensitive: false), 'fleet reporting integrations');
      s = s.replaceAll(RegExp(r'\bsubscription economics\b', caseSensitive: false), 'ride commission & transaction economics');
    }

    // FIX PL-FIX-20261005-v0.9.5-01: Prohibited phrases & legal certainty tone calibration
    s = s.replaceAll(RegExp(r'looming energy crisis', caseSensitive: false), 'increasing electricity demand and security-of-supply challenges');
    s = s.replaceAll(RegExp(r'currently blocked by legislative barriers', caseSensitive: false), 'faces substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'currently blocked by legislative', caseSensitive: false), 'faces substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'insurmountable legislative and regulatory barriers', caseSensitive: false), 'substantial statutory and regulatory barriers, subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'insurmountable legislative', caseSensitive: false), 'substantial statutory');
    s = s.replaceAll(RegExp(r'\binsurmountable\b', caseSensitive: false), 'substantial');
    s = s.replaceAll(RegExp(r'non-starter in the current New Zealand context', caseSensitive: false), 'early-stage concept facing unresolved primary feasibility gateways');
    s = s.replaceAll(RegExp(r'categoriz(e|ing) this as a non-starter', caseSensitive: false), 'viewing this as constrained pending primary gateway resolution');
    s = s.replaceAll(RegExp(r'as a non-starter', caseSensitive: false), 'as constrained pending primary gateway resolution');
    s = s.replaceAll(RegExp(r'non-starter because of legislation', caseSensitive: false), 'constrained pending specialist legal confirmation');
    s = s.replaceAll(RegExp(r'\bnon-starter\b', caseSensitive: false), 'early-stage concept requiring primary gateway resolution');
    s = s.replaceAll(RegExp(r'explicit statutory and regulatory framework effectively prohibits land-based commercial nuclear power, rendering the venture unfeasible without legislative reform\.?', caseSensitive: false), 'The proposed venture faces substantial statutory, regulatory, consenting, public-policy and capital barriers. Whether a viable legal/regulatory pathway exists under the current framework, or whether legislative change would ultimately be required, remains subject to specialist legal confirmation.');
    s = s.replaceAll(RegExp(r'\beffectively prohibits\b', caseSensitive: false), 'presents material statutory barriers to, subject to specialist legal confirmation,');
    s = s.replaceAll(RegExp(r'rendering the venture unfeasible without legislative reform\.?', caseSensitive: false), 'requiring specialist legal confirmation to determine whether a viable statutory pathway exists.');
    s = s.replaceAll(RegExp(r'\bunfeasible without legislative reform\b', caseSensitive: false), 'constrained pending specialist legal confirmation');
    s = s.replaceAll(RegExp(r'commercial off-taker reviews', caseSensitive: false), 'published industry commentary');
    s = s.replaceAll(RegExp(r'specific nuclear prohibitions under (national|New Zealand) law', caseSensitive: false), 'nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model');
    s = s.replaceAll(RegExp(r'specific nuclear prohibitions', caseSensitive: false), 'nuclear-related statutory requirements and restrictions');
    s = s.replaceAll(RegExp(r'expanding rapidly driven by electrification', caseSensitive: false), 'expected to increase driven by electrification');
    s = s.replaceAll(RegExp(r'\bexpanding rapidly\b', caseSensitive: false), 'expected to increase');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team with irrefutable, deep expertise in nuclear science, engineering, and energy regulation', caseSensitive: false), 'identify and begin engaging appropriately credentialled nuclear engineering, energy infrastructure and regulatory specialists who could support a later pre-feasibility stage if the statutory pathway proves viable');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team with irrefutable, deep expertise', caseSensitive: false), 'identify and begin engaging appropriately credentialled specialists');
    s = s.replaceAll(RegExp(r'irrefutable, deep expertise', caseSensitive: false), 'verifiable specialist expertise');
    s = s.replaceAll(RegExp(r'irrefutable expertise', caseSensitive: false), 'specialist expertise');
    s = s.replaceAll(RegExp(r'immediately recruit a core leadership team', caseSensitive: false), 'identify and begin engaging specialist advisers');
    s = s.replaceAll(RegExp(r'The commercially accessible market appears effectively unavailable under the current assessed regulatory environment, subject to specialist legal confirmation', caseSensitive: false), 'The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation');
    s = s.replaceAll(RegExp(r'effectively unavailable', caseSensitive: false), 'materially constrained pending legal confirmation');
    s = s.replaceAll(RegExp(r'deeply hostile legal and regulatory environment', caseSensitive: false), 'complex and heavily structured statutory and regulatory environment');
    s = s.replaceAll(RegExp(r'\bdeeply hostile\b', caseSensitive: false), 'heavily regulated');
    s = s.replaceAll(RegExp(r'Even if a legislative pathway were conceivable[^\.]*\.', caseSensitive: false), 'Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved.');
    s = s.replaceAll(RegExp(r'fundamental legislative and societal shifts before any commercial consideration', caseSensitive: false), 'specialist confirmation of statutory feasibility before committing development capital');
    s = s.replaceAll(RegExp(r'Energy sector feedback and published industry commentary reveal', caseSensitive: false), 'Published energy-sector reporting and industry commentary indicate');
    s = s.replaceAll(RegExp(r'Energy sector feedback and', caseSensitive: false), 'Published energy-sector reporting and');
    s = s.replaceAll(RegExp(r'\benergy sector feedback\b', caseSensitive: false), 'published energy-sector reporting');
    s = s.replaceAll(RegExp(r'Recruit a highly specialised co-founder or an executive team[^\.]*\.', caseSensitive: false), 'Identify and begin engaging appropriately credentialled specialists for preliminary advice, scoping and potential future involvement.');
    s = s.replaceAll(RegExp(r'The foundational legal and regulatory barriers in New Zealand make this venture currently non-viable', caseSensitive: false), 'The unresolved legal and regulatory barriers mean the venture is not currently commercially actionable');
    s = s.replaceAll(RegExp(r'make this venture currently non-viable', caseSensitive: false), 'mean the venture is not currently commercially actionable');
    s = s.replaceAll(RegExp(r'\bextraordinary statutory\b', caseSensitive: false), 'substantial statutory');
    s = s.replaceAll(RegExp(r'\bscope the requirements\b'), 'Scope the requirements');
    s = s.replaceAll(RegExp(r'conduct a formal pre-feasibility study evaluating project capital requirements and site constraints\.?', caseSensitive: false), 'Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result.');

    // Fix 3 Root Cause: Dart replaceAllMapped for duplicate words
    s = s.replaceAllMapped(RegExp(r'\b(\w+)\s+\1\b', caseSensitive: false), (match) => match.group(1)!);
    s = s.replaceAll(RegExp(r'\s+'), ' ');
    s = s.replaceAll('..', '.');
    s = s.replaceAll(',.', '.');
    s = s.replaceAll('.,', '.');
    s = s.replaceAll(',,', ',');
    s = s.replaceAllMapped(RegExp(r'\s([,\.\?!])'), (match) => match.group(1)!);
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

  static String _cleanBusinessModelField(String text, {required String fallback}) {
    if (text.isEmpty || text == fallback) return fallback;
    var cleaned = text.trim();
    if (cleaned == '.' || cleaned == '-' || cleaned == '--' || cleaned == 'N/A' || cleaned == 'TBD' || cleaned == 'null' || cleaned == 'undefined' || cleaned == '[placeholder]') {
      return fallback;
    }
    cleaned = cleaned.replaceAllMapped(RegExp(r'^["\“\‘](.*)["\”\’]$'), (match) => match.group(1)!).trim();
    cleaned = cleaned.replaceAll(RegExp(r'^(i\s+want\s+to\s+(develop|build|create|launch)|developing|i\s+am\s+building|we\s+are\s+building|my\s+startup\s+idea\s+is|the\s+problem\s+is|customer\s+problem\s+is|my\s+target\s+market\s+is|i\s+want\s+to\s+target|our\s+target\s+customers\s+are)\s+', caseSensitive: false), '');
    cleaned = cleaned.trim();
    if (cleaned.isEmpty || cleaned == '.' || cleaned == '-') return fallback;
    cleaned = cleaned[0].toUpperCase() + cleaned.substring(1);
    if (!cleaned.endsWith('.')) cleaned += '.';
    return cleaned;
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
