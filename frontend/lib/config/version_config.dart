class VersionConfig {
  static const String appVersion = 'v0.10.3';
  static const String fullVersionString = 'PitchLab MVP v0.10.3';
  static const String changeId = 'PL-20261009-03-MOBILE-SAFARI-INPUT';
  static const String parentChangeId = 'PL-FIX-20261009-003';
  static const String buildId = 'd83a1e9';
  static const String deployedAtFormatted = '09 Oct 2026 23:20 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}

