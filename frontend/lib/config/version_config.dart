class VersionConfig {
  static const String appVersion = 'v0.9.6';
  static const String fullVersionString = 'PitchLab MVP v0.9.6';
  static const String changeId = 'PL-FIX-20261006-SMARTTAX-01';
  static const String parentChangeId = 'PL-FIX-2026-10-06-MOORSAFE-INT-01';
  static const String buildId = 'ea29c17';
  static const String deployedAtFormatted = '07 Oct 2026 12:00 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
