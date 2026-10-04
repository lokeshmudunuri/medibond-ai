export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelName: string;
  languageCode?: string;
  suggestedActionType?: string;
  suggestedActionPayload?: string;
  isEmergencyAlert?: boolean;
}

export enum EmergencyStatus {
  Normal = 'normal',
  UrgentWarning = 'urgent_warning',
  CriticalEmergency = 'critical_emergency',
}

export interface EmergencyEvaluation {
  status: EmergencyStatus;
  title: string;
  rationale: string;
  immediateAction: string;
  emergencyNumber: string;
  isEmergency: boolean;
}

export enum ScopeFilterResult {
  InScope = 'in_scope',
  OutOfScope = 'out_of_scope',
  UnauthorizedAction = 'unauthorized_action',
}
