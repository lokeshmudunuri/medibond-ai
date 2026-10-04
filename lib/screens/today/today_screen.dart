import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../core/localization/app_localizations.dart';
import '../../models/alert_entity.dart';
import '../../models/check_in.dart';
import '../../models/medicine.dart';
import '../../models/patient.dart';
import '../../models/recovery_plan.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/recovery/recovery_engine.dart';
import '../../ui/widgets/health_status_badge.dart';
import '../../ui/widgets/provenance_tag.dart';
import '../chat/chat_screen.dart';
import '../voice/voice_assistant_sheet.dart';
import 'recovery_checkin_dialog.dart';
import 'what_can_i_eat_dialog.dart';

class TodayScreen extends StatefulWidget {
  final Function(int targetTab)? onNavigateToTab;

  const TodayScreen({super.key, this.onNavigateToTab});

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  final HealthMemoryService _memory = HealthMemoryService();
  final RecoveryEngine _recoveryEngine = RecoveryEngine();

  PatientProfile? _patient;
  RecoveryPlanEntity? _activePlan;
  List<MedicineEntity> _medicines = [];
  List<AlertEntity> _alerts = [];
  List<DailyCheckInEntity> _checkIns = [];
  RecoveryHealthStatus? _recoveryStatus;
  bool _isLoading = true;
  StreamSubscription? _eventSubscription;

  @override
  void initState() {
    super.initState();
    _loadData();
    _eventSubscription = HealthEventBus().stream.listen((event) {
      if (mounted) {
        _loadData();
      }
    });
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    final patient = await _memory.getPatientProfile();
    final plan = await _memory.getActiveRecoveryPlan();
    final meds = await _memory.getActiveMedicines();
    final alerts = await _memory.getRecentAlerts(limit: 3);
    final checkIns = await _memory.getRecentCheckIns(limit: 10);
    final recoveryStatus = await _recoveryEngine.calculateDynamicRecoveryIndex();

    if (mounted) {
      setState(() {
        _patient = patient;
        _activePlan = plan;
        _medicines = meds;
        _alerts = alerts;
        _checkIns = checkIns;
        _recoveryStatus = recoveryStatus;
        _isLoading = false;
      });
    }
  }

