import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/models/evaluation_result.dart';
import 'package:frontend/pdf_service.dart';
import 'package:frontend/config/version_config.dart';

void main() {
  group('PL-FIX-20261030-01 — Tai Bookkeeping & EvaluationResult Integrity Tests', () {
    final Map<String, dynamic> taiEvaluationMap = {
      'id': '6auxSTXpKCF6F2mxpCao',
      'userId': '4tzQUVLLUuVBRt0Jj9XbONAXIga2',
      'founderName': 'Tai',
      'appVersion': 'v0.12.4',
      'fullVersionString': 'PitchLab MVP v0.12.4',
      'buildId': 'sr20261030a',
      'changeId': 'PL-FIX-20261030-01',
      'assessmentGeneratedAt': '2026-10-30T10:30:00.000Z',
      'assessmentGeneratedAtFormatted': '2026-10-30 10:30 GMT (UTC+00:00)',
      'ventureContext': 'Professional Services / Bookkeeping & Financial Advisory',
      'idea': 'To provide Bookkeeping Services to small business owners/sole traders who cannot afford the high fees charged by Chartered Accountants, and to help them understand their financial information in a simple, relatable and supportive way. The goal is to empower our Pasifika people to feel confident about managing their business finances by building trust, relationships, and confidence first.',
      'category': 'Bookkeeping Services',
      'problem': '1. To become more proficient in the Xero accounting packgage by enrolling in further course training\n2. Understanding the requirements to set up a business\n3. New client base',
      'targetMarket': 'Start-ups, Sole Traders, Small to Medium Businesses in the following industries: construction and trades, transport/courier Services, food and hospitality, cleaning and Lawn services, retail and creative businesses, community organisations and charities.',
      'timeCommitment': '15-30 hours/week',
      'capacity': '3',
      'investmentCommitment': r'$0-$500',
      'budget': r'$0-$500 NZD',
      'customerValidation': 'No',
      'founderBackgroundNarrative': 'My career spans more than 28 years in financial administration, project controls, and payroll across major energy, construction, and engineering companies in New Zealand and Australia. I hold a Bachelor of Business degree and a Diploma in Applied Management, and currently serve as Treasurer for an Incorporated Society.',
      'overallScore': 45,
      'masterRecommendation': 'PIVOT - Concept / Target / Model',
      'scorecard': {
        'problemCustomerClarity': {
          'scoreAchieved': 6,
          'maxScore': 14,
          'evidenceLevel': 'Partial Evidence',
          'explanation': 'The submitted problem statement describes the founder\'s own operational setup and training goals rather than external customer pain points.',
          'missingEvidence': 'Direct customer problem discovery logs.',
          'howToImprove': 'Interview 8–10 Pasifika small business owners and community treasurers.'
        },
        'founderCapabilityFit': {
          'scoreAchieved': 9,
          'maxScore': 15,
          'evidenceLevel': 'Limited Evidence',
          'explanation': 'Strong 28+ years financial administration, payroll, and society treasurer experience; completing Xero certification will close the cloud practice gap.',
          'missingEvidence': 'Completed Xero Advisor certification.',
          'howToImprove': 'Complete Xero Advisor and Payroll certification courses.'
        },
        'customerValidation': {
          'scoreAchieved': 2,
          'maxScore': 20,
          'evidenceLevel': 'Not yet evidenced',
          'explanation': 'No structured customer discovery interviews or paying bookkeeping clients have been secured yet.',
          'missingEvidence': '8–10 customer discovery logs and 2–3 signed pilot retainers.',
          'howToImprove': 'Conduct 8–10 structured discovery conversations with target business owners.'
        },
        'marketCommercialOpportunity': {
          'scoreAchieved': 8,
          'maxScore': 14,
          'evidenceLevel': 'Partial Evidence',
          'explanation': 'Clear Auckland Pasifika SME and community organisation niche.',
          'missingEvidence': 'Validated local client acquisition conversion rate.',
          'howToImprove': 'Engage local Pasifika business networks and community hubs.'
        },
        'businessModelWillingnessToPay': {
          'scoreAchieved': 7,
          'maxScore': 14,
          'evidenceLevel': 'Partial Evidence',
          'explanation': 'Logical recurring monthly bookkeeping and payroll retainer model.',
          'missingEvidence': 'Tested fixed-fee monthly package pricing.',
          'howToImprove': 'Present 3-tier monthly bookkeeping packages to 5 prospects.'
        },
        'competitivePosition': {
          'scoreAchieved': 5,
          'maxScore': 9,
          'evidenceLevel': 'Partial Evidence',
          'explanation': 'Differentiated by culturally grounded, plain-language support below Chartered Accountant fee levels.',
          'missingEvidence': 'Competitor fee benchmark.',
          'howToImprove': 'Benchmark local bookkeeper and CA fee tiers.'
        },
        'executionReadiness': {
          'scoreAchieved': 4,
          'maxScore': 9,
          'evidenceLevel': 'Partial Evidence',
          'explanation': r'15–30 hours/week provides strong part-time execution capacity alongside lean $0–$500 NZD setup budget.',
          'missingEvidence': 'Completed Xero certification and practice registration.',
          'howToImprove': 'Complete Xero certification and client engagement templates.'
        },
        'futureTrends': {
          'scoreAchieved': 4,
          'maxScore': 5,
          'evidenceLevel': 'Strong Evidence',
          'explanation': 'Favourable cloud accounting and IRD digital compliance tailwinds.',
          'missingEvidence': 'Ongoing monitoring of IRD digital filing standards.',
          'howToImprove': 'Align service packages with cloud ledger workflows.'
        },
      },
      'founderMetrics': {
        'weeklyAvailableHours': '15–30 hours/week',
        'availableCapital': r'$0–$500 NZD',
        'initialRiskCapital': r'$0–$500 NZD',
        'founderPositionSummary': 'Workable With Constraints'
      },
      'businessModelSnapshot': {
        'targetCustomer': 'Start-ups, sole traders, small-to-medium businesses, and community organisations in Auckland.',
        'coreOffering': 'Dedicated bookkeeping, payroll, accounts payable/receivable, reconciliation, and practical financial literacy workshops.',
        'customerProblem': 'Founder\'s submitted response listed internal launch priorities (Xero course proficiency, business setup requirements, and new client base) rather than external customer pain points. Inferred customer problem: Pasifika small business owners and community organisations face high Chartered Accountant fees and compliance stress.',
        'valueProposition': 'Culturally responsive, relationship-based bookkeeping and financial administration support.',
        'revenueModel': 'Tiered fixed-fee monthly bookkeeping and payroll retainers and workshop facilitation.',
        'customerAcquisition': 'Warm outreach through Pasifika business networks, community organisations, and CA referrals.',
        'keyCosts': 'Xero advisor certification, business registration, professional indemnity insurance, and client outreach.',
        'commercialAssessment': 'A low-overhead professional bookkeeping practice with strong founder domain alignment (28+ years in financial administration and society treasurer governance).'
      },
      'businessTheme': {
        'primaryTheme': 'Professional Services / Bookkeeping & Financial Advisory',
        'secondaryTheme': 'Small Business & Community Financial Compliance Support',
        'strategicPositioning': 'Positions as a culturally responsive, plain-language bookkeeping, payroll, and financial literacy practice in New Zealand.',
        'marketCategoryDynamics': 'Driven by bi-monthly GST/PAYE compliance mandates, cloud accounting ledger adoption, and charity reporting rules.',
        'strategicMoat': 'Personal practitioner trust, cultural and community network credibility, and 28+ years of financial administration experience.'
      },
    };

    test('Classifies Bookkeeping Service accurately and never triggers isTradesServices or isTaxFintech', () {
      final res = EvaluationResult.fromMap(taiEvaluationMap);
      expect(res.isBookkeepingService, isTrue);
      expect(res.isTradesServices, isFalse);
      expect(res.isTaxFintech, isFalse);
      expect(res.isHardware, isFalse);
      expect(res.isNuclear, isFalse);
    });

    test('Reconciles all 8 scorecard categories to exact overallScore (45/100) and maxScore 100', () {
      final res = EvaluationResult.fromMap(taiEvaluationMap);
      expect(res.scorecardCategories.length, equals(8));
      final sumAchieved = res.scorecardCategories.fold<int>(0, (prev, c) => prev + c.scoreAchieved);
      final sumMax = res.scorecardCategories.fold<int>(0, (prev, c) => prev + c.maxScore);
      expect(sumMax, equals(100));
      expect(sumAchieved, equals(45));
      expect(res.overallScore, equals(45));
    });

    test('Preserves canonical founder time (15–30 hours/week), capital (\$0–\$500 NZD), founderName (Tai), and GMT timestamp', () {
      final res = EvaluationResult.fromMap(taiEvaluationMap);
      expect(res.timeAvailable, equals('15–30 hours/week'));
      expect(res.capitalAvailable, equals(r'$0–$500 NZD'));
      expect(res.riskCapital, equals(r'$0–$500 NZD'));
      expect(res.founderName, equals('Tai'));
      expect(res.appVersion, equals(VersionConfig.appVersion));
      expect(res.buildId, equals(VersionConfig.buildId));
      expect(res.assessmentGeneratedAtFormatted, endsWith('GMT (UTC+00:00)'));
      for (final step in res.ninetyDayRoadmapSteps) {
        expect(step['hours'], equals('15–30 hours/week'));
        expect(step['tasks']!.toLowerCase().contains('homeowners'), isFalse);
        expect(step['tasks']!.toLowerCase().contains('subcontractor'), isFalse);
      }
    });

    test('PdfService.buildPdfBytes generates valid PDF bytes for Tai Bookkeeping report and passes pre-PDF integrity gate', () async {
      final pdfBytes = await PdfService.buildPdfBytes(taiEvaluationMap);
      expect(pdfBytes.isNotEmpty, isTrue);
      expect(pdfBytes.length, greaterThan(5000));
    });
  });
}
