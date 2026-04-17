
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.20.0
 * Query Engine version: 06fc58a368dc7be9fbbbe894adf8d445d208c284
 */
Prisma.prismaVersion = {
  client: "5.20.0",
  engine: "06fc58a368dc7be9fbbbe894adf8d445d208c284"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  fullName: 'fullName',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ParentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  parentCode: 'parentCode',
  parentName: 'parentName',
  email: 'email',
  phone: 'phone',
  status: 'status'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  teacherCode: 'teacherCode',
  teacherName: 'teacherName',
  email: 'email',
  phone: 'phone',
  homeroomClass: 'homeroomClass',
  campusId: 'campusId',
  status: 'status',
  dateOfBirth: 'dateOfBirth',
  departmentId: 'departmentId',
  mainSubjectId: 'mainSubjectId'
};

exports.Prisma.CampusScalarFieldEnum = {
  id: 'id',
  campusCode: 'campusCode',
  campusName: 'campusName',
  address: 'address',
  status: 'status'
};

exports.Prisma.AcademicYearScalarFieldEnum = {
  id: 'id',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  classCode: 'classCode',
  className: 'className',
  level: 'level',
  grade: 'grade',
  campusId: 'campusId',
  academicYearId: 'academicYearId',
  homeroomTeacherId: 'homeroomTeacherId',
  status: 'status',
  educationSystem: 'educationSystem'
};

exports.Prisma.TeacherClassAssignmentScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  classId: 'classId',
  roleInClass: 'roleInClass',
  status: 'status'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  studentCode: 'studentCode',
  studentName: 'studentName',
  classId: 'classId',
  campusId: 'campusId',
  academicYearId: 'academicYearId',
  status: 'status',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender'
};

exports.Prisma.ParentStudentLinkScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  studentId: 'studentId',
  relationship: 'relationship',
  status: 'status'
};

exports.Prisma.SurveyPeriodScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  academicYearId: 'academicYearId',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  status: 'status'
};

exports.Prisma.SurveySectionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  sortOrder: 'sortOrder',
  status: 'status'
};

exports.Prisma.SurveyQuestionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  questionText: 'questionText',
  sectionId: 'sectionId',
  surveyPeriodId: 'surveyPeriodId',
  questionType: 'questionType',
  ratingScaleMin: 'ratingScaleMin',
  ratingScaleMax: 'ratingScaleMax',
  options: 'options',
  weight: 'weight',
  isRequired: 'isRequired',
  isActive: 'isActive',
  sortOrder: 'sortOrder'
};

exports.Prisma.SurveyFormScalarFieldEnum = {
  id: 'id',
  surveyPeriodId: 'surveyPeriodId',
  parentId: 'parentId',
  studentId: 'studentId',
  classId: 'classId',
  campusId: 'campusId',
  academicYearId: 'academicYearId',
  submissionDateTime: 'submissionDateTime',
  submittedByEmail: 'submittedByEmail',
  overallAverageScore: 'overallAverageScore',
  npsScoreRaw: 'npsScoreRaw',
  npsCategory: 'npsCategory',
  status: 'status'
};

exports.Prisma.SurveyResponseScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  questionId: 'questionId',
  numericScore: 'numericScore',
  textAnswer: 'textAnswer',
  choiceAnswer: 'choiceAnswer',
  calculatedWeightedScore: 'calculatedWeightedScore',
  createdAt: 'createdAt'
};

exports.Prisma.SummaryByClassScalarFieldEnum = {
  id: 'id',
  surveyPeriodId: 'surveyPeriodId',
  classId: 'classId',
  totalStudents: 'totalStudents',
  surveyedStudents: 'surveyedStudents',
  notSurveyedStudents: 'notSurveyedStudents',
  completionRate: 'completionRate',
  averageSatisfactionScore: 'averageSatisfactionScore',
  promoterCount: 'promoterCount',
  passiveCount: 'passiveCount',
  detractorCount: 'detractorCount',
  npsValue: 'npsValue',
  updatedAt: 'updatedAt'
};

exports.Prisma.SummaryByCampusScalarFieldEnum = {
  id: 'id',
  surveyPeriodId: 'surveyPeriodId',
  campusId: 'campusId',
  totalStudents: 'totalStudents',
  surveyedStudents: 'surveyedStudents',
  notSurveyedStudents: 'notSurveyedStudents',
  completionRate: 'completionRate',
  averageSatisfactionScore: 'averageSatisfactionScore',
  promoterCount: 'promoterCount',
  passiveCount: 'passiveCount',
  detractorCount: 'detractorCount',
  npsValue: 'npsValue',
  updatedAt: 'updatedAt'
};

exports.Prisma.SummarySystemScalarFieldEnum = {
  id: 'id',
  surveyPeriodId: 'surveyPeriodId',
  totalStudents: 'totalStudents',
  surveyedStudents: 'surveyedStudents',
  notSurveyedStudents: 'notSurveyedStudents',
  completionRate: 'completionRate',
  averageSatisfactionScore: 'averageSatisfactionScore',
  promoterCount: 'promoterCount',
  passiveCount: 'passiveCount',
  detractorCount: 'detractorCount',
  npsValue: 'npsValue',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  subjectCode: 'subjectCode',
  subjectName: 'subjectName',
  studyPrograms: 'studyPrograms',
  level: 'level',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeachingAssignmentScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  classId: 'classId',
  subjectId: 'subjectId',
  academicYearId: 'academicYearId',
  semester: 'semester'
};

exports.Prisma.SubjectQuotaScalarFieldEnum = {
  id: 'id',
  subjectId: 'subjectId',
  academicYearId: 'academicYearId',
  quota: 'quota',
  quotaPrimary: 'quotaPrimary',
  quotaMiddle: 'quotaMiddle',
  quotaHigh: 'quotaHigh'
};

exports.Prisma.RoleScalarFieldEnum = {
  code: 'code',
  name: 'name',
  description: 'description',
  isSystem: 'isSystem'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  roleCode: 'roleCode',
  module: 'module',
  canRead: 'canRead',
  canCreate: 'canCreate',
  canUpdate: 'canUpdate',
  canDelete: 'canDelete'
};

exports.Prisma.WorkTaskScalarFieldEnum = {
  id: 'id',
  category: 'category',
  title: 'title',
  description: 'description',
  assignedToRole: 'assignedToRole',
  assignedToUserId: 'assignedToUserId',
  assignedById: 'assignedById',
  startDate: 'startDate',
  endDate: 'endDate',
  progress: 'progress',
  month: 'month',
  academicYearId: 'academicYearId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  staffNote: 'staffNote',
  staffUpdatedAt: 'staffUpdatedAt'
};

