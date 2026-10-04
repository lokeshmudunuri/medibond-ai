export type SupportedLanguage = 'en' | 'te' | 'hi' | 'kn';

export interface MultilingualParsedRecovery {
  detectedLanguage: SupportedLanguage;
  painIncreased: boolean;
  painDecreased: boolean;
  painScore?: number;
  sleepHours?: number;
  medicationTaken?: boolean;
  medicationMissed?: boolean;
  mobilityReduced: boolean;
  mobilityImproved: boolean;
  symptoms: string[];
  rawText: string;
}

export interface LocalizationStrings {
  appName: string;
  generalHealth: string;
  recoveryTrack: string;
  medicalVault: string;
  doctorDirectory: string;
  storageManager: string;
  settings: string;
  emergencyAlert: string;
  askDoctor: string;
  scanPrescription: string;
  scanLabReport: string;
  handwritingDetected: string;
  reviewAndConfirm: string;
  saveToCase: string;
  painScoreLabel: string;
  sleepHoursLabel: string;
  medicationAdherenceLabel: string;
  mobilityStatusLabel: string;
  start10MinMonitoring: string;
  stop10MinMonitoring: string;
  hourlyUpdate: string;
  dailySummary: string;
  airplaneModeActive: string;
  dietAdviceLabel: string;
  modelInferenceStatus: string;
}

export class MultilingualService {
  private static currentLanguage: SupportedLanguage = 'en';

