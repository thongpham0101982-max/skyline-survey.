export type ActionType =
  | "ACTION_SEND_ADVISORY_EMAIL"
  | "ACTION_SEND_GRADEBOOK_REMINDER"
  | "ACTION_SEND_OBSERVATION_REMINDER"
  | "ACTION_DRAFT_GRADEBOOK_UNLOCK";

export interface AdvisoryEmailPayload {
  studentId: string;
  studentName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  plainText: string;
  gapScore?: number;
  barrierCount?: number;
  planSummary?: string;
}

export interface GradebookReminderPayload {
  recipientEmail: string;
  recipientName: string;
  subjectName: string;
  className: string;
  deadlineDate: string;
  subject: string;
  htmlContent: string;
  plainText: string;
}

export interface ObservationReminderPayload {
  recipientEmail: string;
  recipientName: string;
  currentCompleted: number;
  quotaRequired: number;
  departmentName: string;
  subject: string;
  htmlContent: string;
  plainText: string;
}

export interface GradebookUnlockPayload {
  teacherId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  reason: string;
  evidenceSummary: string;
}

export interface ActionProposal {
  actionId: string;
  actionType: ActionType;
  title: string;
  description: string;
  targetEntityId?: string;
  preview: {
    recipient?: string;
    subject?: string;
    summary: string;
    details: Record<string, any>;
  };
  expiresAt: string;
  confirmationRequired: true;
}

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  actionType: ActionType;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}
