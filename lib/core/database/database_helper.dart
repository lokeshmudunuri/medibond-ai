import 'dart:async';
import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import '../resources/storage_paths.dart';
import '../security/sanitized_logger.dart';

class DatabaseHelper {
  static const String _tag = 'DatabaseHelper';
  static const String _dbName = 'carebond_health_core.db';
  static const int _dbVersion = 1;

  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    if (Platform.environment.containsKey('FLUTTER_TEST')) {
      throw UnsupportedError('Test environment: Using in-memory fallback');
    }
    await StoragePaths.initialize();
    final dbPath = p.join(StoragePaths.databaseDir.path, _dbName);
    SanitizedLogger.info(_tag, 'Initializing Health Database at: $dbPath');

    return await openDatabase(
      dbPath,
      version: _dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    SanitizedLogger.info(_tag, 'Creating CareBond Core Health schema tables...');

    await db.execute('''
      CREATE TABLE patient (
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        gender TEXT,
        bloodGroup TEXT,
        heightCm REAL,
        weightKg REAL,
        emergencyContactName TEXT,
        emergencyContactPhone TEXT,
        preferredLanguage TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE conditions (
        id TEXT PRIMARY KEY,
        name TEXT,
        icdOrCategory TEXT,
        diagnosedDate TEXT,
        status TEXT,
        notes TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE allergies (
        id TEXT PRIMARY KEY,
        allergen TEXT,
        reaction TEXT,
        severity TEXT,
        identifiedDate TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE medicines (
        id TEXT PRIMARY KEY,
        name TEXT,
        genericName TEXT,
        dosage TEXT,
        form TEXT,
        frequency TEXT,
        timing TEXT,
        instructions TEXT,
        startDate TEXT,
        endDate TEXT,
        isActive INTEGER,
        isConfirmedByUser INTEGER,
        reminderTimes TEXT,
        prescribedForCondition TEXT,
        prescribingDoctor TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        type TEXT,
        testDate TEXT,
        laboratoryOrHospital TEXT,
        summary TEXT,
        rawOcrText TEXT,
        results TEXT,
        localFilePath TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE procedures (
        id TEXT PRIMARY KEY,
        name TEXT,
        procedureDate TEXT,
        hospital TEXT,
        surgeon TEXT,
        notes TEXT,
        recoveryStatus TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE symptoms (
        id TEXT PRIMARY KEY,
        symptom TEXT,
        severity INTEGER,
        location TEXT,
        loggedAt TEXT,
        notes TEXT,
        isTriggerForAlert INTEGER,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE doctor_instructions (
        id TEXT PRIMARY KEY,
        title TEXT,
        instruction TEXT,
        category TEXT,
        givenDate TEXT,
        doctorName TEXT,
        isCompleted INTEGER,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE recovery_plans (
        id TEXT PRIMARY KEY,
        title TEXT,
        procedureName TEXT,
        startDate TEXT,
        targetDurationDays INTEGER,
        currentPhase TEXT,
        milestones TEXT,
        targetDailySteps REAL,
        targetRestHours REAL,
        isActive INTEGER,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE check_ins (
        id TEXT PRIMARY KEY,
        checkInDate TEXT,
        painScore INTEGER,
        fatigueScore INTEGER,
        moodScore INTEGER,
        sleepHours REAL,
        tookAllMedications INTEGER,
        reportedSymptoms TEXT,
        patientSpokenTranscript TEXT,
        adaptiveFollowUpQuestion TEXT,
        adaptiveFollowUpAnswer TEXT,
        clinicianNotes TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE sensor_observations (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        sensorType TEXT,
        value REAL,
        rawX REAL,
        rawY REAL,
        rawZ REAL,
        unit TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE personal_baselines (
        id TEXT PRIMARY KEY,
        metricName TEXT UNIQUE,
        baselineMean REAL,
        stdDevOrMAD REAL,
        cusumHigh REAL,
        cusumLow REAL,
        sampleCount INTEGER,
        lastUpdated TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE alerts (
        id TEXT PRIMARY KEY,
        title TEXT,
        metricOrSource TEXT,
        observedValue REAL,
        baselineValue REAL,
        deviation REAL,
        severity TEXT,
        explanation TEXT,
        recommendedAction TEXT,
        timestamp TEXT,
        isAcknowledged INTEGER,
        isCaregiverEscalated INTEGER,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE timeline_events (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        eventType TEXT,
        eventDate TEXT,
        relatedEntityId TEXT,
        relatedEntityType TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE gene_drug_flags (
        id TEXT PRIMARY KEY,
        gene TEXT,
        variantOrPhenotype TEXT,
        affectedDrug TEXT,
        clinicalImplication TEXT,
        recommendationLevel TEXT,
        provenance TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT,
        role TEXT,
        content TEXT,
        timestamp TEXT,
        modelName TEXT,
        languageCode TEXT,
        suggestedActionType TEXT,
        suggestedActionPayload TEXT
      )
    ''');
  }

  Future<void> close() async {
    final db = _db;
    if (db != null) {
      await db.close();
      _db = null;
    }
  }
}
