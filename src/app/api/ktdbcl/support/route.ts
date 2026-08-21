import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const academicYearId = searchParams.get("academicYearId")

  if (!academicYearId) {
    return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
  }

  try {
    const userRole = (session.user as any)?.role || ""
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

    // 1. Action: getConfigs
    if (action === "getConfigs") {
      const configs = await prisma.learningSupportOutcomeConfig.findMany({
        where: { academicYearId },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(configs)
    }

    // 2. Action: getTargets
    if (action === "getTargets") {
      let callerTeacher = null;
      if (!isGDCS && !isKTDBCL && session?.user?.id) {
        callerTeacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              { userId: session.user.id },
              { id: session.user.id },
              { teacherCode: session.user.id },
              { email: (session.user as any)?.email || "" }
            ]
          }
        });
      }

      // GLOBAL AUTO-SYNC: Sync all input assessment commitment records into LearningSupportTarget & Assignments
      try {
        const [allStudents, allAssignments, inputAssessments, preschoolAssessments] = await Promise.all([
          prisma.student.findMany({
            where: { status: "ACTIVE" },
            select: { id: true, studentCode: true, studentName: true, classId: true, class: { select: { id: true, className: true, classCode: true } } }
          }),
          prisma.teachingAssignment.findMany({
            where: { academicYearId },
            include: {
              teacher: { select: { id: true, teacherName: true } },
              subject: { select: { id: true, subjectName: true, name: true } },
              class: { select: { id: true, className: true, classCode: true } }
            }
          }),
          prisma.inputAssessmentStudent.findMany({
            where: {
              OR: [
                { admissionResult: { contains: "cam kết" } },
                { admissionResult: { contains: "Cam kết" } },
                { directorNote: { contains: "Môn cam kết" } },
                { directorNote: { contains: "Mon cam ket" } },
                { directorNote: { contains: "cam kết" } },
                { directorNote: { contains: "Cam kết" } }
              ]
            },
            select: { studentCode: true, enrollmentCode: true, fullName: true, directorNote: true, admissionResult: true }
          }),
          (prisma as any).preschoolInputAssessmentStudent ? (prisma as any).preschoolInputAssessmentStudent.findMany({
            where: {
              OR: [
                { admissionResult: { contains: "cam kết" } },
                { admissionResult: { contains: "Cam kết" } },
                { directorNote: { contains: "Môn cam kết" } },
                { directorNote: { contains: "Mon cam ket" } },
                { directorNote: { contains: "cam kết" } },
                { directorNote: { contains: "Cam kết" } }
              ]
            },
            select: { studentCode: true, enrollmentCode: true, fullName: true, directorNote: true, admissionResult: true }
          }) : Promise.resolve([])
        ]);

        const allSurveyRecords = [...inputAssessments, ...preschoolAssessments];

        const parseSubs = (note: any, resStr: any) => {
          const text = `${note || ""} ${resStr || ""}`;
          if (!text.trim()) return [];
          const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết):\s*\[?([^\]\r\n]+)\]?/i);
          if (match && match[1]) {
            return match[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
          }
          const subs: string[] = [];
          if (/Toán|Math/i.test(text)) subs.push("Toán");
          if (/Văn|Tiếng Việt|Ngữ văn|Literature/i.test(text)) subs.push("Tiếng Việt");
          if (/Tiếng Anh\s*\(viết\)|Anh\s*\(viết\)|English\s*\(written\)/i.test(text)) subs.push("Tiếng Anh (viết)");
          if (/Tiếng Anh\s*\(vấn đáp\)|Anh\s*\(vấn đáp\)|English\s*\(oral\)/i.test(text)) subs.push("Tiếng Anh (vấn đáp)");
          if (subs.every(s => !s.includes("Tiếng Anh")) && /Anh|English/i.test(text)) subs.push("Tiếng Anh");
          if (/Tâm lý|Psychology/i.test(text)) subs.push("Tâm lý");
          return subs;
        };

        const cleanStr = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");

        for (const survey of allSurveyRecords) {
          const sCode = survey.studentCode || survey.enrollmentCode || "";
          const student = allStudents.find(st => (sCode && (st.studentCode === sCode)) || (cleanStr(st.studentName) === cleanStr(survey.fullName)));

          if (student) {
            const rawSubs = parseSubs(survey.directorNote, survey.admissionResult);
            for (const rawSub of rawSubs) {
              let normSub = "Tiếng Việt";
              if (/Toán/i.test(rawSub)) normSub = "Toán";
              else if (/Anh/i.test(rawSub)) normSub = "Tiếng Anh";
              else if (/Tâm lý/i.test(rawSub)) normSub = "Tâm lý";
              else if (/Văn|Tiếng Việt|Ngữ văn/i.test(rawSub)) normSub = "Tiếng Việt";

              const supportType = normSub === "Tâm lý" ? "PSYCHOLOGICAL" : "ACADEMIC";

              let target = await prisma.learningSupportTarget.findFirst({
                where: {
                  studentId: student.id,
                  reason: { contains: normSub },
                  academicYearId
                }
              });

              if (!target) {
                target = await prisma.learningSupportTarget.create({
                  data: {
                    studentId: student.id,
                    supportType,
                    sourceType: normSub === "Tâm lý" ? "TAM_LY" : "ADMISSION",
                    status: "ĐÃ DUYỆT",
                    reason: normSub,
                    notes: "Tự động đồng bộ từ Cam kết khảo sát đầu vào Admin",
                    academicYearId,
                    startDate: new Date(),
                    terminationStatus: "ACTIVE"
                  }
                });
              }

              // Auto-assign to TeachingAssignment GVBM for this student's class and subject
              const matchedAssignments = allAssignments.filter(a => {
                const classMatches = (
                  a.classId === student.classId ||
                  a.class?.id === student.classId ||
                  a.class?.classCode === student.classId ||
                  a.class?.className === student.classId ||
                  a.class?.className === student.class?.className
                );
                if (!classMatches) return false;
                const subName = (a.subject?.subjectName || a.subject?.name || "").toLowerCase();
                if (normSub === "Toán") return subName.includes("toán");
                if (normSub === "Tiếng Việt") return subName.includes("văn") || subName.includes("tiếng việt");
                if (normSub === "Tiếng Anh") return subName.includes("anh");
                if (normSub === "Tâm lý") return subName.includes("tâm lý");
                return subName.includes(normSub.toLowerCase());
              });

              for (const assign of matchedAssignments) {
                const existingAssign = await prisma.learningSupportAssignment.findFirst({
                  where: {
                    targetId: target.id,
                    teacherId: assign.teacherId
                  }
                });
                if (!existingAssign) {
                  await prisma.learningSupportAssignment.create({
                    data: {
                      targetId: target.id,
                      teacherId: assign.teacherId,
                      assignedAt: new Date()
                    }
                  });
                }
              }
            }
          }
        }
      } catch (errSync) {
        console.error("Global auto-sync error:", errSync);
      }

      // Query all targets for academic year
      let teacherClassIds: string[] = [];
      let teacherHomeroomClassIds: string[] = [];
      if (callerTeacher) {
        const [assignments, homeroomClasses] = await Promise.all([
          prisma.teachingAssignment.findMany({
            where: { teacherId: callerTeacher.id, academicYearId },
            select: { classId: true }
          }),
          prisma.class.findMany({
            where: {
              academicYearId,
              OR: [
                { homeroomTeacherId: callerTeacher.id },
                { homeroomTeacherId: { contains: callerTeacher.id } }
              ]
            },
            select: { id: true, className: true, classCode: true }
          })
        ]);
        teacherClassIds = assignments.map((a: any) => a.classId);
        teacherHomeroomClassIds = homeroomClasses.map((c: any) => c.id);
      }

      const whereClause: any = { academicYearId };
      if (callerTeacher) {
        const orConditions: any[] = [
          { createdById: callerTeacher.id },
          { assignments: { some: { teacherId: callerTeacher.id } } }
        ];
        if (teacherClassIds.length > 0 || teacherHomeroomClassIds.length > 0) {
          orConditions.push({ student: { classId: { in: [...teacherClassIds, ...teacherHomeroomClassIds] } } });
        }
        whereClause.OR = orConditions;
      }

      const targets = await prisma.learningSupportTarget.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              gender: true,
              classId: true,
              class: {
                select: {
                  className: true,
                  classCode: true,
                  campusId: true,
                  campus: { select: { campusName: true } }
                }
              }
            }
          },
          assignments: {
            include: {
              teacher: { select: { id: true, teacherName: true } },
              subject: { select: { id: true, subjectName: true } }
            }
          },
          evaluations: true,
          createdBy: {
            select: {
              id: true,
              teacherName: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      // Post-filter for callerTeacher by subject matching
      const teacherAssignments = callerTeacher ? await prisma.teachingAssignment.findMany({
        where: { teacherId: callerTeacher.id },
        include: { subject: true, class: true }
      }) : [];

      const homeroomClassSet = new Set(teacherHomeroomClassIds);

      const normalizeReasonStr = (reasonStr: string) => {
        if (!reasonStr) return "";
        let r = reasonStr.trim();
        if (r.toLowerCase().includes("tâm lý")) return "Tâm lý";
        if (r.toLowerCase().includes("anh") || r.toLowerCase().includes("english")) return "Tiếng Anh";
        if (r.toLowerCase().includes("văn") || r.toLowerCase().includes("tiếng việt") || r.toLowerCase().includes("ngữ văn")) return "Tiếng Việt";
        if (r.toLowerCase().includes("toán") || r.toLowerCase().includes("math")) return "Toán";
        return r;
      };

      const validTargets = targets.filter((t: any) => {
        if (!callerTeacher) return true;
        const isHomeroom = homeroomClassSet.has(t.student?.classId);

        const mySubjectsInClass = teacherAssignments
          .filter((a: any) => {
            if (!t.student) return false;
            const stClassId = t.student.classId;
            const stClassName = t.student.class?.className;
            const stClassCode = t.student.class?.classCode;

            return (
              a.classId === stClassId ||
              a.class?.id === stClassId ||
              (stClassCode && (a.classId === stClassCode || a.class?.classCode === stClassCode)) ||
              (stClassName && (a.classId === stClassName || a.class?.className === stClassName))
            );
          })
          .map((a: any) => (a.subject?.subjectName || a.subject?.name || "").toLowerCase());

        const normReason = normalizeReasonStr(t.reason).toLowerCase();

        if (!isHomeroom) {
          if (mySubjectsInClass.length === 0) return false;
          const matchesSubject = mySubjectsInClass.some((ts: string) => {
            if (ts.includes("toán")) return normReason.includes("toán");
            if (ts.includes("văn") || ts.includes("tiếng việt") || ts.includes("ngữ văn")) {
              return normReason.includes("văn") || normReason.includes("tiếng việt") || normReason.includes("ngữ văn");
            }
            if (ts.includes("anh")) return normReason.includes("anh");
            if (ts.includes("tâm lý")) return normReason.includes("tâm lý");
            return normReason.includes(ts) || ts.includes(normReason);
          });
          if (!matchesSubject) return false;
        }

        return true;
      });

      // Deduplicate targets by (studentId + normReason)
      const targetMap = new Map<string, any>();
      for (const t of validTargets) {
        const normReason = normalizeReasonStr(t.reason);
        const key = `${t.studentId}_${normReason.toLowerCase()}`;
        if (!targetMap.has(key)) {
          targetMap.set(key, {
            ...t,
            reason: normReason
          });
        }
      }

      // Populate assignedTeacherName for GVBM
      const allClassAssignments = await prisma.teachingAssignment.findMany({
        where: { academicYearId },
        include: {
          teacher: { select: { id: true, teacherName: true } },
          subject: { select: { id: true, subjectName: true, name: true } },
          class: { select: { id: true, className: true, classCode: true } }
        }
      });

      const result = Array.from(targetMap.values()).map((t: any) => {
        let gvbmName = t.assignments?.[0]?.teacher?.teacherName || t.createdBy?.teacherName || "";
        if (!gvbmName && t.student) {
          const stClassId = t.student.classId;
          const normReason = (t.reason || "").toLowerCase();
          const matchedAssignment = allClassAssignments.find((a: any) => {
            const classMatches = (
              a.classId === stClassId ||
              a.class?.id === stClassId ||
              a.class?.classCode === stClassId ||
              a.class?.className === stClassId ||
              a.class?.className === t.student?.class?.className
            );
            if (!classMatches) return false;
            const subName = (a.subject?.subjectName || a.subject?.name || "").toLowerCase();
            if (normReason.includes("toán")) return subName.includes("toán");
            if (normReason.includes("văn") || normReason.includes("tiếng việt")) return subName.includes("văn") || subName.includes("tiếng việt");
            if (normReason.includes("anh")) return subName.includes("anh");
            if (normReason.includes("tâm lý")) return subName.includes("tâm lý");
            return subName.includes(normReason);
          });
          if (matchedAssignment) {
            gvbmName = matchedAssignment.teacher?.teacherName || "";
          }
        }
        return {
          ...t,
          assignedTeacherName: gvbmName || (callerTeacher ? callerTeacher.teacherName : "")
        };
      });

      return NextResponse.json(result);
    }

    // 3. Action: getAssignments
    if (action === "getAssignments") {
      const assignments = await prisma.learningSupportAssignment.findMany({
        where: { academicYearId },
        include: {
          teacher: { select: { id: true, teacherName: true } },
          target: {
            include: {
              student: { select: { id: true, studentName: true, studentCode: true } }
            }
          },
          subject: { select: { id: true, subjectName: true } }
        }
      })
      return NextResponse.json(assignments)
    }

    // 4. Action: getClassSyncCandidates
    if (action === "getClassSyncCandidates") {
      const classId = searchParams.get("classId")
      if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

      // Fetch all students in the class
      const students = await prisma.student.findMany({
        where: { classId },
        select: {
          id: true,
          studentName: true,
          studentCode: true,
          gender: true
        }
      })

      // Fetch input assessments for these students
      const studentCodes = students.map(s => s.studentCode)
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          studentCode: { in: studentCodes }
        }
      })

      // Map candidates
      const candidates = students.map(s => {
        const assessment = inputAssessments.find(a => a.studentCode === s.studentCode)
        return {
          id: s.id,
          studentName: s.studentName,
          studentCode: s.studentCode,
          gender: s.gender,
          mathScore: (assessment as any)?.mathScore || null,
          literatureScore: (assessment as any)?.literatureScore || null,
          englishScore: (assessment as any)?.englishScore || null,
          mathTarget: (assessment as any)?.mathTarget || false,
          literatureTarget: (assessment as any)?.literatureTarget || false,
          englishTarget: (assessment as any)?.englishTarget || false,
          psychologyTarget: (assessment as any)?.psychologyTarget || false,
          notes: (assessment as any)?.note || ""
        }
      }).filter(c => c.mathTarget || c.literatureTarget || c.englishTarget || c.psychologyTarget)

      return NextResponse.json(candidates)
    }

   // 4.5. Action: getCommitmentCandidates
    if (action === "getCommitmentCandidates") {
      const periods = await prisma.inputAssessmentPeriod.findMany({
        where: { academicYearId },
        select: { id: true }
      })
      const periodIds = periods.map(p => p.id)

      const inputStudents = await prisma.inputAssessmentStudent.findMany({
        where: {
          periodId: { in: periodIds },
          OR: [
            { admissionResult: { contains: "cam kết" } },
            { admissionResult: { contains: "Cam kết" } },
            { directorNote: { contains: "Môn cam kết" } },
            { directorNote: { contains: "Mon cam ket" } },
            { directorNote: { contains: "cam kết" } },
            { directorNote: { contains: "Cam kết" } }
          ]
        },
        include: {
          enrollmentClass: {
            include: {
              campus: true
            }
          }
        }
      })

      const preschoolStudents = await prisma.preschoolInputAssessmentStudent.findMany({
        where: {
          periodId: { in: periodIds },
          OR: [
            { admissionResult: { contains: "cam kết" } },
            { admissionResult: { contains: "Cam kết" } },
            { directorNote: { contains: "Môn cam kết" } },
            { directorNote: { contains: "Mon cam ket" } },
            { directorNote: { contains: "cam kết" } },
            { directorNote: { contains: "Cam kết" } }
          ]
        },
        include: {
          enrollmentClass: {
            include: {
              campus: true
            }
          }
        }
      })

      const allStudentCodes = [
        ...inputStudents.map(s => s.studentCode),
        ...preschoolStudents.map(s => s.studentCode)
      ].filter(Boolean)

      const allFullNames = [
        ...inputStudents.map(s => s.fullName),
        ...preschoolStudents.map(s => s.fullName)
      ].filter(Boolean)

      const systemStudents = await prisma.student.findMany({
        where: {
          OR: [
            { studentCode: { in: allStudentCodes } },
            { studentName: { in: allFullNames } }
          ],
          academicYearId
        },
        include: {
          class: {
            include: {
              campus: true
            }
          }
        }
      })

      const cleanString = (str: string | null | undefined) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

      const parseCommittedSubjects = (note: string | null | undefined, resultStr?: string | null | undefined) => {
        const text = `${note || ""} ${resultStr || ""}`
        if (!text.trim()) return []
        
        const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết):\s*\[?([^\]\r\n]+)\]?/i)
        if (match && match[1]) {
          const splitSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          if (splitSubs.length > 0) return splitSubs
        }

        const subs: string[] = []
        if (/Toán|Math/i.test(text)) subs.push("Toán")
        if (/Văn|Tiếng Việt|Ngữ văn|Literature/i.test(text)) subs.push("Tiếng Việt")
        if (/Tiếng Anh\s*\(viết\)|Anh\s*\(viết\)|English\s*\(written\)/i.test(text)) {
          subs.push("Tiếng Anh (viết)")
        }
        if (/Tiếng Anh\s*\(vấn đáp\)|Anh\s*\(vấn đáp\)|English\s*\(oral\)/i.test(text)) {
          subs.push("Tiếng Anh (vấn đáp)")
        }
        if (subs.every(s => !s.includes("Tiếng Anh")) && /Anh|English/i.test(text)) {
          subs.push("Tiếng Anh")
        }
        if (/Tâm lý|Psychology/i.test(text)) subs.push("Tâm lý")
        return subs
      }

      const result = [
        ...inputStudents.map(is => {
          const matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && is.studentCode && ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
            cleanString(ss.studentName) === cleanString(is.fullName)
          )
          
          const committedSubjects = parseCommittedSubjects(is.directorNote, is.admissionResult)

          const resolvedClassName = 
            matchingStudent?.class?.className ||
            matchingStudent?.class?.classCode ||
            is.enrollmentClass?.className ||
            is.enrollmentClass?.classCode ||
            (is.enrollmentClassId && !is.enrollmentClassId.startsWith("c") ? is.enrollmentClassId : null) ||
            (is.className && is.className !== "Chưa xếp lớp" ? is.className : null) ||
            "Chưa xếp lớp"

          const resolvedCampus = 
            matchingStudent?.class?.campus?.campusName ||
            is.enrollmentClass?.campus?.campusName ||
            is.registeredCampus ||
            is.admissionCampus ||
            ""

          return {
            id: is.id,
            studentCode: is.studentCode,
            fullName: is.fullName,
            gender: is.gender,
            admissionResult: is.admissionResult,
            directorNote: is.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            campusName: resolvedCampus,
            committedSubjects,
            mathScore: is.mathScore,
            literatureScore: is.literatureScore,
            writtenEnglishScore: is.writtenEnglishScore,
            oralEnglishScore: is.oralEnglishScore,
            psychologyScore: is.psychologyScore
          }
        }),
        ...preschoolStudents.map(ps => {
          const matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && ps.studentCode && ss.studentCode.trim().toLowerCase() === ps.studentCode.trim().toLowerCase()) ||
            cleanString(ss.studentName) === cleanString(ps.fullName)
          )
          
          const committedSubjects = parseCommittedSubjects(ps.directorNote, ps.admissionResult)

          const resolvedClassName = 
            matchingStudent?.class?.className ||
            matchingStudent?.class?.classCode ||
            ps.enrollmentClass?.className ||
            ps.enrollmentClass?.classCode ||
            (ps.enrollmentClassId && !ps.enrollmentClassId.startsWith("c") ? ps.enrollmentClassId : null) ||
            "Chưa xếp lớp"

          const resolvedCampus = 
            matchingStudent?.class?.campus?.campusName ||
            ps.enrollmentClass?.campus?.campusName ||
            ps.admissionCampus ||
            ""

          return {
            id: ps.id,
            studentCode: ps.studentCode,
            fullName: ps.fullName,
            gender: ps.gender,
            admissionResult: ps.admissionResult,
            directorNote: ps.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            campusName: resolvedCampus,
            committedSubjects,
            mathScore: null,
            literatureScore: null,
            writtenEnglishScore: null,
            oralEnglishScore: null,
            psychologyScore: null
          }
        })
      ]

      return NextResponse.json(result)
    }

    // 5. Action: getCommitment
    if (action === "getCommitment") {
      const studentId = searchParams.get("studentId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const commitment = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      // Also look up previous year's commitment for inheritance
      const previousCommitment = await prisma.studentLearningCommitment.findFirst({
        where: {
          studentId,
          academicYearId: { not: academicYearId }
        },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json({ commitment, hasPrevious: !!previousCommitment, previousCommitment })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action, academicYearId } = body

    if (!academicYearId) {
      return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
    }

    const userRole = (session.user as any)?.role || ""
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

    // 1. Action: saveConfig
    if (action === "saveConfig") {
      const { id, supportType, code, outcomeLabel, description } = body
      if (!supportType || !code || !outcomeLabel) {
        return NextResponse.json({ error: "Missing required config fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportOutcomeConfig.update({
          where: { id },
          data: { supportType, code, outcomeLabel, description }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.learningSupportOutcomeConfig.create({
          data: { supportType, code, outcomeLabel, description, academicYearId }
        })
        return NextResponse.json(created)
      }
    }

    // 2. Action: deleteConfig
    if (action === "deleteConfig") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 })
      await prisma.learningSupportOutcomeConfig.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // 3. Action: saveTarget (includes edit & manual creation)
    if (action === "saveTarget") {
      const { id, studentId, supportType, sourceType, status, reason, notes, startDate } = body
      if (!studentId || !supportType || !sourceType) {
        return NextResponse.json({ error: "Missing required target fields" }, { status: 400 })
      }

      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      })

      if (id) {
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: { status, reason, notes, startDate: startDate ? new Date(startDate) : undefined }
        })
        return NextResponse.json(updated)
      } else {
        // Check if unique target already exists
        const existing = await prisma.learningSupportTarget.findUnique({
          where: {
            studentId_supportType_academicYearId: {
              studentId,
              supportType,
              academicYearId
            }
          }
        })

        if (existing) {
          const updated = await prisma.learningSupportTarget.update({
            where: { id: existing.id },
            data: {
              status: status || "TIẾP TỤC THEO TUẦN",
              terminationStatus: "ACTIVE",
              reason: reason || existing.reason,
              notes: notes || existing.notes,
              createdById: existing.createdById || (teacher ? teacher.id : null)
            }
          })
          return NextResponse.json(updated)
        }

        const created = await prisma.learningSupportTarget.create({
          data: {
            studentId,
            supportType,
            sourceType,
            status: "ĐÃ DUYỆT",
            reason,
            notes,
            academicYearId,
            startDate: startDate ? new Date(startDate) : new Date(),
            terminationStatus: "ACTIVE",
            createdById: teacher ? teacher.id : null
          }
        })

        const targetObj = existing ? updated : created;

        if (teacher) {
          const existingAssign = await prisma.learningSupportAssignment.findFirst({
            where: {
              targetId: targetObj.id,
              teacherId: teacher.id,
              academicYearId
            }
          });
          if (!existingAssign) {
            await prisma.learningSupportAssignment.create({
              data: {
                teacherId: teacher.id,
                targetId: targetObj.id,
                academicYearId,
                notes: sourceType === "GVBM" ? "Giáo viên bộ môn phân công hỗ trợ" : "Giáo viên chủ nhiệm phân công hỗ trợ"
              }
            });
          }
        }

        return NextResponse.json(targetObj)
      }
    }

    // 4. Action: deleteTarget
    if (action === "deleteTarget") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing target ID" }, { status: 400 })
      await prisma.learningSupportTarget.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // 5. Action: syncAdmission (Bulk sync from input assessment)
    if (action === "syncAdmission") {
      const { candidates } = body // Array of candidate targets
      if (!Array.isArray(candidates)) return NextResponse.json({ error: "Candidates must be an array" }, { status: 400 })

      const createdTargets = []
      for (const cand of candidates) {
        try {
          const newTarget = await prisma.learningSupportTarget.create({
            data: {
              studentId: cand.studentId,
              supportType: cand.supportType, // "ACADEMIC" or "PSYCHOLOGICAL"
              sourceType: "ADMISSION",
              status: "TIẾP TỤC THEO TUẦN",
              reason: cand.reason,
              notes: cand.notes || "Đồng bộ tự động từ Khảo sát đầu vào",
              academicYearId,
              startDate: new Date(),
              terminationStatus: "ACTIVE"
            }
          })
          createdTargets.push(newTarget)
        } catch (e) {
          // Ignore duplicates (unique index will trigger error if studentId & supportType already registered for this year)
        }
      }
      return NextResponse.json({ success: true, count: createdTargets.length })
    }

    // 6. Action: saveAssignment
    if (action === "saveAssignment") {
      const { id, teacherId, targetId, subjectId, notes } = body
      if (!teacherId || !targetId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportAssignment.update({
          where: { id },
          data: { teacherId, subjectId, notes }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.learningSupportAssignment.create({
          data: { teacherId, targetId, subjectId, notes, academicYearId }
        })
        return NextResponse.json(created)
      }
    }

    // Action: bulkApproveTargets
    if (action === "bulkApproveTargets") {
      const { targetIds, approve } = body
      if (!Array.isArray(targetIds)) return NextResponse.json({ error: "targetIds must be an array" }, { status: 400 })

      if (approve) {
        // Fetch all targets to check their createdById (include student to find classId)
        const targets = await prisma.learningSupportTarget.findMany({
          where: { id: { in: targetIds } },
          include: { student: true }
        })

        const existingAssigns = await prisma.learningSupportAssignment.findMany({
          where: { targetId: { in: targetIds } }
        });
        const existingAssignMap = new Set(existingAssigns.map(a => a.targetId));
        
        // Find psychology subject
        const psychSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { subjectName: { contains: "Tâm lý" } },
              { subjectName: { contains: "Tâm Lý" } },
              { subjectName: { contains: "tâm lý" } }
            ]
          }
        });

        const txOperations = [];
        for (const target of targets) {
          if (!existingAssignMap.has(target.id)) {
            if (target.supportType === "PSYCHOLOGICAL") {
              // Auto-assign to the psychology subject teacher (GVBM) of the student's class
              if (target.student?.classId && psychSubject) {
                const psychAssignment = await prisma.teachingAssignment.findFirst({
                  where: {
                    classId: target.student.classId,
                    subjectId: psychSubject.id,
                    academicYearId: target.academicYearId
                  }
                });

                if (psychAssignment) {
                  txOperations.push(prisma.learningSupportAssignment.create({
                    data: {
                      teacherId: psychAssignment.teacherId,
                      targetId: target.id,
                      academicYearId: target.academicYearId,
                      notes: "Tự động phân công cho GVBM giảng dạy môn Tâm lý của lớp"
                    }
                  }));
                }
              }
            } else if (target.createdById) {
              // Academic support: auto-assign to proposing teacher
              txOperations.push(prisma.learningSupportAssignment.create({
                data: {
                  teacherId: target.createdById,
                  targetId: target.id,
                  academicYearId: target.academicYearId,
                  notes: "Tự động phân công cho giáo viên đề xuất"
                }
              }));
            }
          }
          
          txOperations.push(prisma.learningSupportTarget.update({
            where: { id: target.id },
            data: { status: "ĐÃ DUYỆT" }
          }));
        }
        await prisma.$transaction(txOperations);
      } else {
        // Reject - update status
        await prisma.learningSupportTarget.updateMany({
          where: { id: { in: targetIds } },
          data: { status: "TỪ CHỐI", terminationStatus: "TERMINATED" }
        })
      }
      return NextResponse.json({ success: true })
    }

    // 7. Action: deleteAssignment
    if (action === "deleteAssignment") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 })
      await prisma.learningSupportAssignment.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // 8. Action: requestTermination (Teacher/Psychologist requests completion)
    if (action === "requestTermination") {
      const { id, outcome, notes } = body
      if (!id) return NextResponse.json({ error: "Missing target ID" }, { status: 400 })
      
      const updated = await prisma.learningSupportTarget.update({
        where: { id },
        data: {
          terminationStatus: "PENDING_TERMINATION",
          outcome: outcome || "Hoàn thành bồi dưỡng",
          notes: notes || undefined
        }
      })
      return NextResponse.json(updated)
    }

    // 9. Action: approveTermination (GĐCS/BGH approves completion)
    if (action === "approveTermination") {
      if (!isGDCS && !isKTDBCL) {
        return NextResponse.json({ error: "Chỉ Giám đốc Cơ sở (GĐCS) hoặc Ban KT&ĐBCL mới có quyền duyệt kết thúc" }, { status: 403 })
      }

      const { id, approve, outcome } = body
      if (!id) return NextResponse.json({ error: "Missing target ID" }, { status: 400 })

      if (approve) {
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: {
            terminationStatus: "TERMINATED",
            status: "KẾT THÚC BỒI DƯỠNG",
            endDate: new Date(),
            outcome: outcome || "Đã duyệt kết thúc",
            terminationApprovedById: session.user.id,
            terminationApprovedAt: new Date()
          }
        })
        return NextResponse.json(updated)
      } else {
        // Reject termination request, return to ACTIVE status
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: {
            terminationStatus: "ACTIVE",
            outcome: null
          }
        })
        return NextResponse.json(updated)
      }
    }

    // 10. Action: saveEvaluation (Teacher adds weekly/monthly evaluations)
    if (action === "saveEvaluation") {
      const { id, targetId, periodType, periodName, trackingLevel, comment, updatedStatus } = body
      if (!targetId || !periodType || !periodName || !trackingLevel || !comment) {
        return NextResponse.json({ error: "Missing evaluation fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportEvaluation.update({
          where: { id },
          data: { periodType, periodName, trackingLevel, comment, updatedStatus }
        })
        return NextResponse.json(updated)
      } else {
        // Also optionally update the target's current status if specified
        if (updatedStatus) {
          await prisma.learningSupportTarget.update({
            where: { id: targetId },
            data: { status: updatedStatus }
          })
        }

        const created = await prisma.learningSupportEvaluation.create({
          data: {
            targetId,
            evaluatorId: session.user.id,
            periodType,
            periodName,
            trackingLevel,
            comment,
            updatedStatus
          }
        })
        return NextResponse.json(created)
      }
    }

    // 11. Action: saveCommitment (Create or overwrite commitment by year)
    if (action === "saveCommitment") {
      const { studentId, content, status } = body
      if (!studentId || !content) {
        return NextResponse.json({ error: "Missing commitment fields" }, { status: 400 })
      }

      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        const updated = await prisma.studentLearningCommitment.update({
          where: { id: existing.id },
          data: { content, status: status || "ACTIVE", teacherId: session.user.id, teacherName: session.user.name || "Teacher" }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.studentLearningCommitment.create({
          data: {
            studentId,
            academicYearId,
            content,
            status: status || "ACTIVE",
            teacherId: session.user.id,
            teacherName: session.user.name || "Teacher"
          }
        })
        return NextResponse.json(created)
      }
    }

    // 12. Action: inheritCommitment (Inherit commitment from previous year)
    if (action === "inheritCommitment") {
      const { studentId } = body
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const previousCommitment = await prisma.studentLearningCommitment.findFirst({
        where: {
          studentId,
          academicYearId: { not: academicYearId }
        },
        orderBy: { createdAt: "desc" }
      })

      if (!previousCommitment) {
        return NextResponse.json({ error: "Không tìm thấy cam kết năm học cũ để kế thừa" }, { status: 404 })
      }

      // Check if current commitment already exists
      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        return NextResponse.json({ error: "Cam kết cho năm học hiện tại đã tồn tại" }, { status: 400 })
      }

      const created = await prisma.studentLearningCommitment.create({
        data: {
          studentId,
          academicYearId,
          content: previousCommitment.content,
          status: "ACTIVE",
          teacherId: session.user.id,
          teacherName: session.user.name || "Teacher"
        }
      })

      return NextResponse.json(created)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
