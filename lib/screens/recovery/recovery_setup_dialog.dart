import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../core/config/app_theme.dart';
import '../../models/doctor_instruction.dart';
import '../../models/provenance.dart';
import '../../models/recovery_plan.dart';
import '../../services/health_memory/health_memory_service.dart';

class RecoverySetupDialog extends StatefulWidget {
  final RecoveryPlanEntity? initialPlan;
  final VoidCallback onSaved;

  const RecoverySetupDialog({super.key, this.initialPlan, required this.onSaved});

  @override
  State<RecoverySetupDialog> createState() => _RecoverySetupDialogState();
}

class _RecoverySetupDialogState extends State<RecoverySetupDialog> {
  static const _uuid = Uuid();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _titleController;
  late TextEditingController _procedureController;
  late TextEditingController _durationDaysController;
  late TextEditingController _instructionsController;

  DateTime _startDate = DateTime.now();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialPlan?.title ?? 'Post-Appendectomy Recovery Protocol');
    _procedureController = TextEditingController(text: widget.initialPlan?.procedureName ?? 'Laparoscopic Appendectomy');
    _durationDaysController = TextEditingController(text: widget.initialPlan != null ? '${widget.initialPlan!.targetDurationDays}' : '14');
    _instructionsController = TextEditingController(
      text: 'Keep surgical incision dry for 48 hours\nLight walking 15 minutes twice daily\nNo heavy lifting (> 10 lbs) for 2 weeks\nTake pain medication as prescribed',
    );
    if (widget.initialPlan != null) {
      _startDate = widget.initialPlan!.startDate;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _procedureController.dispose();
    _durationDaysController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _savePlan() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final days = int.tryParse(_durationDaysController.text.trim()) ?? 14;
    final instructionsList = _instructionsController.text
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final milestones = [
      RecoveryMilestone(dayNumber: 1, title: 'Incision Inspection', description: 'Check wound site for swelling or redness'),
      RecoveryMilestone(dayNumber: (days * 0.3).round(), title: 'Mobility Expansion', description: 'Increase daily walking sessions'),
      RecoveryMilestone(dayNumber: (days * 0.6).round(), title: 'Stitch / Suture Review', description: 'Clinical post-op evaluation'),
      RecoveryMilestone(dayNumber: days, title: 'Full Protocol Completion', description: 'Resume normal daily activities'),
    ];

    final plan = RecoveryPlanEntity(
      id: widget.initialPlan?.id ?? 'rec_${_uuid.v4().substring(0, 8)}',
      title: _titleController.text.trim(),
      procedureName: _procedureController.text.trim(),
      startDate: _startDate,
      targetDurationDays: days,
      currentPhase: 'Phase 1: Acute Recovery & Wound Healing',
      milestones: milestones,
      targetDailySteps: 3500,
      targetRestHours: 8.5,
      isActive: true,
      provenance: Provenance.documented(
        documentName: 'Discharge Summary Protocol Import',
      ),
    );

    await HealthMemoryService().saveRecoveryPlan(plan);

    // Save individual doctor instructions
    for (var inst in instructionsList) {
      await HealthMemoryService().addDoctorInstruction(
        DoctorInstructionEntity(
          id: _uuid.v4(),
          title: 'Recovery Care Instruction',
          instruction: inst,
          category: 'Recovery',
          givenDate: DateTime.now(),
          provenance: Provenance.documented(documentName: 'Discharge Instructions'),
        ),
      );
    }

    if (mounted) {
      setState(() => _isSaving = false);
      widget.onSaved();
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Form(
          key: _formKey,
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
                        child: const Icon(Icons.healing, color: AppTheme.primaryTeal, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        widget.initialPlan != null ? 'Edit Recovery Plan' : 'Start Recovery Protocol',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
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
                      const Text('Protocol Title:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(hintText: 'e.g. Post-Appendectomy Recovery Protocol'),
                        validator: (val) => val == null || val.isEmpty ? 'Title is required' : null,
                      ),
                      const SizedBox(height: 12),

                      const Text('Procedure or Medical Condition:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _procedureController,
                        decoration: const InputDecoration(hintText: 'e.g. Laparoscopic Appendectomy'),
                        validator: (val) => val == null || val.isEmpty ? 'Procedure name is required' : null,
                      ),
                      const SizedBox(height: 12),

                      const Text('Target Duration (Days):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _durationDaysController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(hintText: 'e.g. 14'),
                        validator: (val) => val == null || val.isEmpty ? 'Days required' : null,
                      ),
                      const SizedBox(height: 12),

                      const Text('Discharge & Doctor Instructions (One per line):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _instructionsController,
                        maxLines: 4,
                        decoration: const InputDecoration(hintText: 'Keep wound dry\nWalk 15 mins daily\nAvoid lifting weights'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _savePlan,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryTeal,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(_isSaving ? 'Saving...' : 'Save Recovery Plan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
