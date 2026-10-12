class VersionConfig {
  static const String appVersion = 'v0.12.2';
  static const String fullVersionString = 'PitchLab MVP v0.12.2';
  static const String changeId = 'PL-FIX-20261012-03-CV-BASE64';
  static const String parentChangeId = 'PL-FIX-20261012-02-CV-UPLOAD-PERMANENT';
  static const String buildId = 'sr20261012c';
  static const String deployedAtFormatted = '12 Oct 2026 23:00 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
