import '../../models/medicine.dart';
import '../../models/provenance.dart';
import 'medical_ner_service.dart';

class MedicationNormalizer {
  static final Map<String, String> _brandToGenericMap = {
    'telma': 'Telmisartan',
    'telpres': 'Telmisartan',
    'glucophage': 'Metformin Hydrochloride',
    'glycomet': 'Metformin Hydrochloride',
    'pantocid': 'Pantoprazole Sodium',
    'pan 40': 'Pantoprazole Sodium',
    'augmentin': 'Amoxicillin + Clavulanate Potassium',
    'calpol': 'Paracetamol',
    'dolo 650': 'Paracetamol',
    'lipitor': 'Atorvastatin',
    'atorva': 'Atorvastatin',
  };

  static MedicineEntity normalizeDraftToEntity({
    required ExtractedMedicineDraft draft,
    required String documentId,
    required String documentName,
    bool confirmedByUser = false,
  }) {
    String generic = draft.genericName;
    final lowerName = draft.medicineName.toLowerCase();

    for (var entry in _brandToGenericMap.entries) {
      if (lowerName.contains(entry.key)) {
        generic = entry.value;
        break;
      }
    }

    if (generic.isEmpty) {
      generic = draft.medicineName;
    }

    // Determine default reminder times based on frequency
    final reminderTimes = <String>[];
    final freqLower = draft.frequency.toLowerCase();
    if (freqLower.contains('twice') || freqLower.contains('bid')) {
      reminderTimes.addAll(['08:00', '20:00']);
    } else if (freqLower.contains('thrice') || freqLower.contains('tid')) {
      reminderTimes.addAll(['08:00', '14:00', '20:00']);
    } else {
      // Once daily
      reminderTimes.add(draft.timing.toLowerCase().contains('night') ? '21:00' : '08:00');
    }

    return MedicineEntity(
      id: 'med_${DateTime.now().millisecondsSinceEpoch}',
      name: draft.medicineName,
      genericName: generic,
      dosage: draft.dosage,
      frequency: draft.frequency,
      timing: draft.timing,
      instructions: draft.instructions,
      startDate: DateTime.now(),
      isActive: true,
      isConfirmedByUser: confirmedByUser,
      reminderTimes: reminderTimes,
      provenance: confirmedByUser
          ? Provenance.documented(
              documentId: documentId,
              documentName: documentName,
              originalText: draft.rawText,
              confidence: draft.confidence,
            )
          : Provenance.requiresReview(
              documentId: documentId,
              documentName: documentName,
              originalText: draft.rawText,
              confidence: draft.confidence,
            ),
    );
  }
}
