import { describe, expect, it } from "vitest";
import {
  ALL_GRADES,
  countRequiredDocsForGrade,
  createDefaultAdmissionDossierGroups,
  resolveStudentDossier,
  studentHasLearningCommitment,
} from "@/lib/admission-dossier";

describe("admission-dossier matrix defaults & resolver", () => {
  const groups = createDefaultAdmissionDossierGroups();

  it("matches exact required document counts for Trong nước (Lớp 1–12)", () => {
    const tn = groups.find((g) => g.id === "trong_nuoc")!;
    const counts = ALL_GRADES.map((g) => countRequiredDocsForGrade(tn, g));
    expect(counts).toEqual([3, 5, 5, 5, 5, 4, 5, 5, 5, 4, 6, 6]);
  });

  it("matches exact required document counts for VN về nước / Nước ngoài (Lớp 1–12)", () => {
    const nn = groups.find((g) => g.id === "nuoc_ngoai")!;
    const counts = ALL_GRADES.map((g) => countRequiredDocsForGrade(nn, g));
    expect(counts).toEqual([3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it("matches exact required document counts for Homeschooling (Lớp 1–12)", () => {
    const hs = groups.find((g) => g.id === "homeschooling")!;
    const counts = ALL_GRADES.map((g) => countRequiredDocsForGrade(hs, g));
    expect(counts).toEqual([3, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4]);
  });

  it("includes [*] routing footnotes only for Grade 1 (Trong nước) and conditionally appends Commitment", () => {
    const g1NoCom = resolveStudentDossier(groups, {
      grade: "Khối 1",
      targetType: "Nội tỉnh",
      hasCommitment: false,
    });
    expect(g1NoCom.items).toHaveLength(3);
    expect(g1NoCom.footnotes).toHaveLength(3);

    const g1WithCom = resolveStudentDossier(groups, {
      grade: "1",
      targetType: "Ngoại tỉnh",
      hasCommitment: true,
    });
    expect(g1WithCom.items).toHaveLength(4);
    expect(g1WithCom.items[3].name).toContain("Cam kết tăng cường kiến thức");
    expect(g1WithCom.items[3].qty).toBe("01");

    const g7NoCom = resolveStudentDossier(groups, {
      grade: "Khối 7",
      targetType: "Nội tỉnh",
      hasCommitment: false,
    });
    expect(g7NoCom.items).toHaveLength(5);
    expect(g7NoCom.footnotes).toHaveLength(0);
  });

  it("routes Nước ngoài and Home Schooling students to their respective matrices", () => {
    const foreignG6 = resolveStudentDossier(groups, {
      grade: "Khối 6",
      targetType: "Nước ngoài",
      hasCommitment: false,
    });
    expect(foreignG6.group.id).toBe("nuoc_ngoai");
    expect(foreignG6.items).toHaveLength(4);

    const homeG5 = resolveStudentDossier(groups, {
      grade: "Lớp 5",
      targetType: "Home Schooling",
      hasCommitment: false,
    });
    expect(homeG5.group.id).toBe("homeschooling");
    expect(homeG5.items).toHaveLength(5);

    const homeG8 = resolveStudentDossier(groups, {
      grade: "8",
      targetType: "Homeschooling",
      hasCommitment: true,
    });
    expect(homeG8.group.id).toBe("homeschooling");
    expect(homeG8.items).toHaveLength(5); // 4 bắt buộc + 1 cam kết
  });

  it("detects student learning commitment from admissionResult or committedSubjects", () => {
    expect(studentHasLearningCommitment({ admissionResult: "Đạt" })).toBe(false);
    expect(studentHasLearningCommitment({ admissionResult: "Đạt (Có cam kết)" })).toBe(true);
    expect(studentHasLearningCommitment({ committedSubjects: ["Toán"] })).toBe(true);
    expect(studentHasLearningCommitment({ directorNote: "Môn cam kết: [Tiếng Anh]" })).toBe(true);
  });
});
