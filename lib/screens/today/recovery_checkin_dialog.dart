import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../models/check_in.dart';
import '../../models/provenance.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/recovery/recovery_engine.dart';

typedef RecoveryCheckInDialog = RecoveryCheckinDialog;

class RecoveryCheckinDialog extends StatefulWidget {
  final VoidCallback? onCompleted;

  const RecoveryCheckinDialog({super.key, this.onCompleted});

  static Future<void> show(BuildContext context, {VoidCallback? onCompleted}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RecoveryCheckinDialog(onCompleted: onCompleted),
    );
  }

  @override
  State<RecoveryCheckinDialog> createState() => _RecoveryCheckinDialogState();
}

class _RecoveryCheckinDialogState extends State<RecoveryCheckinDialog> {
  static const _uuid = Uuid();
  final HealthMemoryService _memory = HealthMemoryService();
  final RecoveryEngine _recoveryEngine = RecoveryEngine();

  double _painScore = 2.0;
  double _fatigueScore = 3.0;
  final int _moodScore = 4;
  double _sleepHours = 7.5;
  bool _tookAllMeds = true;
  final String _symptoms = 'Mild incision tenderness';
  String _adaptiveQuestion = 'How is your mobility progressing today?';
  final TextEditingController _followUpAnswerController = TextEditingController();
  bool _isSaving = false;

  List<DailyCheckInEntity> _pastCheckIns = [];

  @override
  void initState() {
    super.initState();
    _loadAdaptiveQuestion();
  }

  Future<void> _loadAdaptiveQuestion() async {
    final past = await _memory.getRecentCheckIns(limit: 5);
    _pastCheckIns = past;
    _updateAdaptiveQuestion();
  }

  void _updateAdaptiveQuestion() {
    final question = _recoveryEngine.generateAdaptiveFollowUpQuestion(
      _pastCheckIns,
      currentPain: _painScore.toInt(),
      currentSleep: _sleepHours,
      currentTookMeds: _tookAllMeds,
    );
    if (mounted) {
      setState(() {
        _adaptiveQuestion = question;
      });
    }
  }

  @override
  void dispose() {
    _followUpAnswerController.dispose();
    super.dispose();
  }

  Future<void> _submitCheckIn() async {
    setState(() {
      _isSaving = true;
    });

    final entity = DailyCheckInEntity(
      id: _uuid.v4(),
      checkInDate: DateTime.now(),
      painScore: _painScore.toInt(),
      fatigueScore: _fatigueScore.toInt(),
      moodScore: _moodScore,
      sleepHours: _sleepHours,
      tookAllMedications: _tookAllMeds,
      reportedSymptoms: _symptoms,
      adaptiveFollowUpQuestion: _adaptiveQuestion,
      adaptiveFollowUpAnswer: _followUpAnswerController.text.trim().isNotEmpty
          ? _followUpAnswerController.text.trim()
          : 'Walking comfortably inside the room with minor pulling sensation.',
      provenance: Provenance.userReported(),
    );

    await _memory.logCheckIn(entity);
    HealthEventBus().notifyDataChanged();

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      Navigator.pop(context);
      widget.onCompleted?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Daily Recovery Check-in successfully recorded!'),
          backgroundColor: AppTheme.primaryTeal,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
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
          // Drag handle
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

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.fact_check_outlined, color: AppTheme.primaryTeal, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Daily Recovery Check-in',
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

          const Divider(height: 16),

          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Pain Score Slider
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Pain Level (0 = None, 10 = Severe)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('${_painScore.toInt()} / 10', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryTeal, fontSize: 15)),
                    ],
                  ),
                  Slider(
                    value: _painScore,
                    min: 0,
                    max: 10,
                    divisions: 10,
                    activeColor: _painScore > 6 ? AppTheme.severityCritical : AppTheme.primaryTeal,
                    onChanged: (val) {
                      setState(() {
                        _painScore = val;
                      });
                      _updateAdaptiveQuestion();
                    },
                  ),
                  const SizedBox(height: 8),

                  // 2. Sleep Hours
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Sleep Duration Last Night', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('${_sleepHours.toStringAsFixed(1)} hrs', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryTeal, fontSize: 14)),
                    ],
                  ),
                  Slider(
                    value: _sleepHours,
                    min: 3,
                    max: 12,
                    divisions: 18,
                    activeColor: AppTheme.accentTeal,
                    onChanged: (val) {
                      setState(() {
                        _sleepHours = val;
                      });
                      _updateAdaptiveQuestion();
                    },
                  ),
                  const SizedBox(height: 8),

                  // 2b. Fatigue Level
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Fatigue Level (1 = Energetic, 5 = Exhausted)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('${_fatigueScore.toInt()} / 5', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryTeal, fontSize: 14)),
                    ],
                  ),
                  Slider(
                    value: _fatigueScore,
                    min: 1,
                    max: 5,
                    divisions: 4,
                    activeColor: AppTheme.accentTeal,
                    onChanged: (val) {
                      setState(() {
                        _fatigueScore = val;
                      });
                    },
                  ),
                  const SizedBox(height: 8),

                  // 3. Medication adherence checkbox
                  CheckboxListTile(
                    title: const Text('Took all prescribed medications as scheduled', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Telmisartan, Metformin, Pantoprazole', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    value: _tookAllMeds,
                    activeColor: AppTheme.primaryTeal,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (val) {
                      setState(() {
                        _tookAllMeds = val ?? true;
                      });
                      _updateAdaptiveQuestion();
                    },
                  ),
                  const SizedBox(height: 8),

                  // 4. Adaptive Follow-up question card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWarm,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.psychology, size: 16, color: AppTheme.primaryTeal),
                            SizedBox(width: 6),
                            Text(
                              'Adaptive Follow-up Question',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _adaptiveQuestion,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _followUpAnswerController,
                          decoration: InputDecoration(
                            hintText: 'e.g. Walking 10 mins without pain, incision dry...',
                            hintStyle: const TextStyle(fontSize: 12),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.mic, color: AppTheme.primaryTeal, size: 18),
                              onPressed: () {
                                _followUpAnswerController.text = 'Gentle 15-minute room walking completed with no dizziness.';
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          ElevatedButton(
            onPressed: _isSaving ? null : _submitCheckIn,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryTeal,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _isSaving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Save Daily Check-in', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