exports.Prisma.StudentAchievementScalarFieldEnum = {
  id: 'id',
  competitionCode: 'competitionCode',
  competitionName: 'competitionName',
  level: 'level',
  grade: 'grade',
  nature: 'nature',
  organizingLevel: 'organizingLevel',
  field: 'field',
  recognition: 'recognition',
  participationType: 'participationType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskCommentScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.TaskAttachmentScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  fileName: 'fileName',
  fileData: 'fileData',
  fileSize: 'fileSize',
  contentType: 'contentType',
  createdAt: 'createdAt'
};

exports.Prisma.InputAssessmentPeriodScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  academicYearId: 'academicYearId',
  campusId: 'campusId',
  assignedUserId: 'assignedUserId',
  startDate: 'startDate',
  endDate: 'endDate',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InputAssessmentBatchScalarFieldEnum = {
  id: 'id',
  periodId: 'periodId',
  batchNumber: 'batchNumber',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WeeklyReportScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  weekNumber: 'weekNumber',
  month: 'month',
  year: 'year',
  academicYearId: 'academicYearId',
  status: 'status',
  managerComment: 'managerComment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WeeklyReportItemScalarFieldEnum = {
  id: 'id',
  reportId: 'reportId',
  mainTask: 'mainTask',
  workContent: 'workContent',
  progress: 'progress',
  proposedSolution: 'proposedSolution',
  managerNote: 'managerNote',
  createdAt: 'createdAt'
};

exports.Prisma.InputAssessmentStudentScalarFieldEnum = {
  id: 'id',
  studentCode: 'studentCode',
  fullName: 'fullName',
  dateOfBirth: 'dateOfBirth',
  className: 'className',
  academicRating: 'academicRating',
  conductRating: 'conductRating',
  admissionCriteria: 'admissionCriteria',
  surveySystem: 'surveySystem',
  targetType: 'targetType',
  psychologyScore: 'psychologyScore',
  writtenEnglishScore: 'writtenEnglishScore',
  oralEnglishScore: 'oralEnglishScore',
  mathScore: 'mathScore',
  literatureScore: 'literatureScore',
  periodId: 'periodId',
  batchId: 'batchId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  signatureName: 'signatureName',
  surveyFormType: 'surveyFormType',
  hocKy: 'hocKy',
  kqHocTap: 'kqHocTap',
  kqRenLuyen: 'kqRenLuyen',
  kqgdTieuHoc: 'kqgdTieuHoc',
  grade: 'grade',
  hoSoCtQuocTe: 'hoSoCtQuocTe',
  admissionResult: 'admissionResult',
  directorNote: 'directorNote'
};

exports.Prisma.AssessmentGradeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  sortOrder: 'sortOrder',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.AssessmentSystemScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  sortOrder: 'sortOrder',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.AssessmentSubjectScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  subjectType: 'subjectType',
  scoreColumns: 'scoreColumns',
  commentColumns: 'commentColumns',
  sortOrder: 'sortOrder',
  status: 'status',
  createdAt: 'createdAt',
  columnNames: 'columnNames'
};

exports.Prisma.EducationSystemScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  academicYearId: 'academicYearId',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.GradeSubjectMappingScalarFieldEnum = {
  id: 'id',
  grade: 'grade',
  educationSystem: 'educationSystem',
  subjectId: 'subjectId',
  createdAt: 'createdAt'
};

exports.Prisma.AssessmentConfigScalarFieldEnum = {
  id: 'id',
  categoryType: 'categoryType',
  code: 'code',
  name: 'name',
  status: 'status',
  sortOrder: 'sortOrder',
  academicYearId: 'academicYearId',
  createdAt: 'createdAt'
};

