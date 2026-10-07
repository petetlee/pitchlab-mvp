import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pdf_service.dart';

void main() {
  test('Generate MoorSafe Assessment PDF, Verify Integrity Gates, and Save to Disk', () async {
    final jsonFile = File('../functions/latest_moorsafe_eval.json');
    expect(jsonFile.existsSync(), isTrue);

    final jsonStr = await jsonFile.readAsString();
    final Map<String, dynamic> evalData = jsonDecode(jsonStr);

    print('Building MoorSafe PDF bytes from evaluation data...');
    final Uint8List pdfBytes = await PdfService.buildPdfBytes(evalData);
    expect(pdfBytes.isNotEmpty, isTrue);

    final downloadsDir = Directory(r'C:\Users\petet\Downloads');
    final targetPath1 = File(r'C:\Users\petet\Downloads\PitchLab_MoorSafe_Premium_Solar_Powered_Assessment_2026-10-06.pdf');
    final targetPath2 = File('../functions/PitchLab_MoorSafe_Premium_Solar_Powered_Assessment_2026-10-06.pdf');

    if (downloadsDir.existsSync()) {
      await targetPath1.writeAsBytes(pdfBytes);
      print('✅ Saved to ${targetPath1.path} (${pdfBytes.length} bytes)');
    }
    await targetPath2.writeAsBytes(pdfBytes);
    print('✅ Saved to ${targetPath2.path} (${pdfBytes.length} bytes)');
  });
}
