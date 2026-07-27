import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'cv_picker_helper_stub.dart';

Future<CvFileResult?> pickCvFile() async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
    );

    if (result == null || result.files.isEmpty) {
      return null;
    }

    final file = result.files.first;
    final bytes = file.bytes;
    if (bytes == null) {
      return null;
    }

    return CvFileResult(
      name: file.name,
      bytes: bytes,
      size: file.size,
    );
  } catch (e) {
    rethrow;
  }
}
