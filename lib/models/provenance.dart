enum ProvenanceSource {
  documented,
  userReported,
  systemDetected,
  requiresReview,
  urgentEscalation,
}

extension ProvenanceSourceExtension on ProvenanceSource {
  String get displayName {
    switch (this) {
      case ProvenanceSource.documented:
        return 'Documented (Clinical)';
      case ProvenanceSource.userReported:
        return 'User-Reported';
      case ProvenanceSource.systemDetected:
        return 'System-Detected';
      case ProvenanceSource.requiresReview:
        return 'Requires Review';
      case ProvenanceSource.urgentEscalation:
        return 'Urgent Escalation';
    }
  }

  String get shortCode {
    switch (this) {
      case ProvenanceSource.documented:
        return 'DOC';
      case ProvenanceSource.userReported:
        return 'USER';
      case ProvenanceSource.systemDetected:
        return 'SYS';
      case ProvenanceSource.requiresReview:
        return 'REVIEW';
      case ProvenanceSource.urgentEscalation:
        return 'URGENT';
    }
  }
}

class Provenance {
  final ProvenanceSource source;
  final String? documentId;
  final String? documentName;
  final String? originalText;
  final double confidence;
  final DateTime recordedAt;

  const Provenance({
    required this.source,
    this.documentId,
    this.documentName,
    this.originalText,
    this.confidence = 1.0,
    required this.recordedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'source': source.name,
      'documentId': documentId,
      'documentName': documentName,
      'originalText': originalText,
      'confidence': confidence,
      'recordedAt': recordedAt.toIso8601String(),
    };
  }

  factory Provenance.fromMap(Map<String, dynamic> map) {
    return Provenance(
      source: ProvenanceSource.values.firstWhere(
        (e) => e.name == map['source'],
        orElse: () => ProvenanceSource.userReported,
      ),
      documentId: map['documentId'],
      documentName: map['documentName'],
      originalText: map['originalText'],
      confidence: (map['confidence'] as num?)?.toDouble() ?? 1.0,
      recordedAt: map['recordedAt'] != null 
          ? DateTime.parse(map['recordedAt']) 
          : DateTime.now(),
    );
  }

  factory Provenance.userReported() {
    return Provenance(
      source: ProvenanceSource.userReported,
      confidence: 1.0,
      recordedAt: DateTime.now(),
    );
  }

  factory Provenance.systemDetected() {
    return Provenance(
      source: ProvenanceSource.systemDetected,
      confidence: 0.95,
      recordedAt: DateTime.now(),
    );
  }

  factory Provenance.documented({String? documentId, String? documentName, String? originalText, double confidence = 0.95}) {
    return Provenance(
      source: ProvenanceSource.documented,
      documentId: documentId,
      documentName: documentName,
      originalText: originalText,
      confidence: confidence,
      recordedAt: DateTime.now(),
    );
  }

  factory Provenance.requiresReview({String? documentId, String? documentName, String? originalText, double confidence = 0.65}) {
    return Provenance(
      source: ProvenanceSource.requiresReview,
      documentId: documentId,
      documentName: documentName,
      originalText: originalText,
      confidence: confidence,
      recordedAt: DateTime.now(),
    );
  }
}
