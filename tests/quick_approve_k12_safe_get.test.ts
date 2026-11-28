import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockFindFirst = vi.fn();
const mockScoreFindMany = vi.fn();
const mockPreschoolFindMany = vi.fn();
const mockPreschoolUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    inputAssessmentStudent: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
    preschoolInputAssessmentStudent: {
      findMany: (...args: any[]) => mockPreschoolFindMany(...args),
      update: (...args: any[]) => mockPreschoolUpdate(...args),
    },
    studentAssessmentScore: {
      findMany: (...args: any[]) => mockScoreFindMany(...args),
    },
    user: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    teacher: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/entrance-progress/entranceProgressEngine", () => ({
  executeEntranceWorkflowAction: vi.fn().mockResolvedValue({}),
}));

import {
  buildStudentQuickApproveUrls,
  generateK12ApprovalToken,
  generateBatchApprovalToken,
} from "@/lib/k12-approval-service";
import { GET, POST } from "@/app/api/admin/quick-approve/k12/route";

describe("K-12 Quick Approve Email Safety (Anti-Outlook Safe Links / Prefetch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ fullName: "Nguyễn Văn A" });
    mockScoreFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({
      id: "stu-1",
      studentCode: "HS701020244",
      fullName: "Trần Nguyên Khoa",
      grade: "6",
      surveyFormType: "HNS",
      admissionCampus: "CS1",
      admissionResult: null,
      directorNote: null,
      periodId: "per-1",
      batchId: "bat-1",
      period: { name: "Kỳ 1" },
      batch: { name: "Đợt 1" },
    });
  });

  it("buildStudentQuickApproveUrls does not append unsafe confirm=1", () => {
    const k12 = buildStudentQuickApproveUrls({
      studentId: "stu-1",
      isPreschool: false,
      baseUrl: "https://ssm.skylineschool.edu.vn",
      recipientEmail: "gdcs.cs1@skylineschool.edu.vn",
    });
    expect(k12.approveDatUrl).not.toContain("confirm=1");
    expect(k12.approveCamKetOrHocThuUrl).not.toContain("confirm=1");
    expect(k12.approveKhongDatUrl).not.toContain("confirm=1");

    const mn = buildStudentQuickApproveUrls({
      studentId: "stu-2",
      isPreschool: true,
      baseUrl: "https://ssm.skylineschool.edu.vn",
      recipientEmail: "gdcs.cs1@skylineschool.edu.vn",
    });
    expect(mn.approveDatUrl).not.toContain("confirm=1");
    expect(mn.approveCamKetOrHocThuUrl).not.toContain("confirm=1");
    expect(mn.approveKhongDatUrl).not.toContain("confirm=1");
  });

  it("GET single student NEVER mutates DB even if legacy confirm=1 is present, and pre-checks multi-subject preselect", async () => {
    const email = "gdcs.cs1@skylineschool.edu.vn";
    const token = generateK12ApprovalToken("stu-1", "DAT_CAM_KET", email);
    const url = `https://ssm.skylineschool.edu.vn/api/admin/quick-approve/k12?studentId=stu-1&action=DAT_CAM_KET&email=${encodeURIComponent(email)}&token=${token}&confirm=1&preselect=${encodeURIComponent("Toán học,Tiếng Anh (viết)")}`;

    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mockUpdate).not.toHaveBeenCalled();

    const html = await res.text();
    expect(html).toContain('method="POST"');
    expect(html).toContain('value="Toán học" checked');
    expect(html).toContain('value="Tiếng Anh (viết)" checked');
  });

  it("GET batch mode NEVER mutates DB and renders confirmation form", async () => {
    const email = "gdcs.cs1@skylineschool.edu.vn";
    const token = generateBatchApprovalToken("per-1", "bat-1", false, email);
    mockFindMany.mockResolvedValue([
      { id: "stu-1", studentCode: "HS01", fullName: "HS 1", isAbsent: false, admissionResult: null, grade: "6" },
    ]);

    const url = `https://ssm.skylineschool.edu.vn/api/admin/quick-approve/k12?mode=batch&periodId=per-1&batchId=bat-1&isPreschool=0&email=${encodeURIComponent(email)}&token=${token}`;
    const res = await GET(new NextRequest(url));

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    const html = await res.text();
    expect(html).toContain('name="mode" value="batch"');
    expect(html).toContain('method="POST"');
  });

  it("POST single student executes DB update after human confirmation", async () => {
    const email = "gdcs.cs1@skylineschool.edu.vn";
    const token = generateK12ApprovalToken("stu-1", "DAT_CAM_KET", email);
    const fd = new FormData();
    fd.append("mode", "student");
    fd.append("studentId", "stu-1");
    fd.append("action", "DAT_CAM_KET");
    fd.append("email", email);
    fd.append("token", token);
    fd.append("decision", "Đạt cam kết");
    fd.append("committedSubjects", "Toán học");
    fd.append("committedSubjects", "Tiếng Anh (viết)");

    const req = new NextRequest("https://ssm.skylineschool.edu.vn/api/admin/quick-approve/k12", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.where.id).toBe("stu-1");
    expect(updateArg.data.admissionResult).toBe("Đạt cam kết");
    expect(updateArg.data.directorNote).toContain("[Môn cam kết: Toán học, Tiếng Anh (viết)]");
  });

  it("POST batch mode executes DB update for pending students", async () => {
    const email = "gdcs.cs1@skylineschool.edu.vn";
    const token = generateBatchApprovalToken("per-1", "bat-1", false, email);
    mockFindMany.mockResolvedValue([
      { id: "stu-1", isAbsent: false, admissionResult: null, directorNote: null },
      { id: "stu-2", isAbsent: false, admissionResult: "Đạt", directorNote: null },
    ]);

    const fd = new FormData();
    fd.append("mode", "batch");
    fd.append("periodId", "per-1");
    fd.append("batchId", "bat-1");
    fd.append("isPreschool", "0");
    fd.append("email", email);
    fd.append("token", token);

    const req = new NextRequest("https://ssm.skylineschool.edu.vn/api/admin/quick-approve/k12", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0].where.id).toBe("stu-1");
  });
});
