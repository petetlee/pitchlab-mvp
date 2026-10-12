class VersionConfig {
  static const String appVersion = 'v0.12.0';
  static const String fullVersionString = 'PitchLab MVP v0.12.0';
  static const String changeId = 'PL-20261012-HISTORY-01';
  static const String parentChangeId = 'PL-FIX-20261012-01-SAFARI-SUBMISSION-UPLOAD';
  static const String buildId = 'PL-20261012-HISTORY-01';
  static const String deployedAtFormatted = '12 Oct 2026 14:15 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
