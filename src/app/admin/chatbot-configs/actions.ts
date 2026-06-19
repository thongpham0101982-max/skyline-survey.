"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createChatbotConfig(name: string, code: string, systemInstruction: string, allowedRoles: string) {
  try {
    await prisma.chatbotConfig.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        systemInstruction,
        allowedRoles,
        isActive: true
      }
    });
    revalidatePath("/admin/chatbot-configs");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateChatbotConfig(
  id: string,
  name: string,
  code: string,
  systemInstruction: string,
  allowedRoles: string,
  isActive: boolean
) {
  try {
    await prisma.chatbotConfig.update({
      where: { id },
      data: {
        name,
        code: code.toUpperCase().trim(),
        systemInstruction,
        allowedRoles,
        isActive
      }
    });
    revalidatePath("/admin/chatbot-configs");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteChatbotConfig(id: string) {
  try {
    await prisma.chatbotConfig.delete({ where: { id } });
    revalidatePath("/admin/chatbot-configs");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
