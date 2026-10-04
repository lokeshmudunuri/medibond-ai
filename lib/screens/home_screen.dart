import 'package:flutter/material.dart';
import '../ui/document_import_panel.dart';
import '../ui/sensor_monitoring_panel.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    _DashboardTab(),
    _UnderstandCareTab(),
    _RecoveryWatchTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CareWatch AI Recovery'),
        elevation: 2,
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description),
            label: 'Understand Care',
          ),
          NavigationDestination(
            icon: Icon(Icons.monitor_heart_outlined),
            selectedIcon: Icon(Icons.monitor_heart),
            label: 'Recovery Watch',
          ),
        ],
      ),
    );
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: const Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome to CareWatch AI',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Real-time recovery monitoring and smart medical document analysis for postoperative and ongoing recovery care.',
                    style: TextStyle(color: Colors.black87),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const DocumentImportPanel(),
          const SizedBox(height: 12),
          const SensorMonitoringPanel(),
        ],
      ),
    );
  }
}

class _UnderstandCareTab extends StatelessWidget {
  const _UnderstandCareTab();

  @override
  Widget build(BuildContext context) {
    return const SingleChildScrollView(
      padding: EdgeInsets.all(16.0),
      child: Column(
        children: [
          DocumentImportPanel(),
        ],
      ),
    );
  }
}

class _RecoveryWatchTab extends StatelessWidget {
  const _RecoveryWatchTab();

  @override
  Widget build(BuildContext context) {
    return const SingleChildScrollView(
      padding: EdgeInsets.all(16.0),
      child: Column(
        children: [
          SensorMonitoringPanel(),
        ],
      ),
    );
  }
}