exports.Prisma.InputAssessmentTeacherAssignmentScalarFieldEnum = {
  id: 'id',
  periodId: 'periodId',
  batchId: 'batchId',
  userId: 'userId',
  subjectId: 'subjectId',
  grade: 'grade',
  educationSystem: 'educationSystem',
  unlockRequestStatus: 'unlockRequestStatus',
  unlockReason: 'unlockReason',
  createdAt: 'createdAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentAssessmentScoreScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  subjectId: 'subjectId',
  scores: 'scores',
  comments: 'comments',
  updatedAt: 'updatedAt',
  teacherId: 'teacherId',
  teacherName: 'teacherName'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Parent: 'Parent',
  Teacher: 'Teacher',
  Campus: 'Campus',
  AcademicYear: 'AcademicYear',
  Class: 'Class',
  TeacherClassAssignment: 'TeacherClassAssignment',
  Student: 'Student',
  ParentStudentLink: 'ParentStudentLink',
  SurveyPeriod: 'SurveyPeriod',
  SurveySection: 'SurveySection',
  SurveyQuestion: 'SurveyQuestion',
  SurveyForm: 'SurveyForm',
  SurveyResponse: 'SurveyResponse',
  SummaryByClass: 'SummaryByClass',
  SummaryByCampus: 'SummaryByCampus',
  SummarySystem: 'SummarySystem',
  Notification: 'Notification',
  Subject: 'Subject',
  TeachingAssignment: 'TeachingAssignment',
  SubjectQuota: 'SubjectQuota',
  Role: 'Role',
  Permission: 'Permission',
  WorkTask: 'WorkTask',
  StudentAchievement: 'StudentAchievement',
  TaskComment: 'TaskComment',
  TaskAttachment: 'TaskAttachment',
  InputAssessmentPeriod: 'InputAssessmentPeriod',
  InputAssessmentBatch: 'InputAssessmentBatch',
  WeeklyReport: 'WeeklyReport',
  WeeklyReportItem: 'WeeklyReportItem',
  InputAssessmentStudent: 'InputAssessmentStudent',
  AssessmentGrade: 'AssessmentGrade',
  AssessmentSystem: 'AssessmentSystem',
  AssessmentSubject: 'AssessmentSubject',
  EducationSystem: 'EducationSystem',
  GradeSubjectMapping: 'GradeSubjectMapping',
  AssessmentConfig: 'AssessmentConfig',
  InputAssessmentTeacherAssignment: 'InputAssessmentTeacherAssignment',
  Department: 'Department',
  StudentAssessmentScore: 'StudentAssessmentScore'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\prisma\\generated\\client2",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "C:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../..",
  "clientVersion": "5.20.0",
  "engineVersion": "06fc58a368dc7be9fbbbe894adf8d445d208c284",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "sqlite",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  previewFeatures = [\"driverAdapters\"]\n  provider        = \"prisma-client-js\"\n  output          = \"./generated/client2\"\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id                               String                             @id @default(cuid())\n  fullName                         String\n  email                            String                             @unique\n  passwordHash                     String\n  role                             String                             @default(\"PARENT\")\n  status                           String                             @default(\"ACTIVE\")\n  createdAt                        DateTime                           @default(now())\n  updatedAt                        DateTime                           @updatedAt\n  inputAssessmentPeriods           InputAssessmentPeriod[]            @relation(\"PeriodAssignee\")\n  InputAssessmentTeacherAssignment InputAssessmentTeacherAssignment[]\n  notifications                    Notification[]\n  parent                           Parent?\n  taskAttachments                  TaskAttachment[]                   @relation(\"TaskAttachments\")\n  taskComments                     TaskComment[]                      @relation(\"TaskComments\")\n  teacher                          Teacher?\n  weeklyReports                    WeeklyReport[]\n  receivedTasks                    WorkTask[]                         @relation(\"TaskAssignee\")\n  assignedTasks                    WorkTask[]                         @relation(\"TaskAssigner\")\n}\n\nmodel Parent {\n  id          String              @id @default(cuid())\n  userId      String              @unique\n  parentCode  String              @unique\n  parentName  String\n  email       String?\n  phone       String?\n  status      String              @default(\"ACTIVE\")\n  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)\n  students    ParentStudentLink[]\n  surveyForms SurveyForm[]\n}\n\nmodel Teacher {\n  id                 String                   @id @default(cuid())\n  userId             String                   @unique\n  teacherCode        String                   @unique\n  teacherName        String\n  email              String?\n  phone              String?\n  homeroomClass      String?\n  campusId           String\n  status             String                   @default(\"ACTIVE\")\n  dateOfBirth        DateTime?\n  departmentId       String?\n  mainSubjectId      String?\n  mainSubjectRel     Subject?                 @relation(\"teacherMainSubject\", fields: [mainSubjectId], references: [id])\n  departmentRel      Department?              @relation(fields: [departmentId], references: [id])\n  user               User                     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  campus             Campus                   @relation(fields: [campusId], references: [id])\n  classes            TeacherClassAssignment[]\n  TeachingAssignment TeachingAssignment[]\n}\n\nmodel Campus {\n  id                     String                  @id @default(cuid())\n  campusCode             String                  @unique\n  campusName             String\n  address                String?\n  status                 String                  @default(\"ACTIVE\")\n  classes                Class[]\n  inputAssessmentPeriods InputAssessmentPeriod[]\n  students               Student[]\n  summaries              SummaryByCampus[]\n  surveyForms            SurveyForm[]\n  teachers               Teacher[]\n}\n\nmodel AcademicYear {\n  id                     String                  @id @default(cuid())\n  name                   String\n  startDate              DateTime\n  endDate                DateTime\n  status                 String                  @default(\"ACTIVE\")\n  assessmentConfigs      AssessmentConfig[]\n  classes                Class[]\n  educationSystems       EducationSystem[]\n  inputAssessmentPeriods InputAssessmentPeriod[]\n  students               Student[]\n  subjectQuotas          SubjectQuota[]\n  surveyForms            SurveyForm[]\n  surveyPeriods          SurveyPeriod[]\n  teachingAssignments    TeachingAssignment[]\n  weeklyReports          WeeklyReport[]\n  workTasks              WorkTask[]\n}\n\nmodel Class {\n  id                  String                   @id @default(cuid())\n  classCode           String                   @unique\n  className           String\n  level               String                   @default(\"Tieu hoc\")\n  grade               String                   @default(\"\")\n  campusId            String\n  academicYearId      String\n  homeroomTeacherId   String?\n  status              String                   @default(\"ACTIVE\")\n  educationSystem     String?                  @default(\"\")\n  campus              Campus                   @relation(fields: [campusId], references: [id])\n  academicYear        AcademicYear             @relation(fields: [academicYearId], references: [id])\n  students            Student[]\n  summaries           SummaryByClass[]\n  surveyForms         SurveyForm[]\n  teachers            TeacherClassAssignment[]\n  teachingAssignments TeachingAssignment[]\n}\n\nmodel TeacherClassAssignment {\n  id          String  @id @default(cuid())\n  teacherId   String\n  classId     String\n  roleInClass String?\n  status      String  @default(\"ACTIVE\")\n  class       Class   @relation(fields: [classId], references: [id], onDelete: Cascade)\n  teacher     Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)\n\n  @@unique([teacherId, classId])\n}\n\nmodel Student {\n  id             String              @id @default(cuid())\n  studentCode    String\n  studentName    String\n  classId        String\n  campusId       String\n  academicYearId String\n  status         String              @default(\"ACTIVE\")\n  dateOfBirth    DateTime?\n  gender         String?\n  parents        ParentStudentLink[]\n  academicYear   AcademicYear        @relation(fields: [academicYearId], references: [id])\n  campus         Campus              @relation(fields: [campusId], references: [id])\n  class          Class               @relation(fields: [classId], references: [id])\n  surveyForms    SurveyForm[]\n}\n\nmodel ParentStudentLink {\n  id           String  @id @default(cuid())\n  parentId     String\n  studentId    String\n  relationship String?\n  status       String  @default(\"ACTIVE\")\n  student      Student @relation(fields: [studentId], references: [id], onDelete: Cascade)\n  parent       Parent  @relation(fields: [parentId], references: [id], onDelete: Cascade)\n\n  @@unique([parentId, studentId])\n}\n\nmodel SurveyPeriod {\n  id              String            @id @default(cuid())\n  code            String            @unique\n  name            String\n  academicYearId  String\n  startDate       DateTime\n  endDate         DateTime\n  isActive        Boolean           @default(false)\n  status          String            @default(\"ACTIVE\")\n  campusSummaries SummaryByCampus[]\n  classSummaries  SummaryByClass[]\n  systemSummaries SummarySystem?\n  surveyForms     SurveyForm[]\n  academicYear    AcademicYear      @relation(fields: [academicYearId], references: [id])\n  questions       SurveyQuestion[]\n}\n\nmodel SurveySection {\n  id        String           @id @default(cuid())\n  code      String           @unique\n  name      String\n  sortOrder Int              @default(0)\n  status    String           @default(\"ACTIVE\")\n  questions SurveyQuestion[]\n}\n\nmodel SurveyQuestion {\n  id             String           @id @default(cuid())\n  code           String           @unique\n  questionText   String\n  sectionId      String?\n  surveyPeriodId String?\n  questionType   String\n  ratingScaleMin Int?             @default(1)\n  ratingScaleMax Int?             @default(5)\n  options        String?\n  weight         Float            @default(1.0)\n  isRequired     Boolean          @default(true)\n  isActive       Boolean          @default(true)\n  sortOrder      Int              @default(0)\n  surveyPeriod   SurveyPeriod?    @relation(fields: [surveyPeriodId], references: [id])\n  section        SurveySection?   @relation(fields: [sectionId], references: [id])\n  responses      SurveyResponse[]\n}\n\nmodel SurveyForm {\n  id                  String           @id @default(cuid())\n  surveyPeriodId      String\n  parentId            String\n  studentId           String\n  classId             String\n  campusId            String\n  academicYearId      String\n  submissionDateTime  DateTime         @default(now())\n  submittedByEmail    String?\n  overallAverageScore Float?\n  npsScoreRaw         Int?\n  npsCategory         String?\n  status              String           @default(\"DRAFT\")\n  surveyPeriod        SurveyPeriod     @relation(fields: [surveyPeriodId], references: [id])\n  parent              Parent           @relation(fields: [parentId], references: [id], onDelete: Cascade)\n  student             Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)\n  class               Class            @relation(fields: [classId], references: [id])\n  campus              Campus           @relation(fields: [campusId], references: [id])\n  academicYear        AcademicYear     @relation(fields: [academicYearId], references: [id])\n  responses           SurveyResponse[]\n\n  @@unique([parentId, studentId, surveyPeriodId])\n}\n\nmodel SurveyResponse {\n  id                      String         @id @default(cuid())\n  formId                  String\n  questionId              String\n  numericScore            Int?\n  textAnswer              String?\n  choiceAnswer            String?\n  calculatedWeightedScore Float?\n  createdAt               DateTime       @default(now())\n  question                SurveyQuestion @relation(fields: [questionId], references: [id])\n  form                    SurveyForm     @relation(fields: [formId], references: [id], onDelete: Cascade)\n}\n\nmodel SummaryByClass {\n  id                       String       @id @default(cuid())\n  surveyPeriodId           String\n  classId                  String\n  totalStudents            Int          @default(0)\n  surveyedStudents         Int          @default(0)\n  notSurveyedStudents      Int          @default(0)\n  completionRate           Float        @default(0)\n  averageSatisfactionScore Float?       @default(0)\n  promoterCount            Int          @default(0)\n  passiveCount             Int          @default(0)\n  detractorCount           Int          @default(0)\n  npsValue                 Float?       @default(0)\n  updatedAt                DateTime     @updatedAt\n  class                    Class        @relation(fields: [classId], references: [id])\n  surveyPeriod             SurveyPeriod @relation(fields: [surveyPeriodId], references: [id])\n\n  @@unique([surveyPeriodId, classId])\n}\n\nmodel SummaryByCampus {\n  id                       String       @id @default(cuid())\n  surveyPeriodId           String\n  campusId                 String\n  totalStudents            Int          @default(0)\n  surveyedStudents         Int          @default(0)\n  notSurveyedStudents      Int          @default(0)\n  completionRate           Float        @default(0)\n  averageSatisfactionScore Float?       @default(0)\n  promoterCount            Int          @default(0)\n  passiveCount             Int          @default(0)\n  detractorCount           Int          @default(0)\n  npsValue                 Float?       @default(0)\n  updatedAt                DateTime     @updatedAt\n  campus                   Campus       @relation(fields: [campusId], references: [id])\n  surveyPeriod             SurveyPeriod @relation(fields: [surveyPeriodId], references: [id])\n\n  @@unique([surveyPeriodId, campusId])\n}\n\nmodel SummarySystem {\n  id                       String       @id @default(cuid())\n  surveyPeriodId           String       @unique\n  totalStudents            Int          @default(0)\n  surveyedStudents         Int          @default(0)\n  notSurveyedStudents      Int          @default(0)\n  completionRate           Float        @default(0)\n  averageSatisfactionScore Float?       @default(0)\n  promoterCount            Int          @default(0)\n  passiveCount             Int          @default(0)\n  detractorCount           Int          @default(0)\n  npsValue                 Float?       @default(0)\n  updatedAt                DateTime     @updatedAt\n  surveyPeriod             SurveyPeriod @relation(fields: [surveyPeriodId], references: [id])\n}\n\nmodel Notification {\n  id        String   @id @default(cuid())\n  userId    String\n  title     String\n  message   String\n  isRead    Boolean  @default(false)\n  createdAt DateTime @default(now())\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n}\n\nmodel Subject {\n  id            String               @id @default(cuid())\n  subjectCode   String               @unique\n  subjectName   String\n  studyPrograms String?              @default(\"HĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¬Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡ S\")\n  level         String?              @default(\"ALL\")\n  description   String?\n  status        String               @default(\"ACTIVE\")\n  createdAt     DateTime             @default(now())\n  updatedAt     DateTime             @updatedAt\n  quotas        SubjectQuota[]\n  mainTeachers  Teacher[]            @relation(\"teacherMainSubject\")\n  assignments   TeachingAssignment[]\n}\n\nmodel TeachingAssignment {\n  id             String       @id @default(cuid())\n  teacherId      String\n  classId        String\n  subjectId      String\n  academicYearId String\n  semester       Int\n  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])\n  subject        Subject      @relation(fields: [subjectId], references: [id])\n  class          Class        @relation(fields: [classId], references: [id])\n  teacher        Teacher      @relation(fields: [teacherId], references: [id])\n\n  @@unique([teacherId, classId, subjectId, academicYearId, semester])\n}\n\nmodel SubjectQuota {\n  id             String       @id @default(cuid())\n  subjectId      String\n  academicYearId String\n  quota          Int          @default(0)\n  quotaPrimary   Int          @default(0)\n  quotaMiddle    Int          @default(0)\n  quotaHigh      Int          @default(0)\n  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)\n  subject        Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n\n  @@unique([subjectId, academicYearId])\n}\n\nmodel Role {\n  code        String       @id\n  name        String\n  description String?\n  isSystem    Boolean      @default(false)\n  permissions Permission[]\n}\n\nmodel Permission {\n  id        String  @id @default(cuid())\n  roleCode  String\n  module    String\n  canRead   Boolean @default(false)\n  canCreate Boolean @default(false)\n  canUpdate Boolean @default(false)\n  canDelete Boolean @default(false)\n  role      Role    @relation(fields: [roleCode], references: [code], onDelete: Cascade)\n\n  @@unique([roleCode, module])\n}\n\nmodel WorkTask {\n  id               String           @id @default(cuid())\n  category         String\n  title            String\n  description      String?\n  assignedToRole   String           @default(\"KT_DBCL\")\n  assignedToUserId String?\n  assignedById     String\n  startDate        DateTime\n  endDate          DateTime\n  progress         String           @default(\"PENDING\")\n  month            Int?\n  academicYearId   String?\n  createdAt        DateTime         @default(now())\n  updatedAt        DateTime         @updatedAt\n  staffNote        String?\n  staffUpdatedAt   DateTime?\n  attachments      TaskAttachment[]\n  comments         TaskComment[]\n  assignedToUser   User?            @relation(\"TaskAssignee\", fields: [assignedToUserId], references: [id])\n  assignedBy       User             @relation(\"TaskAssigner\", fields: [assignedById], references: [id])\n  academicYear     AcademicYear?    @relation(fields: [academicYearId], references: [id])\n}\n\nmodel StudentAchievement {\n  id                String   @id @default(cuid())\n  competitionCode   String   @unique\n  competitionName   String\n  level             String\n  grade             String\n  nature            String\n  organizingLevel   String?\n  field             String\n  recognition       String?\n  participationType String?\n  createdAt         DateTime @default(now())\n  updatedAt         DateTime @updatedAt\n}\n\nmodel TaskComment {\n  id        String   @id @default(cuid())\n  taskId    String\n  userId    String\n  content   String\n  createdAt DateTime @default(now())\n  user      User     @relation(\"TaskComments\", fields: [userId], references: [id])\n  task      WorkTask @relation(fields: [taskId], references: [id], onDelete: Cascade)\n}\n\nmodel TaskAttachment {\n  id          String   @id @default(cuid())\n  taskId      String\n  userId      String\n  fileName    String\n  fileData    String\n  fileSize    Int      @default(0)\n  contentType String   @default(\"\")\n  createdAt   DateTime @default(now())\n  user        User     @relation(\"TaskAttachments\", fields: [userId], references: [id])\n  task        WorkTask @relation(fields: [taskId], references: [id], onDelete: Cascade)\n}\n\nmodel InputAssessmentPeriod {\n  id                               String                             @id @default(cuid())\n  code                             String                             @unique\n  name                             String\n  academicYearId                   String\n  campusId                         String?\n  assignedUserId                   String?\n  startDate                        DateTime?\n  endDate                          DateTime?\n  description                      String?\n  status                           String                             @default(\"ACTIVE\")\n  createdAt                        DateTime                           @default(now())\n  updatedAt                        DateTime                           @updatedAt\n  batches                          InputAssessmentBatch[]\n  academicYear                     AcademicYear                       @relation(fields: [academicYearId], references: [id])\n  campus                           Campus?                            @relation(fields: [campusId], references: [id])\n  assignedUser                     User?                              @relation(\"PeriodAssignee\", fields: [assignedUserId], references: [id])\n  students                         InputAssessmentStudent[]\n  InputAssessmentTeacherAssignment InputAssessmentTeacherAssignment[]\n}\n\nmodel InputAssessmentBatch {\n  id                               String                             @id @default(cuid())\n  periodId                         String\n  batchNumber                      Int\n  name                             String\n  startDate                        DateTime\n  endDate                          DateTime\n  status                           String                             @default(\"ACTIVE\")\n  createdAt                        DateTime                           @default(now())\n  updatedAt                        DateTime                           @updatedAt\n  period                           InputAssessmentPeriod              @relation(fields: [periodId], references: [id], onDelete: Cascade)\n  students                         InputAssessmentStudent[]\n  InputAssessmentTeacherAssignment InputAssessmentTeacherAssignment[]\n\n  @@unique([periodId, batchNumber])\n}\n\nmodel WeeklyReport {\n  id             String             @id @default(cuid())\n  userId         String\n  weekNumber     Int\n  month          Int\n  year           Int\n  academicYearId String?\n  status         String             @default(\"DRAFT\")\n  managerComment String?\n  createdAt      DateTime           @default(now())\n  updatedAt      DateTime           @updatedAt\n  academicYear   AcademicYear?      @relation(fields: [academicYearId], references: [id])\n  user           User               @relation(fields: [userId], references: [id])\n  items          WeeklyReportItem[]\n}\n\nmodel WeeklyReportItem {\n  id               String       @id @default(cuid())\n  reportId         String\n  mainTask         String\n  workContent      String\n  progress         String       @default(\"NOT_STARTED\")\n  proposedSolution String?\n  managerNote      String?\n  createdAt        DateTime     @default(now())\n  report           WeeklyReport @relation(fields: [reportId], references: [id], onDelete: Cascade)\n}\n\nmodel InputAssessmentStudent {\n  id                  String                   @id @default(cuid())\n  studentCode         String\n  fullName            String\n  dateOfBirth         DateTime?\n  className           String?\n  academicRating      String?\n  conductRating       String?\n  admissionCriteria   String?\n  surveySystem        String?\n  targetType          String?\n  psychologyScore     Float?\n  writtenEnglishScore Float?\n  oralEnglishScore    Float?\n  mathScore           Float?\n  literatureScore     Float?\n  periodId            String\n  batchId             String?\n  createdAt           DateTime                 @default(now())\n  updatedAt           DateTime                 @updatedAt\n  signatureName       String?\n  surveyFormType      String?\n  hocKy               String?\n  kqHocTap            String?\n  kqRenLuyen          String?\n  kqgdTieuHoc         String?\n  grade               String?\n  hoSoCtQuocTe        String?\n  admissionResult     String?\n  directorNote        String?\n  batch               InputAssessmentBatch?    @relation(fields: [batchId], references: [id])\n  period              InputAssessmentPeriod    @relation(fields: [periodId], references: [id], onDelete: Cascade)\n  scores              StudentAssessmentScore[]\n\n  @@unique([studentCode, periodId])\n}\n\nmodel AssessmentGrade {\n  id        String   @id @default(cuid())\n  code      String   @unique\n  name      String\n  sortOrder Int      @default(0)\n  status    String   @default(\"ACTIVE\")\n  createdAt DateTime @default(now())\n}\n\nmodel AssessmentSystem {\n  id        String   @id @default(cuid())\n  code      String   @unique\n  name      String\n  sortOrder Int      @default(0)\n  status    String   @default(\"ACTIVE\")\n  createdAt DateTime @default(now())\n}\n\nmodel AssessmentSubject {\n  id                               String                             @id @default(cuid())\n  code                             String                             @unique\n  name                             String\n  subjectType                      String?\n  scoreColumns                     Int                                @default(1)\n  commentColumns                   Int                                @default(1)\n  sortOrder                        Int                                @default(0)\n  status                           String                             @default(\"ACTIVE\")\n  createdAt                        DateTime                           @default(now())\n  columnNames                      String?\n  gradeMappings                    GradeSubjectMapping[]\n  InputAssessmentTeacherAssignment InputAssessmentTeacherAssignment[]\n  studentScores                    StudentAssessmentScore[]\n}\n\nmodel EducationSystem {\n  id             String       @id @default(cuid())\n  code           String       @unique\n  name           String\n  academicYearId String\n  status         String       @default(\"ACTIVE\")\n  createdAt      DateTime     @default(now())\n  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)\n}\n\nmodel GradeSubjectMapping {\n  id              String            @id @default(cuid())\n  grade           String\n  educationSystem String\n  subjectId       String\n  createdAt       DateTime          @default(now())\n  subject         AssessmentSubject @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n\n  @@unique([grade, educationSystem, subjectId])\n}\n\nmodel AssessmentConfig {\n  id             String        @id @default(cuid())\n  categoryType   String\n  code           String\n  name           String\n  status         String        @default(\"ACTIVE\")\n  sortOrder      Int           @default(0)\n  academicYearId String?\n  createdAt      DateTime      @default(now())\n  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id], onDelete: Cascade)\n\n  @@unique([categoryType, code, academicYearId])\n}\n\nmodel InputAssessmentTeacherAssignment {\n  id                  String                @id @default(cuid())\n  periodId            String\n  batchId             String?\n  userId              String\n  subjectId           String\n  grade               String\n  educationSystem     String\n  unlockRequestStatus String                @default(\"NONE\")\n  unlockReason        String?\n  createdAt           DateTime              @default(now())\n  subject             AssessmentSubject     @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n  user                User                  @relation(fields: [userId], references: [id], onDelete: Cascade)\n  batch               InputAssessmentBatch? @relation(fields: [batchId], references: [id], onDelete: Cascade)\n  period              InputAssessmentPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)\n\n  @@unique([periodId, batchId, userId, subjectId, grade, educationSystem])\n}\n\nmodel Department {\n  id          String    @id @default(cuid())\n  code        String    @unique\n  name        String\n  description String?\n  status      String    @default(\"ACTIVE\")\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  teachers    Teacher[]\n}\n\nmodel StudentAssessmentScore {\n  id          String                 @id @default(cuid())\n  studentId   String\n  subjectId   String\n  scores      String?\n  comments    String?\n  updatedAt   DateTime               @updatedAt\n  teacherId   String?\n  teacherName String?\n  subject     AssessmentSubject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n  student     InputAssessmentStudent @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  @@unique([studentId, subjectId])\n}\n",
  "inlineSchemaHash": "a498b564e4b2be56d9b24bfa44593a07ef6451cfbefac6ef4628f6de4f6dc596",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fullName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inputAssessmentPeriods\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"PeriodAssignee\"},{\"name\":\"InputAssessmentTeacherAssignment\",\"kind\":\"object\",\"type\":\"InputAssessmentTeacherAssignment\",\"relationName\":\"InputAssessmentTeacherAssignmentToUser\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"Notification\",\"relationName\":\"NotificationToUser\"},{\"name\":\"parent\",\"kind\":\"object\",\"type\":\"Parent\",\"relationName\":\"ParentToUser\"},{\"name\":\"taskAttachments\",\"kind\":\"object\",\"type\":\"TaskAttachment\",\"relationName\":\"TaskAttachments\"},{\"name\":\"taskComments\",\"kind\":\"object\",\"type\":\"TaskComment\",\"relationName\":\"TaskComments\"},{\"name\":\"teacher\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"TeacherToUser\"},{\"name\":\"weeklyReports\",\"kind\":\"object\",\"type\":\"WeeklyReport\",\"relationName\":\"UserToWeeklyReport\"},{\"name\":\"receivedTasks\",\"kind\":\"object\",\"type\":\"WorkTask\",\"relationName\":\"TaskAssignee\"},{\"name\":\"assignedTasks\",\"kind\":\"object\",\"type\":\"WorkTask\",\"relationName\":\"TaskAssigner\"}],\"dbName\":null},\"Parent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ParentToUser\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"ParentStudentLink\",\"relationName\":\"ParentToParentStudentLink\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"ParentToSurveyForm\"}],\"dbName\":null},\"Teacher\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"teacherCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"teacherName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"homeroomClass\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dateOfBirth\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"departmentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mainSubjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mainSubjectRel\",\"kind\":\"object\",\"type\":\"Subject\",\"relationName\":\"teacherMainSubject\"},{\"name\":\"departmentRel\",\"kind\":\"object\",\"type\":\"Department\",\"relationName\":\"DepartmentToTeacher\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TeacherToUser\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToTeacher\"},{\"name\":\"classes\",\"kind\":\"object\",\"type\":\"TeacherClassAssignment\",\"relationName\":\"TeacherToTeacherClassAssignment\"},{\"name\":\"TeachingAssignment\",\"kind\":\"object\",\"type\":\"TeachingAssignment\",\"relationName\":\"TeacherToTeachingAssignment\"}],\"dbName\":null},\"Campus\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classes\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"CampusToClass\"},{\"name\":\"inputAssessmentPeriods\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"CampusToInputAssessmentPeriod\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"Student\",\"relationName\":\"CampusToStudent\"},{\"name\":\"summaries\",\"kind\":\"object\",\"type\":\"SummaryByCampus\",\"relationName\":\"CampusToSummaryByCampus\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"CampusToSurveyForm\"},{\"name\":\"teachers\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"CampusToTeacher\"}],\"dbName\":null},\"AcademicYear\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assessmentConfigs\",\"kind\":\"object\",\"type\":\"AssessmentConfig\",\"relationName\":\"AcademicYearToAssessmentConfig\"},{\"name\":\"classes\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"AcademicYearToClass\"},{\"name\":\"educationSystems\",\"kind\":\"object\",\"type\":\"EducationSystem\",\"relationName\":\"AcademicYearToEducationSystem\"},{\"name\":\"inputAssessmentPeriods\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"AcademicYearToInputAssessmentPeriod\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"Student\",\"relationName\":\"AcademicYearToStudent\"},{\"name\":\"subjectQuotas\",\"kind\":\"object\",\"type\":\"SubjectQuota\",\"relationName\":\"AcademicYearToSubjectQuota\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"AcademicYearToSurveyForm\"},{\"name\":\"surveyPeriods\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"AcademicYearToSurveyPeriod\"},{\"name\":\"teachingAssignments\",\"kind\":\"object\",\"type\":\"TeachingAssignment\",\"relationName\":\"AcademicYearToTeachingAssignment\"},{\"name\":\"weeklyReports\",\"kind\":\"object\",\"type\":\"WeeklyReport\",\"relationName\":\"AcademicYearToWeeklyReport\"},{\"name\":\"workTasks\",\"kind\":\"object\",\"type\":\"WorkTask\",\"relationName\":\"AcademicYearToWorkTask\"}],\"dbName\":null},\"Class\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"className\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"level\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grade\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"homeroomTeacherId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"educationSystem\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToClass\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToClass\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"Student\",\"relationName\":\"ClassToStudent\"},{\"name\":\"summaries\",\"kind\":\"object\",\"type\":\"SummaryByClass\",\"relationName\":\"ClassToSummaryByClass\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"ClassToSurveyForm\"},{\"name\":\"teachers\",\"kind\":\"object\",\"type\":\"TeacherClassAssignment\",\"relationName\":\"ClassToTeacherClassAssignment\"},{\"name\":\"teachingAssignments\",\"kind\":\"object\",\"type\":\"TeachingAssignment\",\"relationName\":\"ClassToTeachingAssignment\"}],\"dbName\":null},\"TeacherClassAssignment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"teacherId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roleInClass\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"class\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"ClassToTeacherClassAssignment\"},{\"name\":\"teacher\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"TeacherToTeacherClassAssignment\"}],\"dbName\":null},\"Student\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dateOfBirth\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"gender\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parents\",\"kind\":\"object\",\"type\":\"ParentStudentLink\",\"relationName\":\"ParentStudentLinkToStudent\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToStudent\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToStudent\"},{\"name\":\"class\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"ClassToStudent\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"StudentToSurveyForm\"}],\"dbName\":null},\"ParentStudentLink\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"relationship\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"student\",\"kind\":\"object\",\"type\":\"Student\",\"relationName\":\"ParentStudentLinkToStudent\"},{\"name\":\"parent\",\"kind\":\"object\",\"type\":\"Parent\",\"relationName\":\"ParentToParentStudentLink\"}],\"dbName\":null},\"SurveyPeriod\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusSummaries\",\"kind\":\"object\",\"type\":\"SummaryByCampus\",\"relationName\":\"SummaryByCampusToSurveyPeriod\"},{\"name\":\"classSummaries\",\"kind\":\"object\",\"type\":\"SummaryByClass\",\"relationName\":\"SummaryByClassToSurveyPeriod\"},{\"name\":\"systemSummaries\",\"kind\":\"object\",\"type\":\"SummarySystem\",\"relationName\":\"SummarySystemToSurveyPeriod\"},{\"name\":\"surveyForms\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"SurveyFormToSurveyPeriod\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToSurveyPeriod\"},{\"name\":\"questions\",\"kind\":\"object\",\"type\":\"SurveyQuestion\",\"relationName\":\"SurveyPeriodToSurveyQuestion\"}],\"dbName\":null},\"SurveySection\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"questions\",\"kind\":\"object\",\"type\":\"SurveyQuestion\",\"relationName\":\"SurveyQuestionToSurveySection\"}],\"dbName\":null},\"SurveyQuestion\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"questionText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sectionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"questionType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ratingScaleMin\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"ratingScaleMax\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"options\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"weight\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"isRequired\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"surveyPeriod\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"SurveyPeriodToSurveyQuestion\"},{\"name\":\"section\",\"kind\":\"object\",\"type\":\"SurveySection\",\"relationName\":\"SurveyQuestionToSurveySection\"},{\"name\":\"responses\",\"kind\":\"object\",\"type\":\"SurveyResponse\",\"relationName\":\"SurveyQuestionToSurveyResponse\"}],\"dbName\":null},\"SurveyForm\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"submissionDateTime\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"submittedByEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"overallAverageScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"npsScoreRaw\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"npsCategory\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriod\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"SurveyFormToSurveyPeriod\"},{\"name\":\"parent\",\"kind\":\"object\",\"type\":\"Parent\",\"relationName\":\"ParentToSurveyForm\"},{\"name\":\"student\",\"kind\":\"object\",\"type\":\"Student\",\"relationName\":\"StudentToSurveyForm\"},{\"name\":\"class\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"ClassToSurveyForm\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToSurveyForm\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToSurveyForm\"},{\"name\":\"responses\",\"kind\":\"object\",\"type\":\"SurveyResponse\",\"relationName\":\"SurveyFormToSurveyResponse\"}],\"dbName\":null},\"SurveyResponse\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"formId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"questionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"numericScore\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"textAnswer\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"choiceAnswer\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"calculatedWeightedScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"question\",\"kind\":\"object\",\"type\":\"SurveyQuestion\",\"relationName\":\"SurveyQuestionToSurveyResponse\"},{\"name\":\"form\",\"kind\":\"object\",\"type\":\"SurveyForm\",\"relationName\":\"SurveyFormToSurveyResponse\"}],\"dbName\":null},\"SummaryByClass\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"surveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"notSurveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"completionRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"averageSatisfactionScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"promoterCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"passiveCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"detractorCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"npsValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"class\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"ClassToSummaryByClass\"},{\"name\":\"surveyPeriod\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"SummaryByClassToSurveyPeriod\"}],\"dbName\":null},\"SummaryByCampus\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"surveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"notSurveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"completionRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"averageSatisfactionScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"promoterCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"passiveCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"detractorCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"npsValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToSummaryByCampus\"},{\"name\":\"surveyPeriod\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"SummaryByCampusToSurveyPeriod\"}],\"dbName\":null},\"SummarySystem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyPeriodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"surveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"notSurveyedStudents\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"completionRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"averageSatisfactionScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"promoterCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"passiveCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"detractorCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"npsValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"surveyPeriod\",\"kind\":\"object\",\"type\":\"SurveyPeriod\",\"relationName\":\"SummarySystemToSurveyPeriod\"}],\"dbName\":null},\"Notification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isRead\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"NotificationToUser\"}],\"dbName\":null},\"Subject\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studyPrograms\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"level\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"quotas\",\"kind\":\"object\",\"type\":\"SubjectQuota\",\"relationName\":\"SubjectToSubjectQuota\"},{\"name\":\"mainTeachers\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"teacherMainSubject\"},{\"name\":\"assignments\",\"kind\":\"object\",\"type\":\"TeachingAssignment\",\"relationName\":\"SubjectToTeachingAssignment\"}],\"dbName\":null},\"TeachingAssignment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"teacherId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"semester\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToTeachingAssignment\"},{\"name\":\"subject\",\"kind\":\"object\",\"type\":\"Subject\",\"relationName\":\"SubjectToTeachingAssignment\"},{\"name\":\"class\",\"kind\":\"object\",\"type\":\"Class\",\"relationName\":\"ClassToTeachingAssignment\"},{\"name\":\"teacher\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"TeacherToTeachingAssignment\"}],\"dbName\":null},\"SubjectQuota\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quota\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"quotaPrimary\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"quotaMiddle\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"quotaHigh\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToSubjectQuota\"},{\"name\":\"subject\",\"kind\":\"object\",\"type\":\"Subject\",\"relationName\":\"SubjectToSubjectQuota\"}],\"dbName\":null},\"Role\":{\"fields\":[{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isSystem\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"permissions\",\"kind\":\"object\",\"type\":\"Permission\",\"relationName\":\"PermissionToRole\"}],\"dbName\":null},\"Permission\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roleCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"module\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"canRead\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"canCreate\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"canUpdate\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"canDelete\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"role\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"PermissionToRole\"}],\"dbName\":null},\"WorkTask\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedToRole\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedToUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"progress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"month\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"staffNote\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"staffUpdatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"attachments\",\"kind\":\"object\",\"type\":\"TaskAttachment\",\"relationName\":\"TaskAttachmentToWorkTask\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"TaskComment\",\"relationName\":\"TaskCommentToWorkTask\"},{\"name\":\"assignedToUser\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TaskAssignee\"},{\"name\":\"assignedBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TaskAssigner\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToWorkTask\"}],\"dbName\":null},\"StudentAchievement\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"competitionCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"competitionName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"level\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grade\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"nature\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"organizingLevel\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"field\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recognition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"participationType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"TaskComment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TaskComments\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"WorkTask\",\"relationName\":\"TaskCommentToWorkTask\"}],\"dbName\":null},\"TaskAttachment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fileName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fileData\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fileSize\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"contentType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TaskAttachments\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"WorkTask\",\"relationName\":\"TaskAttachmentToWorkTask\"}],\"dbName\":null},\"InputAssessmentPeriod\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"campusId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"batches\",\"kind\":\"object\",\"type\":\"InputAssessmentBatch\",\"relationName\":\"InputAssessmentBatchToInputAssessmentPeriod\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToInputAssessmentPeriod\"},{\"name\":\"campus\",\"kind\":\"object\",\"type\":\"Campus\",\"relationName\":\"CampusToInputAssessmentPeriod\"},{\"name\":\"assignedUser\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PeriodAssignee\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"InputAssessmentStudent\",\"relationName\":\"InputAssessmentPeriodToInputAssessmentStudent\"},{\"name\":\"InputAssessmentTeacherAssignment\",\"kind\":\"object\",\"type\":\"InputAssessmentTeacherAssignment\",\"relationName\":\"InputAssessmentPeriodToInputAssessmentTeacherAssignment\"}],\"dbName\":null},\"InputAssessmentBatch\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"periodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batchNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"period\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"InputAssessmentBatchToInputAssessmentPeriod\"},{\"name\":\"students\",\"kind\":\"object\",\"type\":\"InputAssessmentStudent\",\"relationName\":\"InputAssessmentBatchToInputAssessmentStudent\"},{\"name\":\"InputAssessmentTeacherAssignment\",\"kind\":\"object\",\"type\":\"InputAssessmentTeacherAssignment\",\"relationName\":\"InputAssessmentBatchToInputAssessmentTeacherAssignment\"}],\"dbName\":null},\"WeeklyReport\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"weekNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"month\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"year\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"managerComment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToWeeklyReport\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWeeklyReport\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"WeeklyReportItem\",\"relationName\":\"WeeklyReportToWeeklyReportItem\"}],\"dbName\":null},\"WeeklyReportItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reportId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mainTask\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workContent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"progress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proposedSolution\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"managerNote\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"report\",\"kind\":\"object\",\"type\":\"WeeklyReport\",\"relationName\":\"WeeklyReportToWeeklyReportItem\"}],\"dbName\":null},\"InputAssessmentStudent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fullName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dateOfBirth\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"className\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicRating\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conductRating\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"admissionCriteria\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveySystem\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"targetType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"psychologyScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"writtenEnglishScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"oralEnglishScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"mathScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"literatureScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"periodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batchId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"signatureName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"surveyFormType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hocKy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kqHocTap\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kqRenLuyen\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kqgdTieuHoc\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grade\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hoSoCtQuocTe\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"admissionResult\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"directorNote\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batch\",\"kind\":\"object\",\"type\":\"InputAssessmentBatch\",\"relationName\":\"InputAssessmentBatchToInputAssessmentStudent\"},{\"name\":\"period\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"InputAssessmentPeriodToInputAssessmentStudent\"},{\"name\":\"scores\",\"kind\":\"object\",\"type\":\"StudentAssessmentScore\",\"relationName\":\"InputAssessmentStudentToStudentAssessmentScore\"}],\"dbName\":null},\"AssessmentGrade\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AssessmentSystem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AssessmentSubject\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scoreColumns\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"commentColumns\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"columnNames\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gradeMappings\",\"kind\":\"object\",\"type\":\"GradeSubjectMapping\",\"relationName\":\"AssessmentSubjectToGradeSubjectMapping\"},{\"name\":\"InputAssessmentTeacherAssignment\",\"kind\":\"object\",\"type\":\"InputAssessmentTeacherAssignment\",\"relationName\":\"AssessmentSubjectToInputAssessmentTeacherAssignment\"},{\"name\":\"studentScores\",\"kind\":\"object\",\"type\":\"StudentAssessmentScore\",\"relationName\":\"AssessmentSubjectToStudentAssessmentScore\"}],\"dbName\":null},\"EducationSystem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToEducationSystem\"}],\"dbName\":null},\"GradeSubjectMapping\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grade\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"educationSystem\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"subject\",\"kind\":\"object\",\"type\":\"AssessmentSubject\",\"relationName\":\"AssessmentSubjectToGradeSubjectMapping\"}],\"dbName\":null},\"AssessmentConfig\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"academicYearId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"academicYear\",\"kind\":\"object\",\"type\":\"AcademicYear\",\"relationName\":\"AcademicYearToAssessmentConfig\"}],\"dbName\":null},\"InputAssessmentTeacherAssignment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"periodId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batchId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grade\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"educationSystem\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unlockRequestStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unlockReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"subject\",\"kind\":\"object\",\"type\":\"AssessmentSubject\",\"relationName\":\"AssessmentSubjectToInputAssessmentTeacherAssignment\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"InputAssessmentTeacherAssignmentToUser\"},{\"name\":\"batch\",\"kind\":\"object\",\"type\":\"InputAssessmentBatch\",\"relationName\":\"InputAssessmentBatchToInputAssessmentTeacherAssignment\"},{\"name\":\"period\",\"kind\":\"object\",\"type\":\"InputAssessmentPeriod\",\"relationName\":\"InputAssessmentPeriodToInputAssessmentTeacherAssignment\"}],\"dbName\":null},\"Department\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"teachers\",\"kind\":\"object\",\"type\":\"Teacher\",\"relationName\":\"DepartmentToTeacher\"}],\"dbName\":null},\"StudentAssessmentScore\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subjectId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scores\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"comments\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"teacherId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"teacherName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"object\",\"type\":\"AssessmentSubject\",\"relationName\":\"AssessmentSubjectToStudentAssessmentScore\"},{\"name\":\"student\",\"kind\":\"object\",\"type\":\"InputAssessmentStudent\",\"relationName\":\"InputAssessmentStudentToStudentAssessmentScore\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

