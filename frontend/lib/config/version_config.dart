class VersionConfig {
  static const String appVersion = 'v0.12.5';
  static const String fullVersionString = 'PitchLab MVP v0.12.5';
  static const String changeId = 'PL-FIX-20261103-01';
  static const String parentChangeId = 'PL-FIX-20261030-01';
  static const String buildId = 'sr20261103a';
  static const String deployedAtFormatted = '2026-11-03 00:05 GMT (UTC+00:00)';

  static String get displayMarker => 'Build $appVersion | Deployed $deployedAtFormatted | $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
