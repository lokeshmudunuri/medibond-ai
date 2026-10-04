export interface DoctorSpecialistProfile {
  id: string;
  name: string;
  isDemoProfile: boolean;
  specialty: string;
  subSpecialties: string[];
  experienceYears: number;
  hospitalName: string;
  hospitalLocation: string;
  bio: string;
  languages: string[];
  conditionsHandled: string[];
  defaultRecoveryDurationDays: number;
  sampleInstructions: string[];
  sampleRestrictions: string[];
  sampleDietGuidance: string;
  typicalMilestones: {
    dayNumber: number;
    title: string;
    description: string;
  }[];
  contactInfo: {
    phone: string;
    email: string;
    clinicHours: string;
    teleconsultAvailable: boolean;
  };
}

export class DoctorDirectoryService {
  private static specialists: DoctorSpecialistProfile[] = [
    {
      id: 'doc_ortho_01',
      name: 'Dr. Ravi Kumar (Demo)',
      isDemoProfile: true,
      specialty: 'Orthopedics',
      subSpecialties: ['Joint Replacement', 'Fracture Care', 'Spine Rehabilitation'],
      experienceYears: 16,
      hospitalName: 'Rashi Orthopedic Hospital',
      hospitalLocation: 'Hyderabad, Telangana',
      bio: 'Consultant Orthopedic Surgeon specializing in post-surgical mobility restoration, joint replacement recovery, and bone healing monitoring.',
      languages: ['English', 'Telugu', 'Hindi'],
      conditionsHandled: ['Post Total Knee Replacement (TKR)', 'Post Hip Arthroplasty', 'Fracture Recovery', 'ACL Reconstruction'],
      defaultRecoveryDurationDays: 45,
      sampleInstructions: [
        'Perform prescribed ankle pumps and quad sets every 2 hours while awake.',
        'Use walker/crutches as advised; strictly avoid unassisted weight bearing for 2 weeks.',
        'Keep operative wound clean and dry; do not soak in water until suture removal.',
        'Take prescribed analgesics 30 minutes before physiotherapy sessions.',
      ],
      sampleRestrictions: [
        'No cross-legged sitting or low chair seating.',
        'No lifting loads over 5 kg.',
        'No sudden twisting or pivoting on operative limb.',
      ],
      sampleDietGuidance: 'High-protein diet (dal, eggs, paneer), calcium-rich foods (milk, ragi), and adequate hydration to support bone and muscle healing.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Discharge & Home Setup', description: 'Patient mobilized safely with walker and discharged with oral meds.' },
        { dayNumber: 3, title: 'Wound Dressing & Swelling Check', description: 'Evaluate surgical incision, localized warmth, and edema.' },
        { dayNumber: 7, title: 'Physiotherapy Phase 1', description: 'Active-assisted knee flexion to 90 degrees and quad control.' },
        { dayNumber: 14, title: 'Suture / Staple Removal', description: 'Clinic inspection and transition to single-cane support if stable.' },
        { dayNumber: 30, title: 'Independent Ambulation Review', description: 'Strengthening regimen and functional gait retraining.' },
      ],
      contactInfo: {
        phone: '+91 98765 43210 (Demo)',
        email: 'dr.ravi.ortho@rashi-demo.org',
        clinicHours: 'Mon-Sat 10:00 AM - 05:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_surgery_02',
      name: 'Dr. Priya Sharma (Demo)',
      isDemoProfile: true,
      specialty: 'General Surgery',
      subSpecialties: ['Laparoscopic Surgery', 'Hernia Repair', 'Gastrointestinal Procedures'],
      experienceYears: 14,
      hospitalName: 'Apollo Care Surgical Center',
      hospitalLocation: 'Bengaluru, Karnataka',
      bio: 'Senior General & Laparoscopic Surgeon dedicated to smooth postoperative recovery, wound healing, and early return to daily activities.',
      languages: ['English', 'Hindi', 'Kannada'],
      conditionsHandled: ['Post Laparoscopic Appendectomy', 'Post Cholecystectomy', 'Post Inguinal Hernioplasty', 'Post Laparotomy'],
      defaultRecoveryDurationDays: 21,
      sampleInstructions: [
        'Check wound site daily for erythema, purulent discharge, or spreading redness.',
        'Walk gently around the room 3-4 times a day to prevent venous thromboembolism.',
        'Support abdominal wall with a small pillow when coughing or deep breathing.',
      ],
      sampleRestrictions: [
        'Strictly avoid heavy weight lifting (>4 kg) for 4 weeks.',
        'Avoid driving until free from narcotic pain medication and abdominal tenderness.',
      ],
      sampleDietGuidance: 'Bland, easily digestible diet (khichdi, oats, clear soups). Avoid carbonated beverages and deeply fried items for 2 weeks.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Post-Op Discharge', description: 'Vitals stable, tolerating soft oral feeds, pain controlled.' },
        { dayNumber: 3, title: 'Early Recovery & Bowel Regularity', description: 'Ensure normal flatus and bowel movement with stool softeners if needed.' },
        { dayNumber: 8, title: 'Incision Inspection', description: 'Inspect laparoscopic port sites or surgical staples.' },
        { dayNumber: 21, title: 'Full Activity Clearance', description: 'Final surgical sign-off for returning to work.' },
      ],
      contactInfo: {
        phone: '+91 98450 11223 (Demo)',
        email: 'dr.priya.surgery@apollocare-demo.org',
        clinicHours: 'Mon-Fri 09:00 AM - 04:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_cardio_03',
      name: 'Dr. Suresh Reddy (Demo)',
      isDemoProfile: true,
      specialty: 'Cardiology',
      subSpecialties: ['Interventional Cardiology', 'Post-CABG Care', 'Heart Failure Management'],
      experienceYears: 20,
      hospitalName: 'Care Heart & Vascular Institute',
      hospitalLocation: 'Hyderabad, Telangana',
      bio: 'Cardiologist focused on post-angioplasty recovery, cardiac rehabilitation, blood pressure optimization, and antiplatelet compliance.',
      languages: ['English', 'Telugu', 'Hindi'],
      conditionsHandled: ['Post Percutaneous Coronary Intervention (PCI / Stent)', 'Post CABG Recovery', 'Post Myocardial Infarction'],
      defaultRecoveryDurationDays: 60,
      sampleInstructions: [
        'Take blood thinners (antiplatelets) exactly at the same time every morning; never skip a dose.',
        'Record morning and evening Blood Pressure and Heart Rate daily.',
        'Engage in 15-minute level walking daily, gradually increasing duration as tolerated.',
      ],
      sampleRestrictions: [
        'No vigorous exertion, sprinting, or heavy pulling.',
        'Seek immediate medical care if experiencing chest pressure, radiation to jaw/arm, or breathlessness.',
      ],
      sampleDietGuidance: 'Strict low-sodium (<2g salt/day), low saturated fat Mediterranean-style diet. Zero trans fats, increase leafy greens and oats.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Cath Lab Discharge', description: 'Access site checked for hematoma, antiplatelet regimen confirmed.' },
        { dayNumber: 7, title: 'Access Site Healing & BP Review', description: 'Radial/femoral site closure check, initial ECG review.' },
        { dayNumber: 30, title: 'Cardiac Rehab Phase 2', description: 'Submaximal treadmill stress evaluation and lipid profile reassessment.' },
        { dayNumber: 60, title: 'Stable Maintenance Status', description: 'Long-term medication optimization and lifestyle review.' },
      ],
      contactInfo: {
        phone: '+91 98111 22334 (Demo)',
        email: 'dr.suresh.cardio@careheart-demo.org',
        clinicHours: 'Mon-Sat 11:00 AM - 06:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_neuro_04',
      name: 'Dr. Ananya Iyer (Demo)',
      isDemoProfile: true,
      specialty: 'Neurology',
      subSpecialties: ['Stroke Rehabilitation', 'Post-Craniotomy Care', 'Neuropathy Management'],
      experienceYears: 15,
      hospitalName: 'NIMHANS Neuro Recovery Center',
      hospitalLocation: 'Bengaluru, Karnataka',
      bio: 'Neurologist and Neuro-rehabilitation Specialist guiding patients through neuroplasticity recovery, speech therapy, and motor retraining.',
      languages: ['English', 'Kannada', 'Hindi'],
      conditionsHandled: ['Post Ischemic Stroke Recovery', 'Post Craniotomy', 'Peripheral Neuropathy', 'Bell\'s Palsy'],
      defaultRecoveryDurationDays: 90,
      sampleInstructions: [
        'Perform daily physical and occupational therapy exercises as scheduled.',
        'Ensure a clutter-free environment and adequate lighting to prevent accidental falls.',
        'Monitor for signs of facial droop, limb weakness, or slurred speech (FAST criteria).',
      ],
      sampleRestrictions: [
        'No unassisted walking until gait stability is certified by physical therapy.',
        'Avoid sleep deprivation and excessive screen fatigue.',
      ],
      sampleDietGuidance: 'Neuro-protective diet rich in omega-3 fatty acids (walnuts, flaxseeds, fish), colorful berries, and low glycemic index grains.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Inpatient Rehab Transition', description: 'Baseline NIHSS and motor score recorded, home safety plan created.' },
        { dayNumber: 14, title: 'Early Motor Retraining', description: 'Grip strength, fine motor coordination, and speech fluency review.' },
        { dayNumber: 45, title: 'ADL Independence Check', description: 'Assessment of independent dressing, bathing, and assisted transfers.' },
        { dayNumber: 90, title: 'Functional Outcome Milestone', description: 'Comprehensive neurological recovery score.' },
      ],
      contactInfo: {
        phone: '+91 97400 33445 (Demo)',
        email: 'dr.ananya.neuro@nimhans-demo.org',
        clinicHours: 'Tue-Sun 10:00 AM - 04:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_physio_05',
      name: 'Dr. Vikram Varma (Demo)',
      isDemoProfile: true,
      specialty: 'Physiotherapy',
      subSpecialties: ['Orthopedic Rehabilitation', 'Sports Injury Rehab', 'Spinal Posture Therapy'],
      experienceYears: 12,
      hospitalName: 'Prime Motion Physio & Rehab',
      hospitalLocation: 'Visakhapatnam, Andhra Pradesh',
      bio: 'Lead Physiotherapist specializing in biomechanical recovery, muscle strengthening, joint range of motion, and posture rehabilitation.',
      languages: ['English', 'Telugu'],
      conditionsHandled: ['Post-Op Knee/Hip Rehab', 'Frozen Shoulder', 'Lumbar Radiculopathy', 'Post-Sprain Recovery'],
      defaultRecoveryDurationDays: 30,
      sampleInstructions: [
        'Apply ice pack for 15 minutes after exercise sessions to reduce localized inflammation.',
        'Maintain steady breathing during stretches; never hold your breath during exertion.',
        'Perform passive range of motion exercises 3 times daily.',
      ],
      sampleRestrictions: [
        'Stop immediately if pain exceeds 6/10 on the visual analog scale.',
        'Avoid jerky, sudden uncontrolled movements.',
      ],
      sampleDietGuidance: 'Adequate hydration (2.5 - 3 liters water daily) and electrolyte balance to prevent muscle cramping and facilitate tissue repair.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Baseline Range of Motion', description: 'Initial goniometric joint angles and pain tolerance recorded.' },
        { dayNumber: 7, title: 'Phase 1: Pain & Edema Control', description: 'Reduction in resting pain and restoration of basic mobility.' },
        { dayNumber: 15, title: 'Phase 2: Progressive Resistance', description: 'Introduction of low-resistance elastic bands.' },
        { dayNumber: 30, title: 'Phase 3: Functional Restoration', description: 'Return to normal gait and occupational tasks.' },
      ],
      contactInfo: {
        phone: '+91 99880 55667 (Demo)',
        email: 'dr.vikram.physio@primemotion-demo.org',
        clinicHours: 'Mon-Sat 08:00 AM - 02:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_pulmo_06',
      name: 'Dr. Meera Nambiar (Demo)',
      isDemoProfile: true,
      specialty: 'Pulmonology',
      subSpecialties: ['Respiratory Rehabilitation', 'Post-Pneumonia Recovery', 'Asthma & COPD'],
      experienceYears: 18,
      hospitalName: 'Breathe Well Pulmonary Clinic',
      hospitalLocation: 'Kochi, Kerala',
      bio: 'Pulmonologist guiding respiratory recovery through incentive spirometry, oxygen weaning, breathing retraining, and infection prevention.',
      languages: ['English', 'Hindi', 'Malayalam'],
      conditionsHandled: ['Post Viral/Bacterial Pneumonia', 'Post COVID-19 Lung Recovery', 'COPD Exacerbation Recovery', 'Pleural Effusion Post-Drainage'],
      defaultRecoveryDurationDays: 30,
      sampleInstructions: [
        'Perform Incentive Spirometry 10 breaths every waking hour.',
        'Measure resting SpO2 twice daily with pulse oximeter; alert clinic if SpO2 drops below 94%.',
        'Practice pursed-lip breathing during bouts of exertion or breathlessness.',
      ],
      sampleRestrictions: [
        'Strict avoidance of active and passive smoke, strong perfumes, and dust.',
        'Avoid crowded, poorly ventilated indoor areas.',
      ],
      sampleDietGuidance: 'Small, frequent nutrient-dense meals to prevent diaphragm crowding and fatigue. Warm fluids and ginger tea for throat comfort.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Discharge Oxygen Check', description: 'Confirm baseline room air oxygen saturation >=95%.' },
        { dayNumber: 5, title: 'Spirometry Volume Progress', description: 'Increase inspiratory volume to target marker.' },
        { dayNumber: 14, title: '6-Minute Walk Test Review', description: 'Verify exercise tolerance without significant desaturation.' },
        { dayNumber: 30, title: 'Pulmonary Clearance & Normalization', description: 'Follow-up chest X-ray and lung function review.' },
      ],
      contactInfo: {
        phone: '+91 94470 66778 (Demo)',
        email: 'dr.meera.pulmo@breathewell-demo.org',
        clinicHours: 'Mon-Fri 09:30 AM - 03:30 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_gastro_07',
      name: 'Dr. Rajesh Deshmukh (Demo)',
      isDemoProfile: true,
      specialty: 'Gastroenterology',
      subSpecialties: ['Digestive Recovery', 'Post-Endoscopy Care', 'IBD & Liver Convalescence'],
      experienceYears: 17,
      hospitalName: 'City Digestive & Liver Care',
      hospitalLocation: 'Mumbai, Maharashtra',
      bio: 'Consultant Gastroenterologist managing post-procedural gastrointestinal recovery, gut microbiome restoration, and liver healing.',
      languages: ['English', 'Hindi', 'Marathi'],
      conditionsHandled: ['Post Endoscopic Polypectomy', 'Post Acute Pancreatitis Recovery', 'GERD & Peptic Ulcer Healing', 'Fatty Liver Reversal'],
      defaultRecoveryDurationDays: 28,
      sampleInstructions: [
        'Take proton pump inhibitor (PPI) exactly 30 minutes before the morning meal.',
        'Remain upright for at least 45 minutes after eating.',
        'Keep a daily food and symptom diary to identify gastric triggers.',
      ],
      sampleRestrictions: [
        'No spicy, highly oily, citrus, or caffeinated items for 3 weeks.',
        'No alcohol consumption during active gastric mucosal healing.',
      ],
      sampleDietGuidance: 'Soft, probiotic-rich diet (curd, buttermilk, boiled vegetables, tender coconut water). Avoid late-night snacking.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Post-Procedure Clearance', description: 'Tolerating clear liquids without nausea or epigastric pain.' },
        { dayNumber: 7, title: 'Dietary Transition', description: 'Progression from semi-solid to balanced soft solid meals.' },
        { dayNumber: 28, title: 'Mucosal Healing Review', description: 'Symptom resolution and medication step-down plan.' },
      ],
      contactInfo: {
        phone: '+91 98200 77889 (Demo)',
        email: 'dr.rajesh.gastro@cityliver-demo.org',
        clinicHours: 'Mon-Sat 10:00 AM - 05:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_derma_08',
      name: 'Dr. Shalini Rao (Demo)',
      isDemoProfile: true,
      specialty: 'Dermatology',
      subSpecialties: ['Wound Healing & Scarring', 'Post-Biopsy Care', 'Skin Graft Recovery'],
      experienceYears: 13,
      hospitalName: 'Skin & Wound Restoration Institute',
      hospitalLocation: 'Hyderabad, Telangana',
      bio: 'Dermatologist focused on surgical wound healing, sterile dressings, scar minimization, and skin barrier recovery.',
      languages: ['English', 'Telugu', 'Hindi'],
      conditionsHandled: ['Post Skin Biopsy', 'Post Cyst Excision', 'Wound Dehiscence Prevention', 'Post Burn Rehabilitation'],
      defaultRecoveryDurationDays: 14,
      sampleInstructions: [
        'Clean wound with sterile normal saline before applying prescribed antibiotic ointment.',
        'Apply silicone gel sheet after complete epithelialization to reduce hypertrophic scarring.',
        'Protect wound from direct sunlight with physical coverage or SPF 50 sunscreen.',
      ],
      sampleRestrictions: [
        'Do not scratch, pick at scabs, or vigorously rub healing skin.',
        'Avoid swimming pools and saunas until incision is completely closed.',
      ],
      sampleDietGuidance: 'Vitamin C-rich foods (amla, oranges, bell peppers) and zinc-rich foods to accelerate collagen synthesis.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Initial Dressing Setup', description: 'Sterile dressing applied with appropriate pressure.' },
        { dayNumber: 4, title: 'Exudate & Margin Inspection', description: 'Check for signs of localized secondary infection.' },
        { dayNumber: 10, title: 'Suture Removal & Scar Protocol', description: 'Remove sutures and initiate topical scar therapy.' },
      ],
      contactInfo: {
        phone: '+91 97000 88990 (Demo)',
        email: 'dr.shalini.derma@skinrestoration-demo.org',
        clinicHours: 'Mon-Fri 11:00 AM - 04:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_ent_09',
      name: 'Dr. Arvind Swamy (Demo)',
      isDemoProfile: true,
      specialty: 'ENT',
      subSpecialties: ['Sinonasal Recovery', 'Post-Tonsillectomy Care', 'Otologic Rehabilitation'],
      experienceYears: 15,
      hospitalName: 'Apex ENT & Head-Neck Clinic',
      hospitalLocation: 'Chennai, Tamil Nadu',
      bio: 'ENT Surgeon specialized in post-rhinoplasty healing, tonsillectomy recovery, sinus hygiene, and voice rest protocols.',
      languages: ['English', 'Tamil', 'Telugu'],
      conditionsHandled: ['Post Functional Endoscopic Sinus Surgery (FESS)', 'Post Tonsillectomy', 'Post Tympanoplasty', 'Post Septoplasty'],
      defaultRecoveryDurationDays: 14,
      sampleInstructions: [
        'Perform gentle isotonic saline nasal douches 4 times daily as directed.',
        'Sneeze with mouth open to prevent sudden intranasal pressure spikes.',
        'Sleep with head elevated on 2 pillows for the first 5 days.',
      ],
      sampleRestrictions: [
        'No nose blowing for 10 days post-surgery.',
        'Avoid hot, spicy, or crunchy foods that could irritate throat scabs.',
      ],
      sampleDietGuidance: 'Cool or room temperature soft foods (ice cream, yogurt, custard, cold porridge) for the first 48 hours.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Post-Surgical Airway & Bleeding Check', description: 'Verify no active epistaxis or airway compromise.' },
        { dayNumber: 5, title: 'Nasal Pack Removal / Slough Check', description: 'Gentle clinic debridement if indicated.' },
        { dayNumber: 14, title: 'Airway & Hearing Restoration', description: 'Final endoscopic visualization of mucosal healing.' },
      ],
      contactInfo: {
        phone: '+91 98400 99001 (Demo)',
        email: 'dr.arvind.ent@apexent-demo.org',
        clinicHours: 'Mon-Sat 09:00 AM - 03:00 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_uro_10',
      name: 'Dr. Manoj Nair (Demo)',
      isDemoProfile: true,
      specialty: 'Urology',
      subSpecialties: ['Post-TURP Recovery', 'Kidney Stone Post-Op', 'Catheter Management'],
      experienceYears: 19,
      hospitalName: 'Lakeshore Urology Center',
      hospitalLocation: 'Kochi, Kerala',
      bio: 'Urologist managing post-urological intervention healing, urinary symptom score monitoring, and fluid balance protocols.',
      languages: ['English', 'Malayalam', 'Hindi'],
      conditionsHandled: ['Post TURP (Prostate Surgery)', 'Post URS / PCNL for Renal Calculi', 'Post Catheter Removal Recovery'],
      defaultRecoveryDurationDays: 21,
      sampleInstructions: [
        'Maintain high fluid intake (2.5 - 3.5 liters/day) to keep urine clear and pale yellow.',
        'Avoid straining during urination or defecation; use prescribed stool softeners.',
        'Report immediately if urine becomes frank red with large blood clots or if unable to pass urine.',
      ],
      sampleRestrictions: [
        'No heavy lifting or strenuous exertion for 3 weeks.',
        'Avoid sexual activity for 4 weeks following prostate or bladder procedures.',
      ],
      sampleDietGuidance: 'High-fiber diet with low oxalate intake if recovering from kidney stones. Limit excessive salt and animal proteins.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Catheter Removal & Voiding Trial', description: 'Successful spontaneous voiding with minimal post-void residue.' },
        { dayNumber: 7, title: 'Hematuria Resolution Review', description: 'Confirm urine is clear with no dysuria or fever.' },
        { dayNumber: 21, title: 'Urological Clearance', description: 'Urinary flow rate and final recovery sign-off.' },
      ],
      contactInfo: {
        phone: '+91 94460 11234 (Demo)',
        email: 'dr.manoj.uro@lakeshore-demo.org',
        clinicHours: 'Mon-Fri 10:00 AM - 04:30 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_gyn_11',
      name: 'Dr. Sunita Murthy (Demo)',
      isDemoProfile: true,
      specialty: 'Gynecology',
      subSpecialties: ['Post-Cesarean Recovery', 'Post-Hysterectomy Care', 'Pelvic Floor Rehab'],
      experienceYears: 16,
      hospitalName: 'Mother & Cradle Women\'s Hospital',
      hospitalLocation: 'Bengaluru, Karnataka',
      bio: 'Obstetrician & Gynecologist dedicated to holistic postpartum and post-gynecological surgical recovery, lactation support, and incision care.',
      languages: ['English', 'Kannada', 'Telugu', 'Hindi'],
      conditionsHandled: ['Post Lower Segment Cesarean Section (LSCS)', 'Post Total Laparoscopic Hysterectomy', 'Post Ovarian Cystectomy'],
      defaultRecoveryDurationDays: 42,
      sampleInstructions: [
        'Keep Pfannenstiel incision dry and clean; inspect daily for swelling or oozing.',
        'Take iron and calcium supplements with meals as prescribed for 3 months.',
        'Perform gentle pelvic floor (Kegel) exercises starting 2 weeks post-procedure if pain-free.',
      ],
      sampleRestrictions: [
        'No lifting anything heavier than your baby for 6 weeks.',
        'Avoid tub baths, tampons, and intercourse for 6 weeks.',
      ],
      sampleDietGuidance: 'Iron-rich foods (spinach, jaggery, beetroot), lactation-friendly galactagogues (methi, garlic, oats), and plenty of fluids.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Hospital Discharge', description: 'Pain managed with oral analgesics, voiding normally, incision intact.' },
        { dayNumber: 7, title: 'Wound Check & Lochia Review', description: 'Check incision healing and postpartum bleeding volume.' },
        { dayNumber: 21, title: 'Mobility & Mood Check', description: 'Screen for postpartum fatigue and emotional well-being.' },
        { dayNumber: 42, title: '6-Week Post-Surgical Sign-off', description: 'Pelvic exam and clearance for normal exercise.' },
      ],
      contactInfo: {
        phone: '+91 98455 66778 (Demo)',
        email: 'dr.sunita.gyn@mothercradle-demo.org',
        clinicHours: 'Mon-Sat 09:30 AM - 03:30 PM',
        teleconsultAvailable: true,
      },
    },
    {
      id: 'doc_genmed_12',
      name: 'Dr. Ashok Varma (Demo)',
      isDemoProfile: true,
      specialty: 'General Medicine',
      subSpecialties: ['Post-Infection Convalescence', 'Geriatric Recovery', 'Metabolic Stabilization'],
      experienceYears: 22,
      hospitalName: 'CareBond Memorial Health Center',
      hospitalLocation: 'Hyderabad, Telangana',
      bio: 'Senior Consultant Physician specializing in whole-patient recovery following acute illnesses, sepsis recovery, glycemic management, and medication reconciliation.',
      languages: ['English', 'Telugu', 'Hindi'],
      conditionsHandled: ['Post Dengue / Viral Sepsis Recovery', 'Post Diabetic Ketoacidosis Stabilization', 'Post Acute Pyelonephritis', 'Geriatric Frailty Rehab'],
      defaultRecoveryDurationDays: 21,
      sampleInstructions: [
        'Complete full course of oral antibiotics even if feeling completely well.',
        'Log fasting and post-prandial blood sugars daily in your health log.',
        'Stay well-hydrated with oral rehydration solutions and fresh soups.',
      ],
      sampleRestrictions: [
        'Avoid strenuous physical labor until platelet counts and liver enzymes normalize.',
        'Do not self-prescribe OTC NSAIDs or analgesics.',
      ],
      sampleDietGuidance: 'High-calorie, easily digestible home-cooked meals with plenty of fluids, tender coconut water, and fresh fruits.',
      typicalMilestones: [
        { dayNumber: 0, title: 'Discharge & Medication Reconciliation', description: 'Consolidated discharge prescriptions and home care instructions.' },
        { dayNumber: 5, title: 'Vitals & Lab Recheck', description: 'Complete Blood Count (CBC) and Renal Function Test (RFT) follow-up.' },
        { dayNumber: 14, title: 'Energy & Functional Recovery', description: 'Fatigue reduction and nutritional assessment.' },
        { dayNumber: 21, title: 'Full Convalescence Clearance', description: 'Final physician review and long-term preventive health plan.' },
      ],
      contactInfo: {
        phone: '+91 98765 11223 (Demo)',
        email: 'dr.ashok.genmed@carebond-demo.org',
        clinicHours: 'Mon-Sat 09:00 AM - 06:00 PM',
        teleconsultAvailable: true,
      },
    },
  ];

  public static getAllSpecialists(): DoctorSpecialistProfile[] {
    return this.specialists;
  }

  public static getSpecialistById(id: string): DoctorSpecialistProfile | undefined {
    return this.specialists.find(s => s.id === id);
  }

  public static getSpecialistsBySpecialty(specialty: string): DoctorSpecialistProfile[] {
    return this.specialists.filter(s => s.specialty.toLowerCase() === specialty.toLowerCase());
  }

  public static searchSpecialists(query: string): DoctorSpecialistProfile[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.specialists;
    return this.specialists.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      s.hospitalName.toLowerCase().includes(q) ||
      s.conditionsHandled.some(c => c.toLowerCase().includes(q))
    );
  }
}