  private static translations: Record<SupportedLanguage, LocalizationStrings> = {
    en: {
      appName: 'CareBond AI',
      generalHealth: 'General Health',
      recoveryTrack: 'Deep Recovery Track',
      medicalVault: 'Medical Document Vault',
      doctorDirectory: 'Specialist Directory',
      storageManager: 'Storage & Data Manager',
      settings: 'Settings & Diagnostics',
      emergencyAlert: 'EMERGENCY RED FLAG DETECTED',
      askDoctor: 'Questions for Doctor',
      scanPrescription: 'Scan Prescription',
      scanLabReport: 'Scan Lab Report',
      handwritingDetected: 'Handwriting Detected - Review Carefully',
      reviewAndConfirm: 'Review & Confirm Extracted Medical Data',
      saveToCase: 'Save Confirmed Record to Case',
      painScoreLabel: 'Pain Score (0-10)',
      sleepHoursLabel: 'Sleep Duration (Hours)',
      medicationAdherenceLabel: 'Medication Adherence',
      mobilityStatusLabel: 'Mobility & Activity Status',
      start10MinMonitoring: 'Start 10-Min Continuous Recovery Monitor',
      stop10MinMonitoring: 'Stop Continuous Recovery Monitor',
      hourlyUpdate: 'Hourly Recovery Trend Update',
      dailySummary: 'End-of-Day Recovery Summary',
      airplaneModeActive: '100% Offline Mode Active (No Cloud Calls)',
      dietAdviceLabel: 'Dietary & Nutrition Guidance',
      modelInferenceStatus: 'Local Model Inference Active',
    },
    te: {
      appName: 'కేర్‌బాండ్ AI',
      generalHealth: 'సాధారణ ఆరోగ్యం',
      recoveryTrack: 'రికవరీ & సంరక్షణ ట్రాక్',
      medicalVault: 'వైద్య రికార్డుల వాల్ట్',
      doctorDirectory: 'వైద్య నిపుణుల డైరెక్టరీ',
      storageManager: 'స్టోరేజ్ మేనేజర్',
      settings: 'సెట్టింగ్‌లు & డయాగ్నోస్టిక్స్',
      emergencyAlert: 'అత్యవసర హెచ్చరిక గుర్తించబడింది',
      askDoctor: 'డాక్టర్‌ను అడగవలసిన ప్రశ్నలు',
      scanPrescription: 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి',
      scanLabReport: 'ల్యాబ్ రిపోర్ట్ స్కాన్ చేయండి',
      handwritingDetected: 'చేతివ్రాత గుర్తించబడింది - సరిచూసుకోండి',
      reviewAndConfirm: 'వైద్య సమాచారాన్ని సమీక్షించి నిర్ధారించండి',
      saveToCase: 'కేస్‌లో భద్రపరచండి',
      painScoreLabel: 'నొప్పి తీవ్రత (0-10)',
      sleepHoursLabel: 'నిద్ర సమయం (గంటలు)',
      medicationAdherenceLabel: 'మందుల వాడకం',
      mobilityStatusLabel: 'కదలిక & శారీరక స్థితి',
      start10MinMonitoring: '10 నిమిషాల నిరంతర రికవరీ మానిటరింగ్ ప్రారంభించండి',
      stop10MinMonitoring: 'మానిటరింగ్ ఆపండి',
      hourlyUpdate: 'గంటవారీ రికవరీ అప్‌డేట్',
      dailySummary: 'రోజువారీ రికవరీ సారాంశం',
      airplaneModeActive: '100% ఆఫ్‌లైన్ మోడ్ సక్రియంగా ఉంది',
      dietAdviceLabel: 'ఆహార & పోషకాహార సలహా',
      modelInferenceStatus: 'స్థానిక మోడల్ రన్ అవుతోంది',
    },
    hi: {
      appName: 'केयरबॉन्ड AI',
      generalHealth: 'सामान्य स्वास्थ्य',
      recoveryTrack: 'रिकवरी और देखभाल ट्रैक',
      medicalVault: 'मेडिकल रिकॉर्ड वॉल्ट',
      doctorDirectory: 'विशेषज्ञ डॉक्टर डायरेक्टरी',
      storageManager: 'स्टोरेज मैनेजर',
      settings: 'सेटिंग्स और निदान',
      emergencyAlert: 'आपातकालीन चेतावनी पाई गई',
      askDoctor: 'डॉक्टर से पूछने योग्य प्रश्न',
      scanPrescription: 'पर्चे (प्रिस्क्रिप्शन) को स्कैन करें',
      scanLabReport: 'लैब रिपोर्ट स्कैन करें',
      handwritingDetected: 'हस्तलिखित दस्तावेज़ - कृपया जांचें',
      reviewAndConfirm: 'चिकित्सा डेटा की समीक्षा और पुष्टि करें',
      saveToCase: 'केस में सुरक्षित करें',
      painScoreLabel: 'दर्द का स्तर (0-10)',
      sleepHoursLabel: 'नींद की अवधि (घंटे)',
      medicationAdherenceLabel: 'दवा का सेवन',
      mobilityStatusLabel: 'गतिशीलता और गतिविधि',
      start10MinMonitoring: '10-मिनट सतत रिकवरी निगरानी शुरू करें',
      stop10MinMonitoring: 'निगरानी रोकें',
      hourlyUpdate: 'प्रति घंटा रिकवरी अपडेट',
      dailySummary: 'दैनिक रिकवरी सारांश',
      airplaneModeActive: '100% ऑफ़लाइन मोड सक्रिय है',
      dietAdviceLabel: 'आहार और पोषण मार्गदर्शन',
      modelInferenceStatus: 'स्थानीय मॉडल सक्रिय है',
    },
    kn: {
      appName: 'ಕೇರ್‌ಬಾಂಡ್ AI',
      generalHealth: 'ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ',
      recoveryTrack: 'ಚೇತರಿಕೆ ಮತ್ತು ಆರೈಕೆ ಟ್ರ್ಯಾಕ್',
      medicalVault: 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳ ವಾಲ್ಟ್',
      doctorDirectory: 'ತಜ್ಞ ವೈದ್ಯರ ವಿವರ',
      storageManager: 'ಸ್ಟೋರೇಜ್ ಮ್ಯಾನೇಜರ್',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      emergencyAlert: 'ತುರ್ತು ಎಚ್ಚರಿಕೆ ಪತ್ತೆಯಾಗಿದೆ',
      askDoctor: 'ವೈದ್ಯರಿಗೆ ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳು',
      scanPrescription: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
      scanLabReport: 'ಲ್ಯಾಬ್ ವರದಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
      handwritingDetected: 'ಕೈಬರಹ ಗುರುತಿಸಲಾಗಿದೆ - ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ',
      reviewAndConfirm: 'ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ದೃಢೀಕರಿಸಿ',
      saveToCase: 'ಕೇಸ್‌ನಲ್ಲಿ ಉಳಿಸಿ',
      painScoreLabel: 'ನೋವಿನ ಪ್ರಮಾಣ (0-10)',
      sleepHoursLabel: 'ನಿದ್ರೆಯ ಅವಧಿ (ಗಂಟೆಗಳು)',
      medicationAdherenceLabel: 'ಔಷಧಿ ಸೇವನೆ',
      mobilityStatusLabel: 'ಚಲನಶೀಲತೆಯ ಸ್ಥಿತಿ',
      start10MinMonitoring: '10-ನಿಮಿಷಗಳ ನಿರಂತರ ಚೇತರಿಕೆ ಮಾನಿಟರಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ',
      stop10MinMonitoring: 'ಮಾನಿಟರಿಂಗ್ ನಿಲ್ಲಿಸಿ',
      hourlyUpdate: 'ಗಂಟೆಯ ಚೇತರಿಕೆಯ ಅಪ್ಡೇಟ್',
      dailySummary: 'ದೈನಂದಿನ ಚೇತರಿಕೆಯ ಸಾರಾಂಶ',
      airplaneModeActive: '100% ಆಫ್‌ಲೈನ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      dietAdviceLabel: 'ಆಹಾರ ಮತ್ತು ಪೋಷಣೆಯ ಮಾರ್ಗದರ್ಶನ',
      modelInferenceStatus: 'ಸ್ಥಳೀಯ ಮಾದರಿ ಸಕ್ರಿಯವಾಗಿದೆ',
    },
  };

