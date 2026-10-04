export type CaseStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type CaseType = 'GENERAL' | 'RECOVERY';

export interface CaseFile {
  id: string;
  title: string;
  doctorName: string;
  hospitalName: string;
  specialty?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  caseType: CaseType;
  followUpDate?: string;
  dietGuidance?: string;
  doctorInstructions: string[];
  documentIds: string[];
  medicineIds: string[];
  symptoms: string[];
  notes?: string;
}

export interface CreateCasePayload {
  title: string;
  doctorName: string;
  hospitalName: string;
  specialty?: string;
  description?: string;
  caseType?: CaseType;
  followUpDate?: string;
  dietGuidance?: string;
  initialInstructions?: string;
}
