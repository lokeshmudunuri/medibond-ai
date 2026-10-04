class MedicalKnowledgeBase {
  static final Map<String, Map<String, String>> _drugDatabase = {
    'telmisartan': {
      'class': 'Angiotensin II Receptor Blocker (ARB)',
      'purpose': 'Manages high blood pressure (hypertension) and protects cardiovascular & kidney health.',
      'howItWorks': 'Relaxes blood vessels, allowing blood to flow more easily and reducing cardiac workload.',
      'commonSideEffects': 'Dizziness when standing up quickly, mild fatigue, back pain.',
      'keyCautions': 'Do not take during pregnancy. Avoid sudden potassium supplements without doctor guidance.',
    },
    'metformin': {
      'class': 'Biguanide Antidiabetic',
      'purpose': 'First-line treatment for Type 2 Diabetes Mellitus to maintain healthy blood glucose levels.',
      'howItWorks': 'Reduces glucose production by the liver and improves insulin sensitivity in body cells.',
      'commonSideEffects': 'Nausea, stomach upset, diarrhea (reduced by taking with meals or using XR formulations).',
      'keyCautions': 'Withhold temporarily before medical scans using iodinated contrast dye.',
    },
    'pantoprazole': {
      'class': 'Proton Pump Inhibitor (PPI)',
      'purpose': 'Reduces stomach acid secretion; used for GERD, gastric ulcers, and post-operative gastric protection.',
      'howItWorks': 'Blocks the acid pumps (H+/K+ ATPase enzymes) in the parietal cells of the stomach lining.',
      'commonSideEffects': 'Mild headache, diarrhea, abdominal discomfort.',
      'keyCautions': 'Best taken on an empty stomach 30 minutes before the morning meal.',
    },
    'amoxicillin': {
      'class': 'Beta-lactam Antibiotic (Aminopenicillin)',
      'purpose': 'Treats bacterial infections such as respiratory, ENT, skin, and urinary tract infections.',
      'howItWorks': 'Inhibits bacterial cell wall synthesis leading to bacterial lysis.',
      'commonSideEffects': 'Mild diarrhea, nausea, rash.',
      'keyCautions': 'Contraindicated in individuals with known Penicillin allergies.',
    },
    'paracetamol': {
      'class': 'Analgesic & Antipyretic',
      'purpose': 'Relieves mild-to-moderate pain and reduces fever.',
      'howItWorks': 'Inhibits prostaglandin synthesis in the central nervous system.',
      'commonSideEffects': 'Rare at therapeutic doses; safe for stomach compared to NSAIDs.',
      'keyCautions': 'Do not exceed 4,000 mg in 24 hours to prevent hepatotoxicity.',
    },
  };

  static final Map<String, String> _conditionGuides = {
    'hypertension': 'High blood pressure occurs when the force of blood against artery walls is consistently elevated. Standard target is usually < 130/80 mmHg. Lifestyle modifications including low sodium diet, regular walking, and medication adherence are key.',
    'diabetes': 'Type 2 Diabetes occurs when cells become resistant to insulin or the pancreas produces insufficient insulin. Key monitoring markers include Fasting Blood Sugar (70-100 mg/dL normal) and HbA1c (< 7% target for most adults).',
    'laparoscopic appendectomy': 'Surgical removal of the vermiform appendix via small abdominal keyhole incisions. Standard recovery spans 1 to 2 weeks. Restrict heavy lifting (> 5kg) for 3-4 weeks. Keep port sites clean and dry.',
  };

  static Map<String, String>? getDrugInfo(String nameOrGeneric) {
    final lower = nameOrGeneric.toLowerCase();
    for (var entry in _drugDatabase.entries) {
      if (lower.contains(entry.key) || entry.key.contains(lower)) {
        return entry.value;
      }
    }
    return null;
  }

  static String? getConditionGuide(String conditionName) {
    final lower = conditionName.toLowerCase();
    for (var entry in _conditionGuides.entries) {
      if (lower.contains(entry.key)) {
        return entry.value;
      }
    }
    return null;
  }
}
