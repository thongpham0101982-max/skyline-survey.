import { prisma } from "@/lib/db"
import { ChatbotConfigsClient } from "./client"
import { PageHeader } from "@/components/PageHeader"

export default async function ChatbotConfigsPage() {
  const configs = await prisma.chatbotConfig.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Cấu hình Chatbot"
        description="Quản lý kịch bản, lời dặn AI và phân quyền cho các trợ lý ảo"
        breadcrumbs={[
          { label: "Cấu hình hệ thống" },
          { label: "Trợ lý AI & Chatbot" }
        ]}
      />

      <ChatbotConfigsClient initialConfigs={configs} />
    </div>
  )
}
