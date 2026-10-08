class VersionConfig {
  static const String appVersion = 'v0.9.7';
  static const String fullVersionString = 'PitchLab MVP v0.9.7';
  static const String changeId = 'PL-FIX-20261008-V0.9.7-LERIDE-SEMANTIC-INTEGRITY';
  static const String parentChangeId = 'PL-FIX-2026-10-06-MOORSAFE-INT-01';
  static const String buildId = '29b508e';
  static const String deployedAtFormatted = '08 Oct 2026 13:30 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
