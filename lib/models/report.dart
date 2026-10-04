import 'provenance.dart';

class LabResultItem {
  final String testName; // e.g. Hemoglobin, Fasting Blood Sugar, Creatinine
  final String value; // e.g. 14.2, 110, 0.9
  final String unit; // e.g. g/dL, mg/dL, mg/dL
  final String referenceRange; // e.g. 13.0 - 17.0
  final bool isAbnormal;
  final String interpretation; // e.g. Normal, Elevated, Critical High

  LabResultItem({
    required this.testName,
    required this.value,
    required this.unit,
    required this.referenceRange,
    this.isAbnormal = false,
    this.interpretation = 'Normal',
  });

  Map<String, dynamic> toMap() {
    return {
      'testName': testName,
      'value': value,
      'unit': unit,
      'referenceRange': referenceRange,
      'isAbnormal': isAbnormal,
      'interpretation': interpretation,
    };
  }

  factory LabResultItem.fromMap(Map<String, dynamic> map) {
    return LabResultItem(
      testName: map['testName'] ?? '',
      value: map['value'] ?? '',
      unit: map['unit'] ?? '',
      referenceRange: map['referenceRange'] ?? '',
      isAbnormal: map['isAbnormal'] ?? false,
      interpretation: map['interpretation'] ?? 'Normal',
    );
  }
}

class ReportEntity {
  final String id;
  final String title; // e.g. Complete Blood Count, Lipid Profile, Chest X-Ray
  final String type; // Lab, Radiology, Prescription, Discharge Summary
  final DateTime testDate;
  final String laboratoryOrHospital;
  final String summary; // Structured patient-friendly explanation
  final String rawOcrText;
  final List<LabResultItem> results;
  final String localFilePath;
  final Provenance provenance;

  ReportEntity({
    required this.id,
    required this.title,
    required this.type,
    required this.testDate,
    this.laboratoryOrHospital = '',
    this.summary = '',
    this.rawOcrText = '',
    this.results = const [],
    this.localFilePath = '',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'testDate': testDate.toIso8601String(),
      'laboratoryOrHospital': laboratoryOrHospital,
      'summary': summary,
      'rawOcrText': rawOcrText,
      'results': results.map((r) => r.toMap()).toList(),
      'localFilePath': localFilePath,
      'provenance': provenance.toMap(),
    };
  }

  factory ReportEntity.fromMap(Map<String, dynamic> map) {
    return ReportEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      type: map['type'] ?? 'Lab',
      testDate: map['testDate'] != null
          ? DateTime.parse(map['testDate'])
          : DateTime.now(),
      laboratoryOrHospital: map['laboratoryOrHospital'] ?? '',
      summary: map['summary'] ?? '',
      rawOcrText: map['rawOcrText'] ?? '',
      results: (map['results'] as List<dynamic>?)
              ?.map((item) => LabResultItem.fromMap(Map<String, dynamic>.from(item)))
              .toList() ??
          [],
      localFilePath: map['localFilePath'] ?? '',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
