import { AIUserContext, RAGCitation, KnowledgeDocumentMetadata } from "../types";
import { OFFICIAL_KNOWLEDGE_DOCUMENTS } from "./knowledgeStore";
import { prisma } from "@/lib/db";

export interface RetrievalResult {
  hasMatch: boolean;
  content: string;
  citations: RAGCitation[];
}

export async function retrieveKnowledge(query: string, userContext: AIUserContext): Promise<RetrievalResult> {
  if (!query || !query.trim()) {
    return { hasMatch: false, content: "", citations: [] };
  }

  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery
    .replace(/[?,.:;!'"()[\]{}]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Fetch dynamic documents from Database
  let dynamicDocs: KnowledgeDocumentMetadata[] = [];
  try {
    const dbDocs = await prisma.knowledgeDocument.findMany({
      where: { status: "ACTIVE" }
    });
    dynamicDocs = dbDocs.map(d => ({
      id: d.id,
      title: d.title,
      category: d.category as any,
      version: d.version,
      schoolYear: d.schoolYear,
      effectiveDate: d.effectiveDate,
      status: d.status as any,
      roleScope: (d.roleScope ? JSON.parse(d.roleScope) : ["ADMIN", "TEACHER"]) as any,
      campusScope: (d.campusScope ? JSON.parse(d.campusScope) : ["ALL"]) as any,
      source: d.source,
      content: d.content
    }));
  } catch (e) {
    // If DB has no documents or fails, fall back to official static store
  }

  const allDocuments = [...OFFICIAL_KNOWLEDGE_DOCUMENTS, ...dynamicDocs];

  // 1. Pre-filtering by Metadata: Status, Effective Date, Role Scope, Campus Scope
  const eligibleDocs = allDocuments.filter(doc => {
    // A. Status Check
    if (doc.status !== "ACTIVE") return false;

    // B. Effective Date Check
    if (doc.effectiveDate > todayStr) return false;
    if (doc.expiryDate && doc.expiryDate < todayStr) return false;

    // C. Role Scope Check
    if (userContext.role !== "ADMIN" && !doc.roleScope.includes(userContext.role)) {
      return false;
    }

    // D. Campus Scope Check
    if (
      userContext.role !== "ADMIN" &&
      !doc.campusScope.includes("ALL") &&
      userContext.campusId &&
      !doc.campusScope.includes(userContext.campusId)
    ) {
      return false;
    }

    return true;
  });

  // 2. Score relevance based on token matching in title, category, and content
  const scoredDocs = eligibleDocs.map(doc => {
    let score = 0;
    const docTitleLower = doc.title.toLowerCase();
    const docContentLower = doc.content.toLowerCase();
    const docCategoryLower = doc.category.toLowerCase();

    // Direct phrase match bonus
    if (docTitleLower.includes(cleanQuery)) score += 50;
    if (docContentLower.includes(cleanQuery)) score += 30;

    // Token match scoring
    queryTokens.forEach(token => {
      if (docTitleLower.includes(token)) score += 10;
      if (docCategoryLower.includes(token)) score += 8;
      if (docContentLower.includes(token)) score += 2;
    });

    return { doc, score };
  });

  // Sort by score descending
  const matches = scoredDocs.filter(d => d.score >= 10).sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return {
      hasMatch: false,
      content:
        "Hệ thống tri thức quy chế SSM hiện tại chưa ghi nhận văn bản quy định hoặc hướng dẫn chính thức phù hợp với nội dung câu hỏi của Thầy/Cô và Em.",
      citations: []
    };
  }

  // Pick top 2 most relevant documents
  const topMatches = matches.slice(0, 2);
  const citations: RAGCitation[] = topMatches.map(m => ({
    documentId: m.doc.id,
    title: m.doc.title,
    category: m.doc.category,
    version: m.doc.version,
    source: m.doc.source,
    effectiveDate: m.doc.effectiveDate,
    snippet: m.doc.title
  }));

  const combinedContent = topMatches
    .map(
      m =>
        `### 📖 ${m.doc.title} (Phiên bản ${m.doc.version} — ${m.doc.source})\n*Ngày hiệu lực: ${m.doc.effectiveDate}*\n\n${m.doc.content}`
    )
    .join("\n\n---\n\n");

  return {
    hasMatch: true,
    content: combinedContent,
    citations
  };
}
