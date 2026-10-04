import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import '../security/sanitized_logger.dart';

class StoragePaths {
  static const String _tag = 'StoragePaths';

  static Directory? _rootDir;

  static Future<void> initialize() async {
    if (Platform.environment.containsKey('FLUTTER_TEST')) {
      _rootDir = Directory(p.join(Directory.current.path, 'CareBond_Storage'));
      await _ensureSubdirs();
      return;
    }
    try {
      final appDocDir = await getApplicationDocumentsDirectory();
      _rootDir = Directory(p.join(appDocDir.path, 'CareBond'));

      // Ensure all distinct folder structures exist
      await _ensureSubdirs();
      SanitizedLogger.info(_tag, 'Storage paths initialized at: ${_rootDir!.path}');
    } catch (e) {
      // Fallback for tests / non-android headless environments
      _rootDir = Directory(p.join(Directory.current.path, 'CareBond_Storage'));
      await _ensureSubdirs();
      SanitizedLogger.info(_tag, 'Storage paths fallback initialized at: ${_rootDir!.path}');
    }
  }

  static Future<void> _ensureSubdirs() async {
    if (_rootDir == null) return;
    final subdirs = [
      modelsVoiceDir,
      modelsOcrDir,
      modelsNerDir,
      modelsReasoningDir,
      modelsTtsDir,
      knowledgeDir,
      safetyDir,
      databaseDir,
      medicalDocsDir,
      cacheDir,
      metadataDir,
    ];

    for (var dir in subdirs) {
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
    }
  }

  static Directory get rootDir => _rootDir ?? Directory(p.join(Directory.current.path, 'CareBond_Storage'));
  static Directory get modelsDir => Directory(p.join(rootDir.path, 'models'));
  static Directory get modelsVoiceDir => Directory(p.join(rootDir.path, 'models', 'voice'));
  static Directory get modelsOcrDir => Directory(p.join(rootDir.path, 'models', 'ocr'));
  static Directory get modelsNerDir => Directory(p.join(rootDir.path, 'models', 'medical_ner'));
  static Directory get modelsReasoningDir => Directory(p.join(rootDir.path, 'models', 'medical_reasoning'));
  static Directory get modelsTtsDir => Directory(p.join(rootDir.path, 'models', 'tts'));
  static Directory get knowledgeDir => Directory(p.join(rootDir.path, 'knowledge'));
  static Directory get safetyDir => Directory(p.join(rootDir.path, 'safety'));
  static Directory get databaseDir => Directory(p.join(rootDir.path, 'database'));
  static Directory get medicalDocsDir => Directory(p.join(rootDir.path, 'medical_documents'));
  static Directory get cacheDir => Directory(p.join(rootDir.path, 'cache'));
  static Directory get metadataDir => Directory(p.join(rootDir.path, 'metadata'));

  static Future<int> calculateTotalModelStorageBytes() async {
    int total = 0;
    if (await modelsDir.exists()) {
      await for (final file in modelsDir.list(recursive: true, followLinks: false)) {
        if (file is File) {
          total += await file.length();
        }
      }
    }
    return total;
  }

  static Future<int> calculateMedicalDocsStorageBytes() async {
    int total = 0;
    if (await medicalDocsDir.exists()) {
      await for (final file in medicalDocsDir.list(recursive: true, followLinks: false)) {
        if (file is File) {
          total += await file.length();
        }
      }
    }
    return total;
  }

  static Future<void> clearTempOcrCache() async {
    if (await cacheDir.exists()) {
      await for (final file in cacheDir.list(recursive: false, followLinks: false)) {
        try {
          if (file is File) {
            await file.delete();
          }
        } catch (_) {}
      }
    }
  }
}
