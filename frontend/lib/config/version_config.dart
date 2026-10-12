class VersionConfig {
  static const String appVersion = 'v0.12.0';
  static const String fullVersionString = 'PitchLab MVP v0.12.0';
  static const String changeId = 'PL-20261012-CVUPLOAD-02';
  static const String parentChangeId = 'PL-20261012-HISTORY-01';
  static const String buildId = 'PL-20261012-CVUPLOAD-02';
  static const String deployedAtFormatted = '12 Oct 2026 21:10 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId • $changeId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId • $changeId';
}
