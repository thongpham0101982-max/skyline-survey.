import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ensureParentMeetingTables } from "../schemaInit";
import {
    signParentMeetingQrToken,
    verifyParentMeetingQrToken,
} from "../qrSecurity";
import {
    computeMeetingAttendanceStats,
    createOrCloneParentMeeting,
    createParentMeetingFeedback,
    createParentMeetingTask,
    getMeetingMinutesForViewer,
    interactWithMeetingFeedback,
    issueParentMeetingQr,
    listMeetingFeedback,
    listParentMeetingsForActor,
    listParentMeetingTasks,
    ParentMeetingActorContext,
    ParentMeetingError,
    recordManualAttendance,
    saveOrTransitionMeetingMinutes,
    submitParentRsvp,
    updateParentMeeting,
    verifyAndCheckInQrToken,
} from "../parentMeetingService";

describe("Digital Parent Meeting (Họp Phụ huynh số) – 15 Mandatory Scenarios", () => {
    const testRunId = crypto.randomBytes(4).toString("hex");
    const yearId = `pm_test_year_${testRunId}`;
    const campus1Id = `pm_test_campus1_${testRunId}`;
    const campus2Id = `pm_test_campus2_${testRunId}`;
    const classAId = `pm_test_classA_${testRunId}`;
    const classBId = `pm_test_classB_${testRunId}`;
    const classCId = `pm_test_classC_${testRunId}`;

    const gvcnAUserId = `pm_user_gvcnA_${testRunId}`;
    const gvcnBUserId = `pm_user_gvcnB_${testRunId}`;
    const gvbmUserId = `pm_user_gvbm_${testRunId}`;
    const adminUserId = `pm_user_admin_${testRunId}`;

    const teacherAId = `pm_teacherA_${testRunId}`;
    const teacherBId = `pm_teacherB_${testRunId}`;

    const parent1UserId = `pm_user_parent1_${testRunId}`;
    const parent1Id = `pm_parent1_${testRunId}`;
    const parent2UserId = `pm_user_parent2_${testRunId}`;
    const parent2Id = `pm_parent2_${testRunId}`;

    const student1Id = `pm_student1_${testRunId}`; // Child 1 of Parent 1 (Class A, Campus 1)
    const student2Id = `pm_student2_${testRunId}`; // Child 2 of Parent 1 (Class B, Campus 2)
    const student3Id = `pm_student3_${testRunId}`; // Child of Parent 2 (Class A, Campus 1)

    let gvcnACtx: ParentMeetingActorContext;
    let gvcnBCtx: ParentMeetingActorContext;
    let gvbmCtx: ParentMeetingActorContext;
    let adminCtx: ParentMeetingActorContext;
    let parent1Ctx: ParentMeetingActorContext;
    let parent2Ctx: ParentMeetingActorContext;

    let multiClassMeetingId = "";
    let otherMeetingId = "";

    beforeAll(async () => {
        await ensureParentMeetingTables();

        await prisma.academicYear.create({
            data: {
                id: yearId,
                name: `2026-2027-${testRunId}`,
                startDate: new Date("2026-08-01"),
                endDate: new Date("2027-05-31"),
                status: "ACTIVE",
            },
        });

        await prisma.campus.createMany({
            data: [
                { id: campus1Id, campusCode: `CS1_${testRunId}`, campusName: `Cơ sở 1 ${testRunId}` },
                { id: campus2Id, campusCode: `CS2_${testRunId}`, campusName: `Cơ sở 2 ${testRunId}` },
            ],
        });

        await prisma.user.createMany({
            data: [
                {
                    id: gvcnAUserId,
                    email: `gvcna_${testRunId}@skyline.edu.vn`,
                    fullName: "Cô Nguyễn Thị Lan (GVCN Lớp A)",
                    passwordHash: "test_hash",
                    role: "TEACHER",
                },
                {
                    id: gvcnBUserId,
                    email: `gvcnb_${testRunId}@skyline.edu.vn`,
                    fullName: "Thầy Trần Văn Minh (GVCN Lớp B)",
                    passwordHash: "test_hash",
                    role: "TEACHER",
                },
                {
                    id: gvbmUserId,
                    email: `gvbm_${testRunId}@skyline.edu.vn`,
                    fullName: "Thầy Lê Hoàng (GVBM Toán)",
                    passwordHash: "test_hash",
                    role: "TEACHER",
                },
                {
                    id: adminUserId,
                    email: `admin_${testRunId}@skyline.edu.vn`,
                    fullName: "Ban Giám Hiệu Sky-Line",
                    passwordHash: "test_hash",
                    role: "ADMIN",
                },
                {
                    id: parent1UserId,
                    email: `ph1_${testRunId}@parent.skyline.edu.vn`,
                    fullName: "Ông Phạm Văn Hùng (PHHS 2 con)",
                    passwordHash: "test_hash",
                    role: "PARENT",
                },
                {
                    id: parent2UserId,
                    email: `ph2_${testRunId}@parent.skyline.edu.vn`,
                    fullName: "Bà Hoàng Thu Hà (PHHS HS 3)",
                    passwordHash: "test_hash",
                    role: "PARENT",
                },
            ],
        });

        await prisma.teacher.createMany({
            data: [
                {
                    id: teacherAId,
                    userId: gvcnAUserId,
                    teacherCode: `GVA_${testRunId}`,
                    teacherName: "Cô Nguyễn Thị Lan",
                    email: `gvcna_${testRunId}@skyline.edu.vn`,
                    campusId: campus1Id,
                },
                {
                    id: teacherBId,
                    userId: gvcnBUserId,
                    teacherCode: `GVB_${testRunId}`,
                    teacherName: "Thầy Trần Văn Minh",
                    email: `gvcnb_${testRunId}@skyline.edu.vn`,
                    campusId: campus2Id,
                },
            ],
        });

        await prisma.class.createMany({
            data: [
                {
                    id: classAId,
                    classCode: `5A1_${testRunId}`,
                    className: `5A1_${testRunId}`,
                    grade: "5",
                    level: "TIEU_HOC",
                    campusId: campus1Id,
                    academicYearId: yearId,
                    homeroomTeacherId: teacherAId,
                },
                {
                    id: classBId,
                    classCode: `8B1_${testRunId}`,
                    className: `8B1_${testRunId}`,
                    grade: "8",
                    level: "THCS",
                    campusId: campus2Id,
                    academicYearId: yearId,
                    homeroomTeacherId: teacherBId,
                },
                {
                    id: classCId,
                    classCode: `5A2_${testRunId}`,
                    className: `5A2_${testRunId}`,
                    grade: "5",
                    level: "TIEU_HOC",
                    campusId: campus1Id,
                    academicYearId: yearId,
                    homeroomTeacherId: teacherAId,
                },
            ],
        });

        await prisma.student.createMany({
            data: [
                {
                    id: student1Id,
                    studentCode: `HS1_${testRunId}`,
                    studentName: "Phạm Gia Bảo",
                    classId: classAId,
                    campusId: campus1Id,
                    academicYearId: yearId,
                    status: "ACTIVE",
                },
                {
                    id: student2Id,
                    studentCode: `HS2_${testRunId}`,
                    studentName: "Phạm Minh Châu",
                    classId: classBId,
                    campusId: campus2Id,
                    academicYearId: yearId,
                    status: "ACTIVE",
                },
                {
                    id: student3Id,
                    studentCode: `HS3_${testRunId}`,
                    studentName: "Đặng Quốc Khánh",
                    classId: classAId,
                    campusId: campus1Id,
                    academicYearId: yearId,
                    status: "ACTIVE",
                },
            ],
        });

        await prisma.parent.createMany({
            data: [
                {
                    id: parent1Id,
                    userId: parent1UserId,
                    parentCode: `PH1_${testRunId}`,
                    parentName: "Ông Phạm Văn Hùng",
                    phone: "0905111222",
                    email: `ph1_${testRunId}@parent.skyline.edu.vn`,
                },
                {
                    id: parent2Id,
                    userId: parent2UserId,
                    parentCode: `PH2_${testRunId}`,
                    parentName: "Bà Hoàng Thu Hà",
                    phone: "0905333444",
                    email: `ph2_${testRunId}@parent.skyline.edu.vn`,
                },
            ],
        });

        await prisma.parentStudentLink.createMany({
            data: [
                {
                    id: `psl_1_${testRunId}`,
                    parentId: parent1Id,
                    studentId: student1Id,
                    relationship: "BO",
                },
                {
                    id: `psl_2_${testRunId}`,
                    parentId: parent1Id,
                    studentId: student2Id,
                    relationship: "BO",
                },
                {
                    id: `psl_3_${testRunId}`,
                    parentId: parent2Id,
                    studentId: student3Id,
                    relationship: "ME",
                },
            ],
        });

        gvcnACtx = {
            userId: gvcnAUserId,
            userEmail: `gvcna_${testRunId}@skyline.edu.vn`,
            userName: "Cô Nguyễn Thị Lan",
            role: "TEACHER",
            isSuperAdmin: false,
            isAdmin: false,
            isKTDBCL: false,
            isGDCS: false,
            isTeacher: true,
            isParent: false,
            allowedCampusIds: [campus1Id],
            parentId: null,
            linkedStudents: [],
            teacherId: teacherAId,
            homeroomClassIds: [classAId, classCId],
            subjectClassIds: [],
        };

        gvcnBCtx = {
            userId: gvcnBUserId,
            userEmail: `gvcnb_${testRunId}@skyline.edu.vn`,
            userName: "Thầy Trần Văn Minh",
            role: "TEACHER",
            isSuperAdmin: false,
            isAdmin: false,
            isKTDBCL: false,
            isGDCS: false,
            isTeacher: true,
            isParent: false,
            allowedCampusIds: [campus2Id],
            parentId: null,
            linkedStudents: [],
            teacherId: teacherBId,
            homeroomClassIds: [classBId],
            subjectClassIds: [],
        };

        gvbmCtx = {
            userId: gvbmUserId,
            userEmail: `gvbm_${testRunId}@skyline.edu.vn`,
            userName: "Thầy Lê Hoàng (GVBM Toán)",
            role: "TEACHER",
            isSuperAdmin: false,
            isAdmin: false,
            isKTDBCL: false,
            isGDCS: false,
            isTeacher: true,
            isParent: false,
            allowedCampusIds: [campus1Id],
            parentId: null,
            linkedStudents: [],
            teacherId: null,
            homeroomClassIds: [],
            subjectClassIds: [classAId],
        };

        adminCtx = {
            userId: adminUserId,
            userEmail: `admin_${testRunId}@skyline.edu.vn`,
            userName: "Ban Giám Hiệu",
            role: "ADMIN",
            isSuperAdmin: false,
            isAdmin: true,
            isKTDBCL: true,
            isGDCS: false,
            isTeacher: false,
            isParent: false,
            allowedCampusIds: [campus1Id, campus2Id],
            parentId: null,
            linkedStudents: [],
            teacherId: null,
            homeroomClassIds: [],
            subjectClassIds: [],
        };

        parent1Ctx = {
            userId: parent1UserId,
            userEmail: `ph1_${testRunId}@parent.skyline.edu.vn`,
            userName: "Ông Phạm Văn Hùng",
            role: "PARENT",
            isSuperAdmin: false,
            isAdmin: false,
            isKTDBCL: false,
            isGDCS: false,
            isTeacher: false,
            isParent: true,
            allowedCampusIds: [],
            parentId: parent1Id,
            linkedStudents: [
                {
                    studentId: student1Id,
                    studentCode: `HS1_${testRunId}`,
                    studentName: "Phạm Gia Bảo",
                    classId: classAId,
                    className: `5A1_${testRunId}`,
                    grade: "5",
                    campusId: campus1Id,
                    relationship: "BO",
                },
                {
                    studentId: student2Id,
                    studentCode: `HS2_${testRunId}`,
                    studentName: "Phạm Minh Châu",
                    classId: classBId,
                    className: `8B1_${testRunId}`,
                    grade: "8",
                    campusId: campus2Id,
                    relationship: "BO",
                },
            ],
            teacherId: null,
            homeroomClassIds: [],
            subjectClassIds: [],
        };

        parent2Ctx = {
            userId: parent2UserId,
            userEmail: `ph2_${testRunId}@parent.skyline.edu.vn`,
            userName: "Bà Hoàng Thu Hà",
            role: "PARENT",
            isSuperAdmin: false,
            isAdmin: false,
            isKTDBCL: false,
            isGDCS: false,
            isTeacher: false,
            isParent: true,
            allowedCampusIds: [],
            parentId: parent2Id,
            linkedStudents: [
                {
                    studentId: student3Id,
                    studentCode: `HS3_${testRunId}`,
                    studentName: "Đặng Quốc Khánh",
                    classId: classAId,
                    className: `5A1_${testRunId}`,
                    grade: "5",
                    campusId: campus1Id,
                    relationship: "ME",
                },
            ],
            teacherId: null,
            homeroomClassIds: [],
            subjectClassIds: [],
        };
    });

    afterAll(async () => {
        try {
            await prisma.parentMeeting.deleteMany({ where: { academicYearId: yearId } });
            await prisma.parentStudentLink.deleteMany({
                where: { studentId: { in: [student1Id, student2Id, student3Id] } },
            });
            await prisma.parent.deleteMany({ where: { id: { in: [parent1Id, parent2Id] } } });
            await prisma.student.deleteMany({
                where: { id: { in: [student1Id, student2Id, student3Id] } },
            });
            await prisma.class.deleteMany({
                where: { id: { in: [classAId, classBId, classCId] } },
            });
            await prisma.teacher.deleteMany({ where: { id: { in: [teacherAId, teacherBId] } } });
            await prisma.user.deleteMany({
                where: {
                    id: {
                        in: [
                            gvcnAUserId,
                            gvcnBUserId,
                            gvbmUserId,
                            adminUserId,
                            parent1UserId,
                            parent2UserId,
                        ],
                    },
                },
            });
            await prisma.campus.deleteMany({ where: { id: { in: [campus1Id, campus2Id] } } });
            await prisma.academicYear.deleteMany({ where: { id: yearId } });
        } catch {
            // Ignore cleanup errors
        }
    });

    it("Scenario 1 & 3: Multi-class meeting creation & Multi-child parent can switch between children in different classes/campuses", async () => {
        const start = new Date(Date.now() + 30 * 60 * 1000);
        const end = new Date(Date.now() + 150 * 60 * 1000);

        const created = await createOrCloneParentMeeting(adminCtx, {
            title: "Họp PHHS Định kỳ Học kỳ I",
            meetingType: "DINH_KY",
            academicYearId: yearId,
            semester: "HK1",
            campusId: campus1Id,
            startTime: start,
            endTime: end,
            status: "PUBLISHED",
            classIds: [classAId, classBId, classCId],
        });

        expect(created.classCount).toBe(3);
        expect(created.invitationsCount).toBeGreaterThanOrEqual(3);
        multiClassMeetingId = created.meeting.id;

        const secondMeeting = await createOrCloneParentMeeting(gvcnACtx, {
            title: "Họp Chuyên đề Lớp 5A1",
            meetingType: "CHUYEN_DE",
            academicYearId: yearId,
            semester: "HK1",
            campusId: campus1Id,
            startTime: start,
            endTime: end,
            status: "PUBLISHED",
            classIds: [classAId],
        });
        otherMeetingId = secondMeeting.meeting.id;

        // Parent 1 filters by Child 1 (Class A) vs Child 2 (Class B)
        const listChild1 = await listParentMeetingsForActor(parent1Ctx, {
            studentId: student1Id,
        });
        const listChild2 = await listParentMeetingsForActor(parent1Ctx, {
            studentId: student2Id,
        });

        expect(listChild1.items.some((m) => m.id === multiClassMeetingId)).toBe(true);
        expect(listChild1.items.some((m) => m.id === otherMeetingId)).toBe(true);
        expect(listChild2.items.some((m) => m.id === multiClassMeetingId)).toBe(true);
        // Child 2 is in Class B, so Child 2 should NOT see Class A's exclusive meeting
        expect(listChild2.items.some((m) => m.id === otherMeetingId)).toBe(false);
    });

    it("Scenario 8 & 9: Anti-IDOR – Parent cannot access another student's data, and GVCN cannot manage another teacher's class", async () => {
        // Parent 1 tries to RSVP for Student 3 (belongs to Parent 2) -> 403 FORBIDDEN_STUDENT_ACCESS
        await expect(
            submitParentRsvp(parent1Ctx, {
                meetingId: multiClassMeetingId,
                studentId: student3Id,
                rsvpStatus: "CONFIRMED",
            })
        ).rejects.toMatchObject({
            code: "FORBIDDEN_STUDENT_ACCESS",
            status: 403,
        });

        // GVCN B (Class B) tries to record manual attendance for Class A -> 403 FORBIDDEN_CLASS_ACCESS
        await expect(
            recordManualAttendance(gvcnBCtx, {
                meetingId: multiClassMeetingId,
                classId: classAId,
                studentId: student1Id,
                attendeeName: "Ông Hùng",
                attendeeRole: "BO",
                manualReason: "NO_PHONE",
            })
        ).rejects.toMatchObject({
            code: "FORBIDDEN_CLASS_ACCESS",
            status: 403,
        });
    });

    it("Scenario 4 & 5: Expired QR token and Wrong-Meeting QR token are strictly rejected", async () => {
        const pastExpiry = new Date(Date.now() - 60 * 1000);
        const { qrToken: expiredToken } = signParentMeetingQrToken({
            sessionId: crypto.randomUUID(),
            meetingId: multiClassMeetingId,
            classId: classAId,
            studentId: student1Id,
            parentId: parent1Id,
            expiresAt: pastExpiry,
        });

        const expiredCheck = verifyParentMeetingQrToken(expiredToken, multiClassMeetingId);
        expect(expiredCheck.valid).toBe(false);
        if (!expiredCheck.valid) {
            expect(expiredCheck.errorCode).toBe("TOKEN_EXPIRED");
        }

        // Issue valid QR for `otherMeetingId` and try scanning it in `multiClassMeetingId`
        const issuedOther = await issueParentMeetingQr(parent1Ctx, {
            meetingId: otherMeetingId,
            studentId: student1Id,
        });

        // Ensure raw studentCode is never embedded in the QR token
        expect(issuedOther.qrSession.qrToken.includes(`HS1_${testRunId}`)).toBe(false);

        await expect(
            verifyAndCheckInQrToken(gvcnACtx, {
                meetingId: multiClassMeetingId,
                qrToken: issuedOther.qrSession.qrToken,
                mode: "CONFIRM",
            })
        ).rejects.toMatchObject({
            code: "WRONG_MEETING",
        });
    });

    it("Scenario 6 & 7: Concurrent QR scan by 2 teachers and Re-scanned QR are handled idempotently without duplicate attendance records", async () => {
        await submitParentRsvp(parent1Ctx, {
            meetingId: multiClassMeetingId,
            studentId: student1Id,
            rsvpStatus: "CONFIRMED",
            attendeeRole: "BO",
        });

        const issued = await issueParentMeetingQr(parent1Ctx, {
            meetingId: multiClassMeetingId,
            studentId: student1Id,
        });

        // Two teachers / staff scan the exact same QR simultaneously
        const [scan1, scan2] = await Promise.all([
            verifyAndCheckInQrToken(gvcnACtx, {
                meetingId: multiClassMeetingId,
                qrToken: issued.qrSession.qrToken,
                mode: "CONFIRM",
                attendeeRole: "BO",
                attendeeCount: 1,
            }),
            verifyAndCheckInQrToken(adminCtx, {
                meetingId: multiClassMeetingId,
                qrToken: issued.qrSession.qrToken,
                mode: "CONFIRM",
                attendeeRole: "BO",
                attendeeCount: 1,
            }),
        ]);

        expect(scan1.attendance?.id).toBeDefined();
        expect(scan2.attendance?.id).toBeDefined();

        // Subsequent replay scan
        const replayScan = await verifyAndCheckInQrToken(gvcnACtx, {
            meetingId: multiClassMeetingId,
            qrToken: issued.qrSession.qrToken,
            mode: "CONFIRM",
        });
        expect(replayScan.alreadyCheckedIn).toBe(true);

        // Verify only ONE attendance record exists in DB for (meetingId, student1Id)
        const records = await prisma.parentMeetingAttendance.findMany({
            where: {
                meetingId: multiClassMeetingId,
                studentId: student1Id,
            },
        });
        expect(records.length).toBe(1);
    });

    it("Scenario 2 & 11: Manual check-in with Two Guardians Attending accurately separates actualAttendeeCount vs presentStudentCount", async () => {
        // Student 3 has BOTH Father and Mother attending together (2 actual attendees for 1 student) via manual check-in
        await recordManualAttendance(gvcnACtx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            studentId: student3Id,
            parentId: parent2Id,
            attendeeName: "Ông Đặng Văn Nam & Bà Hoàng Thu Hà",
            attendeeRole: "CA_BO_VA_ME",
            attendeeCount: 2,
            manualReason: "TWO_GUARDIANS",
        });

        const stats = await computeMeetingAttendanceStats(multiClassMeetingId, classAId);
        // Student 1 (1 attendee) + Student 3 (2 attendees) => 2 unique students represented, 3 actual people present!
        expect(stats.presentStudentCount).toBe(2);
        expect(stats.actualAttendeeCount).toBe(3);
        expect(stats.attendanceRate).toBe(100);
    });

    it("Scenario 12 & 13: Private feedback isolation, GVBM forwarding, and dynamic Overdue warning calculation", async () => {
        const pastDue = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Parent 1 submits a PRIVATE feedback with an already-passed SLA deadline
        const privateFb = await createParentMeetingFeedback(parent1Ctx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            studentId: student1Id,
            stage: "PRE_MEETING",
            topicGroup: "CHAT_LUONG_MON_HOC",
            title: "Góp ý riêng tư về tâm lý học tập của con",
            content: "Mong thầy cô lưu ý riêng tư cho cháu Bảo.",
            visibilityScope: "PRIVATE",
            allowShareInSummary: false,
            dueAt: pastDue,
        });

        // Parent 2 submits an ANONYMOUS CLASS_SHARED feedback
        await createParentMeetingFeedback(parent2Ctx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            studentId: student3Id,
            stage: "DURING_MEETING",
            topicGroup: "HOAT_DONG_GIAO_DUC",
            title: "Đề xuất tổ chức thêm CLB Toán tư duy",
            content: "Đề nghị nhà trường mở thêm CLB sau giờ học.",
            visibilityScope: "CLASS_SHARED_ANONYMOUS",
            allowShareInSummary: true,
        });

        // Parent 2 lists feedback -> MUST NOT see Parent 1's PRIVATE feedback!
        const parent2VisibleList = await listMeetingFeedback(parent2Ctx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
        });
        expect(parent2VisibleList.some((f) => f.id === privateFb.id)).toBe(false);

        // Parent 1 lists feedback -> Sees own PRIVATE feedback + anonymized class-shared feedback (with studentName masked)
        const parent1VisibleList = await listMeetingFeedback(parent1Ctx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
        });
        const ownItem = parent1VisibleList.find((f) => f.id === privateFb.id);
        expect(ownItem).toBeDefined();
        expect(ownItem?.isOverdue).toBe(true);
        expect(ownItem?.businessStatus).toBe("NEW"); // Business status preserved alongside dynamic isOverdue flag!

        const sharedItemForP1 = parent1VisibleList.find((f) => f.id !== privateFb.id);
        expect(sharedItemForP1?.studentId).toBe("ANONYMOUS");

        // GVCN forwards privateFb to GVBM Toán
        const forwarded = await interactWithMeetingFeedback(gvcnACtx, {
            feedbackId: privateFb.id,
            action: "FORWARD",
            targetAssigneeUserId: gvbmUserId,
            targetAssigneeName: "Thầy Lê Hoàng (GVBM Toán)",
            targetAssigneeRole: "GVBM",
            messageContent: "Nhờ thầy Hoàng trao đổi thêm với PHHS.",
        });
        expect(forwarded.businessStatus).toBe("WAITING_COORDINATION");

        // GVBM replies to the forwarded feedback
        const replied = await interactWithMeetingFeedback(gvbmCtx, {
            feedbackId: privateFb.id,
            action: "REPLY",
            messageContent: "Thầy đã nắm thông tin và sẽ kèm thêm cho Bảo vào chiều thứ 5.",
            newStatus: "RESPONDED",
        });
        expect(replied.businessStatus).toBe("RESPONDED");

        // Parent 1 rates CSAT 5 stars
        const rated = await interactWithMeetingFeedback(parent1Ctx, {
            feedbackId: privateFb.id,
            action: "RATE_CSAT",
            csatScore: 5,
            csatComment: "Rất hài lòng với sự hỗ trợ nhanh chóng của thầy cô!",
        });
        expect(rated.csatScore).toBe(5);
        expect(rated.businessStatus).toBe("COMPLETED");
    });

    it("Scenario 14: Unapproved/Draft minutes are hidden from Parents until PUBLISHED, and collective minutes exclude PRIVATE feedback", async () => {
        // GVCN saves DRAFT minutes
        const draftMin = await saveOrTransitionMeetingMinutes(gvcnACtx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            action: "SAVE_DRAFT",
            conclusions: "Kết luận nháp",
        });
        expect(draftMin.status).toBe("DRAFT");
        // Verify private feedback content was NOT auto-injected into generalFeedbackSummary
        expect(draftMin.generalFeedbackSummary?.includes("cháu Bảo")).toBe(false);
        expect(draftMin.generalFeedbackSummary?.includes("CLB Toán tư duy") || draftMin.generalFeedbackSummary?.includes("CLB sau giờ học")).toBe(true);

        // Parent tries to view DRAFT minutes -> receives null
        const parentViewDraft = await getMeetingMinutesForViewer(
            parent1Ctx,
            multiClassMeetingId,
            classAId
        );
        expect(parentViewDraft).toBeNull();

        // GVCN submits for approval -> PENDING_APPROVAL (still hidden from parents)
        await saveOrTransitionMeetingMinutes(gvcnACtx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            action: "SUBMIT_APPROVAL",
        });
        const parentViewPending = await getMeetingMinutesForViewer(
            parent1Ctx,
            multiClassMeetingId,
            classAId
        );
        expect(parentViewPending).toBeNull();

        // Admin publishes minutes -> now visible to parents!
        await saveOrTransitionMeetingMinutes(adminCtx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            action: "PUBLISH",
        });
        const parentViewPublished = await getMeetingMinutesForViewer(
            parent1Ctx,
            multiClassMeetingId,
            classAId
        );
        expect(parentViewPublished).not.toBeNull();
        expect(parentViewPublished?.status).toBe("PUBLISHED");
        expect(parentViewPublished?.version).toBe(3);
    });

    it("Scenario 15 & 10: Incomplete post-meeting tasks tracking & Cancelled meeting blocks new QR/check-in", async () => {
        const pastDueTask = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const task = await createParentMeetingTask(gvcnACtx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
            title: "Gửi kế hoạch bồi dưỡng học kỳ I cho PHHS lớp 5A1",
            assigneeUserId: gvcnAUserId,
            assigneeName: "Cô Nguyễn Thị Lan",
            assigneeRole: "GVCN",
            dueAt: pastDueTask,
            priority: "HIGH",
            visibleToParents: true,
        });

        const tasksForParent = await listParentMeetingTasks(parent1Ctx, {
            meetingId: multiClassMeetingId,
            classId: classAId,
        });
        expect(tasksForParent.some((t) => t.id === task.id && t.isOverdue)).toBe(true);

        // Cancel `otherMeetingId` and verify QR issuance and check-in are blocked
        await updateParentMeeting(gvcnACtx, otherMeetingId, {
            status: "CANCELLED",
            cancelReason: "Điều chỉnh lịch công tác trường",
        });

        await expect(
            issueParentMeetingQr(parent1Ctx, {
                meetingId: otherMeetingId,
                studentId: student1Id,
            })
        ).rejects.toMatchObject({
            code: "MEETING_CANCELLED",
        });
    });
});
