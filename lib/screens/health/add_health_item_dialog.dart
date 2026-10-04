import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../core/config/app_theme.dart';
import '../../models/allergy.dart';
import '../../models/condition.dart';
import '../../models/medicine.dart';
import '../../models/provenance.dart';
import '../../services/health_memory/health_memory_service.dart';

enum HealthItemType { condition, allergy, medicine }

class AddHealthItemDialog extends StatefulWidget {
  final HealthItemType initialType;
  final VoidCallback? onAdded;

  const AddHealthItemDialog({super.key, this.initialType = HealthItemType.condition, this.onAdded});

  static Future<void> show(BuildContext context, {HealthItemType initialType = HealthItemType.condition, VoidCallback? onAdded}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddHealthItemDialog(initialType: initialType, onAdded: onAdded),
    );
  }

  @override
  State<AddHealthItemDialog> createState() => _AddHealthItemDialogState();
}

class _AddHealthItemDialogState extends State<AddHealthItemDialog> {
  static const _uuid = Uuid();
  final HealthMemoryService _memory = HealthMemoryService();

  late HealthItemType _selectedType;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _detailController = TextEditingController();
  final TextEditingController _dosageController = TextEditingController();
  final TextEditingController _freqController = TextEditingController();

  String _allergySeverity = 'Moderate';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialType;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _detailController.dispose();
    _dosageController.dispose();
    _freqController.dispose();
    super.dispose();
  }

  Future<void> _saveItem() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    setState(() {
      _isSaving = true;
    });

    if (_selectedType == HealthItemType.condition) {
      await _memory.addCondition(
        ConditionEntity(
          id: _uuid.v4(),
          name: name,
          diagnosedDate: DateTime.now(),
          status: 'managed',
          notes: _detailController.text.trim(),
          provenance: Provenance.userReported(),
        ),
      );
    } else if (_selectedType == HealthItemType.allergy) {
      await _memory.addAllergy(
        AllergyEntity(
          id: _uuid.v4(),
          allergen: name,
          reaction: _detailController.text.trim().isNotEmpty ? _detailController.text.trim() : 'Skin rash / hives',
          severity: _allergySeverity,
          identifiedDate: DateTime.now(),
          provenance: Provenance.userReported(),
        ),
      );
    } else {
      await _memory.addMedicine(
        MedicineEntity(
          id: _uuid.v4(),
          name: name,
          genericName: name,
          dosage: _dosageController.text.trim().isNotEmpty ? _dosageController.text.trim() : '1 tablet',
          frequency: _freqController.text.trim().isNotEmpty ? _freqController.text.trim() : 'Once daily',
          instructions: _detailController.text.trim(),
          startDate: DateTime.now(),
          isActive: true,
          isConfirmedByUser: true,
          reminderTimes: ['08:00'],
          provenance: Provenance.userReported(),
        ),
      );
    }

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      Navigator.pop(context);
      widget.onAdded?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          const Text(
            'Add Health Information',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 12),

          // Type Segment
          SegmentedButton<HealthItemType>(
            segments: const [
              ButtonSegment(value: HealthItemType.condition, label: Text('Condition', style: TextStyle(fontSize: 12))),
              ButtonSegment(value: HealthItemType.medicine, label: Text('Medicine', style: TextStyle(fontSize: 12))),
              ButtonSegment(value: HealthItemType.allergy, label: Text('Allergy', style: TextStyle(fontSize: 12))),
            ],
            selected: {_selectedType},
            onSelectionChanged: (val) {
              setState(() {
                _selectedType = val.first;
              });
            },
          ),
          const SizedBox(height: 16),

          Flexible(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      labelText: _selectedType == HealthItemType.condition
                          ? 'Condition Name (e.g. Asthma)'
                          : _selectedType == HealthItemType.allergy
                              ? 'Allergen (e.g. Sulfa drugs)'
                              : 'Medicine Name (e.g. Amlodipine 5mg)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_selectedType == HealthItemType.medicine) ...[
                    TextField(
                      controller: _dosageController,
                      decoration: const InputDecoration(labelText: 'Dosage (e.g. 5mg, 1 tablet)'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _freqController,
                      decoration: const InputDecoration(labelText: 'Frequency (e.g. Once daily, Twice daily)'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_selectedType == HealthItemType.allergy) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _allergySeverity,
                      decoration: const InputDecoration(labelText: 'Allergy Severity'),
                      items: ['Mild', 'Moderate', 'Severe', 'Life-Threatening'].map((s) {
                        return DropdownMenuItem(value: s, child: Text(s));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _allergySeverity = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _detailController,
                    decoration: InputDecoration(
                      labelText: _selectedType == HealthItemType.allergy
                          ? 'Reaction (e.g. Rash, swelling)'
                          : 'Clinical notes or instructions',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          ElevatedButton(
            onPressed: _isSaving ? null : _saveItem,
            child: _isSaving
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Save to Health Memory', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
