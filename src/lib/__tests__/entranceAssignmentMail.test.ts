import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { formatEmailSubject } from "@/lib/mail";
import {
  isBatchAllowedForSender,
  resolveEmailCampusBranding,
  type AssignmentSenderContext,
} from "@/lib/entrance-assignment-mail";

describe("formatEmailSubject", () => {
  it("preserves [SSM - <Campus>] subject prefix without prepending [Sky-line SMS]", () => {
    expect(
      formatEmailSubject(
        "[SSM - Sky-Line Riverside] Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông"
      )
    ).toBe(
      "[SSM - Sky-Line Riverside] Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông"
    );
  });

  it("preserves bare [SSM] prefix", () => {
    expect(formatEmailSubject("[ssm] Thông báo Phân công")).toBe(
      "[SSM] Thông báo Phân công"
    );
  });

  it("keeps legacy [Sky-line SMS] normalization intact for other modules", () => {
    expect(formatEmailSubject("[Sky-Line SIS] Test")).toBe(
      "[Sky-line SMS] Test"
    );
  });
});

describe("resolveEmailCampusBranding", () => {
  it("binds subject prefix and announcer phrase to the logged-in teacher campus", () => {
    const branding = resolveEmailCampusBranding(
      {
        primaryCampus: {
          id: "c1",
          campusCode: "CS1",
          campusName: "Sky-Line Riverside",
        },
        allowedCampuses: [
          { id: "c1", campusCode: "CS1", campusName: "Sky-Line Riverside" },
        ],
        senderEmail: "giaovu.cs1.gv@skylineschool.edu.vn",
        isSystemWide: false,
      },
      { campusId: "c1", name: "CS1 _ KSL _ Đợt 118 _ KTĐV _ 20/10/2026" },
      "Khảo sát đầu vào"
    );

    expect(branding.subjectPrefix).toBe("[SSM - Sky-Line Riverside]");
    expect(branding.announcerPhrase).toBe(
      "Giáo vụ cơ sở Sky-Line Riverside trân trọng thông báo"
    );
    expect(branding.fromDisplayName).toBe(
      "SSM - Giáo vụ cơ sở Sky-Line Riverside"
    );
    expect(branding.replyTo).toBe("giaovu.cs1.gv@skylineschool.edu.vn");
  });

  it("strips duplicate leading 'Cơ sở' from campusName", () => {
    const branding = resolveEmailCampusBranding(
      {
        primaryCampus: {
          id: "c2",
          campusCode: "CS2",
          campusName: "Cơ sở 2 - Sky-Line Central",
        },
        allowedCampuses: [
          {
            id: "c2",
            campusCode: "CS2",
            campusName: "Cơ sở 2 - Sky-Line Central",
          },
        ],
        senderEmail: "gv.cs2@skylineschool.edu.vn",
        isSystemWide: false,
      },
      null,
      null
    );

    expect(branding.announcerPhrase).toBe(
      "Giáo vụ cơ sở 2 - Sky-Line Central trân trọng thông báo"
    );
    expect(branding.subjectPrefix).toBe("[SSM - 2 - Sky-Line Central]");
  });

  it("falls back to batch campus when system-wide admin has no personal campus", () => {
    const branding = resolveEmailCampusBranding(
      {
        primaryCampus: null,
        allowedCampuses: [],
        senderEmail: "admin@skylineschool.edu.vn",
        isSystemWide: true,
      },
      {
        campusId: "c3",
        name: "CS3 _ Đợt 5",
        campus: {
          id: "c3",
          campusCode: "CS3",
          campusName: "Sky-Line International",
        },
      },
      "Kỳ KSĐV"
    );

    expect(branding.subjectPrefix).toBe("[SSM - Sky-Line International]");
    expect(branding.announcerPhrase).toBe(
      "Giáo vụ cơ sở Sky-Line International trân trọng thông báo"
    );
  });
});

describe("isBatchAllowedForSender", () => {
  const baseSender: AssignmentSenderContext = {
    auth: {} as any,
    userId: "u1",
    senderName: "Nguyễn Văn A",
    senderEmail: "a@skylineschool.edu.vn",
    role: "GIAO_VU_CS",
    isSystemWide: false,
    allowedCampuses: [
      { id: "c1", campusCode: "CS1", campusName: "Sky-Line Riverside" },
    ],
    allowedCampusIds: ["c1"],
    primaryCampus: {
      id: "c1",
      campusCode: "CS1",
      campusName: "Sky-Line Riverside",
    },
  };

  it("allows batches belonging to the sender's campus", () => {
    expect(
      isBatchAllowedForSender(baseSender, {
        campusId: "c1",
        name: "CS1 _ KSL _ Đợt 118",
      })
    ).toBe(true);
  });

  it("blocks batches belonging to another campus for campus-scoped accounts", () => {
    expect(
      isBatchAllowedForSender(baseSender, {
        campusId: "c2",
        name: "CS2 _ KSL _ Đợt 12",
      })
    ).toBe(false);
    expect(
      isBatchAllowedForSender(baseSender, {
        campusId: null,
        name: "CS2 _ KSL _ Đợt 12",
      })
    ).toBe(false);
  });

  it("allows all campuses for system-wide roles", () => {
    const adminSender: AssignmentSenderContext = {
      ...baseSender,
      role: "ADMIN",
      isSystemWide: true,
    };
    expect(
      isBatchAllowedForSender(adminSender, {
        campusId: "c2",
        name: "CS2 _ KSL _ Đợt 12",
      })
    ).toBe(true);
  });
});
