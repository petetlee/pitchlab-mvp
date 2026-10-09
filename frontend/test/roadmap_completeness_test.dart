import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/models/evaluation_result.dart';
import 'package:frontend/pdf_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('90-Day Validation Roadmap Completeness Tests (PL-FIX-20261009-003)', () {
    void verifyPhaseStructure(List<Map<String, dynamic>> phases) {
      expect(phases.length, equals(3), reason: 'Every assessment must generate exactly 3 distinct phases.');

      // Phase 1: Days 1–30 — Problem Validation
      expect(phases[0]['daysRange'], equals('Days 1–30'));
      expect(phases[0]['phaseNumber'], equals('Phase 1'));
      expect(phases[0]['objective'], isNotEmpty);
      expect((phases[0]['activities'] as List).length, inInclusiveRange(3, 5));
      expect(phases[0]['successCriteria'], isNotEmpty);
      expect(phases[0]['deliverables'], isNotEmpty);
      expect(phases[0]['decisionMilestone'], isNotEmpty);

      // Phase 2: Days 31–60 — Solution Validation
      expect(phases[1]['daysRange'], equals('Days 31–60'));
      expect(phases[1]['phaseNumber'], equals('Phase 2'));
      expect(phases[1]['objective'], isNotEmpty);
      expect((phases[1]['activities'] as List).length, inInclusiveRange(3, 5));
      expect(phases[1]['successCriteria'], isNotEmpty);
      expect(phases[1]['deliverables'], isNotEmpty);
      expect(phases[1]['decisionMilestone'], isNotEmpty);

      // Phase 3: Days 61–90 — Commercial Validation & Decision
      expect(phases[2]['daysRange'], equals('Days 61–90'));
      expect(phases[2]['phaseNumber'], equals('Phase 3'));
      expect(phases[2]['objective'], isNotEmpty);
      expect((phases[2]['activities'] as List).length, inInclusiveRange(3, 5));
      expect(phases[2]['successCriteria'], isNotEmpty);
      expect(phases[2]['deliverables'], isNotEmpty);
      expect(phases[2]['decisionMilestone'], isNotEmpty);
    }

    test('1. PitchLab (AI Business Assessment Platform) generates tailored 3-phase roadmap', () async {
      final evaluation = {
        'idea': 'PitchLab - AI Idea Portfolio & Decision Platform',
        'problem': 'Founders wasting capital on unvalidated commercial business ideas',
        'targetMarket': 'Early stage founders, accelerators, and startup incubators',
        'category': 'AI / Business Decision Support Software',
        'overallScore': 82,
        'masterRecommendation': 'Proceed with Controlled Validation',
        'ventureType': 'AI / Business Decision Support Software',
      };

      final res = EvaluationResult(evaluation);
      expect(res.isAiDecisionSupport, isTrue);

      final phases = res.ninetyDayPhases;
      verifyPhaseStructure(phases);

      // Archetype-specific checks
      final allText = phases.map((p) => '${p['objective']} ${(p['activities'] as List).join(' ')} ${p['successCriteria']} ${p['deliverables']} ${p['decisionMilestone']}').join(' ').toLowerCase();
      expect(allText.contains('founder') || allText.contains('evaluation') || allText.contains('scoring'), isTrue);

      // Verify weekly steps
      final steps = res.ninetyDayRoadmapSteps;
      expect(steps.length, equals(6));
      expect(steps.first['objective'], contains('Problem Discovery'));

      // Verify PDF generation succeeds
      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('2. LeRide (Samoa Transport Marketplace) generates tailored 3-phase roadmap', () async {
      final evaluation = {
        'idea': 'LeRide - Pacific Islands Ride Sharing and Local Transport Marketplace',
        'problem': 'Fragmented island passenger transport and lack of transparent fare booking',
        'targetMarket': 'Local residents, commuters, and tourists in Samoa and Pacific islands',
        'category': 'Transportation / Mobility / Marketplace',
        'overallScore': 68,
        'masterRecommendation': 'Proceed with Controlled Validation',
        'ventureType': 'Transportation / Mobility / Marketplace',
        'isTransport': true,
      };

      final res = EvaluationResult(evaluation);
      expect(res.isTransport, isTrue);

      final phases = res.ninetyDayPhases;
      verifyPhaseStructure(phases);

      // Archetype-specific checks
      final allText = phases.map((p) => '${p['objective']} ${(p['activities'] as List).join(' ')} ${p['successCriteria']} ${p['deliverables']} ${p['decisionMilestone']}').join(' ').toLowerCase();
      expect(allText.contains('passenger') || allText.contains('driver') || allText.contains('ride'), isTrue);
      expect(allText.contains('concierge') || allText.contains('dispatch'), isTrue);

      // Verify weekly steps
      final steps = res.ninetyDayRoadmapSteps;
      expect(steps.length, equals(6));
      expect(steps.first['objective'], contains('Passenger & Driver Outreach'));

      // Verify PDF generation succeeds
      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('3. MoorSafe (Marine Technology Hardware Invention) generates tailored 3-phase roadmap', () async {
      final evaluation = {
        'idea': 'MoorSafe Solar Powered Smart Mooring Monitor',
        'problem': 'Mooring line failures and vessel breakaway risks in marine harbors',
        'targetMarket': 'Marina operators and vessel owners',
        'category': 'Hardware / Physical Product',
        'overallScore': 74,
        'masterRecommendation': 'Proceed with Controlled Validation',
        'ventureType': 'Physical Consumer Product / Hardware',
        'isHardware': true,
      };

      final res = EvaluationResult(evaluation);
      expect(res.isHardware, isTrue);

      final phases = res.ninetyDayPhases;
      verifyPhaseStructure(phases);

      // Archetype-specific checks
      final allText = phases.map((p) => '${p['objective']} ${(p['activities'] as List).join(' ')} ${p['successCriteria']} ${p['deliverables']} ${p['decisionMilestone']}').join(' ').toLowerCase();
      expect(allText.contains('vessel') || allText.contains('marina') || allText.contains('hardware') || allText.contains('prototype'), isTrue);
      expect(allText.contains('benchtop') || allText.contains('cad') || allText.contains('bom'), isTrue);

      // Verify weekly steps
      final steps = res.ninetyDayRoadmapSteps;
      expect(steps.length, equals(6));
      expect(steps.first['objective'], contains('User Problem Discovery'));

      // Verify PDF generation succeeds
      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('4. LBM Construction (Residential Building Services) generates tailored 3-phase roadmap', () async {
      final evaluation = {
        'idea': 'LBM Construction - Residential Building & Renovation Services',
        'problem': 'Unreliable trade scheduling and lack of project cost transparency',
        'targetMarket': 'Homeowners and property developers in Auckland',
        'category': 'Trades / Construction Services',
        'overallScore': 70,
        'masterRecommendation': 'Proceed with Controlled Validation',
        'ventureType': 'Trades / Construction Services',
      };

      final res = EvaluationResult(evaluation);
      expect(res.isTradesServices, isTrue);

      final phases = res.ninetyDayPhases;
      verifyPhaseStructure(phases);

      // Archetype-specific checks
      final allText = phases.map((p) => '${p['objective']} ${(p['activities'] as List).join(' ')} ${p['successCriteria']} ${p['deliverables']} ${p['decisionMilestone']}').join(' ').toLowerCase();
      expect(allText.contains('renovation') || allText.contains('building') || allText.contains('property') || allText.contains('subcontractor'), isTrue);
      expect(allText.contains('estimating') || allText.contains('fixed-price') || allText.contains('milestone'), isTrue);

      // Verify weekly steps
      final steps = res.ninetyDayRoadmapSteps;
      expect(steps.length, equals(6));
      expect(steps.first['objective'], contains('Client Discovery Outreach'));

      // Verify PDF generation succeeds
      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('5. Nuclear Power Plant (Highly Regulated Infrastructure) generates tailored statutory roadmap', () async {
      final evaluation = {
        'idea': 'Nuclear Power Plant - Small Modular Reactor Energy Generation',
        'problem': 'High electricity prices and baseload power decarbonisation in New Zealand',
        'targetMarket': 'National electricity grid and heavy industrial power users',
        'category': 'Energy / Infrastructure / Heavy Industrial',
        'overallScore': 42,
        'masterRecommendation': 'Statutory & Regulatory Barrier Unresolved',
        'ventureType': 'Energy / Infrastructure / Heavy Industrial',
        'isNuclear': true,
      };

      final res = EvaluationResult(evaluation);
      expect(res.isNuclear, isTrue);

      final phases = res.ninetyDayPhases;
      verifyPhaseStructure(phases);

      // Archetype-specific checks
      final allText = phases.map((p) => '${p['objective']} ${(p['activities'] as List).join(' ')} ${p['successCriteria']} ${p['deliverables']} ${p['decisionMilestone']}').join(' ').toLowerCase();
      expect(allText.contains('statutory') || allText.contains('radiation safety') || allText.contains('regulatory'), isTrue);
      expect(allText.contains('smr') || allText.contains('pre-feasibility'), isTrue);
      // Strictly no software development leaks
      expect(allText.contains('writing code') || allText.contains('software development') || allText.contains('mobile app'), isFalse);

      // Verify weekly steps
      final steps = res.ninetyDayRoadmapSteps;
      expect(steps.length, equals(6));
      expect(steps.first['objective'], contains('Legal & Statutory Scoping'));

      // Verify PDF generation succeeds
      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes.length, greaterThan(1000));
    });
  });
}