  public static setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage = lang;
  }

  public static getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public static getStrings(lang?: SupportedLanguage): LocalizationStrings {
    return this.translations[lang || this.currentLanguage] || this.translations.en;
  }

  /**
   * Detects language from natural speech / text input
   */
  public static detectLanguage(text: string): SupportedLanguage {
    if (!text) return 'en';
    // Telugu Unicode block 0C00-0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Devanagari (Hindi) Unicode block 0900-097F
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Kannada Unicode block 0C80-0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    return 'en';
  }

  /**
   * Parses multilingual recovery inputs (English, Telugu, Hindi, Kannada, mixed/bilingual)
   * into a canonical structured medical state.
   */
  public static extractMultilingualRecoveryState(
    text: string,
    currentPain: number = 4,
    currentSleep: number = 7
  ): MultilingualParsedRecovery {
    const raw = text || '';
    const lower = raw.toLowerCase();
    const detectedLang = this.detectLanguage(raw);

    let painIncreased = false;
    let painDecreased = false;
    let painScore: number | undefined;
    let sleepHours: number | undefined;
    let medicationTaken: boolean | undefined;
    let medicationMissed: boolean | undefined;
    let mobilityReduced = false;
    let mobilityImproved = false;
    const symptoms: string[] = [];

    // --- PAIN DETECTION ---
    // Telugu: checks for pain ("నొప్పి" / "బాధ") + increase ("ఎక్కువ" / "ఎక్కువగా" / "పెరిగింది")
    if (
      (lower.includes('నొప్పి') || lower.includes('బాధ')) &&
      (lower.includes('ఎక్కువ') || lower.includes('ఎక్కువగా') || lower.includes('పెరిగింది') || lower.includes('తీవ్రం'))
    ) {
      painIncreased = true;
      painScore = Math.min(10, currentPain + 2);
    } else if (
      (lower.includes('నొప్పి') || lower.includes('బాధ')) &&
      (lower.includes('తగ్గింది') || lower.includes('తక్కువ') || lower.includes('నయమైంది'))
    ) {
      painDecreased = true;
      painScore = Math.max(0, currentPain - 2);
    }

    // Hindi: checks for pain ("दर्द" / "तकलीफ") + increase ("ज्यादा" / "बढ़" / "अधिक" / "तीव्र")
    if (
      (lower.includes('दर्द') || lower.includes('तकलीफ')) &&
      (lower.includes('ज्यादा') || lower.includes('बढ़') || lower.includes('बढ़') || lower.includes('अधिक') || lower.includes('तेज'))
    ) {
      painIncreased = true;
      painScore = Math.min(10, currentPain + 2);
    } else if (
      (lower.includes('दर्द') || lower.includes('तकलीफ')) &&
      (lower.includes('कम') || lower.includes('घट') || lower.includes('राहत'))
    ) {
      painDecreased = true;
      painScore = Math.max(0, currentPain - 2);
    }

    // Kannada: checks for pain ("ನೋವು" / "ಬಾಧೆ") + increase ("ಹೆಚ್ಚ" / "ಹೆಚ್ಚಾಗಿದೆ" / "ಜಾಸ್ತಿ")
    if (
      (lower.includes('ನೋವು') || lower.includes('ಬಾಧೆ')) &&
      (lower.includes('ಹೆಚ್ಚ') || lower.includes('ಹೆಚ್ಚಾಗಿದೆ') || lower.includes('ಜಾಸ್ತಿ'))
    ) {
      painIncreased = true;
      painScore = Math.min(10, currentPain + 2);
    } else if (
      (lower.includes('ನೋವು') || lower.includes('ಬಾಧೆ')) &&
      (lower.includes('ಕಡಿಮೆ') || lower.includes('ಕಡಿಮೆಯಾಗಿದೆ') || lower.includes('ಗುಣ'))
    ) {
      painDecreased = true;
      painScore = Math.max(0, currentPain - 2);
    }

    // English / Mixed
    if (
      lower.includes('pain higher') ||
      lower.includes('pain increased') ||
      lower.includes('more pain') ||
      lower.includes('worse pain') ||
      lower.includes('severe pain') ||
      lower.includes('pain is high') ||
      lower.includes('pain is higher') ||
      lower.includes('pain than yesterday') ||
      (lower.includes('pain') && (lower.includes('higher') || lower.includes('worse') || lower.includes('increase'))) ||
      lower.includes('ఇంకా pain') ||
      lower.includes('दर्द increase')
    ) {
      painIncreased = true;
      painScore = Math.min(10, (painScore ?? currentPain) + 2);
    } else if (lower.includes('pain less') || lower.includes('pain decreased') || lower.includes('better pain')) {
      painDecreased = true;
      painScore = Math.max(0, (painScore ?? currentPain) - 2);
    }

    // Specific numeric pain matches (e.g. "pain 7", "pain: 8", "నొప్పి 7")
    const painNumMatch = lower.match(/(?:pain|నొప్పి|दर्द|ನೋವು)\s*(?:is|score|:)?\s*(\d{1,2})/);
    if (painNumMatch && painNumMatch[1]) {
      const p = parseInt(painNumMatch[1], 10);
      if (p >= 0 && p <= 10) {
        painScore = p;
        painIncreased = p > currentPain;
        painDecreased = p < currentPain;
      }
    }

    // --- SLEEP DETECTION ---
    // Regex for numeric hours: "5 hours", "5 hours sleep", "5 గంటలు", "5 घंटे", "5 ಗಂಟೆ"
    const sleepHourMatch = lower.match(/(\d{1,2})\s*(?:hours?|hrs?|గంటలు|గంటల|घंटे|घंटों|ಗಂಟೆ|ಗಂಟೆಗಳ)/);
    if (sleepHourMatch && sleepHourMatch[1]) {
      sleepHours = parseInt(sleepHourMatch[1], 10);
    } else if (
      lower.includes('five hours') ||
      lower.includes('ఐదు గంటలు') ||
      lower.includes('पांच घंटे') ||
      lower.includes('ಐದು ಗಂಟೆ')
    ) {
      sleepHours = 5;
    } else if (
      lower.includes('four hours') ||
      lower.includes('నాలుగు గంటలు') ||
      lower.includes('चार घंटे') ||
      lower.includes('ನಾಲ್ಕು ಗಂಟೆ')
    ) {
      sleepHours = 4;
    } else if (
      lower.includes('six hours') ||
      lower.includes('ఆరు గంటలు') ||
      lower.includes('छह घंटे') ||
      lower.includes('ಆರು ಗಂಟೆ')
    ) {
      sleepHours = 6;
    }

    // --- MEDICATION ADHERENCE ---
    if (
      lower.includes('took all medication') ||
      lower.includes('took medicine') ||
      lower.includes('taken medicine') ||
      lower.includes('మందులు వేసుకున్నాను') ||
      lower.includes('दवाई ले ली') ||
      lower.includes('ಔಷಧಿ ತೆಗೆದುಕೊಂಡೆ')
    ) {
      medicationTaken = true;
      medicationMissed = false;
    } else if (
      lower.includes('missed medication') ||
      lower.includes('missed dose') ||
      lower.includes('forgot medicine') ||
      lower.includes('మందులు మర్చిపోయాను') ||
      lower.includes('दवा भूल गया') ||
      lower.includes('ಔಷಧಿ ಮರೆತಿದ್ದೇನೆ')
    ) {
      medicationTaken = false;
      medicationMissed = true;
    }

    // --- MOBILITY DETECTION ---
    if (
      lower.includes('mobility reduced') ||
      lower.includes('reduced mobility') ||
      lower.includes('difficulty walking') ||
      lower.includes('unable to walk') ||
      lower.includes('నడవలేకపోతున్నాను') ||
      lower.includes('నడవడం కష్టంగా') ||
      lower.includes('चलने में परेशानी') ||
      lower.includes('ನಡೆಯಲು ಕಷ್ಟ')
    ) {
      mobilityReduced = true;
    } else if (
      lower.includes('walking better') ||
      lower.includes('mobility improved') ||
      lower.includes('సులువుగా నడుస్తున్నాను') ||
      lower.includes('चलने में सुधार') ||
      lower.includes('ಉತ್ತಮವಾಗಿ ನಡೆಯುತ್ತಿದ್ದೇನೆ')
    ) {
      mobilityImproved = true;
    }

    // --- SYMPTOM KEYWORDS ---
    if (lower.includes('fever') || lower.includes('జ్వరం') || lower.includes('बुखार') || lower.includes('ಜ್ವರ')) {
      symptoms.push('Fever');
    }
    if (lower.includes('swelling') || lower.includes('వాపు') || lower.includes('सूजन') || lower.includes('ಊತ')) {
      symptoms.push('Swelling');
    }
    if (lower.includes('vomiting') || lower.includes('వాంతులు') || lower.includes('उल्टी') || lower.includes('ವಾಂತಿ')) {
      symptoms.push('Nausea/Vomiting');
    }
    if (lower.includes('dizziness') || lower.includes('తలతిరగడం') || lower.includes('चक्कर') || lower.includes('ತಲೆಸುತ್ತು')) {
      symptoms.push('Dizziness');
    }

    return {
      detectedLanguage: detectedLang,
      painIncreased,
      painDecreased,
      painScore: painScore ?? (painIncreased ? currentPain + 2 : currentPain),
      sleepHours: sleepHours ?? currentSleep,
      medicationTaken,
      medicationMissed,
      mobilityReduced,
      mobilityImproved,
      symptoms,
      rawText: raw,
    };
  }

  /**
   * Builds localized recovery summary text
   */
  public static buildLocalizedRecoverySummary(
    lang: SupportedLanguage,
    params: {
      painScore: number;
      painDelta: number;
      sleepHours: number;
      medicationStatus: string;
      mobilityStatus: string;
      concerningChange: boolean;
      changeSummary: string;
    }
  ): string {
    const l = lang || this.currentLanguage;
    if (l === 'te') {
      return `రికవరీ అప్‌డేట్:
నొప్పి స్కోరు: ${params.painScore}/10 (${params.painDelta >= 0 ? '+' : ''}${params.painDelta}).
నిద్ర: ${params.sleepHours} గంటలు.
మందుల స్థితి: ${params.medicationStatus}.
కదలిక: ${params.mobilityStatus}.
${params.concerningChange ? '⚠️ గమనిక: పరిస్థితిలో మార్పు కనిపించింది, జాగ్రత్తగా పరిశీలించండి.' : '✅ సాధారణ రికవరీ పురోగతిలో ఉంది. ఎటువంటి అత్యవసర లక్షణాలు లేవు.'}`;
    }

    if (l === 'hi') {
      return `रिकवरी अपडेट:
दर्द का स्तर: ${params.painScore}/10 (${params.painDelta >= 0 ? '+' : ''}${params.painDelta}).
नींद: ${params.sleepHours} घंटे.
दवा का सेवन: ${params.medicationStatus}.
गतिशीलता: ${params.mobilityStatus}.
${params.concerningChange ? '⚠️ ध्यान दें: स्थिति में बदलाव देखा गया है, कृपया निगरानी रखें।' : '✅ सामान्य रिकवरी प्रगति पर है। कोई आपातकालीन लक्षण नहीं पाए गए।'}`;
    }

    if (l === 'kn') {
      return `ಚೇತರಿಕೆಯ ಅಪ್ಡೇಟ್:
ನೋವಿನ ಪ್ರಮಾಣ: ${params.painScore}/10 (${params.painDelta >= 0 ? '+' : ''}${params.painDelta}).
ನಿದ್ರೆ: ${params.sleepHours} ಗಂಟೆಗಳು.
ಔಷಧಿ ಸ್ಥಿತಿ: ${params.medicationStatus}.
ಚಲನಶೀಲತೆ: ${params.mobilityStatus}.
${params.concerningChange ? '⚠️ ಗಮನಿಸಿ: ಸ್ಥಿತಿಯಲ್ಲಿ ಬದಲಾವಣೆ ಕಂಡುಬಂದಿದೆ, ದಯವಿಟ್ಟು ಗಮನಿಸಿ.' : '✅ ಸಾಮಾನ್ಯ ಚೇತರಿಕೆ ಪ್ರಗತಿಯಲ್ಲಿದೆ. ಯಾವುದೇ ತುರ್ತು ಲಕ್ಷಣಗಳಿಲ್ಲ.'}`;
    }

    // Default English
    return `Recovery Update:
Pain Score: ${params.painScore}/10 (${params.painDelta >= 0 ? '+' : ''}${params.painDelta}).
Sleep Duration: ${params.sleepHours} hours.
Medication Adherence: ${params.medicationStatus}.
Mobility Status: ${params.mobilityStatus}.
${params.concerningChange ? '⚠️ Notice: A meaningful trend change was detected. Please monitor closely and adhere to doctor guidelines.' : '✅ Normal recovery progress. No emergency red flags detected.'}`;
  }
}
