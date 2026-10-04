import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';
import '../../core/config/app_theme.dart';
import '../../core/events/health_event_bus.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/security/sanitized_logger.dart';
import '../../models/chat_message.dart';
import '../../models/check_in.dart';
import '../../models/provenance.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../../services/medical_reasoning/gemma_inference_engine.dart';
import '../../services/recovery/recovery_engine.dart';
import '../today/what_can_i_eat_dialog.dart';

class ChatScreen extends StatefulWidget {
  final String? initialPrompt;

  const ChatScreen({super.key, this.initialPrompt});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const String _tag = 'ChatScreen';
  static const _uuid = Uuid();

  final HealthMemoryService _memory = HealthMemoryService();
  final GemmaInferenceEngine _engine = GemmaInferenceEngine();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<ChatMessageEntity> _messages = [];
  bool _isLoading = true;
  bool _isGenerating = false;
  String _streamingContent = '';
  StreamSubscription<String>? _streamSub;

  final List<String> _suggestedPrompts = [
    'What is Telmisartan 40mg for and when should I take it?',
    'I slept for 4 hours and my pain is 7.',
    'What can I eat during post-op recovery?',
    'What are my activity and wound care restrictions?',
    'Explain my latest blood test report results.',
  ];

  @override
  void initState() {
    super.initState();
    _loadChatHistory();
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadChatHistory() async {
    final history = await _memory.getChatMessages();
    if (mounted) {
      setState(() {
        _messages = history;
        _isLoading = false;
      });
      _scrollToBottom();

      if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
        _sendMessage(widget.initialPrompt!);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final query = text.trim();
    if (query.isEmpty || _isGenerating) return;

    _textController.clear();
    final lang = LanguageManager().currentLanguage.code;

    // 1. Add and persist user message
    final userMsg = ChatMessageEntity(
      id: _uuid.v4(),
      role: 'user',
      content: query,
      timestamp: DateTime.now(),
      modelName: _engine.activeModelName,
      languageCode: lang,
    );

    setState(() {
      _messages.add(userMsg);
      _isGenerating = true;
      _streamingContent = '';
    });
    await _memory.saveChatMessage(userMsg);
    _scrollToBottom();

    // 2. Start streaming response from on-device Gemma engine
    final stream = _engine.streamInference(
      prompt: query,
      languageCode: lang,
    );

    final buffer = StringBuffer();
    _streamSub = stream.listen(
      (token) {
        buffer.write(token);
        if (mounted) {
          setState(() {
            _streamingContent = buffer.toString();
          });
          _scrollToBottom();
        }
      },
      onDone: () async {
        final finalText = buffer.toString();
        final checkInAction = _engine.processChatMessage(userMessage: query, languageCode: lang);
        final actionResult = await checkInAction;

        final assistantMsg = ChatMessageEntity(
          id: _uuid.v4(),
          role: 'assistant',
          content: finalText.isNotEmpty ? finalText : actionResult.content,
          timestamp: DateTime.now(),
          modelName: _engine.activeModelName,
          languageCode: lang,
          suggestedActionType: actionResult.suggestedActionType,
          suggestedActionPayload: actionResult.suggestedActionPayload,
        );

        await _memory.saveChatMessage(assistantMsg);

        if (mounted) {
          setState(() {
            _messages.add(assistantMsg);
            _streamingContent = '';
            _isGenerating = false;
          });
          _scrollToBottom();
        }
      },
      onError: (err) {
        SanitizedLogger.error(_tag, 'Streaming error', err);
        if (mounted) {
          setState(() {
            _isGenerating = false;
            _streamingContent = '';
          });
        }
      },
    );
  }

  void _stopGeneration() {
    _streamSub?.cancel();
    if (_streamingContent.isNotEmpty) {
      final msg = ChatMessageEntity(
        id: _uuid.v4(),
        role: 'assistant',
        content: '$_streamingContent [Generation stopped]',
        timestamp: DateTime.now(),
        modelName: _engine.activeModelName,
      );
      _memory.saveChatMessage(msg);
      _messages.add(msg);
    }
    setState(() {
      _isGenerating = false;
      _streamingContent = '';
    });
  }

  Future<void> _handleActionExecution(ChatMessageEntity msg) async {
    if (msg.suggestedActionType == 'log_checkin') {
      // Parse payload: "pain=7&sleep=4.0"
      int pain = 7;
      double sleep = 4.0;
      try {
        final parts = msg.suggestedActionPayload!.split('&');
        for (var p in parts) {
          final kv = p.split('=');
          if (kv[0] == 'pain') pain = int.parse(kv[1]);
          if (kv[0] == 'sleep') sleep = double.parse(kv[1]);
        }
      } catch (_) {}

      final checkIn = DailyCheckInEntity(
        id: 'chk_${_uuid.v4().substring(0, 8)}',
        checkInDate: DateTime.now(),
        painScore: pain,
        fatigueScore: 5,
        moodScore: 3,
        sleepHours: sleep,
        tookAllMedications: true,
        reportedSymptoms: 'Reported via CareBond AI Chat',
        patientSpokenTranscript: 'Chat check-in logged',
        provenance: Provenance.userReported(),
      );

      await _memory.logCheckIn(checkIn);
      await RecoveryEngine().calculateDynamicRecoveryIndex();
      HealthEventBus().notifyDataChanged();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Stored in Health Memory: Pain $pain/10, Sleep $sleep hrs. Recovery Index recalculated.'),
            backgroundColor: AppTheme.primaryTeal,
          ),
        );
      }
    } else if (msg.suggestedActionType == 'open_food_guidance') {
      showDialog(
        context: context,
        builder: (ctx) => const WhatCanIEatDialog(),
      );
    }
  }

  Future<void> _clearHistory() async {
    await _memory.clearChatHistory();
    setState(() {
      _messages.clear();
      _streamingContent = '';
      _isGenerating = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('CareBond AI Companion', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.greenAccent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${_engine.activeModelName} • 100% Offline',
                  style: const TextStyle(fontSize: 10, color: Colors.white70),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.white),
            tooltip: 'Clear Chat History',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Clear Conversation?'),
                  content: const Text('This will clear local chat history without affecting your medical records.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.severityCritical),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _clearHistory();
                      },
                      child: const Text('Clear', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Suggested prompt horizontal pills if conversation is short
            if (_messages.length <= 2 && !_isGenerating)
              Container(
                height: 48,
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _suggestedPrompts.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, index) {
                    final p = _suggestedPrompts[index];
                    return ActionChip(
                      label: Text(p, style: const TextStyle(fontSize: 11)),
                      backgroundColor: Colors.teal.shade50,
                      side: BorderSide(color: AppTheme.primaryTeal.withValues(alpha: 0.3)),
                      onPressed: () => _sendMessage(p),
                    );
                  },
                ),
              ),

            // Message List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length + (_isGenerating ? 1 : 0),
                      itemBuilder: (ctx, index) {
                        if (index == _messages.length && _isGenerating) {
                          return _buildStreamingBubble();
                        }
                        final msg = _messages[index];
                        return _buildMessageBubble(msg);
                      },
                    ),
            ),

            // Stop Generation Button
            if (_isGenerating)
              Padding(
                padding: const EdgeInsets.only(bottom: 6.0),
                child: TextButton.icon(
                  onPressed: _stopGeneration,
                  icon: const Icon(Icons.stop_circle_outlined, color: AppTheme.severityCritical, size: 18),
                  label: const Text('Stop Generation', style: TextStyle(color: AppTheme.severityCritical, fontSize: 12)),
                  style: TextButton.styleFrom(
                    backgroundColor: AppTheme.severityCriticalBg,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                ),
              ),

            // Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, -1))],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: loc.translate('actionTalk'),
                        hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryTeal,
                    radius: 22,
                    child: IconButton(
                      icon: Icon(_isGenerating ? Icons.hourglass_top : Icons.send, color: Colors.white, size: 18),
                      onPressed: () => _sendMessage(_textController.text),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessageEntity msg) {
    final isUser = msg.isUser;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) ...[
                const CircleAvatar(
                  backgroundColor: AppTheme.primaryTeal,
                  radius: 14,
                  child: Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.primaryTeal : Colors.grey.shade100,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                      bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.content,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: isUser ? Colors.white : AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${msg.timestamp.hour.toString().padLeft(2, '0')}:${msg.timestamp.minute.toString().padLeft(2, '0')}',
                            style: TextStyle(
                              fontSize: 10,
                              color: isUser ? Colors.white70 : AppTheme.textSecondary,
                            ),
                          ),
                          if (!isUser) ...[
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                Clipboard.setData(ClipboardData(text: msg.content));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Copied response to clipboard.'), duration: Duration(seconds: 1)),
                                );
                              },
                              child: const Icon(Icons.copy, size: 12, color: AppTheme.textSecondary),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Suggested Action Chip (e.g. Save Check-in)
          if (!isUser && msg.suggestedActionType != null)
            Padding(
              padding: const EdgeInsets.only(left: 36.0, top: 6.0),
              child: ActionChip(
                avatar: const Icon(Icons.check_circle_outline, color: AppTheme.primaryTeal, size: 16),
                label: Text(
                  msg.suggestedActionType == 'log_checkin'
                      ? 'Confirm & Save Check-in (${msg.suggestedActionPayload})'
                      : 'View Context Guidance',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                ),
                backgroundColor: AppTheme.severityInfoBg,
                side: const BorderSide(color: AppTheme.primaryTeal),
                onPressed: () => _handleActionExecution(msg),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStreamingBubble() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            backgroundColor: AppTheme.primaryTeal,
            radius: 14,
            child: Icon(Icons.auto_awesome, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                  bottomLeft: Radius.circular(4),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _streamingContent.isNotEmpty ? _streamingContent : '...',
                    style: const TextStyle(fontSize: 13, height: 1.35, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.primaryTeal),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Generating with ${_engine.activeModelName}...',
                        style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: AppTheme.primaryTeal),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
