class VersionConfig {
  static const String appVersion = 'v0.9.9';
  static const String fullVersionString = 'PitchLab MVP v0.9.9';
  static const String changeId = 'PL-20261009-TEXTCOLOR-01';
  static const String parentChangeId = 'PL-20261008-CONTACT-01';
  static const String buildId = '5f39e12';
  static const String deployedAtFormatted = '09 Oct 2026 14:50 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
