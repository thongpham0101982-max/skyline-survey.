/**
 * AI Audit Logger for SSM Enterprise Assistant
 * Logs query metadata, latency, and permission decisions.
 */

import { AIIntent, AssistantRole } from "../types";

export interface AIAuditEntry {
  traceId: string;
  userId?: string;
  role: AssistantRole;
  intent: AIIntent;
  toolCalled?: string;
  permissionDecision: "APPROVED" | "DENIED" | "SCOPE_RESTRICTED";
  latencyMs: number;
  isSuccess: boolean;
  modelUsed: string;
  errorMessage?: string;
}

export function logAIAudit(entry: AIAuditEntry): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[AI_AUDIT] [${timestamp}] traceId=${entry.traceId} role=${entry.role} intent=${entry.intent} tool=${entry.toolCalled || "NONE"} decision=${entry.permissionDecision} latency=${entry.latencyMs}ms success=${entry.isSuccess}`
  );

  if (entry.errorMessage) {
    console.warn(`[AI_AUDIT_ERROR] traceId=${entry.traceId} error=${entry.errorMessage}`);
  }
}
