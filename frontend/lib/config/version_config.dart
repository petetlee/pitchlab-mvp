class VersionConfig {
  static const String appVersion = 'v0.12.1';
  static const String fullVersionString = 'PitchLab MVP v0.12.1';
  static const String changeId = 'PL-FIX-20261012-02-CV-UPLOAD-PERMANENT';
  static const String parentChangeId = 'PL-FIX-20261012-01-SAFARI-SUBMISSION-UPLOAD';
  static const String buildId = 'sr20261012b';
  static const String deployedAtFormatted = '12 Oct 2026 22:00 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
