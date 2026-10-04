enum EmergencyStatus {
  normal,
  urgentWarning,
  criticalEmergency,
}

class EmergencyEvaluation {
  final EmergencyStatus status;
  final String title;
  final String rationale;
  final String immediateAction;
  final String emergencyNumber;

  EmergencyEvaluation({
    required this.status,
    required this.title,
    required this.rationale,
    required this.immediateAction,
    this.emergencyNumber = '112 / 911 / 108',
  });

  bool get isEmergency => status == EmergencyStatus.criticalEmergency || status == EmergencyStatus.urgentWarning;
}

class EmergencySafetyEngine {
  static final List<Map<String, dynamic>> _redFlagPatterns = [
    {
      'keywords': ['crushing chest pain', 'chest tightness', 'pain radiating to left arm', 'jaw pain chest'],
      'title': 'Potential Acute Coronary / Cardiac Emergency',
      'rationale': 'Crushing chest pain radiating to the arm or jaw is a hallmark cardiac red flag.',
      'action': 'Call emergency services (112/108/911) immediately. Sit upright, rest, and do not drive yourself.',
      'status': EmergencyStatus.criticalEmergency,
    },
    {
      'keywords': ['face drooping', 'arm weakness', 'slurred speech', 'sudden vision loss', 'facial droop'],
      'title': 'Suspected Acute Stroke (FAST Symptoms)',
      'rationale': 'Sudden unilateral weakness, facial droop, or speech impairment indicates possible cerebral ischemia.',
      'action': 'Immediate emergency department transfer needed within the acute thrombolytic window.',
      'status': EmergencyStatus.criticalEmergency,
    },
    {
      'keywords': ['cannot breathe', 'severe shortness of breath', 'gasping for air', 'blue lips', 'stridor'],
      'title': 'Severe Respiratory Distress',
      'rationale': 'Inability to breathe or cyanosis indicates critical oxygenation failure.',
      'action': 'Call emergency ambulance immediately. Keep patient in a comfortable seated upright position.',
      'status': EmergencyStatus.criticalEmergency,
    },
    {
      'keywords': ['fever above 102', 'fever 103', 'fever 104', 'wound opening', 'pus leaking', 'red streaks wound'],
      'title': 'Post-Operative Surgical Site Infection / Dehiscence Red Flag',
      'rationale': 'High fever combined with wound discharge or gaping indicates post-surgical complication.',
      'action': 'Contact operating surgeon or hospital emergency triage immediately.',
      'status': EmergencyStatus.urgentWarning,
    },
    {
      'keywords': ['swollen one calf', 'calf pain walking', 'warm red swollen leg'],
      'title': 'Suspected Deep Vein Thrombosis (DVT)',
      'rationale': 'Unilateral leg swelling and calf tenderness post-surgery is a warning sign of venous thromboembolism.',
      'action': 'Seek urgent medical evaluation for Doppler ultrasound scan before mobilizing further.',
      'status': EmergencyStatus.urgentWarning,
    },
    {
      'keywords': ['throat swelling', 'swelling tongue', 'difficulty swallowing hives', 'anaphylaxis'],
      'title': 'Severe Anaphylactic Reaction Red Flag',
      'rationale': 'Rapidly spreading hives with airway or mucosal swelling is life-threatening.',
      'action': 'Administer auto-injectable epinephrine (EpiPen) if available and call emergency services immediately.',
      'status': EmergencyStatus.criticalEmergency,
    },
  ];

  static EmergencyEvaluation evaluateRedFlags(String text) {
    final lower = text.toLowerCase();

    for (var rule in _redFlagPatterns) {
      final keywords = rule['keywords'] as List<String>;
      for (var kw in keywords) {
        if (lower.contains(kw)) {
          return EmergencyEvaluation(
            status: rule['status'],
            title: rule['title'],
            rationale: rule['rationale'],
            immediateAction: rule['action'],
          );
        }
      }
    }

    return EmergencyEvaluation(
      status: EmergencyStatus.normal,
      title: 'No Immediate Red Flag Detected',
      rationale: 'Symptoms do not meet deterministic critical emergency escalation criteria.',
      immediateAction: 'Continue standard care and monitor recovery.',
    );
  }
}
