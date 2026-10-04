import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../models/alert_entity.dart';
import '../../models/doctor_instruction.dart';
import '../../models/personal_baseline.dart';
import '../../models/recovery_plan.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/sensors/sensor_service.dart';
import '../../ui/widgets/health_status_badge.dart';
import '../../ui/widgets/metric_card.dart';
import '../chat/chat_screen.dart';
import 'recovery_setup_dialog.dart';

class RecoveryScreen extends StatefulWidget {
  const RecoveryScreen({super.key});

  @override
  State<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends State<RecoveryScreen> {
  final HealthMemoryService _memory = HealthMemoryService();
  final SensorService _sensorService = SensorService();

  RecoveryPlanEntity? _activePlan;
  List<DoctorInstructionEntity> _doctorInstructions = [];
  List<PersonalBaselineEntity> _baselines = [];
  List<AlertEntity> _alerts = [];
  StreamSubscription<SensorDataSnapshot>? _sensorSub;
  StreamSubscription? _eventSub;

  SensorDataSnapshot? _latestSnapshot;
  bool _isMonitoring = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
    _startSensorStream();
    _eventSub = HealthEventBus().stream.listen((event) {
      if (mounted) {
        _loadData();
      }
    });
  }

  void _startSensorStream() {
    _sensorService.startListening();
    _isMonitoring = true;
    _sensorSub = _sensorService.snapshotStream.listen((snapshot) {
      if (mounted) {
        setState(() {
          _latestSnapshot = snapshot;
        });
      }
    });
  }

