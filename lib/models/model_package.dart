enum ModelFeatureCategory {
  vad,
  stt,
  ocr,
  pharmaNer,
  medicalNer,
  gemmaCompanion,
  medicalReasoningMedGemma,
  tts,
  medicalKb,
  safetyEngine,
}

enum ModelInstallStatus {
  notInstalled, // Available
  downloading,
  verifying,
  installed,
  corrupted,
  missing,
  error,
}

enum DeviceProfileTarget {
  essential4GB, // 4GB profile
  advanced6GB, // 6GB+ profile
  universal, // All profiles
}

class ModelPackageEntity {
  final String modelId;
  final String displayName;
  final ModelFeatureCategory feature;
  final String version;
  final String language; // e.g. 'en', 'hi', 'te', 'kn', 'ta', 'mr', 'universal'
  final int sizeBytes;
  final String expectedChecksumSha256;
  final String localRelativePath;
  final DeviceProfileTarget targetProfile;
  final bool isRequiredForCore;
  final String downloadSource;
  final String format;
  final String runtime;
  final String license;

  ModelInstallStatus status;
  double downloadProgress; // 0.0 to 1.0
  int bytesDownloaded;
  String? errorMessage;
  DateTime? installedAt;
  bool isVerified;

  ModelPackageEntity({
    required this.modelId,
    required this.displayName,
    required this.feature,
    required this.version,
    this.language = 'universal',
    required this.sizeBytes,
    required this.expectedChecksumSha256,
    required this.localRelativePath,
    this.targetProfile = DeviceProfileTarget.universal,
    this.isRequiredForCore = false,
    this.downloadSource = 'https://huggingface.co/google/medgemma-4b-it',
    this.format = 'LiteRT/ONNX',
    this.runtime = 'Direct CPU / NNAPI',
    this.license = 'Apache-2.0 / Health Open Access',
    this.status = ModelInstallStatus.notInstalled,
    this.downloadProgress = 0.0,
    this.bytesDownloaded = 0,
    this.errorMessage,
    this.installedAt,
    this.isVerified = false,
  });

  String get formattedSize {
    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    } else if (sizeBytes < 1024 * 1024 * 1024) {
      return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(sizeBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'modelId': modelId,
      'displayName': displayName,
      'feature': feature.name,
      'version': version,
      'language': language,
      'sizeBytes': sizeBytes,
      'expectedChecksumSha256': expectedChecksumSha256,
      'localRelativePath': localRelativePath,
      'targetProfile': targetProfile.name,
      'isRequiredForCore': isRequiredForCore ? 1 : 0,
      'status': status.name,
      'downloadProgress': downloadProgress,
      'errorMessage': errorMessage,
      'installedAt': installedAt?.toIso8601String(),
    };
  }

  factory ModelPackageEntity.fromMap(Map<String, dynamic> map) {
    return ModelPackageEntity(
      modelId: map['modelId'] ?? '',
      displayName: map['displayName'] ?? '',
      feature: ModelFeatureCategory.values.firstWhere(
        (e) => e.name == map['feature'],
        orElse: () => ModelFeatureCategory.gemmaCompanion,
      ),
      version: map['version'] ?? '1.0.0',
      language: map['language'] ?? 'universal',
      sizeBytes: map['sizeBytes'] ?? 0,
      expectedChecksumSha256: map['expectedChecksumSha256'] ?? '',
      localRelativePath: map['localRelativePath'] ?? '',
      targetProfile: DeviceProfileTarget.values.firstWhere(
        (e) => e.name == map['targetProfile'],
        orElse: () => DeviceProfileTarget.universal,
      ),
      isRequiredForCore: map['isRequiredForCore'] == 1 || map['isRequiredForCore'] == true,
      status: ModelInstallStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => ModelInstallStatus.notInstalled,
      ),
      downloadProgress: (map['downloadProgress'] as num?)?.toDouble() ?? 0.0,
      errorMessage: map['errorMessage'],
      installedAt: map['installedAt'] != null ? DateTime.parse(map['installedAt']) : null,
    );
  }
}
