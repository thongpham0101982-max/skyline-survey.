import { ActionProposal } from "../actions/actionTypes";

export type AssistantRole = "STUDENT" | "TEACHER" | "TTCM" | "TBP" | "PARENT" | "ADMIN";

export type AIIntent =
  | "KNOWLEDGE_SEARCH"
  | "EXAM_ANALYSIS"
  | "OBSERVATION_ANALYSIS"
  | "ADVISORY_ANALYSIS"
  | "ACTION_REQUEST"
  | "STUDENT_QUERY"
  | "TEACHER_QUERY"
  | "REPORT"
  | "SSM_GUIDE"
  | "GENERAL_INQUIRY";

export interface AIUserContext {
  userId?: string;
  userName?: string;
  role: AssistantRole;
  campusId?: string;
  allowedCampusIds?: string[];
  departmentId?: string;
  managedDepartmentIds?: string[];
  managedDivisions?: string[];
  isHeadOfAcademic?: boolean;
  isTBP?: boolean;
  isTTCM?: boolean;
  teacherId?: string;
  studentId?: string;
  classId?: string;
}

export interface AIPageContext {
  currentPath: string;
  module?: string;
  classId?: string;
  subjectId?: string;
  campusId?: string;
  examPeriod?: string;
  studentId?: string;
}

export interface KnowledgeDocumentMetadata {
  id: string;
  title: string;
  category: "REGULATION" | "BENCHMARK" | "OBSERVATION" | "ADVISORY" | "PROCESS" | "SSM_GUIDE" | "GENERAL";
  version: string;
  schoolYear: string;
  effectiveDate: string; // YYYY-MM-DD
  expiryDate?: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  roleScope: AssistantRole[];
  campusScope: string[]; // ["ALL"] or ["CS1", "CS2", ...]
  source: string;
  content: string;
  summary?: string;
}

export interface RAGCitation {
  documentId: string;
  title: string;
  category: string;
  version: string;
  source: string;
  effectiveDate: string;
  snippet?: string;
}

export interface AIAssistantResponse {
  success: boolean;
  text: string;
  intent: AIIntent;
  role: AssistantRole;
  personaName: string;
  badge: string;
  primaryColor: string;
  sources?: RAGCitation[];
  toolsUsed?: string[];
  analyticsContext?: {
    module: string;
    metrics?: Record<string, any>;
    sampleSize?: number;
  };
  pendingAction?: ActionProposal;
  suggestedPrompts?: Array<{
    label: string;
    text: string;
  }>;
  warnings?: string[];
  traceId: string;
  latencyMs: number;
}

