import 'dart:typed_data';

class CvFileResult {
  final String name;
  final Uint8List bytes;
  final int size;

  CvFileResult({
    required this.name,
    required this.bytes,
    required this.size,
  });
}

Future<CvFileResult?> pickCvFile() async {
  throw UnsupportedError('Cannot pick CV file without platform implementation.');
}
