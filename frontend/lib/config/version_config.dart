class VersionConfig {
  static const String appVersion = 'v0.12.3';
  static const String fullVersionString = 'PitchLab MVP v0.12.3';
  static const String changeId = 'PL-FIX-20261013-03';
  static const String parentChangeId = 'PL-FIX-20261012-03-CV-BASE64';
  static const String buildId = 'sr20261013a';
  static const String deployedAtFormatted = '12 Oct 2026, 21:20 GMT';

  static String get displayMarker => 'Build $appVersion | Deployed $deployedAtFormatted | $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
