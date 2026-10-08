class VersionConfig {
  static const String appVersion = 'v0.9.8';
  static const String fullVersionString = 'PitchLab MVP v0.9.8';
  static const String changeId = 'PL-20261008-CONTACT-01';
  static const String parentChangeId = 'PL-FIX-20261008-V0.9.7-LERIDE-SEMANTIC-INTEGRITY';
  static const String buildId = '9c2a5da';
  static const String deployedAtFormatted = '08 Oct 2026 14:45 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
