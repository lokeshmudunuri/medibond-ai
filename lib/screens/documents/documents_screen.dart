import 'dart:async';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/security/sanitized_logger.dart';
import '../../models/report.dart';
import '../../services/documents/document_pipeline.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../ui/widgets/provenance_tag.dart';
import 'document_confirmation_screen.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  static const String _tag = 'DocumentsScreen';
  final HealthMemoryService _memory = HealthMemoryService();
  final DocumentPipeline _pipeline = DocumentPipeline();
  final ImagePicker _picker = ImagePicker();

  List<ReportEntity> _reports = [];
  bool _isProcessing = false;
  bool _isLoading = true;
  StreamSubscription? _eventSubscription;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
    _eventSubscription = HealthEventBus().stream.listen((event) {
      if (mounted) {
        _loadDocuments();
      }
    });
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadDocuments() async {
    final list = await _memory.getReports();
    if (mounted) {
      setState(() {
        _reports = list;
        _isLoading = false;
      });
    }
  }

  Future<void> _startScanWorkflow(DocumentTypeCategory category) async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Scan ${category.name.toUpperCase()} Document',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppTheme.primaryTeal,
                    child: Icon(Icons.camera_alt_outlined, color: Colors.white),
                  ),
                  title: const Text('Capture with Device Camera', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Take a live photo of prescription, lab, or discharge papers'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFromCamera(category);
                  },
                ),
                const Divider(),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primaryTeal.withValues(alpha: 0.1),
                    child: const Icon(Icons.photo_library_outlined, color: AppTheme.primaryTeal),
                  ),
                  title: const Text('Choose from Photo Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Select a saved image of medical report'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFromGallery(category);
                  },
                ),
                const Divider(),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primaryTeal.withValues(alpha: 0.1),
                    child: const Icon(Icons.picture_as_pdf_outlined, color: AppTheme.primaryTeal),
                  ),
                  title: const Text('Choose Document / PDF File', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Select file from local storage or downloads'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFromFileSystem(category);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickFromCamera(DocumentTypeCategory category) async {
    try {
      final photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
        imageQuality: 92,
      );
      if (photo != null) {
        await _processScannedFile(photo.path, photo.name, category);
      }
    } catch (e) {
      SanitizedLogger.error(_tag, 'Camera error', e);
      _showErrorDialog('Camera Access', 'Unable to open device camera. Please check camera permissions in Settings.');
    }
  }

  Future<void> _pickFromGallery(DocumentTypeCategory category) async {
    try {
      final photo = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 92,
      );
      if (photo != null) {
        await _processScannedFile(photo.path, photo.name, category);
      }
    } catch (e) {
      SanitizedLogger.error(_tag, 'Gallery error', e);
      _showErrorDialog('Gallery Access', 'Unable to pick image from gallery. Please check storage permissions.');
    }
  }

  Future<void> _pickFromFileSystem(DocumentTypeCategory category) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'txt'],
      );
      if (result != null && result.files.single.path != null) {
        final path = result.files.single.path!;
        final name = result.files.single.name;
        await _processScannedFile(path, name, category);
      }
    } catch (e) {
      SanitizedLogger.error(_tag, 'File picker error', e);
      _showErrorDialog('File Access', 'Unable to open file picker.');
    }
  }

  Future<void> _processScannedFile(String filePath, String fileName, DocumentTypeCategory category) async {
    setState(() {
      _isProcessing = true;
    });

    try {
      final result = await _pipeline.processDocumentFile(
        filePath: filePath,
        fileName: fileName,
        category: category,
      );

      if (mounted) {
        setState(() {
          _isProcessing = false;
        });

        final committed = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (ctx) => DocumentConfirmationScreen(result: result),
          ),
        );

        if (committed == true) {
          _loadDocuments();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
        _showErrorDialog('OCR Processing', 'Failed to extract text from document: $e');
      }
    }
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(loc.translate('documentsTitle')),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Scan Options Header
                  const Text(
                    'Scan or Import Clinical Records',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'All processing occurs 100% on-device using local PP-OCR & Medical NER.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 14),

                  if (_isProcessing)
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryTeal.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.primaryTeal.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          CircularProgressIndicator(color: AppTheme.primaryTeal),
                          SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Processing Document with Local OCR...', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('Extracting entities, medications & clinical values', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Scan Buttons
                  Row(
                    children: [
                      Expanded(
                        child: _ScanOptionCard(
                          icon: Icons.receipt_long_outlined,
                          title: loc.translate('scanPrescription'),
                          subtitle: 'Rx & Dosages',
                          color: AppTheme.primaryTeal,
                          onTap: () => _startScanWorkflow(DocumentTypeCategory.prescription),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ScanOptionCard(
                          icon: Icons.science_outlined,
                          title: loc.translate('scanReport'),
                          subtitle: 'CBC, Lipid, Metabolic',
                          color: Colors.indigo,
                          onTap: () => _startScanWorkflow(DocumentTypeCategory.labReport),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ScanOptionCard(
                          icon: Icons.local_hospital_outlined,
                          title: loc.translate('scanDischarge'),
                          subtitle: 'Post-Op Instructions',
                          color: Colors.teal.shade700,
                          onTap: () => _startScanWorkflow(DocumentTypeCategory.dischargeSummary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Stored Documents
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Stored Medical Records',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      Text('${_reports.length} Documents', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_reports.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(24.0),
                        child: Column(
                          children: [
                            Icon(Icons.document_scanner_outlined, size: 40, color: AppTheme.primaryTeal),
                            SizedBox(height: 10),
                            Text('No Medical Documents Scanned Yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            SizedBox(height: 4),
                            Text(
                              'Use the camera or upload options above to digitize prescriptions, discharge summaries, or laboratory reports offline with verified medical entity extraction.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ..._reports.map((doc) {
                      return Card(
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
                                      doc.title,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                    ),
                                  ),
                                  ProvenanceTag(provenance: doc.provenance),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${doc.type} • ${doc.testDate.toIso8601String().split('T').first} • ${doc.laboratoryOrHospital}',
                                style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                              ),
                              if (doc.summary.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  doc.summary,
                                  style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                                ),
                              ],
                              if (doc.results.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: doc.results.take(3).map((r) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: r.isAbnormal ? AppTheme.severityWarningBg : Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: r.isAbnormal ? AppTheme.severityWarning : Colors.grey.shade300),
                                      ),
                                      child: Text(
                                        '${r.testName}: ${r.value} ${r.unit}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: r.isAbnormal ? AppTheme.severityWarning : AppTheme.textPrimary,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}

class _ScanOptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ScanOptionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          child: Column(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
