class VersionConfig {
  static const String appVersion = 'v0.9.5';
  static const String fullVersionString = 'PitchLab MVP v0.9.5';
  static const String changeId = 'PL-FIX-20261005-v0.9.5-01-COMPLETE';
  static const String parentChangeId = 'PL-FIX-20261005-v0.9.5-01';
  static const String buildId = 'df9e473';
  static const String deployedAtFormatted = '06 Oct 2026 15:45 NZST';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
