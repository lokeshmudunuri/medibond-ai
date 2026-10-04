import {
  VoiceDoctorInstructionPayload,
  VoiceLanguage,
  VoiceRecoveryCheckInPayload,
} from '../types/voice';

export class VoiceExtractionEngine {
  private static instance: VoiceExtractionEngine;

  private constructor() {}

  public static getInstance(): VoiceExtractionEngine {
    if (!VoiceExtractionEngine.instance) {
      VoiceExtractionEngine.instance = new VoiceExtractionEngine();
    }
    return VoiceExtractionEngine.instance;
  }

  /**
   * Extracts daily recovery metrics from spoken transcript
   */
  public extractRecoveryCheckIn(
    transcript: string,
    language: VoiceLanguage = 'en'
  ): VoiceRecoveryCheckInPayload | null {
    const lower = transcript.toLowerCase();

    // Check if transcript contains check-in signals
    const hasCheckInIntent =
      lower.includes('pain') ||
      lower.includes('sleep') ||
      lower.includes('slept') ||
      lower.includes('medicine') ||
      lower.includes('feel') ||
      lower.includes('hurt') ||
      lower.includes('నొప్పి') || // Telugu pain
      lower.includes('నిద్ర') || // Telugu sleep
      lower.includes('మందులు') || // Telugu medicines
      lower.includes('दर्द') || // Hindi pain
      lower.includes('नींद') || // Hindi sleep
      lower.includes('दवा') || // Hindi medicines
      lower.includes('ನೋವು') || // Kannada pain
      lower.includes('ನಿದ್ರೆ') || // Kannada sleep
      lower.includes('ಔಷಧ'); // Kannada medicines

    if (!hasCheckInIntent) return null;

    let painScore: number | undefined;
    let sleepHours: number | undefined;
    let fatigueScore: number | undefined;
    let tookAllMedications = true;

    // 1. Extract Pain Score (e.g., "pain is 7", "pain around 4", "pain of 8", "दर्द 7", "నొప్పి 7")
    const painMatch =
      lower.match(/(?:pain|hurt|दर्द|నొప్పి|ನೋವು)\s*(?:is|score|level|around|of|=|:)?\s*(\d{1,2})/i) ||
      lower.match(/(\d{1,2})\s*(?:out of 10|\/10|pain)/i);
    if (painMatch) {
      const parsed = parseInt(painMatch[1], 10);
      if (parsed >= 0 && parsed <= 10) painScore = parsed;
    }

    // Number word fallback for pain (one to ten)
    if (painScore === undefined) {
      if (lower.includes('seven') || lower.includes('सात') || lower.includes('ఏడు') || lower.includes('ಏಳು')) painScore = 7;
      else if (lower.includes('four') || lower.includes('चार') || lower.includes('నాలుగు') || lower.includes('ನಾಲ್ಕು')) painScore = 4;
      else if (lower.includes('five') || lower.includes('पांच') || lower.includes('ఐదు') || lower.includes('ಐದು')) painScore = 5;
      else if (lower.includes('three') || lower.includes('तीन') || lower.includes('మూడు') || lower.includes('ಮೂರು')) painScore = 3;
      else if (lower.includes('two') || lower.includes('दो') || lower.includes('రెండు') || lower.includes('ಎರಡು')) painScore = 2;
    }

    // 2. Extract Sleep Hours (e.g., "slept 4 hours", "slept for 6 hours", "4 hours of sleep", "4 घंटे सोया")
    const sleepMatch =
      lower.match(/(?:slept|sleep|सोया|నిద్ర|ನಿದ್ರೆ)\s*(?:for|around|about)?\s*(\d{1,2})\s*(?:hours|hrs|घंटे|గంటలు|ಗಂಟೆ)/i) ||
      lower.match(/(\d{1,2})\s*(?:hours|hrs|घंटे|గంటలు)\s*(?:of sleep|sleep|slept)/i);
    if (sleepMatch) {
      const parsed = parseInt(sleepMatch[1], 10);
      if (parsed >= 0 && parsed <= 24) sleepHours = parsed;
    }

    // Number word fallback for sleep
    if (sleepHours === undefined) {
      if (lower.includes('four hours') || lower.includes('चार घंटे') || lower.includes('నాలుగు గంటలు')) sleepHours = 4;
      else if (lower.includes('six hours') || lower.includes('छह घंटे') || lower.includes('ఆరు గంటలు')) sleepHours = 6;
      else if (lower.includes('eight hours') || lower.includes('आठ घंटे') || lower.includes('ఎనిమిది గంటలు')) sleepHours = 8;
    }

    // 3. Extract Medication Adherence
    if (lower.includes('missed') || lower.includes('forgot') || lower.includes('did not take') || lower.includes('భూల్ గయా') || lower.includes('తీసుకోలేదు')) {
      tookAllMedications = false;
    }

    return {
      painScore: painScore ?? 3,
      sleepHours: sleepHours ?? 7,
      fatigueScore: fatigueScore ?? 2,
      moodScore: 4,
      tookAllMedications,
      reportedSymptoms: transcript,
      rawTranscript: transcript,
    };
  }

