import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pdf_service.dart';

void main() {
  test('Generate Nuclear Assessment PDF and Save to Disk', () async {
    final jsonFile = File('../functions/latest_nuclear_eval.json');
    expect(jsonFile.existsSync(), isTrue);

    final jsonStr = await jsonFile.readAsString();
    final Map<String, dynamic> evalData = jsonDecode(jsonStr);

    print('Building PDF bytes from evaluation data...');
    final Uint8List pdfBytes = await PdfService.buildPdfBytes(evalData);
    expect(pdfBytes.isNotEmpty, isTrue);

    final downloadsDir = Directory(r'C:\Users\petet\Downloads');
    final targetPath1 = File(r'C:\Users\petet\Downloads\PitchLab_Nuclear_Power_Plant_Reliable_Assessment_2026-10-06.pdf');
    final targetPath2 = File('../functions/PitchLab_Nuclear_Power_Plant_Reliable_Assessment_2026-10-06.pdf');

    if (downloadsDir.existsSync()) {
      await targetPath1.writeAsBytes(pdfBytes);
      print('✅ Saved to ${targetPath1.path} (${pdfBytes.length} bytes)');
    }
    await targetPath2.writeAsBytes(pdfBytes);
    print('✅ Saved to ${targetPath2.path} (${pdfBytes.length} bytes)');
  });
}
