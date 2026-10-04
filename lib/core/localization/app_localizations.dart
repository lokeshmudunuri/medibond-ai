import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppLanguage {
  english,
  hindi,
  telugu,
  kannada,
  tamil,
  marathi,
}

extension AppLanguageExtension on AppLanguage {
  String get code {
    switch (this) {
      case AppLanguage.english:
        return 'en';
      case AppLanguage.hindi:
        return 'hi';
      case AppLanguage.telugu:
        return 'te';
      case AppLanguage.kannada:
        return 'kn';
      case AppLanguage.tamil:
        return 'ta';
      case AppLanguage.marathi:
        return 'mr';
    }
  }

  String get nativeName {
    switch (this) {
      case AppLanguage.english:
        return 'English';
      case AppLanguage.hindi:
        return 'हिन्दी';
      case AppLanguage.telugu:
        return 'తెలుగు';
      case AppLanguage.kannada:
        return 'ಕನ್ನಡ';
      case AppLanguage.tamil:
        return 'தமிழ்';
      case AppLanguage.marathi:
        return 'मराठी';
    }
  }

  String get englishName {
    switch (this) {
      case AppLanguage.english:
        return 'English';
      case AppLanguage.hindi:
        return 'Hindi';
      case AppLanguage.telugu:
        return 'Telugu';
      case AppLanguage.kannada:
        return 'Kannada';
      case AppLanguage.tamil:
        return 'Tamil';
      case AppLanguage.marathi:
        return 'Marathi';
    }
  }
}

class LanguageManager extends ChangeNotifier {
  static final LanguageManager _instance = LanguageManager._internal();
  factory LanguageManager() => _instance;
  LanguageManager._internal();

  AppLanguage _currentLanguage = AppLanguage.english;
  AppLanguage get currentLanguage => _currentLanguage;

  static const String _prefKey = 'carebond_selected_language';

  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedCode = prefs.getString(_prefKey);
      if (savedCode != null) {
        _currentLanguage = AppLanguage.values.firstWhere(
          (l) => l.code == savedCode,
          orElse: () => AppLanguage.english,
        );
      }
    } catch (_) {}
    notifyListeners();
  }

  Future<void> setLanguage(AppLanguage language) async {
    _currentLanguage = language;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, language.code);
    } catch (_) {}
    notifyListeners();
  }
}

class AppLocalizations {
  final AppLanguage language;
  AppLocalizations(this.language);

  static AppLocalizations of(BuildContext context) {
    return AppLocalizations(LanguageManager().currentLanguage);
  }

