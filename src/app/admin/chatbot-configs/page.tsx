import { prisma } from "@/lib/db"
import { ChatbotConfigsClient } from "./client"
import { MessageSquareText } from "lucide-react"

export default async function ChatbotConfigsPage() {
  const configs = await prisma.chatbotConfig.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#48BFE3] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <MessageSquareText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Cấu hình Chatbot</h1>
          <p className="text-slate-500 font-medium">Quản lý kịch bản, lời dặn AI và phân quyền cho các trợ lý ảo</p>
        </div>
      </div>

      <ChatbotConfigsClient initialConfigs={configs} />
    </div>
  )
}