  Future<void> _openCheckInDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => const RecoveryCheckInDialog(),
    );
    if (result == true) {
      _loadData();
    }
  }

  void _openWhatCanIEat() {
    showDialog(
      context: context,
      builder: (ctx) => const WhatCanIEatDialog(),
    );
  }

  void _openChatScreen([String? prompt]) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (ctx) => ChatScreen(initialPrompt: prompt)),
    ).then((_) => _loadData());
  }

  void _openVoiceAssistant() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const VoiceAssistantSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal));
    }

    final isCleanSlate = _medicines.isEmpty &&
        _activePlan == null &&
        (_patient?.name == 'Primary User' || _patient?.name == 'Patient');

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primaryTeal,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Patient Welcome Banner & Overall Health Status
            _buildPatientHeader(loc),
            const SizedBox(height: 16),

            // 2. Dynamic Recovery Index Card
            _buildRecoveryIndexCard(loc),
            const SizedBox(height: 16),

            // 3. Important Changes / Explainable Alerts
            if (_alerts.isNotEmpty) ...[
              _buildAlertsSection(),
              const SizedBox(height: 16),
            ],

            // 4. Quick Actions (Talk, Food Guidance, Scan, Check-In)
            _buildActionButtons(loc),
            const SizedBox(height: 20),

            // 5. Clean Slate Welcome Guidance (if empty)
            if (isCleanSlate) ...[
              _buildCleanSlateWelcomeCard(loc),
              const SizedBox(height: 16),
            ],

            // 6. Scheduled Medicines
            _buildMedicinesSection(loc),
            const SizedBox(height: 16),

            // 7. Today's Check-In Status
            _buildCheckInStatusSection(loc),
          ],
        ),
      ),
    );
  }

  Widget _buildPatientHeader(AppLocalizations loc) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryTeal,
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hello, ${_patient?.name ?? "User"}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  _patient?.bloodGroup.isNotEmpty == true
                      ? 'Blood Group: ${_patient!.bloodGroup} • Local Core Active'
                      : 'CareBond AI 100% On-Device Active',
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
              ],
            ),
          ),
          HealthStatusBadge(
            label: _recoveryStatus?.status == RecoveryIndexStatus.attentionRequired
                ? 'Attention'
                : _recoveryStatus?.status == RecoveryIndexStatus.moderateDeviation
                    ? 'Recovering'
                    : 'Stable',
            type: _recoveryStatus?.status == RecoveryIndexStatus.attentionRequired
                ? BadgeStatusType.warning
                : _recoveryStatus?.status == RecoveryIndexStatus.moderateDeviation
                    ? BadgeStatusType.inRecovery
                    : BadgeStatusType.managed,
          ),
        ],
      ),
    );
  }

  Widget _buildRecoveryIndexCard(AppLocalizations loc) {
    final status = _recoveryStatus;
    final score = status?.recoveryScore ?? 88.0;

    Color scoreColor = Colors.green;
    if (score < 60) {
      scoreColor = AppTheme.severityCritical;
    } else if (score < 78) {
      scoreColor = AppTheme.severityWarning;
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  loc.translate('todayRecoveryIndex'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: scoreColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${score.toInt()} / 100',
                    style: TextStyle(fontWeight: FontWeight.bold, color: scoreColor, fontSize: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              status?.headline ?? loc.translate('todayStatusGood'),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              status?.explanation ?? 'Consistent with expected recovery trajectory.',
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.3),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.show_chart, size: 16, color: AppTheme.primaryTeal),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    status?.trendDescription ?? 'Personal recovery baseline active.',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Important Clinical Alerts',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.severityCritical),
        ),
        const SizedBox(height: 8),
        ..._alerts.map((alert) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: AppTheme.severityWarning, width: 1),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          alert.title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.severityCritical.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          alert.escalationLevel.displayName,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.severityCritical),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(alert.whatChanged ?? alert.explanation, style: const TextStyle(fontSize: 12)),
                  const SizedBox(height: 4),
                  Text('Action: ${alert.recommendedAction}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal)),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildActionButtons(AppLocalizations loc) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => _openChatScreen(),
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: Text(loc.translate('actionTalk')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.severityInfoBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryTeal),
              ),
              child: IconButton(
                onPressed: _openVoiceAssistant,
                icon: const Icon(Icons.mic, color: AppTheme.primaryTeal),
                tooltip: 'Voice Assistant',
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _openWhatCanIEat,
                icon: const Icon(Icons.restaurant_menu, size: 18),
                label: Text(loc.translate('actionWhatCanIEat')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => widget.onNavigateToTab?.call(3), // Documents tab
                icon: const Icon(Icons.receipt_long, size: 18),
                label: Text(loc.translate('actionScanPrescription')),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _openCheckInDialog,
                icon: const Icon(Icons.fact_check_outlined, size: 18),
                label: Text(loc.translate('actionCheckIn')),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCleanSlateWelcomeCard(AppLocalizations loc) {
    return Card(
      color: Colors.teal.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: const Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.shield_outlined, color: AppTheme.primaryTeal),
                SizedBox(width: 8),
                Text('Clean Slate Mode Active', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              ],
            ),
            SizedBox(height: 6),
            Text(
              'Your health database is completely clean and private. Use "Scan Prescription" or "Talk to CareBond" to add your first health items.',
              style: TextStyle(fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMedicinesSection(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              loc.translate('todayMedsTitle'),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            TextButton(
              onPressed: () => widget.onNavigateToTab?.call(1), // Health tab
              child: const Text('View All', style: TextStyle(fontSize: 12, color: AppTheme.primaryTeal)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (_medicines.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  const Icon(Icons.medication_outlined, color: AppTheme.primaryTeal, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      loc.translate('todayNoMeds'),
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ..._medicines.take(3).map((m) {
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppTheme.severityInfoBg,
                  child: Icon(Icons.medication, color: AppTheme.primaryTeal, size: 18),
                ),
                title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text('${m.dosage} • ${m.frequency} (${m.timing})', style: const TextStyle(fontSize: 11)),
                trailing: ProvenanceTag(provenance: m.provenance),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCheckInStatusSection(AppLocalizations loc) {
    final hasCheckInToday = _checkIns.any((c) =>
        c.checkInDate.toIso8601String().split('T').first ==
        DateTime.now().toIso8601String().split('T').first);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: hasCheckInToday ? Colors.green.shade100 : Colors.amber.shade100,
              child: Icon(
                hasCheckInToday ? Icons.check : Icons.access_time,
                color: hasCheckInToday ? Colors.green : Colors.amber.shade800,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    loc.translate('todayCheckInTitle'),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasCheckInToday
                        ? loc.translate('todayCheckInCompleted')
                        : loc.translate('todayCheckInPending'),
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _openCheckInDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              ),
              child: Text(hasCheckInToday ? 'Update' : 'Log Now', style: const TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }
}
