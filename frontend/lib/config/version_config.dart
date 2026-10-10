class VersionConfig {
  static const String appVersion = 'v0.11.0';
  static const String fullVersionString = 'PitchLab MVP v0.11.0';
  static const String changeId = 'PL-20261010-SAVE-RESUME-02';
  static const String parentChangeId = 'PL-20261009-03-MOBILE-SAFARI-INPUT';
  static const String buildId = 'sr20261010';
  static const String deployedAtFormatted = '10 Oct 2026 16:00 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
