import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'cv_picker_helper_stub.dart';

Future<CvFileResult?> pickCvFile() async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx'],
      withData: true,
    );

    if (result == null || result.files.isEmpty) {
      return null;
    }

    final file = result.files.first;
    Uint8List? bytes = file.bytes;
    if ((bytes == null || bytes.isEmpty) && file.path != null) {
      bytes = await File(file.path!).readAsBytes();
    }

    if (bytes == null || bytes.isEmpty) {
      return null;
    }

    return CvFileResult(
      name: file.name,
      bytes: bytes,
      size: file.size,
    );
  } catch (e) {
    print('PitchLab CV Picker: Error picking file on IO: $e');
    return null;
  }
}