  /**
   * Extracts doctor verbal instructions from spoken consultation/discharge audio
   */
  public extractDoctorInstruction(
    transcript: string,
    language: VoiceLanguage = 'en'
  ): VoiceDoctorInstructionPayload | null {
    const lower = transcript.toLowerCase();

    const hasInstructionIntent =
      lower.includes('weight') ||
      lower.includes('leg') ||
      lower.includes('bed') ||
      lower.includes('rest') ||
      lower.includes('walk') ||
      lower.includes('come back') ||
      lower.includes('return') ||
      lower.includes('follow up') ||
      lower.includes('days') ||
      lower.includes('weeks') ||
      lower.includes('dress') ||
      lower.includes('బరువు') ||
      lower.includes('రోజులు') ||
      lower.includes('वजन') ||
      lower.includes('दिन');

    if (!hasInstructionIntent) return null;

    let restriction = 'Follow general rest and recovery guidelines';
    if (lower.includes('no weight') || lower.includes('don\'t put weight') || lower.includes('do not put weight') || lower.includes('బరువు వేయవద్దు') || lower.includes('वजन मत डालना')) {
      restriction = 'Strict No Weight-Bearing on affected limb';
    } else if (lower.includes('bed rest') || lower.includes('complete rest')) {
      restriction = 'Complete Bed Rest';
    } else if (lower.includes('keep') && lower.includes('dry')) {
      restriction = 'Keep incision dressing clean and dry';
    }

    // Extract Duration (e.g. for two weeks, 14 days, 1 month)
    let duration = 'As advised';
    const forMatch = lower.match(/for\s+(\d+|two|three|four|one|2|3|4|1)\s*(weeks|days|months|ವಾರ|వారాలు|हफ्ते|दिन)/i);
    if (forMatch) {
      const numStr = forMatch[1].toLowerCase() === 'two' ? '2' : forMatch[1].toLowerCase() === 'three' ? '3' : forMatch[1];
      duration = `${numStr} ${forMatch[2]}`;
    } else {
      const durMatch = lower.match(/(\d+)\s*(weeks|days|months|ವಾರ|వారాలు|हफ्ते|दिन)/i);
      if (durMatch) {
        duration = durMatch[0];
      }
    }

    // Extract Follow-up days (e.g. return after 10 days, come back after 10 days)
    let followUpDays = 10;
    const followMatch = lower.match(/(?:after|in|return after|come back after)\s*(\d+)\s*(days|weeks)?/i);
    if (followMatch && followMatch[1]) {
      const num = parseInt(followMatch[1], 10);
      const unit = followMatch[2] || 'days';
      followUpDays = unit.includes('week') ? num * 7 : num;
    }

    return {
      restriction,
      duration,
      followUpDays,
      guidance: transcript,
      rawTranscript: transcript,
    };
  }
}