  static final Map<String, Map<String, String>> _localizedStrings = {
    // English
    'en': {
      'appName': 'CareBond AI',
      'appSubtitle': 'Offline Personal Health & Recovery Companion',
      'tabToday': 'Today',
      'tabHealth': 'Health',
      'tabRecovery': 'Recovery',
      'tabDocuments': 'Documents',
      'tabDoctor': 'Doctor',
      'tabSettings': 'Settings',

      // Onboarding
      'onboardingTitle': 'Welcome to CareBond AI',
      'onboardingDesc': 'Your secure, 100% on-device personal health companion and surgical recovery monitor.',
      'selectLanguage': 'Select Preferred Language',
      'deviceScanTitle': 'Hardware Capability Scanner',
      'profileType': 'Profile Setup Mode',
      'cleanSlate': 'Clean Slate Mode',
      'cleanSlateDesc': 'Start fresh with an empty, secure personal health record.',
      'samplePatient': 'Sample Patient Mode (Demo)',
      'samplePatientDesc': 'Evaluate with preloaded post-cardiac longitudinal recovery history.',
      'getStarted': 'Get Started',

      // Today Screen
      'todayTitle': 'Today\'s Overview',
      'todayRecoveryIndex': 'Recovery Health Index',
      'todayStatusGood': 'Recovery On Track',
      'todayStatusModerate': 'Moderate Deviation Detected',
      'todayStatusAttention': 'Clinical Attention Advised',
      'todayMedsTitle': 'Scheduled Medications',
      'todayNoMeds': 'No medications scheduled for today.',
      'todayCheckInTitle': 'Daily Recovery Check-In',
      'todayCheckInCompleted': 'Check-in completed for today',
      'todayCheckInPending': 'Daily check-in pending',
      'actionTalk': 'Talk to CareBond',
      'actionScanPrescription': 'Scan Prescription',
      'actionScanReport': 'Scan Report / Discharge',
      'actionCheckIn': 'Log Check-In',
      'actionWhatCanIEat': 'What Can I Eat?',
      'foodGuidanceTitle': 'Personalized Food & Nutrition Guidance',
      'foodGuidanceSubtitle': 'General educational dietary advice based on your recorded conditions and medicines',

      // Health Screen
      'healthTitle': 'Personal Health Record',
      'conditions': 'Diagnosed Conditions',
      'medicines': 'Current Medications',
      'allergies': 'Documented Allergies',
      'proceduresAndLabs': 'Procedures & Labs',
      'timeline': 'Health Timeline',
      'genomics': 'Genomics & PGx',
      'noConditions': 'No chronic health conditions documented.',
      'noMedicines': 'No medications currently documented.',
      'noAllergies': 'No known allergies documented.',
      'addRecord': '+ Add Record',

      // Recovery Screen
      'recoveryTitle': 'Recovery Engine & Sensor Monitor',
      'recoveryPlan': 'Active Recovery Protocol',
      'recoveryActiveProtocol': 'Active Protocol',
      'recoveryMetrics': 'Live Kinematic & Biometric Streams',
      'recoveryBaseline': 'Personal Recovery Baselines',
      'recoveryAlerts': 'Explainable Recovery Alerts',
      'noAlerts': 'No active recovery deviations detected.',
      'startRecovery': 'Setup Recovery Protocol',
      'liveSampling': 'Live Sampling Active',
      'sensorsStopped': 'Sensors Suspended',

      // Documents Screen
      'documentsTitle': 'Medical Documents & OCR',
      'takePhoto': 'Take Photo',
      'uploadFile': 'Upload File / Image',
      'scanPrescription': 'Prescription',
      'scanReport': 'Diagnostic Report',
      'scanDischarge': 'Discharge Summary',
      'noDocuments': 'No medical records digitized yet.',
      'documentConfirmation': 'Structured Document Review',
      'saveToHealthMemory': 'Confirm & Save to Health Memory',

      // Doctor Screen
      'doctorHandoffTitle': 'Clinical Doctor Handoff Dossier',
      'generateHandoff': 'Generate Clinical Summary',
      'copyDossier': 'Copy Dossier to Clipboard',
      'handoffDisclaimer': 'Generated 100% on-device for clinical review. No cloud transmission.',

      // Resource Manager
      'resourceManagerTitle': 'Offline Resource & Model Manager',
      'installedModels': 'Installed Models',
      'availableModels': 'Available Offline Packages',
      'download': 'Download',
      'installed': 'Installed & Verified',
      'verifying': 'Verifying SHA-256...',
      'downloading': 'Downloading...',
    },

    // Hindi (हिन्दी)
    'hi': {
      'appName': 'केयरबॉन्ड AI (CareBond)',
      'appSubtitle': 'ऑफलाइन व्यक्तिगत स्वास्थ्य और रिकवरी सहायक',
      'tabToday': 'आज (Today)',
      'tabHealth': 'स्वास्थ्य (Health)',
      'tabRecovery': 'रिकवरी (Recovery)',
      'tabDocuments': 'दस्तावेज़ (Docs)',
      'tabDoctor': 'डॉक्टर (Doctor)',
      'tabSettings': 'सेटिंग्स (Settings)',

      'onboardingTitle': 'केयरबॉन्ड AI में आपका स्वागत है',
      'onboardingDesc': 'आपका 100% सुरक्षित और ऑफलाइन ऑन-डिवाइस व्यक्तिगत स्वास्थ्य व रिकवरी साथी।',
      'selectLanguage': 'पसंदीदा भाषा चुनें',
      'deviceScanTitle': 'डिवाइस क्षमता स्कैनर',
      'profileType': 'प्रोफ़ाइल सेटअप मोड',
      'cleanSlate': 'नया रिकॉर्ड (Clean Slate)',
      'cleanSlateDesc': 'शून्य डेटा के साथ सुरक्षित और नया स्वास्थ्य रिकॉर्ड शुरू करें।',
      'samplePatient': 'नमूना रोगी (Sample Patient Demo)',
      'samplePatientDesc': 'पूर्व-लोड किए गए रिकवरी इतिहास के साथ ऐप का परीक्षण करें।',
      'getStarted': 'आरंभ करें',

      'todayTitle': 'आज का अवलोकन',
      'todayRecoveryIndex': 'रिकवरी स्वास्थ्य सूचकांक',
      'todayStatusGood': 'रिकवरी सामान्य है',
      'todayStatusModerate': 'मध्यम अंतर देखा गया',
      'todayStatusAttention': 'डॉक्टर से परामर्श की सलाह',
      'todayMedsTitle': 'आज की निर्धारित दवाएं',
      'todayNoMeds': 'आज के लिए कोई दवा निर्धारित नहीं है।',
      'todayCheckInTitle': 'दैनिक रिकवरी चेक-इन',
      'todayCheckInCompleted': 'आज का चेक-इन पूरा हुआ',
      'todayCheckInPending': 'आज का चेक-इन बाकी है',
      'actionTalk': 'केयरबॉन्ड से बात करें',
      'actionScanPrescription': 'पर्चा स्कैन करें',
      'actionScanReport': 'रिपोर्ट / डिस्चार्ज सारांश',
      'actionCheckIn': 'चेक-इन दर्ज करें',
      'actionWhatCanIEat': 'मैं क्या खा सकता हूँ?',
      'foodGuidanceTitle': 'व्यक्तिगत आहार और पोषण मार्गदर्शन',
      'foodGuidanceSubtitle': 'आपकी दर्ज बीमारियों और दवाओं पर आधारित शैक्षिक आहार सलाह',

      'healthTitle': 'व्यक्तिगत स्वास्थ्य रिकॉर्ड',
      'conditions': 'दर्ज स्वास्थ्य स्थितियां',
      'medicines': 'वर्तमान दवाएं',
      'allergies': 'दर्ज एलर्जी',
      'proceduresAndLabs': 'प्रक्रियाएं और लैब जांच',
      'timeline': 'स्वास्थ्य समयरेखा (Timeline)',
      'genomics': 'जीनोमिक्स और PGx',
      'noConditions': 'कोई पुरानी बीमारी दर्ज नहीं है।',
      'noMedicines': 'कोई दवा दर्ज नहीं है।',
      'noAllergies': 'कोई एलर्जी दर्ज नहीं है।',
      'addRecord': '+ रिकॉर्ड जोड़ें',

      'recoveryTitle': 'रिकवरी इंजन और सेंसर मॉनिटर',
      'recoveryPlan': 'सक्रिय रिकवरी प्रोटोकॉल',
      'recoveryActiveProtocol': 'सक्रिय प्रोटोकॉल',
      'recoveryMetrics': 'लाइव सेंसर गतिविधि',
      'recoveryBaseline': 'व्यक्तिगत बेसलाइन',
      'recoveryAlerts': 'स्पष्ट रिकवरी अलर्ट',
      'noAlerts': 'कोई असामान्य विचलन नहीं पाया गया।',
      'startRecovery': 'रिकवरी प्रोटोकॉल सेट करें',
      'liveSampling': 'लाइव सेंसर सक्रिय',
      'sensorsStopped': 'सेंसर रोके गए',

      'documentsTitle': 'चिकित्सा दस्तावेज़ और OCR',
      'takePhoto': 'फोटो लें (कैमरा)',
      'uploadFile': 'फ़ाइल / छवि अपलोड करें',
      'scanPrescription': 'प्रिस्क्रिप्शन (पर्चा)',
      'scanReport': 'जांच रिपोर्ट',
      'scanDischarge': 'डिस्चार्ज सारांश',
      'noDocuments': 'कोई दस्तावेज़ स्कैन नहीं किया गया है।',
      'documentConfirmation': 'दस्तावेज़ की संरचित समीक्षा',
      'saveToHealthMemory': 'सत्यापित करें और सहेजें',

      'doctorHandoffTitle': 'डॉक्टर परामर्श सारांश (Handoff)',
      'generateHandoff': 'क्लिनिकल सारांश बनाएं',
      'copyDossier': 'क्लिपबोर्ड पर कॉपी करें',
      'handoffDisclaimer': 'चिकित्सकीय समीक्षा हेतु 100% ऑन-डिवाइस तैयार किया गया। कोई क्लाउड डेटा ट्रांसफर नहीं।',

      'resourceManagerTitle': 'ऑफलाइन संसाधन और मॉडल प्रबंधक',
      'installedModels': 'स्थापित मॉडल्स',
      'availableModels': 'उपलब्ध ऑफलाइन पैकेज',
      'download': 'डाउनलोड करें',
      'installed': 'सफलतापूर्वक स्थापित',
      'verifying': 'SHA-256 जांच जारी...',
      'downloading': 'डाउनलोड जारी...',
    },

    // Telugu (తెలుగు)
    'te': {
      'appName': 'కేర్‌బాండ్ AI (CareBond)',
      'appSubtitle': 'ఆఫ్‌లైన్ వ్యక్తిగత ఆరోగ్య & రికవరీ సహచరుడు',
      'tabToday': 'ఈరోజు (Today)',
      'tabHealth': 'ఆరోగ్యం (Health)',
      'tabRecovery': 'రికవరీ (Recovery)',
      'tabDocuments': 'పత్రాలు (Docs)',
      'tabDoctor': 'వైద్యులు (Doctor)',
      'tabSettings': 'సెట్టింగ్స్ (Settings)',

      'onboardingTitle': 'కేర్‌బాండ్ AI కి స్వాగతం',
      'onboardingDesc': 'మీ వ్యక్తిగత ఆరోగ్య రికార్డు మరియు సర్జరీ రికవరీని పూర్తిగా ఆఫ్‌లైన్‌లో పర్యవేక్షించే భద్రమైన సహచరుడు.',
      'selectLanguage': 'మీ ప్రాధాన్య భాషను ఎంచుకోండి',
      'deviceScanTitle': 'పరికర సామర్థ్య స్కానర్',
      'profileType': 'ప్రొఫైల్ సెటప్ మోడ్',
      'cleanSlate': 'కొత్త రికార్డు (Clean Slate)',
      'cleanSlateDesc': 'పూర్తిగా కొత్త మరియు ఖాళీ రికార్డుతో ప్రారంభించండి.',
      'samplePatient': 'నమూనా పేషెంట్ డెమో (Sample Patient)',
      'samplePatientDesc': 'నమూనా పేషెంట్ డేటాతో యాప్ పనితీరును పరిశీలించండి.',
      'getStarted': 'ప్రారంభించండి',

      'todayTitle': 'ఈరోజు సారాంశం',
      'todayRecoveryIndex': 'రికవరీ ఆరోగ్య సూచిక',
      'todayStatusGood': 'రికవరీ సరిగ్గా ఉంది',
      'todayStatusModerate': 'సాధారణ మార్పు కనుగొనబడింది',
      'todayStatusAttention': 'వైద్యుల సంప్రదింపు అవసరం',
      'todayMedsTitle': 'ఈరోజు మందులు',
      'todayNoMeds': 'ఈరోజు ఎలాంటి మందులు సూచించబడలేదు.',
      'todayCheckInTitle': 'రోజువారీ రికవరీ చెక్-ఇన్',
      'todayCheckInCompleted': 'ఈరోజు చెక్-ఇన్ పూర్తయింది',
      'todayCheckInPending': 'ఈరోజు చెక్-ఇన్ చేయవలసి ఉంది',
      'actionTalk': 'కేర్‌బాండ్‌తో మాట్లాడండి',
      'actionScanPrescription': 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి',
      'actionScanReport': 'రిపోర్ట్ / డిశ్చార్జ్ సారాంశం',
      'actionCheckIn': 'చెక్-ఇన్ నమోదు చేయండి',
      'actionWhatCanIEat': 'నేను ఏమి తినవచ్చు?',
      'foodGuidanceTitle': 'వ్యక్తిగతీకరించిన ఆహార & పోషకాహార మార్గదర్శకాలు',
      'foodGuidanceSubtitle': 'మీ వ్యాధులు మరియు వాడుతున్న మందుల ఆధారంగా సాధారణ ఆహార సూచనలు',

      'healthTitle': 'వ్యక్తిగత ఆరోగ్య రికార్డు',
      'conditions': 'గుర్తించిన అనారోగ్యాలు',
      'medicines': 'వాడుతున్న మందులు',
      'allergies': 'నమోదైన అలెర్జీలు',
      'proceduresAndLabs': 'చికిత్సలు & ల్యాబ్ ఫలితాలు',
      'timeline': 'ఆరోగ్య కాలక్రమం (Timeline)',
      'genomics': 'జెనోమిక్స్ & PGx',
      'noConditions': 'దీర్ఘకాలిక సమస్యలు ఏవీ నమోదు కాలేదు.',
      'noMedicines': 'మందులు ఏవీ నమోదు కాలేదు.',
      'noAllergies': 'అలెర్జీలు ఏవీ నమోదు కాలేదు.',
      'addRecord': '+ రికార్డు జోడించండి',

      'recoveryTitle': 'రికవరీ ఇంజిన్ & సెన్సార్ మానిటర్',
      'recoveryPlan': 'యాక్టివ్ రికవరీ ప్రోటోకాల్',
      'recoveryActiveProtocol': 'యాక్టివ్ ప్రోటోకాల్',
      'recoveryMetrics': 'లైవ్ సెన్సార్ డేటా',
      'recoveryBaseline': 'వ్యక్తిగత బేస్‌లైన్',
      'recoveryAlerts': 'రికవరీ హెచ్చరికలు',
      'noAlerts': 'ఎలాంటి అసాధారణ మార్పులు లేవు.',
      'startRecovery': 'రికవరీ ప్లాన్ ప్రారంభించండి',
      'liveSampling': 'సెన్సార్ పరిశీలన కొనసాగుతోంది',
      'sensorsStopped': 'సెన్సార్లు నిలిపివేయబడ్డాయి',

      'documentsTitle': 'వైద్య పత్రాలు & OCR',
      'takePhoto': 'ఫోటో తీయండి (Camera)',
      'uploadFile': 'ఫైల్ / ఫోటో అప్‌లోడ్ చేయండి',
      'scanPrescription': 'ప్రిస్క్రిప్షన్',
      'scanReport': 'ల్యాబ్ రిపోర్ట్',
      'scanDischarge': 'డిశ్చార్జ్ సారాంశం',
      'noDocuments': 'ఇప్పటివరకు పత్రాలు ఏవీ స్కాన్ చేయలేదు.',
      'documentConfirmation': 'పత్రాల సమాచార సమీక్ష',
      'saveToHealthMemory': 'ధృవీకరించి భద్రపరచండి',

      'doctorHandoffTitle': 'వైద్యుల సంప్రదింపు సారాంశం',
      'generateHandoff': 'క్లినికల్ సారాంశం తయారుచేయి',
      'copyDossier': 'కాపీ చేయండి',
      'handoffDisclaimer': '100% పరికరంలోనే రూపొందించబడింది. క్లౌడ్‌కి ఎటువంటి సమాచారం పంపబడదు.',

      'resourceManagerTitle': 'ఆఫ్‌లైన్ మోడల్స్ మేనేజర్',
      'installedModels': 'ఇన్‌స్టాల్ చేసిన మోడల్స్',
      'availableModels': 'లభ్యమైన ఆఫ్‌లైన్ ప్యాకేజీలు',
      'download': 'డౌన్‌లోడ్ చేయండి',
      'installed': 'ఇన్‌స్టాల్ చేయబడింది',
      'verifying': 'ధృవీకరిస్తోంది...',
      'downloading': 'డౌన్‌లోడ్ అవుతోంది...',
    },

    // Kannada (ಕನ್ನಡ)
    'kn': {
      'appName': 'ಕೇರ್‌ಬಾಂಡ್ AI (CareBond)',
      'appSubtitle': 'ಆಫ್‌ಲೈನ್ ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ಮತ್ತು ಚೇತರಿಕೆಯ ಒಡನಾಡಿ',
      'tabToday': 'ಇಂದು (Today)',
      'tabHealth': 'ಆರೋಗ್ಯ (Health)',
      'tabRecovery': 'ಚೇತರಿಕೆ (Recovery)',
      'tabDocuments': 'ದಾಖಲೆಗಳು (Docs)',
      'tabDoctor': 'ವೈದ್ಯರು (Doctor)',
      'tabSettings': 'ಸೆಟ್ಟಿಂಗ್ಸ್ (Settings)',

      'onboardingTitle': 'ಕೇರ್‌ಬಾಂಡ್ AI ಗೆ ಸುಸ್ವಾಗತ',
      'onboardingDesc': 'ನಿಮ್ಮ ಸುರಕ್ಷಿತ, 100% ಆಫ್‌ಲೈನ್ ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ಮತ್ತು ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ ನಂತರದ ಚೇತರಿಕೆಯ ಒಡನಾಡಿ.',
      'selectLanguage': 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      'deviceScanTitle': 'ಸಾಧನದ ಸಾಮರ್ಥ್ಯ ಸ್ಕ್ಯಾನರ್',
      'profileType': 'ಪ್ರೊಫೈಲ್ ಸೆಟಪ್ ಮೋಡ್',
      'cleanSlate': 'ಹೊಸ ದಾಖಲೆ (Clean Slate)',
      'cleanSlateDesc': 'ಖಾಲಿ ಮತ್ತು ಸುರಕ್ಷಿತ ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ದಾಖಲೆಯೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಿ.',
      'samplePatient': 'ಮಾದರಿ ರೋಗಿ (Sample Patient Demo)',
      'samplePatientDesc': 'ಪೂರ್ವಭಾವಿ ಇತಿಹಾಸದೊಂದಿಗೆ ಅಪ್ಲಿಕೇಶನ್ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಪರೀಕ್ಷಿಸಿ.',
      'getStarted': 'ಪ್ರಾರಂಭಿಸಿ',

      'todayTitle': 'ಇಂದಿನ ಮುನ್ನೋಟ',
      'todayRecoveryIndex': 'ಚೇತರಿಕೆಯ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ',
      'todayStatusGood': 'ಚೇತರಿಕೆ ಉತ್ತಮವಾಗಿದೆ',
      'todayStatusModerate': 'ಸಾಧಾರಣ ವ್ಯತ್ಯಾಸ ಕಂಡುಬಂದಿದೆ',
      'todayStatusAttention': 'ವೈದ್ಯರ ಸಲಹೆ ಅಗತ್ಯವಿದೆ',
      'todayMedsTitle': 'ಇಂದಿನ ಔಷಧಿಗಳು',
      'todayNoMeds': 'ಇಂದಿಗೆ ಯಾವುದೇ ಔಷಧಿ ನಿಗದಿಯಾಗಿಲ್ಲ.',
      'todayCheckInTitle': 'ದೈನಂದಿನ ಚೇತರಿಕೆ ಚೆಕ್-ಇನ್',
      'todayCheckInCompleted': 'ಇಂದಿನ ಚೆಕ್-ಇನ್ ಪೂರ್ಣಗೊಂಡಿದೆ',
      'todayCheckInPending': 'ಇಂದಿನ ಚೆಕ್-ಇನ್ ಬಾಕಿ ಇದೆ',
      'actionTalk': 'ಕೇರ್‌ಬಾಂಡ್ ಜೊತೆ ಮಾತನಾಡಿ',
      'actionScanPrescription': 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
      'actionScanReport': 'ವರದಿ / ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶ',
      'actionCheckIn': 'ಚೆಕ್-ಇನ್ ದಾಖಲಿಸಿ',
      'actionWhatCanIEat': 'ನಾನು ಏನು ತಿನ್ನಬಹುದು?',
      'foodGuidanceTitle': 'ವೈಯಕ್ತಿಕ ಪೌಷ್ಠಿಕಾಂಶ ಮತ್ತು ಆಹಾರ ಮಾರ್ಗದರ್ಶನ',
      'foodGuidanceSubtitle': 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಸ್ಥಿತಿ ಮತ್ತು ಔಷಧಿಗಳ ಆಧಾರದ ಶೈಕ್ಷಣಿಕ ಆಹಾರ ಸಲಹೆ',

      'healthTitle': 'ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ದಾಖಲೆ',
      'conditions': 'ದಾಖಲಾದ ಕಾಯಿಲೆಗಳು',
      'medicines': 'ಪ್ರಸ್ತುತ ಔಷಧಿಗಳು',
      'allergies': 'ದಾಖಲಾದ ಅಲರ್ಜಿಗಳು',
      'proceduresAndLabs': 'ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಗಳು & ಲ್ಯಾಬ್ ವರದಿಗಳು',
      'timeline': 'ಆರೋಗ್ಯ ಟೈಮ್‌ಲೈನ್',
      'genomics': 'ಜೀನೋಮಿಕ್ಸ್ ಮತ್ತು PGx',
      'noConditions': 'ಯಾವುದೇ ದೀರ್ಘಕಾಲಿಕ ಕಾಯಿಲೆಗಳಿಲ್ಲ.',
      'noMedicines': 'ಯಾವುದೇ ಔಷಧಿಗಳು ದಾಖಲಾಗಿಲ್ಲ.',
      'noAllergies': 'ಯಾವುದೇ ಅಲರ್ಜಿಗಳಿಲ್ಲ.',
      'addRecord': '+ ದಾಖಲೆ ಸೇರಿಸಿ',

      'recoveryTitle': 'ಚೇತರಿಕೆ ಎಂಜಿನ್ ಮತ್ತು ಸೆನ್ಸಾರ್ ಮಾನಿಟರ್',
      'recoveryPlan': 'ಸಕ್ರಿಯ ಚೇತರಿಕೆಯ ಪ್ರೋಟೋಕಾಲ್',
      'recoveryActiveProtocol': 'ಸಕ್ರಿಯ ಪ್ರೋಟೋಕಾಲ್',
      'recoveryMetrics': 'ಲೈವ್ ಸೆನ್ಸಾರ್ ಮಾದರಿಗಳು',
      'recoveryBaseline': 'ವೈಯಕ್ತಿಕ ಬೇಸ್‌ಲೈನ್',
      'recoveryAlerts': 'ವಿವರಣಾತ್ಮಕ ಎಚ್ಚರಿಕೆಗಳು',
      'noAlerts': 'ಯಾವುದೇ ಅಸಹಜ ಬದಲಾವಣೆಗಳಿಲ್ಲ.',
      'startRecovery': 'ಚೇತರಿಕೆ ಯೋಜನೆ ರೂಪಿಸಿ',
      'liveSampling': 'ಸೆನ್ಸಾರ್ ಚಾಲನೆಯಲ್ಲಿದೆ',
      'sensorsStopped': 'ಸೆನ್ಸಾರ್ ನಿಲ್ಲಿಸಲಾಗಿದೆ',

      'documentsTitle': 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು ಮತ್ತು OCR',
      'takePhoto': 'ಫೋಟೋ ತೆಗೆಯಿರಿ (Camera)',
      'uploadFile': 'ಫೈಲ್ / ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
      'scanPrescription': 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್',
      'scanReport': 'ಲ್ಯಾಬ್ ವರದಿ',
      'scanDischarge': 'ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶ',
      'noDocuments': 'ಯಾವುದೇ ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿಲ್ಲ.',
      'documentConfirmation': 'ದಾಖಲೆಗಳ ವಿವರ ವಿಮರ್ಶೆ',
      'saveToHealthMemory': 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಉಳಿಸಿ',

      'doctorHandoffTitle': 'ವೈದ್ಯರ ಸಮಾಲೋಚನೆ ಸಾರಾಂಶ',
      'generateHandoff': 'ಕ್ಲಿನಿಕಲ್ ಸಾರಾಂಶ ತಯಾರಿಸಿ',
      'copyDossier': 'ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ಗೆ ನಕಲಿಸಿ',
      'handoffDisclaimer': '100% ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ. ಕ್ಲೌಡ್‌ಗೆ ಯಾವುದೇ ಡೇಟಾ ಕಳುಹಿಸುವುದಿಲ್ಲ.',

      'resourceManagerTitle': 'ಆಫ್‌ಲೈನ್ ರಿಸೋರ್ಸ್ ಮ್ಯಾನೇಜರ್',
      'installedModels': 'ಸ್ಥಾಪಿಸಲಾದ ಮಾದರಿಗಳು',
      'availableModels': 'ಲಭ್ಯವಿರುವ ಆಫ್‌ಲೈನ್ ಪ್ಯಾಕೇಜ್‌ಗಳು',
      'download': 'ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      'installed': 'ಸ್ಥಾಪಿಸಲಾಗಿದೆ',
      'verifying': 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
      'downloading': 'ಡೌನ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    },

    // Tamil (தமிழ்)
    'ta': {
      'appName': 'கேர்பாண்ட் AI (CareBond)',
      'appSubtitle': 'ஆஃப்லைன் தனிப்பயன் நல்வாழ்வு & குணமடைதல் துணை',
      'tabToday': 'இன்று (Today)',
      'tabHealth': 'உடல்நலம் (Health)',
      'tabRecovery': 'குணமடைதல் (Recovery)',
      'tabDocuments': 'ஆவணங்கள் (Docs)',
      'tabDoctor': 'மருத்துவர் (Doctor)',
      'tabSettings': 'அமைப்புகள் (Settings)',

      'onboardingTitle': 'கேர்பாண்ட் AI-க்கு நல்வரவு',
      'onboardingDesc': 'உங்கள் பாதுகாப்பான, 100% ஆஃப்லைன் தனிப்பட்ட உடல்நல மற்றும் அறுவைசிகிச்சை மீட்பு துணை.',
      'selectLanguage': 'விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
      'deviceScanTitle': 'சாதன திறன் ஸ்கேனர்',
      'profileType': 'சுயவிவர அமைப்பு முறை',
      'cleanSlate': 'புதிய பதிவு (Clean Slate)',
      'cleanSlateDesc': 'புதிய மற்றும் பாதுகாப்பான உடல்நலப் பதிவோடு தொடங்கவும்.',
      'samplePatient': 'மாதிரி நோயாளி டெமோ (Sample Patient)',
      'samplePatientDesc': 'முன் ஏற்றப்பட்ட மீட்பு வரலாற்றுடன் செயலியை சோதிக்கவும்.',
      'getStarted': 'தொடங்குங்கள்',

      'todayTitle': 'இன்றைய கண்ணோட்டம்',
      'todayRecoveryIndex': 'குணமடைதல் குறியீடு',
      'todayStatusGood': 'மீட்பு நிலை நன்றாக உள்ளது',
      'todayStatusModerate': 'மிதமான மாற்றம் கண்டறியப்பட்டது',
      'todayStatusAttention': 'மருத்துவர் ஆலோசனை தேவை',
      'todayMedsTitle': 'இன்றைய மருந்துகள்',
      'todayNoMeds': 'இன்று எந்த மருந்துகளும் திட்டமிடப்படவில்லை.',
      'todayCheckInTitle': 'தினசரி மீட்பு செக்-இன்',
      'todayCheckInCompleted': 'இன்றைய செக்-இன் முடிந்தது',
      'todayCheckInPending': 'இன்றைய செக்-இன் நிலுவையில் உள்ளது',
      'actionTalk': 'கேர்பாண்ட்டிடம் பேசுங்கள்',
      'actionScanPrescription': 'மருந்துச்சீட்டை ஸ்கேன் செய்க',
      'actionScanReport': 'மருத்துவ அறிக்கை / டிஸ்சார்ஜ்',
      'actionCheckIn': 'செக்-இன் பதிவு செய்க',
      'actionWhatCanIEat': 'நான் என்ன சாப்பிடலாம்?',
      'foodGuidanceTitle': 'தனிப்பயனாக்கப்பட்ட உணவு வழிகாட்டுதல்',
      'foodGuidanceSubtitle': 'உங்கள் நோய்கள் மற்றும் மருந்துகள் அடிப்படையிலான கல்வி சார்ந்த உணவு ஆலோசனை',

      'healthTitle': 'தனிநபர் மருத்துவப் பதிவு',
      'conditions': 'பதிவான நோய்கள்',
      'medicines': 'தற்போதைய மருந்துகள்',
      'allergies': 'ஒவ்வாமை விவரங்கள்',
      'proceduresAndLabs': 'சிகிச்சைகள் & ஆய்வக சோதனைகள்',
      'timeline': 'உடல்நல காலவரிசை (Timeline)',
      'genomics': 'மரபியல் & PGx',
      'noConditions': 'நீண்டகால நோய்கள் எதுவும் பதிவு செய்யப்படவில்லை.',
      'noMedicines': 'மருந்துகள் எதுவும் பதிவு செய்யப்படவில்லை.',
      'noAllergies': 'ஒவ்வாமைகள் எதுவும் இல்லை.',
      'addRecord': '+ பதிவைச் சேர்க்கவும்',

      'recoveryTitle': 'மீட்பு என்ஜின் & சென்சார் கண்காணிப்பு',
      'recoveryPlan': 'செயலில் உள்ள மீட்பு நெறிமுறை',
      'recoveryActiveProtocol': 'செயலில் உள்ள திட்டம்',
      'recoveryMetrics': 'நேரடி சென்சார் தரவு',
      'recoveryBaseline': 'தனிப்பயன் பேஸ்லைன்',
      'recoveryAlerts': 'விளக்கமான எச்சரிக்கைகள்',
      'noAlerts': 'அசாதாரண மாற்றங்கள் எதுவும் இல்லை.',
      'startRecovery': 'மீட்பு திட்டத்தை அமைக்கவும்',
      'liveSampling': 'சென்சார் கண்காணிப்பு செயலில் உள்ளது',
      'sensorsStopped': 'சென்சார்கள் நிறுத்தப்பட்டன',

      'documentsTitle': 'மருத்துவ ஆவணங்கள் & OCR',
      'takePhoto': 'புகைப்படம் எடு (Camera)',
      'uploadFile': 'கோப்பு / படத்தை பதிவேற்றவும்',
      'scanPrescription': 'மருந்துச் சீட்டு',
      'scanReport': 'ஆய்வக அறிக்கை',
      'scanDischarge': 'டிஸ்சார்ஜ் சம்மரி',
      'noDocuments': 'ஆவணங்கள் எதுவும் இதுவரை ஸ்கேன் செய்யப்படவில்லை.',
      'documentConfirmation': 'ஆவணத் தகவல் மதிப்பாய்வு',
      'saveToHealthMemory': 'உறுதிசெய்து சேமிக்கவும்',

      'doctorHandoffTitle': 'மருத்துவர் ஆலோசனை சுருக்கம்',
      'generateHandoff': 'மருத்துவ சுருக்கத்தை உருவாக்கு',
      'copyDossier': 'நகலெடுக்கவும்',
      'handoffDisclaimer': '100% சாதனத்திலேயே உருவாக்கப்பட்டது. எந்த தகவலும் கிளவுட்டுக்கு அனுப்பப்படாது.',

      'resourceManagerTitle': 'ஆஃப்லைன் வள மேலாளர்',
      'installedModels': 'நிறுவப்பட்ட மாதிரிகள்',
      'availableModels': 'கிடைக்கும் ஆஃப்லைன் தொகுப்புகள்',
      'download': 'பதிவிறக்கு',
      'installed': 'நிறுவப்பட்டது',
      'verifying': 'சரிபார்க்கிறது...',
      'downloading': 'பதிவிறக்குகிறது...',
    },

    // Marathi (मराठी)
    'mr': {
      'appName': 'केअरबॉन्ड AI (CareBond)',
      'appSubtitle': 'ऑफलाइन वैयक्तिक आरोग्य आणि रिकव्हरी सोबती',
      'tabToday': 'आज (Today)',
      'tabHealth': 'आरोग्य (Health)',
      'tabRecovery': 'रिकव्हरी (Recovery)',
      'tabDocuments': 'कागदपत्रे (Docs)',
      'tabDoctor': 'डॉक्टर (Doctor)',
      'tabSettings': 'सेटिंग्ज (Settings)',

      'onboardingTitle': 'केअरबॉन्ड AI मध्ये आपले स्वागत आहे',
      'onboardingDesc': 'आपला 100% सुरक्षित आणि ऑफलाइन ऑन-डिव्हाइस वैयक्तिक आरोग्य आणि शस्त्रक्रियेनंतरचा रिकव्हरी साथीदार.',
      'selectLanguage': 'पसंतीची भाषा निवडा',
      'deviceScanTitle': 'डिव्हाइस क्षमता स्कॅनर',
      'profileType': 'प्रोफाइल सेटअप मोड',
      'cleanSlate': 'नवीन रेकॉर्ड (Clean Slate)',
      'cleanSlateDesc': 'सुरक्षित आणि नवीन आरोग्य नोंदींसह सुरुवात करा.',
      'samplePatient': 'नमुना रुग्ण डेमो (Sample Patient Demo)',
      'samplePatientDesc': 'पूर्व-लोड केलेल्या रिकव्हरी इतिहासासह ॲप तपासा.',
      'getStarted': 'सुरुवात करा',

      'todayTitle': 'आजचा आढावा',
      'todayRecoveryIndex': 'रिकव्हरी आरोग्य निर्देशांक',
      'todayStatusGood': 'रिकव्हरी योग्य मार्गावर आहे',
      'todayStatusModerate': 'मध्यम बदल आढळला',
      'todayStatusAttention': 'डॉक्टरांचा सल्ला आवश्यक',
      'todayMedsTitle': 'आजची औषधे',
      'todayNoMeds': 'आजसाठी कोणतीही औषधे नियोजित नाहीत.',
      'todayCheckInTitle': 'दैनंदिन रिकव्हरी चेक-इन',
      'todayCheckInCompleted': 'आजचे चेक-इन पूर्ण झाले',
      'todayCheckInPending': 'आजचे चेक-इन बाकी आहे',
      'actionTalk': 'केअरबॉन्डशी बोला',
      'actionScanPrescription': 'प्रिस्क्रिप्शन स्कॅन करा',
      'actionScanReport': 'तपासणी अहवाल / डिस्चार्ज',
      'actionCheckIn': 'चेक-इन नोंदवा',
      'actionWhatCanIEat': 'मी काय खाऊ शकतो?',
      'foodGuidanceTitle': 'वैयक्तिकृत आहार आणि पोषण मार्गदर्शन',
      'foodGuidanceSubtitle': 'आपल्या आजार आणि औषधांवर आधारित शैक्षणिक आहार सल्ला',

      'healthTitle': 'वैयक्तिक आरोग्य नोंद',
      'conditions': 'नोंदवलेले आजार',
      'medicines': 'सध्याची औषधे',
      'allergies': 'नोंदवलेली ॲलर्जी',
      'proceduresAndLabs': 'शस्त्रक्रिया आणि लॅब चाचण्या',
      'timeline': 'आरोग्य टाइमलाइन',
      'genomics': 'जीनॉमिक्स आणि PGx',
      'noConditions': 'कोणतेही जुनाट आजार नोंदवलेले नाहीत.',
      'noMedicines': 'कोणतीही औषधे नोंदवलेली नाहीत.',
      'noAllergies': 'कोणतीही ॲलर्जी नोंदवलेली नाही.',
      'addRecord': '+ नोंद जोडा',

      'recoveryTitle': 'रिकव्हरी इंजिन आणि सेन्सर मॉनिटर',
      'recoveryPlan': 'सक्रिय रिकव्हरी प्रोटोकॉल',
      'recoveryActiveProtocol': 'सक्रिय प्रोटोकॉल',
      'recoveryMetrics': 'थेट सेन्सर डेटा प्रवाह',
      'recoveryBaseline': 'वैयक्तिक बेसलाइन',
      'recoveryAlerts': 'स्पष्टीकरणात्मक अलर्ट',
      'noAlerts': 'कोणताही असामान्य बदल आढळला नाही.',
      'startRecovery': 'रिकव्हरी योजना सुरू करा',
      'liveSampling': 'थेट सेन्सर सक्रिय',
      'sensorsStopped': 'सेन्सर थांबवले आहेत',

      'documentsTitle': 'वैद्यकीय कागदपत्रे आणि OCR',
      'takePhoto': 'फोटो काढा (Camera)',
      'uploadFile': 'फाइल / फोटो अपलोड करा',
      'scanPrescription': 'प्रिस्क्रिप्शन',
      'scanReport': 'लॅब अहवाल',
      'scanDischarge': 'डिस्चार्ज सारांश',
      'noDocuments': 'अद्याप कोणतीही कागदपत्रे स्कॅन केलेली नाहीत.',
      'documentConfirmation': 'माहितीचे पुनरावलोकन',
      'saveToHealthMemory': 'पुष्टी करा आणि सेव्ह करा',

      'doctorHandoffTitle': 'डॉक्टर सल्लामसलत सारांश',
      'generateHandoff': 'क्लिनिकल सारांश तयार करा',
      'copyDossier': 'कॉपी करा',
      'handoffDisclaimer': '100% ऑफलाइन तयार केले गेले आहे. कोणताही डेटा क्लाउडवर पाठवला जात नाही.',

      'resourceManagerTitle': 'ऑफलाइन मॉडेल व्यवस्थापक',
      'installedModels': 'स्थापित मॉडेल्स',
      'availableModels': 'उपलब्ध ऑफलाइन पॅकेजेस',
      'download': 'डाउनलोड करा',
      'installed': 'यशस्वीरित्या स्थापित',
      'verifying': 'तपासत आहे...',
      'downloading': 'डाउनलोड होत आहे...',
    },
  };

  String translate(String key) {
    final langCode = language.code;
    return _localizedStrings[langCode]?[key] ?? _localizedStrings['en']?[key] ?? key;
  }

  String get appName => translate('appName');
  String get appSubtitle => translate('appSubtitle');
  String get tabToday => translate('tabToday');
  String get tabHealth => translate('tabHealth');
  String get tabRecovery => translate('tabRecovery');
  String get tabDocuments => translate('tabDocuments');
  String get tabDoctor => translate('tabDoctor');
  String get tabSettings => translate('tabSettings');
}
