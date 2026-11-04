class VersionConfig {
  static const String appVersion = 'v0.12.6';
  static const String fullVersionString = 'PitchLab MVP v0.12.6';
  static const String changeId = 'PL-FIX-20261104-02';
  static const String parentChangeId = 'PL-FIX-20261103-01';
  static const String buildId = 'sr20261104a';
  static const String deployedAtFormatted = '2026-11-04 08:50 GMT (UTC+00:00)';

  static String get displayMarker => 'Build $appVersion | Deployed $deployedAtFormatted | $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
