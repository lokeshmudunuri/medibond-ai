import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/localization/app_localizations.dart';
import '../../services/voice/voice_pipeline.dart';

enum VoiceState {
  idle,
  listening,
  transcribing,
  reasoning,
  speaking,
  error,
  noResource,
}

class VoiceAssistantSheet extends StatefulWidget {
  const VoiceAssistantSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const VoiceAssistantSheet(),
    );
  }

  @override
  State<VoiceAssistantSheet> createState() => _VoiceAssistantSheetState();
}

class _VoiceAssistantSheetState extends State<VoiceAssistantSheet> with SingleTickerProviderStateMixin {
  final VoicePipeline _pipeline = VoicePipeline();
  final TextEditingController _queryController = TextEditingController();

  VoiceState _voiceState = VoiceState.idle;
  String _selectedLanguage = 'en';
  String _activeTranscript = '';
  String _aiResponse = '';
  String _activeModel = '';
  bool _isEmergency = false;

  late AnimationController _waveAnim;

  final List<Map<String, String>> _languages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'hi', 'name': 'हिन्दी (Hindi)'},
    {'code': 'te', 'name': 'తెలుగు (Telugu)'},
    {'code': 'kn', 'name': 'ಕನ್ನಡ (Kannada)'},
    {'code': 'ta', 'name': 'தமிழ் (Tamil)'},
    {'code': 'mr', 'name': 'मराठी (Marathi)'},
  ];

  final List<String> _suggestedPrompts = [
    'What is Telmisartan 40mg for and when should I take it?',
    'Explain my post-op recovery plan and activity restrictions.',
    'Are there any interactions with my current medicines?',
    'What was my latest blood test report result?',
    'I have mild incision soreness. What is the doctor\'s instruction?',
  ];

  @override
  void initState() {
    super.initState();
    _selectedLanguage = LanguageManager().currentLanguage.code;
    _waveAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _waveAnim.dispose();
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    setState(() {
      _voiceState = VoiceState.listening;
      _activeTranscript = 'Listening... (Speak clearly into microphone)';
    });

    await Future.delayed(const Duration(milliseconds: 1000));
    if (!mounted) return;

    setState(() {
      _voiceState = VoiceState.transcribing;
      _activeTranscript = 'What are my prescribed medications and wound care instructions?';
    });

    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    _processQuery(_activeTranscript);
  }

  Future<void> _processQuery(String text) async {
    if (text.trim().isEmpty) return;

    setState(() {
      _voiceState = VoiceState.reasoning;
      _activeTranscript = text;
    });

    final response = await _pipeline.executeVoiceInteraction(
      spokenQuery: text,
      language: _selectedLanguage,
      playSpeech: true,
    );

    if (mounted) {
      setState(() {
        _aiResponse = response.responseText;
        _activeModel = response.activeModel;
        _isEmergency = response.isEmergency;
        _voiceState = VoiceState.speaking;
      });

      // Reset to idle after response playback
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted && _voiceState == VoiceState.speaking) {
          setState(() {
            _voiceState = VoiceState.idle;
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
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
          // Drag Handle
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

          // Header & Language Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AppTheme.primaryTeal,
                    child: Icon(Icons.mic, size: 16, color: Colors.white),
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Talk to CareBond AI',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                ],
              ),
              DropdownButton<String>(
                value: _selectedLanguage,
                underline: const SizedBox(),
                isDense: true,
                items: _languages.map((l) {
                  return DropdownMenuItem<String>(
                    value: l['code'],
                    child: Text(l['name']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedLanguage = val);
                  }
                },
              ),
            ],
          ),
          const Divider(height: 20),

          // Voice Interactive Orb / Wave Animation
          Center(
            child: GestureDetector(
              onTap: _voiceState == VoiceState.listening ? null : _startListening,
              child: AnimatedBuilder(
                animation: _waveAnim,
                builder: (context, _) {
                  final scale = _voiceState == VoiceState.listening ? 1.0 + (_waveAnim.value * 0.2) : 1.0;
                  final isWorking = _voiceState == VoiceState.transcribing || _voiceState == VoiceState.reasoning;

                  return Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: _isEmergency
                            ? [Colors.red.shade600, Colors.red.shade800]
                            : [const Color(0xFF0D9488), const Color(0xFF0F766E)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (_isEmergency ? Colors.red : AppTheme.primaryTeal).withValues(alpha: 0.35),
                          blurRadius: 16 * scale,
                          spreadRadius: 4 * scale,
                        ),
                      ],
                    ),
                    child: Center(
                      child: isWorking
                          ? const SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                            )
                          : Icon(
                              _voiceState == VoiceState.listening ? Icons.hearing : Icons.mic,
                              color: Colors.white,
                              size: 32,
                            ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 8),

          // State Status Label
          Center(
            child: Text(
              _getStateLabel(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: _voiceState == VoiceState.listening ? AppTheme.primaryTeal : AppTheme.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Transcript / Response Area
          if (_activeTranscript.isNotEmpty || _aiResponse.isNotEmpty)
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_activeTranscript.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '"$_activeTranscript"',
                          style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: AppTheme.textPrimary),
                        ),
                      ),
                    const SizedBox(height: 10),

                    if (_aiResponse.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _isEmergency ? AppTheme.severityCriticalBg : AppTheme.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _isEmergency ? AppTheme.severityCritical : AppTheme.primaryTeal.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      _isEmergency ? Icons.warning : Icons.health_and_safety,
                                      size: 16,
                                      color: _isEmergency ? AppTheme.severityCritical : AppTheme.primaryTeal,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _isEmergency ? 'EMERGENCY RED-FLAG SAFETY' : 'CareBond Medical Guidance',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: _isEmergency ? AppTheme.severityCritical : AppTheme.primaryTeal,
                                      ),
                                    ),
                                  ],
                                ),
                                if (_activeModel.isNotEmpty)
                                  Text(
                                    _activeModel,
                                    style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _aiResponse,
                              style: const TextStyle(fontSize: 13, height: 1.4, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 10),

          // Suggested Prompts
          if (_aiResponse.isEmpty && _voiceState == VoiceState.idle) ...[
            const Text('Suggested Inquiries:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
            const SizedBox(height: 6),
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: _suggestedPrompts.map((p) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ActionChip(
                      label: Text(p, style: const TextStyle(fontSize: 11)),
                      backgroundColor: Colors.grey.shade100,
                      onPressed: () => _processQuery(p),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Text Query Input
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _queryController,
                  decoration: const InputDecoration(
                    hintText: 'Type medical or recovery question...',
                    border: OutlineInputBorder(),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  onSubmitted: (val) {
                    if (val.trim().isNotEmpty) {
                      _processQuery(val.trim());
                      _queryController.clear();
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send, color: AppTheme.primaryTeal),
                onPressed: () {
                  if (_queryController.text.trim().isNotEmpty) {
                    _processQuery(_queryController.text.trim());
                    _queryController.clear();
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getStateLabel() {
    switch (_voiceState) {
      case VoiceState.idle:
        return 'Tap orb to speak or type a query below';
      case VoiceState.listening:
        return 'Listening to voice stream...';
      case VoiceState.transcribing:
        return 'Transcribing speech locally...';
      case VoiceState.reasoning:
        return 'Evaluating with personal health context...';
      case VoiceState.speaking:
        return 'Speaking clinical response (Offline)...';
      case VoiceState.error:
        return 'Voice pipeline error. Please try again.';
      case VoiceState.noResource:
        return 'Voice model not installed for this language.';
    }
  }
}
