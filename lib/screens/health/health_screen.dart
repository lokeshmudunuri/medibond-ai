import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../models/allergy.dart';
import '../../models/condition.dart';
import '../../models/genomic_context.dart';
import '../../models/medicine.dart';
import '../../models/procedure.dart';
import '../../models/report.dart';
import '../../models/timeline_event.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../ui/widgets/health_status_badge.dart';
import '../../ui/widgets/provenance_tag.dart';
import 'add_health_item_dialog.dart';
import 'medicine_detail_dialog.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  final HealthMemoryService _memory = HealthMemoryService();

  List<ConditionEntity> _conditions = [];
  List<MedicineEntity> _medicines = [];
  List<AllergyEntity> _allergies = [];
  List<ProcedureEntity> _procedures = [];
  List<ReportEntity> _reports = [];
  List<TimelineEventEntity> _timeline = [];
  List<GeneDrugSafetyFlag> _geneFlags = [];

  bool _isLoading = true;
  StreamSubscription? _eventSub;

  @override
  void initState() {
    super.initState();
    _loadData();
    _eventSub = HealthEventBus().stream.listen((event) {
      if (mounted) {
        _loadData();
      }
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    final conditions = await _memory.getConditions();
    final medicines = await _memory.getAllMedicines();
    final allergies = await _memory.getAllergies();
    final procedures = await _memory.getProcedures();
    final reports = await _memory.getReports();
    final timeline = await _memory.getTimeline();
    final geneFlags = await _memory.getGeneDrugFlags();

    if (mounted) {
      setState(() {
        _conditions = conditions;
        _medicines = medicines;
        _allergies = allergies;
        _procedures = procedures;
        _reports = reports;
        _timeline = timeline;
        _geneFlags = geneFlags;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Personal Health Record'),
          bottom: const TabBar(
            labelColor: AppTheme.primaryTeal,
            unselectedLabelColor: AppTheme.textSecondary,
            indicatorColor: AppTheme.primaryTeal,
            indicatorWeight: 3,
            isScrollable: true,
            tabs: [
              Tab(text: 'Conditions & Allergies'),
              Tab(text: 'Medications'),
              Tab(text: 'Procedures & Labs'),
              Tab(text: 'Timeline & Genetics'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
            : TabBarView(
                children: [
                  _buildConditionsAndAllergiesTab(),
                  _buildMedicationsTab(),
                  _buildProceduresAndLabsTab(),
                  _buildTimelineAndGeneticsTab(),
                ],
              ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () {
            AddHealthItemDialog.show(context, onAdded: _loadData);
          },
          backgroundColor: AppTheme.primaryTeal,
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text('Add Record', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  Widget _buildConditionsAndAllergiesTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Section 1: Conditions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Documented Conditions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              Text('${_conditions.length} Active', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
          const SizedBox(height: 8),
          if (_conditions.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: AppTheme.primaryTeal, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'No chronic health conditions documented. Tap "+ Add Record" to enter diagnosed conditions.',
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._conditions.map((c) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              c.name,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ),
                          ProvenanceTag(provenance: c.provenance),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Diagnosed: ${c.diagnosedDate.toIso8601String().split('T').first} • Status: ${c.status.toUpperCase()}',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                      if (c.notes.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(c.notes, style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary)),
                      ],
                    ],
                  ),
                ),
              );
            }),

          const SizedBox(height: 20),

          // Section 2: Allergies
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Documented Allergies', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              Text('${_allergies.length} Recorded', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
          const SizedBox(height: 8),
          if (_allergies.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(Icons.shield_outlined, color: Colors.green, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'No known allergies documented. Add any medication or food allergies to enable contraindication checking.',
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._allergies.map((a) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.severityWarningBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.severityWarning.withValues(alpha: 0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: AppTheme.severityWarning, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              a.allergen,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                        ProvenanceTag(provenance: a.provenance),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Reaction: ${a.reaction} (Severity: ${a.severity})',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildMedicationsTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Active Medication Regimen', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              Text('${_medicines.where((m) => m.isActive).length} Active', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
          const SizedBox(height: 8),
          if (_medicines.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(Icons.medication_outlined, size: 40, color: AppTheme.primaryTeal),
                    SizedBox(height: 10),
                    Text('No Medications Recorded', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    SizedBox(height: 4),
                    Text('Scan a prescription or tap "Add Record" to start tracking your daily doses and reminders.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  ],
                ),
              ),
            )
          else
            ..._medicines.map((m) {
              return InkWell(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => MedicineDetailDialog(
                      medicine: m,
                      onUpdated: _loadData,
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(14),
                child: Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                m.name,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                              ),
                            ),
                            ProvenanceTag(provenance: m.provenance),
                          ],
                        ),
                        if (m.genericName.isNotEmpty && m.genericName != m.name) ...[
                          const SizedBox(height: 2),
                          Text('Generic: ${m.genericName}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textSecondary)),
                        ],
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceWarm,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              Column(
                                children: [
                                  const Text('Dose', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                  Text(m.dosage, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Column(
                                children: [
                                  const Text('Frequency', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                  Text(m.frequency, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Column(
                                children: [
                                  const Text('Timing', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                  Text(m.timing, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (m.instructions.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text('Instructions: ${m.instructions}', style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary)),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildProceduresAndLabsTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Surgical & Clinical Procedures', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._procedures.map((p) {
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            p.name,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ),
                        HealthStatusBadge(label: p.recoveryStatus, type: BadgeStatusType.inRecovery),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Date: ${p.procedureDate.toIso8601String().split('T').first} • Hospital: ${p.hospital}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    if (p.notes.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(p.notes, style: const TextStyle(fontSize: 12)),
                    ],
                  ],
                ),
              ),
            );
          }),

          const SizedBox(height: 16),
          const Text('Laboratory & Diagnostic Reports', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._reports.map((r) {
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(r.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        ProvenanceTag(provenance: r.provenance),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Date: ${r.testDate.toIso8601String().split('T').first} (${r.laboratoryOrHospital})', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    const SizedBox(height: 8),
                    Text(r.summary, style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary)),
                    const SizedBox(height: 8),
                    ...r.results.map((res) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(res.testName, style: const TextStyle(fontSize: 12)),
                            Row(
                              children: [
                                Text('${res.value} ${res.unit}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: res.isAbnormal ? AppTheme.severityCritical : AppTheme.textPrimary)),
                                if (res.isAbnormal) ...[
                                  const SizedBox(width: 4),
                                  const Icon(Icons.error_outline, size: 14, color: AppTheme.severityCritical),
                                ],
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
          }),
        ],
      ),
    );
  }

  Widget _buildTimelineAndGeneticsTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_geneFlags.isNotEmpty) ...[
            const Text('Pharmacogenetic & Gene-Drug Context', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._geneFlags.map((g) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFC084FC)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Gene ${g.gene} (${g.variantOrPhenotype})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF6B21A8))),
                        ProvenanceTag(provenance: g.provenance),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Affected Drug: ${g.affectedDrug}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF7E22CE))),
                    const SizedBox(height: 4),
                    Text(g.clinicalImplication, style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary)),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
          ],

          const Text('Longitudinal Health Timeline', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._timeline.map((event) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryTeal,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Container(
                      width: 2,
                      height: 50,
                      color: Colors.grey.shade300,
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              event.title,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                            Text(
                              event.eventDate.toIso8601String().split('T').first,
                              style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          event.description,
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}
