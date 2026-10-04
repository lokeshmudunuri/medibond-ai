import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/nutrition/food_guidance_engine.dart';

class WhatCanIEatDialog extends StatefulWidget {
  const WhatCanIEatDialog({super.key});

  @override
  State<WhatCanIEatDialog> createState() => _WhatCanIEatDialogState();
}

class _WhatCanIEatDialogState extends State<WhatCanIEatDialog> {
  final HealthMemoryService _memory = HealthMemoryService();
  FoodGuidanceResult? _guidance;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFoodGuidance();
  }

  Future<void> _loadFoodGuidance() async {
    final conditions = await _memory.getConditions();
    final meds = await _memory.getActiveMedicines();
    final allergies = await _memory.getAllergies();

    final result = await FoodGuidanceEngine.generateGuidance(
      conditions: conditions,
      medicines: meds,
      allergies: allergies,
    );

    if (mounted) {
      setState(() {
        _guidance = result;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 650),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title & Close
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.restaurant_menu_outlined, color: AppTheme.primaryTeal, size: 24),
                          SizedBox(width: 10),
                          Text(
                            'What Can I Eat?',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Personalized Dietary Guidance based on your recorded conditions & medications',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 12),

                  // Context Badges
                  if (_guidance!.matchedContextReasons.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: _guidance!.matchedContextReasons.map((reason) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryTeal.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            reason,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                          ),
                        );
                      }).toList(),
                    ),
                  const SizedBox(height: 12),

                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Recommended Section
                          const Text(
                            'Recommended Options',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green),
                          ),
                          const SizedBox(height: 6),
                          ..._guidance!.recommended.map((cat) {
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(cat.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                                    const SizedBox(height: 4),
                                    ...cat.items.map((item) => Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 2.0),
                                          child: Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Text('• ', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                              Expanded(child: Text(item, style: const TextStyle(fontSize: 12))),
                                            ],
                                          ),
                                        )),
                                    const SizedBox(height: 4),
                                    Text('Why: ${cat.rationale}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textSecondary)),
                                  ],
                                ),
                              ),
                            );
                          }),
                          const SizedBox(height: 14),

                          // Limit or Avoid Section
                          const Text(
                            'Items to Moderate or Limit',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.severityWarning),
                          ),
                          const SizedBox(height: 6),
                          ..._guidance!.limitOrAvoid.map((cat) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.severityWarningBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppTheme.severityWarning.withValues(alpha: 0.5)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(cat.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                                  const SizedBox(height: 4),
                                  ...cat.items.map((item) => Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 2.0),
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('• ', style: TextStyle(color: AppTheme.severityWarning, fontWeight: FontWeight.bold)),
                                            Expanded(child: Text(item, style: const TextStyle(fontSize: 12))),
                                          ],
                                        ),
                                      )),
                                  const SizedBox(height: 4),
                                  Text('Why: ${cat.rationale}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 14),

                          // Questions for Doctor
                          if (_guidance!.questionsForDoctor.isNotEmpty) ...[
                            const Text(
                              'Suggested Questions for Your Physician / Dietitian',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(height: 6),
                            Card(
                              color: Colors.blue.shade50,
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  children: _guidance!.questionsForDoctor.map((q) {
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 3.0),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.help_outline, size: 16, color: Colors.blue),
                                          const SizedBox(width: 8),
                                          Expanded(child: Text(q, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],

                          // Disclaimer
                          Text(
                            _guidance!.clinicalDisclaimer,
                            style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
                    child: const Text('Got It'),
                  ),
                ],
              ),
      ),
    );
  }
}
