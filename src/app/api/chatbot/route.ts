import { POST as assistantPost } from "../assistant/route";

/**
 * Endpoint chuyển tiếp tương thích ngược cho các client cũ gọi /api/chatbot
 */
export async function POST(req: Request) {
  return assistantPost(req);
}
