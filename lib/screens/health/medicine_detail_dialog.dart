import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../models/medicine.dart';
import '../../models/provenance.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/medical_safety/medication_safety_checker.dart';

class MedicineDetailDialog extends StatefulWidget {
  final MedicineEntity medicine;
  final VoidCallback onUpdated;

  const MedicineDetailDialog({super.key, required this.medicine, required this.onUpdated});

  @override
  State<MedicineDetailDialog> createState() => _MedicineDetailDialogState();
}

class _MedicineDetailDialogState extends State<MedicineDetailDialog> {
  final HealthMemoryService _memory = HealthMemoryService();
  final MedicationSafetyChecker _safetyChecker = MedicationSafetyChecker();

  bool _reminderMorning = true;
  bool _reminderAfternoon = false;
  bool _reminderNight = true;
  bool _isSaving = false;
  List<String> _safetyWarnings = [];

  @override
  void initState() {
    super.initState();
    _checkSafetyWarnings();
  }

  Future<void> _checkSafetyWarnings() async {
    final allergies = await _memory.getAllergies();
    final allMeds = await _memory.getAllMedicines();
    final warnings = _safetyChecker.checkMedicationContraindications(
      proposedMedicine: widget.medicine.name,
      patientAllergies: allergies,
      currentMedicines: allMeds.where((m) => m.id != widget.medicine.id).toList(),
    );
    if (mounted) {
      setState(() => _safetyWarnings = warnings);
    }
  }

  Future<void> _deleteMedicine() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Medicine?'),
        content: Text('Remove ${widget.medicine.name} from your active medication profile?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isSaving = true);
      await _memory.deleteMedicine(widget.medicine.id);
      if (mounted) {
        widget.onUpdated();
        Navigator.pop(context);
      }
    }
  }

  Future<void> _confirmUncertainMedicine() async {
    setState(() => _isSaving = true);
    final updated = widget.medicine.copyWith(
      provenance: Provenance.documented(
        documentName: 'Verified and confirmed by Patient',
      ),
      isConfirmedByUser: true,
    );
    await _memory.saveMedicine(updated);
    if (mounted) {
      widget.onUpdated();
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final med = widget.medicine;
    final isUncertain = med.provenance.source == ProvenanceSource.requiresReview;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 620),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.medication, color: AppTheme.primaryTeal, size: 24),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          med.name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                        ),
                        Text(
                          med.dosage,
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(height: 16),

            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Provenance & Source Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isUncertain ? const Color(0xFFFEF3C7) : AppTheme.surfaceWarm,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isUncertain ? const Color(0xFFF59E0B) : Colors.grey.shade300),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Provenance / Source:',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isUncertain ? const Color(0xFF92400E) : AppTheme.primaryDark,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isUncertain ? const Color(0xFFFDE68A) : AppTheme.primaryLight,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  med.provenance.source.name.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isUncertain ? const Color(0xFF92400E) : AppTheme.primaryTeal,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            med.provenance.documentName ?? 'Clinical Record',
                            style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                          ),
                          if (isUncertain) ...[
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: _confirmUncertainMedicine,
                              icon: const Icon(Icons.check_circle_outline, size: 16),
                              label: const Text('Confirm Prescription Accuracy', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFD97706),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Safety Contraindications Warning
                    if (_safetyWarnings.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEF4444)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.warning_amber_rounded, color: Color(0xFFB91C1C), size: 18),
                                SizedBox(width: 6),
                                Text(
                                  'Safety Alert (Contraindication)',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFB91C1C)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            ..._safetyWarnings.map((w) => Text('• $w', style: const TextStyle(fontSize: 11, color: Color(0xFF7F1D1D)))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Medication Details Grid
                    _buildInfoRow('Frequency', med.frequency),
                    _buildInfoRow('Prescribing Doctor', med.prescribingDoctor ?? 'Documented in Record'),
                    _buildInfoRow('Purpose / Indication', med.prescribedForCondition ?? 'Chronic Condition Care'),
                    _buildInfoRow('Start Date', med.startDate.toIso8601String().split('T').first),
                    if (med.endDate != null)
                      _buildInfoRow('End Date', med.endDate!.toIso8601String().split('T').first),
                    const Divider(height: 20),

                    // Daily Reminder Schedule
                    const Text('Daily Offline Reminders:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      title: const Text('Morning (08:00 AM)', style: TextStyle(fontSize: 12)),
                      value: _reminderMorning,
                      activeThumbColor: AppTheme.primaryTeal,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (val) => setState(() => _reminderMorning = val),
                    ),
                    SwitchListTile(
                      title: const Text('Afternoon (01:00 PM)', style: TextStyle(fontSize: 12)),
                      value: _reminderAfternoon,
                      activeThumbColor: AppTheme.primaryTeal,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (val) => setState(() => _reminderAfternoon = val),
                    ),
                    SwitchListTile(
                      title: const Text('Evening / Night (08:00 PM)', style: TextStyle(fontSize: 12)),
                      value: _reminderNight,
                      activeThumbColor: AppTheme.primaryTeal,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (val) => setState(() => _reminderNight = val),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _isSaving ? null : _deleteMedicine,
                  icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                  label: const Text('Remove', style: TextStyle(color: Colors.red)),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Reminders updated successfully.')),
                    );
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, foregroundColor: Colors.white),
                  child: const Text('Done'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
