import 'provenance.dart';

class GeneDrugSafetyFlag {
  final String gene; // e.g. CYP2C19, CYP2D6, HLA-B*1502, TPMT
  final String variantOrPhenotype; // e.g. *2/*2 (Poor Metabolizer)
  final String affectedDrug; // e.g. Clopidogrel, Codeine, Carbamazepine, Azathioprine
  final String clinicalImplication; // e.g. Reduced activation of Clopidogrel -> alternative antiplatelet recommended
  final String recommendationLevel; // Informational / Clinician Review
  final Provenance provenance;

  GeneDrugSafetyFlag({
    required this.gene,
    required this.variantOrPhenotype,
    required this.affectedDrug,
    required this.clinicalImplication,
    this.recommendationLevel = 'Requires Clinician Review',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'gene': gene,
      'variantOrPhenotype': variantOrPhenotype,
      'affectedDrug': affectedDrug,
      'clinicalImplication': clinicalImplication,
      'recommendationLevel': recommendationLevel,
      'provenance': provenance.toMap(),
    };
  }

  factory GeneDrugSafetyFlag.fromMap(Map<String, dynamic> map) {
    return GeneDrugSafetyFlag(
      gene: map['gene'] ?? '',
      variantOrPhenotype: map['variantOrPhenotype'] ?? '',
      affectedDrug: map['affectedDrug'] ?? '',
      clinicalImplication: map['clinicalImplication'] ?? '',
      recommendationLevel: map['recommendationLevel'] ?? 'Requires Clinician Review',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
