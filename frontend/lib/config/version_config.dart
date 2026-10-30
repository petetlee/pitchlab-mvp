class VersionConfig {
  static const String appVersion = 'v0.12.4';
  static const String fullVersionString = 'PitchLab MVP v0.12.4';
  static const String changeId = 'PL-FIX-20261030-01';
  static const String parentChangeId = 'PL-FIX-20261013-03';
  static const String buildId = 'sr20261030a';
  static const String deployedAtFormatted = '2026-10-30 10:30 GMT (UTC+00:00)';

  static String get displayMarker => 'Build $appVersion | Deployed $deployedAtFormatted | $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
