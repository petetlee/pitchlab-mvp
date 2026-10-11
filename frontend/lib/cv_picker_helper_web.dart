import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';
import 'cv_picker_helper_stub.dart';

Future<CvFileResult?> pickCvFile() async {
  try {
    final completer = Completer<CvFileResult?>();

    final uploadInput = html.FileUploadInputElement();
    // Use clear extension list for iOS Safari Files app / iCloud Drive compatibility
    uploadInput.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    uploadInput.multiple = false;

    // Attach to DOM off-screen: WebKit on iOS Safari requires input attachment to prevent garbage collection
    uploadInput.style.position = 'fixed';
    uploadInput.style.top = '-1000px';
    uploadInput.style.left = '-1000px';
    uploadInput.style.opacity = '0';
    html.document.body?.append(uploadInput);

    void cleanup() {
      try {
        uploadInput.remove();
      } catch (_) {}
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

    // Native cancel event supported in modern browsers including iOS Safari 16+
    uploadInput.addEventListener('cancel', (event) {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (!completer.isCompleted) {
          completer.complete(null);
          cleanup();
        }
      });
    });

    // Directly click inside synchronous gesture stack
    uploadInput.click();

    return completer.future;
  } catch (e) {
    print('PitchLab CV Picker: Error picking file on web: $e');
    return null;
  }
}
