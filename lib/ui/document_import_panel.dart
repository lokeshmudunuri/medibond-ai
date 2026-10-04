import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../core/config/app_theme.dart';
import '../screens/documents/document_confirmation_screen.dart';
import '../services/documents/document_pipeline.dart';

class DocumentImportPanel extends StatefulWidget {
  const DocumentImportPanel({super.key});

  @override
  State<DocumentImportPanel> createState() => _DocumentImportPanelState();
}

class _DocumentImportPanelState extends State<DocumentImportPanel> {
  final DocumentPipeline _pipeline = DocumentPipeline();
  String? _selectedFilePath;
  bool _isProcessing = false;
  String _statusMessage = 'Select a prescription or medical report to process offline';

  Future<void> _selectFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );

    if (result != null && result.files.single.path != null) {
      final path = result.files.single.path!;
      final name = result.files.single.name;

      setState(() {
        _selectedFilePath = path;
        _statusMessage = 'Running offline PP-OCR & Medical NER...';
        _isProcessing = true;
      });

      final category = name.toLowerCase().contains('report') || name.toLowerCase().contains('cbc')
          ? DocumentTypeCategory.labReport
          : name.toLowerCase().contains('discharge')
              ? DocumentTypeCategory.dischargeSummary
              : DocumentTypeCategory.prescription;

      final docResult = await _pipeline.processDocumentFile(
        filePath: path,
        fileName: name,
        category: category,
      );

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Document extracted successfully. Reviewing candidate items...';
        });

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (ctx) => DocumentConfirmationScreen(result: docResult),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.document_scanner, color: AppTheme.primaryTeal, size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Document Import & OCR',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(_statusMessage, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            const SizedBox(height: 12),
            if (_selectedFilePath != null)
              Text('Selected: $_selectedFilePath', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: _isProcessing ? null : _selectFile,
              icon: _isProcessing
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.file_upload, size: 18),
              label: Text(_isProcessing ? 'Processing...' : 'Select Medical File'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ],
        ),
      ),
    );
  }
}