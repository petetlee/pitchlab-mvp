import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';
import 'cv_picker_helper_stub.dart';

Future<CvFileResult?> pickCvFile() async {
  final completer = Completer<CvFileResult?>();

  final uploadInput = html.FileUploadInputElement();
  uploadInput.accept = '.pdf,.doc,.docx';
  uploadInput.click();

  uploadInput.onChange.listen((event) {
    final files = uploadInput.files;
    if (files == null || files.isEmpty) {
      if (!completer.isCompleted) completer.complete(null);
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final result = reader.result;
      if (result is Uint8List) {
        if (!completer.isCompleted) {
          completer.complete(CvFileResult(
            name: file.name,
            bytes: result,
            size: file.size,
          ));
        }
      } else if (result is ByteBuffer) {
        if (!completer.isCompleted) {
          completer.complete(CvFileResult(
            name: file.name,
            bytes: Uint8List.view(result),
            size: file.size,
          ));
        }
      } else {
        if (!completer.isCompleted) completer.complete(null);
      }
    });

    reader.onError.listen((event) {
      if (!completer.isCompleted) {
        completer.completeError(Exception('Failed to read selected CV file.'));
      }
    });

    reader.readAsArrayBuffer(file);
  });

  // Fallback for user cancelling file picker dialog
  html.window.onFocus.first.then((_) {
    Future.delayed(const Duration(milliseconds: 1000), () {
      if (!completer.isCompleted) {
        completer.complete(null);
      }
    });
  });

  return completer.future;
}
