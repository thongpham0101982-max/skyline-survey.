
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
