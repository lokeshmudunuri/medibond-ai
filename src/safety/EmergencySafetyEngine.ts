import { EmergencyEvaluation, EmergencyStatus } from '../types/chat';

interface RedFlagRule {
  keywords: string[];
  title: string;
  rationale: string;
  action: string;
  status: EmergencyStatus;
}

export class EmergencySafetyEngine {
  private static readonly RED_FLAG_PATTERNS: RedFlagRule[] = [
    {
      keywords: [
        'crushing chest pain',
        'chest pain',
        'severe chest pain',
        'chest tightness',
        'pain radiating to left arm',
        'jaw pain chest',
        'heart attack',
      ],
      title: 'Potential Acute Coronary / Cardiac Emergency',
      rationale: 'Crushing chest pain radiating to arm or jaw is a hallmark cardiac red flag requiring immediate emergency intervention.',
      action: 'Call emergency services (112 / 911 / 108) immediately. Sit upright, rest, do not exert yourself, and do not drive yourself.',
      status: EmergencyStatus.CriticalEmergency,
    },
    {
      keywords: ['face drooping', 'arm weakness', 'slurred speech', 'sudden vision loss', 'facial droop', 'stroke'],
      title: 'Suspected Acute Stroke (FAST Warning)',
      rationale: 'Sudden unilateral weakness, facial asymmetry, or speech impairment indicates possible acute cerebral ischemia.',
      action: 'Immediate emergency ambulance dispatch needed within the acute thrombolytic window. Note the exact time symptoms began.',
      status: EmergencyStatus.CriticalEmergency,
    },
    {
      keywords: ['cannot breathe', 'severe shortness of breath', 'gasping for air', 'blue lips', 'stridor', 'choking'],
      title: 'Severe Respiratory Failure / Airway Obstruction',
      rationale: 'Inability to speak in full sentences, cyanosis, or stridor indicates critical oxygenation failure.',
      action: 'Call emergency services immediately. Sit upright in a high-Fowler position and loosen tight clothing around neck.',
      status: EmergencyStatus.CriticalEmergency,
    },
    {
      keywords: ['fever above 102', 'fever 103', 'fever 104', 'wound opening', 'pus leaking', 'red streaks wound', 'wound burst', 'dehiscence'],
      title: 'Post-Operative Surgical Site Infection / Dehiscence Red Flag',
      rationale: 'High fever combined with wound discharge, erythema, or incision separation indicates post-surgical complication.',
      action: 'Contact operating surgeon or hospital emergency triage immediately. Do not apply home remedies to open incisions.',
      status: EmergencyStatus.UrgentWarning,
    },
    {
      keywords: ['swollen one calf', 'calf pain walking', 'warm red swollen leg', 'unilateral leg swelling', 'dvt'],
      title: 'Suspected Deep Vein Thrombosis (DVT)',
      rationale: 'Unilateral calf pain, tenderness, warmth, and swelling post-surgery is a warning sign of venous thromboembolism.',
      action: 'Seek urgent medical evaluation for bilateral compression Doppler ultrasound scan before mobilizing further.',
      status: EmergencyStatus.UrgentWarning,
    },
    {
      keywords: ['throat swelling', 'swelling tongue', 'difficulty swallowing hives', 'anaphylaxis', 'epipen'],
      title: 'Severe Anaphylactic Reaction Red Flag',
      rationale: 'Rapidly spreading urticaria with mucosal or laryngeal edema is a life-threatening systemic allergic response.',
      action: 'Administer auto-injectable epinephrine (EpiPen) immediately if available and call emergency ambulance.',
      status: EmergencyStatus.CriticalEmergency,
    },
  ];

  public static evaluateRedFlags(input: string): EmergencyEvaluation {
    const lower = input.toLowerCase();

    for (const rule of this.RED_FLAG_PATTERNS) {
      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          return {
            status: rule.status,
            title: rule.title,
            rationale: rule.rationale,
            immediateAction: rule.action,
            emergencyNumber: '112 / 911 / 108',
            isEmergency: true,
          };
        }
      }
    }

    return {
      status: EmergencyStatus.Normal,
      title: 'No Immediate Red Flag Detected',
      rationale: 'Symptoms do not meet deterministic critical emergency escalation criteria.',
      immediateAction: 'Continue standard care and monitor recovery.',
      emergencyNumber: '112 / 911 / 108',
      isEmergency: false,
    };
  }
}
