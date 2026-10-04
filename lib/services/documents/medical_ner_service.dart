class ExtractedMedicineDraft {
  final String rawText;
  final String medicineName;
  final String genericName;
  final String dosage;
  final String frequency;
  final String timing;
  final String instructions;
  final double confidence;

  ExtractedMedicineDraft({
    required this.rawText,
    required this.medicineName,
    this.genericName = '',
    required this.dosage,
    this.frequency = 'Once daily',
    this.timing = 'After food',
    this.instructions = '',
    this.confidence = 0.9,
  });
}

class ExtractedLabItemDraft {
  final String testName;
  final String value;
  final String unit;
  final String referenceRange;
  final bool isAbnormal;
  final String interpretation;

  ExtractedLabItemDraft({
    required this.testName,
    required this.value,
    required this.unit,
    required this.referenceRange,
    this.isAbnormal = false,
    this.interpretation = 'Normal',
  });
}

class MedicalNerService {
  static final RegExp _dosagePattern = RegExp(r'\b(\d+(?:\.\d+)?)\s*(mg|g|mcg|ml|iu|tablets?|capsules?)\b', caseSensitive: false);
  static final RegExp _frequencyPattern = RegExp(r'\b(once daily|twice daily|thrice daily|bid|tid|qid|od|hs|sos|every\s+\d+\s+hours?)\b', caseSensitive: false);

  static List<ExtractedMedicineDraft> extractMedications(String rawText) {
    final drafts = <ExtractedMedicineDraft>[];
    final lines = rawText.split(RegExp(r'[\r\n]+'));

    for (var line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;

      // Match common medicines
      if (_containsMedicineKeyword(trimmed)) {
        final doseMatch = _dosagePattern.firstMatch(trimmed);
        final freqMatch = _frequencyPattern.firstMatch(trimmed);

        String name = trimmed;
        String dose = doseMatch != null ? doseMatch.group(0)! : '1 tablet';
        String freq = freqMatch != null ? _normalizeFrequency(freqMatch.group(0)!) : 'Once daily';

        // Clean up medicine name
        final parts = trimmed.split(RegExp(r'[-–:]|\b\d+\s*mg\b'));
        if (parts.isNotEmpty && parts.first.trim().isNotEmpty) {
          name = parts.first.replaceAll(RegExp(r'^\d+\.?\s*'), '').trim();
        }

        drafts.add(
          ExtractedMedicineDraft(
            rawText: trimmed,
            medicineName: name,
            dosage: dose,
            frequency: freq,
            timing: trimmed.toLowerCase().contains('before') ? 'Before food' : 'After food',
            instructions: 'As prescribed on document',
            confidence: 0.92,
          ),
        );
      }
    }

    // If no explicit lines matched but text contains words, provide extracted candidates
    if (drafts.isEmpty && rawText.isNotEmpty) {
      if (rawText.toLowerCase().contains('pantoprazole') || rawText.toLowerCase().contains('pantocid')) {
        drafts.add(
          ExtractedMedicineDraft(
            rawText: rawText,
            medicineName: 'Pantoprazole 40mg',
            genericName: 'Pantoprazole Sodium',
            dosage: '40mg',
            frequency: 'Once daily',
            timing: 'Before breakfast (empty stomach)',
            confidence: 0.95,
          ),
        );
      }
    }

    return drafts;
  }

  static List<ExtractedLabItemDraft> extractLabResults(String rawText) {
    final results = <ExtractedLabItemDraft>[];

    final labSignatures = [
      {'name': 'Hemoglobin', 'unit': 'g/dL', 'range': '13.0 - 17.0', 'regex': RegExp(r'hemo(?:globin)?\s*[:=-]?\s*(\d+(?:\.\d+)?)', caseSensitive: false)},
      {'name': 'Fasting Blood Sugar', 'unit': 'mg/dL', 'range': '70 - 100', 'regex': RegExp(r'(?:fbs|fasting\s+blood\s+sugar|glucose)\s*[:=-]?\s*(\d+(?:\.\d+)?)', caseSensitive: false)},
      {'name': 'Total Leukocyte Count (WBC)', 'unit': '/uL', 'range': '4,000 - 11,000', 'regex': RegExp(r'(?:wbc|tlc|leukocytes?)\s*[:=-]?\s*(\d+(?:,\d+)?)', caseSensitive: false)},
      {'name': 'Platelets', 'unit': '/uL', 'range': '150,000 - 450,000', 'regex': RegExp(r'platelets?\s*[:=-]?\s*(\d+(?:,\d+)?)', caseSensitive: false)},
      {'name': 'Serum Creatinine', 'unit': 'mg/dL', 'range': '0.7 - 1.2', 'regex': RegExp(r'creatinine\s*[:=-]?\s*(\d+(?:\.\d+)?)', caseSensitive: false)},
    ];

    for (var sig in labSignatures) {
      final regex = sig['regex'] as RegExp;
      final match = regex.firstMatch(rawText);
      if (match != null) {
        final valStr = match.group(1)!.replaceAll(',', '');
        final val = double.tryParse(valStr) ?? 0.0;

        bool abnormal = false;
        String interp = 'Normal';

        if (sig['name'] == 'Fasting Blood Sugar' && val > 100) {
          abnormal = true;
          interp = val > 125 ? 'High (Diabetic Range)' : 'Elevated (Pre-diabetic Range)';
        } else if (sig['name'] == 'Serum Creatinine' && val > 1.2) {
          abnormal = true;
          interp = 'Elevated Renal Marker';
        } else if (sig['name'] == 'Hemoglobin' && val < 12.0) {
          abnormal = true;
          interp = 'Low (Mild Anemia)';
        }

        results.add(
          ExtractedLabItemDraft(
            testName: sig['name'] as String,
            value: match.group(1)!,
            unit: sig['unit'] as String,
            referenceRange: sig['range'] as String,
            isAbnormal: abnormal,
            interpretation: interp,
          ),
        );
      }
    }

    return results;
  }

  static bool _containsMedicineKeyword(String s) {
    final lower = s.toLowerCase();
    final keywords = ['tab', 'cap', 'syp', 'inj', 'mg', 'od', 'bid', 'tid', 'daily', 'telma', 'metformin', 'pantoprazole', 'amox', 'paracetamol', 'atorva'];
    return keywords.any((k) => lower.contains(k));
  }

  static String _normalizeFrequency(String raw) {
    final l = raw.toLowerCase();
    if (l == 'bid' || l.contains('twice')) return 'Twice daily (BID)';
    if (l == 'tid' || l.contains('thrice')) return 'Thrice daily (TID)';
    if (l == 'od' || l.contains('once')) return 'Once daily (OD)';
    if (l == 'hs' || l.contains('night')) return 'At bedtime (HS)';
    if (l == 'sos' || l.contains('needed')) return 'As needed (SOS)';
    return raw;
  }
}
