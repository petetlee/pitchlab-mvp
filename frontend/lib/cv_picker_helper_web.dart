import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';
import 'cv_picker_helper_stub.dart';

Future<CvFileResult?> pickCvFile() async {
  try {
    final completer = Completer<CvFileResult?>();

    final uploadInput = html.FileUploadInputElement();
    uploadInput.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    uploadInput.multiple = false;

    StreamSubscription? focusSub;

    void cleanup() {
      focusSub?.cancel();
    }

    uploadInput.onChange.listen((event) {
      final files = uploadInput.files;
      if (files == null || files.isEmpty) {
        if (!completer.isCompleted) {
          completer.complete(null);
        }
        cleanup();
        return;
      }

      final file = files[0];
      final reader = html.FileReader();

      reader.onLoadEnd.listen((event) {
        if (!completer.isCompleted) {
          if (reader.result != null) {
            final rawResult = reader.result;
            Uint8List? bytes;
            if (rawResult is Uint8List) {
              bytes = rawResult;
            } else if (rawResult is ByteBuffer) {
              bytes = rawResult.asUint8List();
            } else if (rawResult is List<int>) {
              bytes = Uint8List.fromList(rawResult);
            }

            if (bytes != null && bytes.isNotEmpty) {
              completer.complete(CvFileResult(
                name: file.name,
                bytes: bytes,
                size: file.size,
              ));
            } else {
              completer.complete(null);
            }
          } else {
            completer.complete(null);
          }
        }
        cleanup();
      });

      reader.onError.listen((event) {
        if (!completer.isCompleted) {
          completer.complete(null);
        }
        cleanup();
      });

      reader.readAsArrayBuffer(file);
    });

    focusSub = html.window.onFocus.listen((_) {
      Future.delayed(const Duration(milliseconds: 500), () {
        if (!completer.isCompleted) {
          if (uploadInput.files == null || uploadInput.files!.isEmpty) {
            completer.complete(null);
            cleanup();
          }
        }
      });
    });

    uploadInput.click();

    return completer.future;
  } catch (e) {
    print('PitchLab CV Picker: Error picking file on web: $e');
    return null;
  }
}
