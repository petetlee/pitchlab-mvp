class VersionConfig {
  static const String appVersion = 'v0.12.0';
  static const String fullVersionString = 'PitchLab MVP v0.12.0';
  static const String changeId = 'PL-FIX-20261012-01-SAFARI-SUBMISSION-UPLOAD';
  static const String parentChangeId = 'PL-20261010-SAVE-RESUME-02';
  static const String buildId = 'sr20261012';
  static const String deployedAtFormatted = '12 Oct 2026 11:00 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
