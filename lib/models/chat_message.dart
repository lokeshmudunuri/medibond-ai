class ChatMessageEntity {
  final String id;
  final String conversationId;
  final String role; // 'user', 'assistant', 'system'
  final String content;
  final DateTime timestamp;
  final String modelName;
  final String languageCode;
  final String? suggestedActionType; // 'log_checkin', 'scan_doc', 'open_food_guidance', etc.
  final String? suggestedActionPayload; // JSON or formatted text

  ChatMessageEntity({
    required this.id,
    this.conversationId = 'default_conversation',
    required this.role,
    required this.content,
    required this.timestamp,
    this.modelName = 'Gemma 4 E2B LiteRT-LM',
    this.languageCode = 'en',
    this.suggestedActionType,
    this.suggestedActionPayload,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
  bool get isSystem => role == 'system';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'conversationId': conversationId,
      'role': role,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'modelName': modelName,
      'languageCode': languageCode,
      'suggestedActionType': suggestedActionType,
      'suggestedActionPayload': suggestedActionPayload,
    };
  }

  factory ChatMessageEntity.fromMap(Map<String, dynamic> map) {
    return ChatMessageEntity(
      id: map['id'] ?? '',
      conversationId: map['conversationId'] ?? 'default_conversation',
      role: map['role'] ?? 'user',
      content: map['content'] ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
      modelName: map['modelName'] ?? 'Gemma 4 E2B LiteRT-LM',
      languageCode: map['languageCode'] ?? 'en',
      suggestedActionType: map['suggestedActionType'],
      suggestedActionPayload: map['suggestedActionPayload'],
    );
  }
}
