import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/resources/resource_manager.dart';
import '../../models/model_package.dart';

class ResourceManagerScreen extends StatefulWidget {
  const ResourceManagerScreen({super.key});

  @override
  State<ResourceManagerScreen> createState() => _ResourceManagerScreenState();
}

class _ResourceManagerScreenState extends State<ResourceManagerScreen> {
  final ResourceManager _manager = ResourceManager();
  List<ModelPackageEntity> _models = [];

  @override
  void initState() {
    super.initState();
    _loadModels();
  }

  void _loadModels() {
    setState(() {
      _models = _manager.models;
    });
  }

  Future<void> _install(String modelId) async {
    final success = await _manager.installPackage(modelId);
    if (mounted) {
      _loadModels();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Model package successfully downloaded and verified!' : 'Installation failed.'),
          backgroundColor: success ? AppTheme.primaryTeal : AppTheme.severityCritical,
        ),
      );
    }
  }

  Future<void> _uninstall(String modelId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Uninstall Model Package?'),
        content: const Text('Removing this offline model will delete only the model weight file. Your personal health database, medical records, and recovery metrics will remain 100% untouched.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.severityCritical),
            child: const Text('Uninstall'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await _manager.uninstallPackage(modelId);
      if (mounted) {
        _loadModels();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Model package removed cleanly.' : 'Failed to remove package.'),
          ),
        );
      }
    }
  }

  Future<void> _runSelfTest(String modelId) async {
    final valid = await _manager.runModelSelfTest(modelId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(valid ? 'Local Model Self-Test & Checksum PASSED ✅' : 'Self-test validation failed!'),
          backgroundColor: valid ? AppTheme.primaryTeal : AppTheme.severityCritical,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline AI Model Manager'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _manager.initialize();
              _loadModels();
            },
          ),
        ],
      ),
      body: StreamBuilder<List<ModelPackageEntity>>(
        stream: _manager.packagesStream,
        initialData: _manager.models,
        builder: (context, snapshot) {
          final list = snapshot.data ?? _models;

          final installed = list.where((m) => m.status == ModelInstallStatus.installed).toList();
          final available = list.where((m) => m.status != ModelInstallStatus.installed).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Notice Card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.offline_bolt_outlined, color: AppTheme.primaryTeal),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '100% On-Device Execution: All model weights execute locally via direct CPU / Vulkan GPU runtime without network connectivity.',
                        style: TextStyle(fontSize: 12, color: AppTheme.textPrimary, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Installed Models Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Installed & Verified Models', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text('${installed.length} Ready', style: const TextStyle(fontSize: 12, color: AppTheme.primaryTeal, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              if (installed.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('No optional model packages installed yet.', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                  ),
                )
              else
                ...installed.map((m) => _buildModelCard(m, true)),

              const SizedBox(height: 24),

              // Available Models Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Available Offline Packages', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text('${available.length} Available', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                ],
              ),
              const SizedBox(height: 8),
              ...available.map((m) => _buildModelCard(m, false)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildModelCard(ModelPackageEntity model, bool isInstalled) {
    final isDownloading = model.status == ModelInstallStatus.downloading;
    final isVerifying = model.status == ModelInstallStatus.verifying;

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
                    model.displayName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isInstalled ? Colors.green.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: isInstalled ? Colors.green.shade300 : Colors.grey.shade300),
                  ),
                  child: Text(
                    isInstalled ? 'READY' : 'AVAILABLE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isInstalled ? Colors.green.shade800 : AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _buildTag(model.formattedSize, Colors.grey.shade200, AppTheme.textPrimary),
                _buildTag(model.format, Colors.blue.shade50, Colors.blue.shade800),
                _buildTag(model.runtime, Colors.teal.shade50, Colors.teal.shade800),
                _buildTag(model.license, Colors.amber.shade50, Colors.amber.shade900),
              ],
            ),
            const SizedBox(height: 8),

            // Progress bar if downloading
            if (isDownloading || isVerifying) ...[
              LinearProgressIndicator(
                value: isVerifying ? null : model.downloadProgress,
                backgroundColor: Colors.grey.shade200,
                color: AppTheme.primaryTeal,
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isVerifying
                        ? 'Verifying SHA-256 Checksum & Self-Test...'
                        : 'Downloaded: ${(model.bytesDownloaded / (1024 * 1024)).toStringAsFixed(1)} MB / ${model.formattedSize}',
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  Text(
                    '${(model.downloadProgress * 100).toInt()}%',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (isInstalled) ...[
                  OutlinedButton.icon(
                    onPressed: () => _runSelfTest(model.modelId),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Self-Test', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (!model.isRequiredForCore)
                    TextButton(
                      onPressed: () => _uninstall(model.modelId),
                      child: const Text('Uninstall', style: TextStyle(color: AppTheme.severityCritical, fontSize: 11)),
                    ),
                ] else ...[
                  ElevatedButton.icon(
                    onPressed: isDownloading || isVerifying ? null : () => _install(model.modelId),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Download Package', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color bg, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: textColor)),
    );
  }
}
