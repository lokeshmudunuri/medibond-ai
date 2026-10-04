import '../../models/provenance.dart';
import '../../models/report.dart';
import 'medical_ner_service.dart';

class ReportAnalyzer {
  static ReportEntity analyzeRawReportText({
    required String documentId,
    required String title,
    required String rawText,
    String hospital = 'Diagnostic Center',
  }) {
    final labDrafts = MedicalNerService.extractLabResults(rawText);

    final labItems = labDrafts.map((d) {
      return LabResultItem(
        testName: d.testName,
        value: d.value,
        unit: d.unit,
        referenceRange: d.referenceRange,
        isAbnormal: d.isAbnormal,
        interpretation: d.interpretation,
      );
    }).toList();

    // Generate clear structured patient summary
    final abnormalCount = labItems.where((i) => i.isAbnormal).length;
    String summary;
    if (abnormalCount == 0) {
      summary = 'All extracted lab markers are within normal clinical reference ranges.';
    } else {
      final abnormalNames = labItems.where((i) => i.isAbnormal).map((i) => '${i.testName} (${i.interpretation})').join(', ');
      summary = '$abnormalCount parameter(s) flagged outside standard range: $abnormalNames. Discuss these findings during your next clinical follow-up.';
    }

    return ReportEntity(
      id: documentId,
      title: title,
      type: 'Lab',
      testDate: DateTime.now(),
      laboratoryOrHospital: hospital,
      summary: summary,
      rawOcrText: rawText,
      results: labItems,
      provenance: Provenance.documented(
        documentId: documentId,
        documentName: title,
        originalText: rawText,
        confidence: 0.94,
      ),
    );
  }
}
