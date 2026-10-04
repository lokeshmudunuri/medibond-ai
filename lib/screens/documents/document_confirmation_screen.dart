import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../models/medicine.dart';
import '../../models/provenance.dart';
import '../../models/report.dart';
import '../../services/documents/document_pipeline.dart';
import '../../ui/widgets/provenance_tag.dart';

class DocumentConfirmationScreen extends StatefulWidget {
  final DocumentProcessingResult result;

  const DocumentConfirmationScreen({super.key, required this.result});

  @override
  State<DocumentConfirmationScreen> createState() => _DocumentConfirmationScreenState();
}

class _DocumentConfirmationScreenState extends State<DocumentConfirmationScreen> {
  final DocumentPipeline _pipeline = DocumentPipeline();

  late TextEditingController _titleController;
  late List<bool> _selectedMeds;
  late List<MedicineEntity> _editableMeds;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final todayStr = DateTime.now().toIso8601String().split('T').first;
    String defaultTitle;
    switch (widget.result.category) {
      case DocumentTypeCategory.prescription:
        defaultTitle = 'Prescription — $todayStr';
        break;
      case DocumentTypeCategory.dischargeSummary:
        defaultTitle = 'Discharge Summary — $todayStr';
        break;
      case DocumentTypeCategory.labReport:
        defaultTitle = 'Diagnostic Report — $todayStr';
        break;
    }
    _titleController = TextEditingController(text: defaultTitle);

    _editableMeds = List.from(widget.result.candidateMedicines);
    _selectedMeds = List.generate(widget.result.candidateMedicines.length, (_) => true);
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _commitConfirmedItems() async {
    setState(() {
      _isSaving = true;
    });

    final confirmedMeds = <MedicineEntity>[];
    for (int i = 0; i < _editableMeds.length; i++) {
      if (_selectedMeds[i]) {
        confirmedMeds.add(_editableMeds[i]);
      }
    }

    if (confirmedMeds.isNotEmpty) {
      await _pipeline.confirmAndCommitMedications(confirmedMeds);
    }

    // Commit Report / Document Entity to Health Memory
    final reportTitle = _titleController.text.trim().isNotEmpty
        ? _titleController.text.trim()
        : widget.result.fileName;

    final reportToSave = ReportEntity(
      id: widget.result.documentId,
      title: reportTitle,
      type: widget.result.category.name.toUpperCase(),
      testDate: DateTime.now(),
      laboratoryOrHospital: widget.result.category == DocumentTypeCategory.dischargeSummary
          ? 'Apollo Multi-Specialty Hospital'
          : 'Diagnostic Lab',
      summary: widget.result.reportEntity?.summary ??
          'Clinical record processed via local on-device OCR pipeline.',
      rawOcrText: widget.result.rawOcrText,
      results: widget.result.reportEntity?.results ?? [],
      provenance: Provenance.documented(documentName: 'Camera / OCR: $reportTitle'),
    );

    await _pipeline.commitReport(reportToSave);

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Medical record "$reportTitle" confirmed & saved to Health Memory!'),
          backgroundColor: AppTheme.primaryTeal,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Structured Document Review'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Notice Banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.severityWarningBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.severityWarning.withValues(alpha: 0.5)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: AppTheme.severityWarning),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Medical Safety Requirement: Extracted information is never committed automatically. Please review, edit, and confirm each item before adding to your Health Memory.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textPrimary, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Record Title Editor
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Record Title in Health Memory', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        isDense: true,
                        hintText: 'e.g., Dr. Rao — Prescription — Oct 2026',
                      ),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryTeal.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            widget.result.category.name.toUpperCase(),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Confidence: ${(widget.result.ocrConfidence * 100).toInt()}% • Source: Local OCR',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Safety Flags (if any)
            if (widget.result.safetyFlags.isNotEmpty) ...[
              const Text('Clinical Safety Alerts Detected:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.severityCritical)),
              const SizedBox(height: 8),
              ...widget.result.safetyFlags.map((flag) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.severityCriticalBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.severityCritical),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(flag.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.severityCritical)),
                      const SizedBox(height: 4),
                      Text(flag.description, style: const TextStyle(fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('Next Action: ${flag.recommendation}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.severityCritical)),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Candidate Extracted Medications
            if (_editableMeds.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Extracted Medications:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Text('${_selectedMeds.where((b) => b).length} Selected', style: const TextStyle(fontSize: 12, color: AppTheme.primaryTeal, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              ...List.generate(_editableMeds.length, (index) {
                final med = _editableMeds[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Checkbox(
                              value: _selectedMeds[index],
                              activeColor: AppTheme.primaryTeal,
                              onChanged: (val) {
                                setState(() {
                                  _selectedMeds[index] = val ?? false;
                                });
                              },
                            ),
                            Expanded(
                              child: Text(
                                med.name,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                              ),
                            ),
                            ProvenanceTag(provenance: med.provenance),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.only(left: 48.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Generic: ${med.genericName} • Form: ${med.form}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                              const SizedBox(height: 4),
                              Text('Dosage & Timing: ${med.dosage} — ${med.frequency} (${med.timing})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              if (med.instructions.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text('Instructions: ${med.instructions}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Discharge Summary Instructions (if present)
            if (widget.result.dischargeSummary != null) ...[
              const Text('Discharge & Care Plan Details:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hospital: ${widget.result.dischargeSummary!.hospitalName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text('Physician: ${widget.result.dischargeSummary!.attendingPhysician}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      const Divider(height: 16),
                      Text('Activity Guidelines: ${widget.result.dischargeSummary!.activityRestrictions}', style: const TextStyle(fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('Wound Care: ${widget.result.dischargeSummary!.woundCareInstructions}', style: const TextStyle(fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('Diet Advice: ${widget.result.dischargeSummary!.dietInstructions}', style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Lab Report Results (if present)
            if (widget.result.reportEntity != null && widget.result.reportEntity!.results.isNotEmpty) ...[
              const Text('Extracted Diagnostic Lab Results:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.result.reportEntity!.summary, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      ...widget.result.reportEntity!.results.map((res) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(res.testName, style: const TextStyle(fontSize: 12)),
                              Text(
                                '${res.value} ${res.unit} (Ref: ${res.referenceRange})',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: res.isAbnormal ? AppTheme.severityWarning : AppTheme.textPrimary),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Raw OCR View
            ExpansionTile(
              title: const Text('View Raw Extracted Text', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  width: double.infinity,
                  color: Colors.grey.shade100,
                  child: Text(
                    widget.result.rawOcrText,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 11, height: 1.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: _isSaving ? null : _commitConfirmedItems,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _isSaving
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Confirm & Save to Health Memory', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
