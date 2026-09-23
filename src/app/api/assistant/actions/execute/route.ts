import { auth } from "@/lib/auth";
import { executeAction } from "@/services/ai/actions/actionExecutor";
import { AIUserContext } from "@/services/ai/types";
import { AssistantRole } from "@/lib/assistant/personas";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    const { actionId, requestedRole } = await req.json();

    if (!actionId || typeof actionId !== "string") {
      return Response.json({ error: "Mã hành động actionId không hợp lệ." }, { status: 400 });
    }

    const resolvedRole: AssistantRole = (user?.role as AssistantRole) || requestedRole || "ADMIN";

    const aiUserContext: AIUserContext = {
      userId: user?.id || "guest",
      userName: user?.name || "Người dùng",
      role: resolvedRole
    };

    const result = await executeAction(actionId, aiUserContext);

    return Response.json(result);
  } catch (error: any) {
    console.error("Action execution API error:", error);
    return Response.json(
      { success: false, message: error.message || "Lỗi máy chủ khi thực thi hành động." },
      { status: 500 }
    );
  }
}