  Future<void> _loadData() async {
    final plan = await _memory.getActiveRecoveryPlan();
    final instructions = await _memory.getDoctorInstructions();
    final baselines = await _memory.getAllBaselines();
    final alerts = await _memory.getRecentAlerts(limit: 10);

    if (mounted) {
      setState(() {
        _activePlan = plan;
        _doctorInstructions = instructions;
        _baselines = baselines;
        _alerts = alerts;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _sensorSub?.cancel();
    _eventSub?.cancel();
    _sensorService.stopListening();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recovery Watch & Sensors'),
        actions: [
          IconButton(
            icon: Icon(_isMonitoring ? Icons.pause_circle_outline : Icons.play_circle_outline),
            tooltip: _isMonitoring ? 'Pause Sensor Sampling' : 'Resume Sensor Sampling',
            onPressed: () {
              setState(() {
                if (_isMonitoring) {
                  _sensorService.stopListening();
                  _isMonitoring = false;
                } else {
                  _sensorService.startListening();
                  _isMonitoring = true;
                }
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryTeal,
        icon: const Icon(Icons.chat_bubble_outline, color: Colors.white),
        label: const Text('Ask CareBond AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (ctx) => const ChatScreen(initialPrompt: 'How is my recovery progressing today?')),
          ).then((_) => _loadData());
        },
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Recovery Plan Progress Banner
              if (_activePlan != null)
                _buildPlanBanner()
              else
                _buildNoPlanCard(),
              const SizedBox(height: 16),

              // 2. Live Sensor Signal Cards
              _buildSensorGauges(),
              const SizedBox(height: 16),

              // 3. Robust Personal Baseline Stats (EWMA + MAD + CUSUM)
              _buildPersonalBaselineCard(),
              const SizedBox(height: 16),

              // 4. Doctor Recovery Instructions
              _buildDoctorInstructionsCard(),
              const SizedBox(height: 16),

              // 5. Explainable Deviations & Alerts Log
              _buildAlertsFeed(),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanBanner() {
    final plan = _activePlan!;
    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  plan.title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                HealthStatusBadge(label: 'Day ${plan.currentDayNumber}', type: BadgeStatusType.inRecovery),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Phase: ${plan.currentPhase}',
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: plan.progressPercentage,
              minHeight: 8,
              backgroundColor: Colors.grey.shade200,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryTeal),
            ),
            const SizedBox(height: 12),
            const Text('Recovery Milestones:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            ...plan.milestones.map((m) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 3.0),
                child: Row(
                  children: [
                    Icon(
                      m.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                      size: 16,
                      color: m.isCompleted ? AppTheme.primaryTeal : Colors.grey,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Day ${m.dayNumber}: ${m.title}',
                        style: TextStyle(
                          fontSize: 12,
                          color: m.isCompleted ? AppTheme.textPrimary : AppTheme.textSecondary,
                          decoration: m.isCompleted ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildNoPlanCard() {
    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppTheme.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.healing, color: AppTheme.primaryTeal, size: 32),
            ),
            const SizedBox(height: 12),
            const Text(
              'No Active Recovery Protocol',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
            ),
            const SizedBox(height: 6),
            const Text(
              'Undergoing surgery or recovering from a medical procedure? Start a structured protocol with daily check-ins, personal sensor baselines, and doctor instructions.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => RecoverySetupDialog(
                    onSaved: _loadData,
                  ),
                );
              },
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Start Recovery Protocol'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSensorGauges() {
    final snap = _latestSnapshot;

    final dynamicMotion = snap?.accelMagnitude ?? 0.12;
    final heartRate = snap?.heartRateBpm ?? 72.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Continuous Sensor Observations',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _isMonitoring ? Colors.green : Colors.grey,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  _isMonitoring ? 'Live Sampling' : 'Paused',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: MetricCard(
                title: 'Mobility Intensity',
                value: dynamicMotion.toStringAsFixed(2),
                unit: 'm/s²',
                subtitle: 'Accelerometer Δ',
                icon: Icons.directions_walk,
                iconColor: AppTheme.primaryTeal,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: MetricCard(
                title: 'Resting Heart Rate',
                value: heartRate.toStringAsFixed(0),
                unit: 'BPM',
                subtitle: 'Vitals Pipeline',
                icon: Icons.favorite,
                iconColor: Colors.redAccent,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPersonalBaselineCard() {
    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.analytics_outlined, color: AppTheme.primaryTeal, size: 18),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Deterministic Personal Baseline (EWMA + MAD)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'CareBond adapts to your personal recovery curve. Deviations are only escalated when persistent across cumulative windows (CUSUM filter), preventing false alarms.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 12),
            ..._baselines.map((b) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWarm,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.metricName.replaceAll('_', ' ').toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                        ),
                        Text(
                          'Samples: ${b.sampleCount} • CUSUM Low: ${b.cusumLow.toStringAsFixed(1)}',
                          style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Mean: ${b.baselineMean.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '± Spread: ${b.stdDevOrMAD.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildDoctorInstructionsCard() {
    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Doctor Post-Operative Instructions',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 10),
            if (_doctorInstructions.isEmpty)
              const Text('No specific instructions on file.', style: TextStyle(fontSize: 12))
            else
              ..._doctorInstructions.map((inst) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.shield_outlined, size: 16, color: AppTheme.primaryTeal),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(inst.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            Text(inst.instruction, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsFeed() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Explainable Deviation & Alert History',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        if (_alerts.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No abnormal recovery deviations detected. All biometric signals are within expected personal variance.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ),
              ],
            ),
          )
        else
          ..._alerts.map((al) {
            final isCrit = al.severity == AlertSeverity.critical;
            final badgeText = al.escalationLevel.displayName;

            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(
                  color: isCrit ? AppTheme.severityCritical : AppTheme.severityWarning,
                  width: 1.2,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isCrit ? Icons.warning_rounded : Icons.info_outline,
                              color: isCrit ? AppTheme.severityCritical : AppTheme.severityWarning,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              al.title,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isCrit ? AppTheme.severityCritical : AppTheme.severityWarning,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isCrit ? const Color(0xFFFCA5A5) : const Color(0xFFFDE68A),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badgeText,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isCrit ? const Color(0xFF7F1D1D) : const Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    if (al.whatChanged != null) ...[
                      _buildExplainableRow('WHAT CHANGED', al.whatChanged!),
                      _buildExplainableRow('WHY IT MATTERS', al.whyItMatters ?? 'Recovery milestone monitoring.'),
                      _buildExplainableRow('DATA CAUSING FLAG', al.dataCausedFlag ?? 'Sensor baseline divergence.'),
                      _buildExplainableRow('HOW LONG PERSISTED', al.persistedDuration ?? 'Observed across multiple intervals.'),
                    ] else ...[
                      Text(al.explanation, style: const TextStyle(fontSize: 12, height: 1.4)),
                    ],
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceWarm,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.arrow_circle_right_outlined, size: 16, color: AppTheme.primaryTeal),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'NEXT STEP: [${al.escalationLevel.displayName}] ${al.recommendedAction}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildExplainableRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary, height: 1.35),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppTheme.textSecondary),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
