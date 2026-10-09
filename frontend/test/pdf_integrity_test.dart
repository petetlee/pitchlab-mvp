import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pdf_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PDF Generation Integrity Tests (PL-FIX-20261009-001)', () {
    test('1. LeRide (Transport Marketplace) generates valid PDF bytes without exception', () async {
      final evaluation = {
        'idea': 'LeRide - Pacific Islands Ride Sharing and Local Transport Marketplace',
        'problem': 'Fragmented island passenger transport and lack of transparent fare booking',
        'targetMarket': 'Local residents, commuters, and tourists in Samoa and Pacific islands',
        'category': 'Transportation / Mobility / Marketplace',
        'overallScore': 68,
        'scoreBand': 'COMMERCIAL VALIDATION REQUIRED',
        'masterRecommendation': 'PROCEED TO LEAN FIELD VALIDATION',
        'ventureType': 'Transportation / Mobility / Marketplace',
        'isTransport': true,
        'isMarketplace': true,
        'scores': {
          'overall': 68,
          'problemUrgency': {'scoreAchieved': 14, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 12, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 13, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 15, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 14, 'maxScore': 20},
        },
        'executiveSummary': 'LeRide connects passenger transport operators using manual spreadsheets and phone bookings into a digital ride-booking network.',
        'businessModelSnapshot': {
          'targetCustomer': 'Pacific island commuters and tourists seeking reliable ride transport.',
          'coreOffering': 'On-demand ride booking platform connecting passengers with vetted drivers.',
          'customerProblem': 'Manual spreadsheets and uncoordinated phone booking cause long wait times.',
          'valueProposition': 'Transparent upfront pricing and automated ride dispatch.',
          'revenueModel': 'Transaction fee percentage per completed ride booking.',
          'customerAcquisition': 'Local driver onboarding and airport referral partnerships.',
          'keyCosts': 'Mobile app maintenance, payment gateway fees, and driver support.',
          'commercialAssessment': 'Marketplace network density governs long-term defensibility.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'Increasing passenger demand for digital transport booking.',
            'technologyTrend': 'Widespread mobile phone adoption and GPS availability.',
            'regulatoryTrend': 'Local passenger transport safety and licensing standards.',
            'competitionTrend': 'Traditional taxis and informal operators provide baseline competition.',
            'capitalTrend': 'Asset-light marketplace model scaling through transaction fees.',
          }
        },
      };

      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('2. MoorSafe (Physical Product/Invention) generates valid PDF bytes', () async {
      final evaluation = {
        'idea': 'MoorSafe Solar Powered Smart Mooring Monitor',
        'problem': 'Mooring line failures and vessel breakaway risks in marine harbors',
        'targetMarket': 'Marina operators and vessel owners',
        'category': 'Hardware / Physical Product',
        'overallScore': 74,
        'scoreBand': 'HIGH COMMERCIAL POTENTIAL',
        'masterRecommendation': 'PROCEED TO FIELD PROTOTYPE TESTING',
        'ventureType': 'Hardware / Physical Product',
        'isHardware': true,
        'scores': {
          'overall': 74,
          'problemUrgency': {'scoreAchieved': 16, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 14, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 15, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 15, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 14, 'maxScore': 20},
        },
        'executiveSummary': 'MoorSafe is a solar-powered IoT mooring line strain sensor that alerts vessel owners to breakaway risks.',
        'businessModelSnapshot': {
          'targetCustomer': 'Vessel owners and marina operators seeking marine asset protection.',
          'coreOffering': 'Solar-powered strain sensor and companion mobile alerting app.',
          'customerProblem': 'Undetected mooring line wear leads to costly vessel breakaway damage.',
          'valueProposition': 'Real-time telemetry and immediate alert notifications before line failure.',
          'revenueModel': 'Hardware unit sale plus annual monitoring cloud subscription.',
          'customerAcquisition': 'Direct marine distributor sales and trade show demonstrations.',
          'keyCosts': 'Enclosure tooling, IoT sensor components, and cellular connectivity.',
          'commercialAssessment': 'Validated field trial durability governs commercial adoption.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'Growing marina safety focus and insurance compliance requirements.',
            'technologyTrend': 'Low-power IoT sensors and satellite/cellular marine connectivity.',
            'regulatoryTrend': 'Maritime safety guidelines and environmental harbour protection.',
            'competitionTrend': 'Traditional unmonitored mooring lines create status quo barrier.',
            'capitalTrend': 'Upfront hardware tooling capital scaled through direct sales.',
          }
        },
      };

      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('3. PitchLab (SaaS / AI Platform) generates valid PDF bytes without exception', () async {
      final evaluation = {
        'idea': 'PitchLab - AI Idea Portfolio & Decision Platform',
        'problem': 'Founders wasting capital on unvalidated commercial business ideas',
        'targetMarket': 'Early stage founders, accelerators, and startup incubators',
        'category': 'Software / SaaS / AI Platform',
        'overallScore': 82,
        'scoreBand': 'READY TO COMMENCE VALIDATION',
        'masterRecommendation': 'PROCEED TO MVP LAUNCH',
        'ventureType': 'AI / Business Decision Support Software',
        'scores': {
          'overall': 82,
          'problemUrgency': {'scoreAchieved': 17, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 16, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 16, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 17, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 16, 'maxScore': 20},
        },
        'executiveSummary': 'PitchLab automates commercial readiness assessments for startup founders using Google-native AI orchestration.',
        'businessModelSnapshot': {
          'targetCustomer': 'Startup founders and early-stage venture investors.',
          'coreOffering': 'Automated 12-page commercial readiness assessment report.',
          'customerProblem': 'Premature capital deployment into unvalidated ideas.',
          'valueProposition': 'Instant objective decision frameworks and staged action plans.',
          'revenueModel': 'Pay-per-assessment or monthly subscription tiers.',
          'customerAcquisition': 'Digital founder communities and ecosystem partnerships.',
          'keyCosts': 'AI API compute, web hosting, and continuous model calibration.',
          'commercialAssessment': 'High scalability with software subscription economics.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'Increasing demand for automated business intelligence tools.',
            'technologyTrend': 'Rapid advances in multi-modal LLMs and structured reasoning.',
            'regulatoryTrend': 'Data privacy standards and AI transparency guidelines.',
            'competitionTrend': 'Manual business plan consultants and generic prompt templates.',
            'capitalTrend': 'Lean software capital model scaling efficiently.',
          }
        },
      };

      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('3b. PitchLab PDF rejects deliberate LeRide contamination injection', () async {
      final contaminatedEval = {
        'idea': 'PitchLab - AI Idea Portfolio & Decision Platform',
        'problem': 'Founders wasting capital on unvalidated commercial business ideas',
        'targetMarket': 'Early stage founders, accelerators, and startup incubators',
        'category': 'AI / Business Decision Support Software',
        'overallScore': 82,
        'scoreBand': 'READY TO COMMENCE VALIDATION',
        'masterRecommendation': 'PROCEED TO MVP LAUNCH',
        'ventureType': 'AI / Business Decision Support Software',
        'scores': {
          'overall': 82,
          'problemUrgency': {'scoreAchieved': 17, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 16, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 16, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 17, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 16, 'maxScore': 20},
        },
        'executiveSummary': 'PitchLab connects passengers with vetted drivers across Apia.',
        'businessModelSnapshot': {
          'targetCustomer': 'Startup founders and early-stage venture investors.',
          'coreOffering': 'vetted drivers platform.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'Increasing demand for automated business intelligence tools.',
          }
        },
      };

      expect(() => PdfService.buildPdfBytes(contaminatedEval), throwsException);
    });

    test('4. LBM Construction (Services) generates valid PDF bytes', () async {
      final evaluation = {
        'idea': 'LBM Construction - Residential Building & Renovation Services',
        'problem': 'Unreliable trade scheduling and lack of project cost transparency',
        'targetMarket': 'Homeowners and property developers in Auckland',
        'category': 'Trades / Construction Services',
        'overallScore': 70,
        'scoreBand': 'COMMERCIAL VALIDATION REQUIRED',
        'masterRecommendation': 'PROCEED WITH FIXED CONTRACT PRICING',
        'ventureType': 'Trades / Construction Services',
        'scores': {
          'overall': 70,
          'problemUrgency': {'scoreAchieved': 15, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 14, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 13, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 15, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 13, 'maxScore': 20},
        },
        'executiveSummary': 'LBM Construction provides fixed-price residential building and renovation services with digital project milestones.',
        'businessModelSnapshot': {
          'targetCustomer': 'Residential property owners seeking reliable building contractors.',
          'coreOffering': 'End-to-end residential renovation and building construction management.',
          'customerProblem': 'Cost overruns and poor trade communication during renovations.',
          'valueProposition': 'Fixed-price contracts and guaranteed completion timelines.',
          'revenueModel': 'Milestone-based progress payments on construction contracts.',
          'customerAcquisition': 'Local trade referrals, architect partnerships, and digital reviews.',
          'keyCosts': 'Subcontractor trades, building materials, and site supervision.',
          'commercialAssessment': 'Strong local demand with margin dependent on cost control.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'Steady demand for home renovation and housing supply expansion.',
            'technologyTrend': 'Digital building consents and mobile job management tools.',
            'regulatoryTrend': 'Licensed Building Practitioner standards and building codes.',
            'competitionTrend': 'Fragmented local trade contractors competing on price and reputation.',
            'capitalTrend': 'Low initial capital requirement supported by client progress payments.',
          }
        },
      };

      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('5. Nuclear Power Plant (Complex Technical Assessment) generates valid PDF bytes', () async {
      final evaluation = {
        'idea': 'Nuclear Power Plant - Small Modular Reactor Energy Generation',
        'problem': 'High electricity prices and baseload power decarbonisation in New Zealand',
        'targetMarket': 'National electricity grid and heavy industrial power users',
        'category': 'Complex Technical / Energy Infrastructure',
        'overallScore': 42,
        'scoreBand': 'CRITICAL FEASIBILITY GATE UNRESOLVED',
        'masterRecommendation': 'DO NOT DEPLOY PRIVATE CAPITAL - STATUTORY BARRIERS EXIST',
        'ventureType': 'Complex Technical / Energy Infrastructure',
        'isNuclear': true,
        'scores': {
          'overall': 42,
          'problemUrgency': {'scoreAchieved': 12, 'maxScore': 20},
          'customerValidation': {'scoreAchieved': 8, 'maxScore': 20},
          'businessModelDefensibility': {'scoreAchieved': 9, 'maxScore': 20},
          'founderFit': {'scoreAchieved': 8, 'maxScore': 20},
          'futureTrends': {'scoreAchieved': 5, 'maxScore': 20},
        },
        'executiveSummary': 'Small Modular Reactor facility to supply baseload electricity to the national grid.',
        'businessModelSnapshot': {
          'targetCustomer': 'National grid operator and heavy industrial off-takers.',
          'coreOffering': 'Continuous low-carbon firm electricity generation.',
          'customerProblem': 'Intermittent renewable generation creating grid stability risks.',
          'valueProposition': 'Long-term predictable baseload electricity supply.',
          'revenueModel': 'Long-term Power Purchase Agreements (PPAs) and wholesale electricity sales.',
          'customerAcquisition': 'Direct long-term contracting with grid operators.',
          'keyCosts': 'SMR technology licensing, consenting, plant construction, and security.',
          'commercialAssessment': 'Statutory permissibility and multi-billion dollar CAPEX govern viability.',
        },
        'futureTrends': {
          'dimensions': {
            'demandTrend': 'National demand for low-carbon electricity expected to increase.',
            'technologyTrend': 'International SMR technology progressing across OECD markets.',
            'regulatoryTrend': 'Significant statutory frameworks constrain nuclear generation in NZ.',
            'competitionTrend': 'Hydro, geothermal, and wind dominate current generation.',
            'capitalTrend': 'Multi-billion dollar infrastructure scale requiring government underwriting.',
          }
        },
      };

      final pdfBytes = await PdfService.buildPdfBytes(evaluation);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });
  });
}
