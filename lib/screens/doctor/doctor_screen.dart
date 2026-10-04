import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../services/doctor_handoff/doctor_handoff_engine.dart';

class DoctorScreen extends StatefulWidget {
  const DoctorScreen({super.key});

  @override
  State<DoctorScreen> createState() => _DoctorScreenState();
}

class _DoctorScreenState extends State<DoctorScreen> {
  final DoctorHandoffEngine _handoffEngine = DoctorHandoffEngine();

  DoctorSummaryType _selectedType = DoctorSummaryType.generalDoctor;
  String _specialty = 'Cardiology';
  DoctorSummaryReport? _report;
  bool _isGenerating = false;
  StreamSubscription? _eventSub;

  final List<String> _specialties = [
    'Cardiology',
    'Endocrinology',
    'General Surgery',
    'Orthopedics',
    'Gastroenterology',
    'Pulmonology',
    'Neurology',
  ];

  @override
  void initState() {
    super.initState();
    _generateSummary();
    _eventSub = HealthEventBus().stream.listen((event) {
      if (mounted) {
        _generateSummary();
      }
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    super.dispose();
  }

  Future<void> _generateSummary() async {
    setState(() {
      _isGenerating = true;
    });

    final rep = await _handoffEngine.generateSummary(
      type: _selectedType,
      targetedSpecialty: _specialty,
    );

    if (mounted) {
      setState(() {
        _report = rep;
        _isGenerating = false;
      });
    }
  }

  void _copyToClipboard() {
    if (_report != null) {
      Clipboard.setData(ClipboardData(text: _report!.toFormattedPlainText()));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Doctor Clinical Summary copied to clipboard!'),
          backgroundColor: AppTheme.primaryTeal,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Doctor Handoff Engine'),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy),
            tooltip: 'Copy Summary',
            onPressed: _copyToClipboard,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Regenerate',
            onPressed: _generateSummary,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Clinical Problem Explanation Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.accentTeal.withValues(alpha: 0.4)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.medical_information, color: AppTheme.primaryTeal, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cross-Doctor Health Context Handoff',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryDark),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'When seeing a new doctor for a new or unrelated problem, they may not know your chronic conditions, allergies, or recent surgery. CareBond synthesizes a concise, provenance-aware clinical dossier.',
                          style: TextStyle(fontSize: 11, color: AppTheme.textPrimary, height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Summary Configuration Selectors
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Select Summary Purpose:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<DoctorSummaryType>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: DoctorSummaryType.generalDoctor, child: Text('General Physician Summary', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: DoctorSummaryType.specialist, child: Text('Specialist Consultation Summary', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: DoctorSummaryType.followUp, child: Text('Routine Follow-up Summary', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: DoctorSummaryType.recoveryReview, child: Text('Post-Surgical Recovery Review', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: DoctorSummaryType.secondOpinion, child: Text('Second Opinion Dossier', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: DoctorSummaryType.urgentConsultation, child: Text('Urgent Consultation Handoff', style: TextStyle(fontSize: 13))),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedType = val;
                          });
                          _generateSummary();
                        }
                      },
                    ),
                    if (_selectedType == DoctorSummaryType.specialist) ...[
                      const SizedBox(height: 12),
                      const Text('Target Specialty:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: _specialty,
                        decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                        items: _specialties.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13)))).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _specialty = val;
                            });
                            _generateSummary();
                          }
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Summary Display
            if (_isGenerating)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(color: AppTheme.primaryTeal),
                ),
              )
            else if (_report != null) ...[
              _buildReportSection(
                title: _report!.title,
                icon: Icons.assignment_turned_in_outlined,
                content: _report!.patientHeader,
                isHeader: true,
              ),
              const SizedBox(height: 12),
              _buildReportSection(
                title: '1. Documented Conditions',
                icon: Icons.healing_outlined,
                content: _report!.activeConditionsSection,
              ),
              const SizedBox(height: 12),
              _buildReportSection(
                title: '2. Current Active Medications',
                icon: Icons.medication_outlined,
                content: _report!.currentMedicationsSection,
              ),
              const SizedBox(height: 12),
              _buildReportSection(
                title: '3. Known Allergies & Contraindications',
                icon: Icons.warning_amber_rounded,
                content: _report!.allergiesSection,
                accentColor: AppTheme.severityWarning,
              ),
              const SizedBox(height: 12),
              _buildReportSection(
                title: '4. Surgical History & Recovery Status',
                icon: Icons.local_hospital_outlined,
                content: '${_report!.surgicalHistorySection}\n\n${_report!.recoveryStatusSection}',
              ),
              const SizedBox(height: 12),
              _buildReportSection(
                title: '5. Recent Labs & Diagnostic Findings',
                icon: Icons.biotech_outlined,
                content: _report!.recentReportsSection,
              ),
              if (_report!.genomicContextSection.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildReportSection(
                  title: '6. Pharmacogenetic Context (CYP / HLA)',
                  icon: Icons.science_outlined,
                  content: _report!.genomicContextSection,
                  accentColor: const Color(0xFF6B21A8),
                ),
              ],
              const SizedBox(height: 12),
              _buildReportSection(
                title: '7. Clinician Review Prompts',
                icon: Icons.help_outline,
                content: _report!.clinicianQuestionsSection,
                accentColor: AppTheme.primaryTeal,
              ),
              const SizedBox(height: 16),

              // Provenance Legend & Legal Notice Card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWarm,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Data Provenance Legend:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppTheme.primaryDark)),
                    SizedBox(height: 4),
                    Text(
                      '[DOC] = Clinically Documented in Report/Prescription\n'
                      '[USER] = Patient-Reported via Daily Check-in / Input\n'
                      '[SYS] = Sensor Detected via Continuous Baseline (EWMA/MAD)\n'
                      '[REVIEW] = Unconfirmed OCR Extraction Awaiting Verification\n'
                      '[URGENT] = Safety Engine Emergency Escalation Flag',
                      style: TextStyle(fontSize: 10, color: AppTheme.textSecondary, height: 1.4),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'DISCLAIMER: For clinical review only. CareBond AI does not diagnose conditions or prescribe treatments autonomously.',
                      style: TextStyle(fontSize: 9, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              ElevatedButton.icon(
                onPressed: _copyToClipboard,
                icon: const Icon(Icons.copy, size: 18),
                label: const Text('Copy Clinical Summary to Clipboard', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
              const SizedBox(height: 30),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildReportSection({
    required String title,
    required IconData icon,
    required String content,
    bool isHeader = false,
    Color? accentColor,
  }) {
    final color = accentColor ?? AppTheme.textPrimary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: accentColor ?? AppTheme.primaryTeal),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: isHeader ? 14 : 13,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const Divider(height: 16),
            Text(
              content.isNotEmpty ? content : 'None recorded.',
              style: const TextStyle(fontSize: 12, height: 1.45, color: AppTheme.textPrimary),
            ),
          ],
        ),
      ),
    );
  }
}
