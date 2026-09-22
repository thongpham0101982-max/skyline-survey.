"use client"

import { SSMAssistantWidget } from "./SSMAssistantWidget"
import { AssistantRole } from "@/lib/assistant/personas"

interface ChatBotWidgetProps {
  role?: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
  chatbotCode?: string
}

export function ChatBotWidget({ role = "TEACHER" }: ChatBotWidgetProps) {
  const assistantRole = (role as AssistantRole) || "TEACHER"
  return <SSMAssistantWidget role={assistantRole} />
}
