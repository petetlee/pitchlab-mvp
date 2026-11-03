import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/models/evaluation_result.dart';
import 'package:frontend/pdf_service.dart';
import 'package:frontend/config/version_config.dart';

void main() {
  group('PL-FIX-20261103-01 — Assessment Reliability, Evidence Verification & Decision Consistency Tests', () {
    test('VersionConfig displays target release v0.12.5, sr20261103a, PL-FIX-20261103-01', () {
      expect(VersionConfig.appVersion, equals('v0.12.5'));
      expect(VersionConfig.fullVersionString, equals('PitchLab MVP v0.12.5'));
      expect(VersionConfig.buildId, equals('sr20261103a'));
      expect(VersionConfig.changeId, equals('PL-FIX-20261103-01'));
    });

    final Map<String, dynamic> moorSafeMap = {
      'id': 'eval_moorsafe_live',
      'appVersion': 'v0.12.5',
      'fullVersionString': 'PitchLab MVP v0.12.5',
      'buildId': 'sr20261103a',
      'changeId': 'PL-FIX-20261103-01',
      'assessmentGeneratedAt': '2026-11-03T00:05:00.000Z',
      'assessmentGeneratedAtFormatted': '2026-11-03 00:05 GMT (UTC+00:00)',
      'idea': 'MoorSafe Premium — Solar-Powered Marine Pest Deterrent mounted on mooring ropes to prevent rodents and insects from boarding vessels',
      'category': 'Physical Consumer Product / Hardware',
      'problem': 'Rats, mice, cockroaches and ants climb along mooring ropes from docks, wharves and shoreline moorings to infest berthed boats, causing hygiene risks, chewed marine electrical wiring, upholstery damage, and island biosecurity threats.',
      'targetMarket': 'Recreational boat owners, cruising yachts, launches, liveaboards, and commercial marina operators in New Zealand and international coastal regions.',
      'timeCommitment': '10–15 hours/week',
      'budget': r'$10,000–$25,000',
      'overallScore': 53,
      'masterRecommendation': 'INVESTIGATE',
      'portfolioDecision': 'INVESTIGATE',
      'portfolioMeta': {
        'portfolioDecision': 'INVESTIGATE',
        'decisionState': 'INVESTIGATE',
        'portfolioAction': 'Conduct structured customer discovery interviews and initial evidence gathering.',
        'problemStatus': 'Worth Investigating',
        'solutionStatus': 'Under Stage-Gated Validation'
      },
      'adviserOpinion': {
        'masterRecommendation': 'INVESTIGATE',
        'portfolioDecision': 'INVESTIGATE',
        'opinionNarrative': 'Actively investigate physical prototype field testing, marine durability, and customer willingness to pay.'
      },
      'summaryBlock': {
        'decisionStatus': 'INVESTIGATE',
        'pitchLabVerdict': 'A valid physical consumer product undergoing validation.',
        'threePriorityActions': [
          'Conduct 10-15 interviews with berthed vessel owners.',
          'Build low-voltage bench test circuit on wet marine rope.',
          'Determine target retail BOM and distributor margin structure.'
        ]
      },
      'scorecard': {
        'problemCustomerClarity': {'scoreAchieved': 12, 'maxScore': 14, 'evidenceLevel': 'Strong Evidence', 'explanation': 'Target customer segment defined [Founder Input].'},
        'founderCapabilityFit': {'scoreAchieved': 10, 'maxScore': 15, 'evidenceLevel': 'Partial Evidence', 'explanation': 'CA/BCom commercial capability with outsourced hardware engineering.'},
        'customerValidation': {'scoreAchieved': 1, 'maxScore': 20, 'evidenceLevel': 'Not yet evidenced', 'explanation': '0 potential customers logged.'},
        'marketCommercialOpportunity': {'scoreAchieved': 9, 'maxScore': 14, 'evidenceLevel': 'Partial Evidence', 'explanation': 'Marine pest deterrent market.'},
        'businessModelWillingnessToPay': {'scoreAchieved': 8, 'maxScore': 14, 'evidenceLevel': 'Partial Evidence', 'explanation': 'Hardware unit sales model.'},
        'competitivePosition': {'scoreAchieved': 5, 'maxScore': 9, 'evidenceLevel': 'Partial Evidence', 'explanation': 'Active deterrent vs passive plastic discs.'},
        'executionReadiness': {'scoreAchieved': 5, 'maxScore': 9, 'evidenceLevel': 'Partial Evidence', 'explanation': r'10–15 hrs/wk and $10k–$25k budget.'},
        'futureTrends': {'scoreAchieved': 3, 'maxScore': 5, 'evidenceLevel': 'Partial Evidence', 'explanation': 'Biosecurity regulations.'}
      },
      'founderMetrics': {
        'weeklyAvailableHours': '10–15 hours/week',
        'availableCapital': r'$10,000–$25,000',
        'initialRiskCapital': r'$10,000–$25,000'
      },
      'ninetyDayRoadmapSteps': [
        'Phase 1: Interview 10-15 berthed vessel owners to confirm rodent boarding routes and willingness to pay.',
        'Phase 2: Assemble low-voltage wet-rope bench circuit to verify deterrent pulse threshold.',
        'Phase 3: Fabricate IP67 waterproof enclosure and secure 5 LOIs or pre-orders.'
      ]
    };

    final Map<String, dynamic> nuclearMap = {
      'id': 'eval_nuclear_live',
      'appVersion': 'v0.12.5',
      'fullVersionString': 'PitchLab MVP v0.12.5',
      'buildId': 'sr20261103a',
      'changeId': 'PL-FIX-20261103-01',
      'assessmentGeneratedAt': '2026-11-03T00:05:00.000Z',
      'assessmentGeneratedAtFormatted': '2026-11-03 00:05 GMT (UTC+00:00)',
      'idea': 'Nuclear Power in New Zealand — Commercial Small Modular Reactor (SMR) Concept',
      'category': 'Energy & Infrastructure',
      'problem': 'New Zealand faces long-term electricity generation challenges with winter peak demand, dry-year hydro risk, and industrial decarbonisation requiring baseload firm clean electricity.',
      'targetMarket': 'Electricity gentailers, heavy industrial heat and power consumers, and national grid operators.',
      'timeCommitment': '5–10 hours/week',
      'budget': r'$0–$500 NZD',
      'overallScore': 27,
      'masterRecommendation': 'PARK',
      'portfolioDecision': 'PARK',
      'portfolioMeta': {
        'portfolioDecision': 'PARK',
        'decisionState': 'PARK',
        'portfolioAction': 'Preserve energy-security problem; park commercial SMR deployment pending statutory/regulatory clarification.',
        'problemStatus': 'Worth Preserving',
        'solutionStatus': 'No Established Regulatory Pathway — Parked in Current Formulation'
      },
      'adviserOpinion': {
        'masterRecommendation': 'PARK',
        'portfolioDecision': 'PARK',
        'opinionNarrative': 'Preserve problem statement while parking commercial SMR execution pending statutory and regulatory clarification.'
      },
      'summaryBlock': {
        'decisionStatus': 'PARK',
        'pitchLabVerdict': 'Statutory and licensing uncertainty requires parking the concept.',
        'threePriorityActions': [
          'Commission specialist energy law opinion on NZ statutory framework.',
          'Monitor Ministry of Business, Innovation and Employment (MBIE) policy reviews.',
          'Preserve underlying industrial decarbonisation problem while evaluating firm clean alternatives.'
        ]
      },
      'scorecard': {
        'problemCustomerClarity': {'scoreAchieved': 14, 'maxScore': 14, 'evidenceLevel': 'Strong Evidence', 'explanation': 'Strategic baseload problem definition.'},
        'founderCapabilityFit': {'scoreAchieved': 4, 'maxScore': 15, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Chartered Accountant governance without nuclear reactor consortium.'},
        'customerValidation': {'scoreAchieved': 1, 'maxScore': 20, 'evidenceLevel': 'Not yet evidenced', 'explanation': '0 off-taker LOIs.'},
        'marketCommercialOpportunity': {'scoreAchieved': 3, 'maxScore': 14, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Multi-billion dollar infrastructure.'},
        'businessModelWillingnessToPay': {'scoreAchieved': 2, 'maxScore': 14, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Uncertain tariff pathway.'},
        'competitivePosition': {'scoreAchieved': 1, 'maxScore': 9, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Geothermal and wind baseline.'},
        'executionReadiness': {'scoreAchieved': 1, 'maxScore': 9, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Requires consortium.'},
        'futureTrends': {'scoreAchieved': 1, 'maxScore': 5, 'evidenceLevel': 'Limited Evidence', 'explanation': 'Capped at 1/5 due to lack of established regulatory pathway.'}
      },
      'founderMetrics': {
        'weeklyAvailableHours': '5–10 hours/week',
        'availableCapital': r'$0–$500 NZD',
        'initialRiskCapital': r'$0–$500 NZD'
      }
    };

    test('MoorSafe EvaluationResult unifies masterRecommendation and portfolioDecision to INVESTIGATE', () {
      final res = EvaluationResult.fromMap(moorSafeMap);
      expect(res.masterRecommendation, equals('INVESTIGATE'));
      expect(res.portfolioDecision, equals('INVESTIGATE'));
      expect(res.portfolioMeta['decisionState'], equals('INVESTIGATE'));
      expect(res.appVersion, equals('v0.12.5'));
      expect(res.buildId, equals('sr20261103a'));
      expect(res.changeId, equals('PL-FIX-20261103-01'));
      expect(res.overallScore, equals(53));

      // Assert hours normalization preserves 10–15 hours/week
      expect(res.founderMetrics['weeklyAvailableHours'], equals('10–15 hours/week'));
    });

    test('MoorSafe narrative and roadmap are completely free from generic hardware failure phrases', () {
      final res = EvaluationResult.fromMap(moorSafeMap);
      final joinedRoadmap = res.ninetyDayRoadmapSteps.join(' ').toLowerCase();

      expect(joinedRoadmap.contains('mooring line failure'), isFalse);
      expect(joinedRoadmap.contains('line failure costs'), isFalse);
      expect(joinedRoadmap.contains('unmonitored equipment failures'), isFalse);
      expect(joinedRoadmap.contains('pest'), isTrue);
    });

    test('Nuclear Power NZ EvaluationResult unifies masterRecommendation and portfolioDecision to PARK', () {
      final res = EvaluationResult.fromMap(nuclearMap);
      expect(res.masterRecommendation, equals('PARK'));
      expect(res.portfolioDecision, equals('PARK'));
      expect(res.portfolioMeta['decisionState'], equals('PARK'));
      expect(res.overallScore, equals(27));
      expect(res.scorecardMap['problemCustomerClarity']?['scoreAchieved'], equals(14));
      expect(res.scorecardMap['customerValidation']?['scoreAchieved'], equals(1));
      expect(res.scorecardMap['futureTrends']?['scoreAchieved'], equals(1));
    });

    test('PdfService produces expected authoritative header and footer identifiers', () {
      final res = EvaluationResult.fromMap(moorSafeMap);
      final footerString = 'PitchLab MVP ${res.appVersion} | Build ${res.buildId} | Task ${res.changeId} | Generated ${res.assessmentGeneratedAtFormatted}';
      expect(footerString, contains('PitchLab MVP v0.12.5'));
      expect(footerString, contains('Build sr20261103a'));
      expect(footerString, contains('Task PL-FIX-20261103-01'));
      expect(footerString, contains('2026-11-03 00:05 GMT (UTC+00:00)'));
    });
  });
}
