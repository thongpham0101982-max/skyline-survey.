export type TaskPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW"
export type TaskStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "OVERDUE" | "CANCELLED"
export type SourceModule = "DU_GIO" | "CO_VAN" | "PHHS" | "HO_TRO" | "TRAI_NGHIEM" | "KHAO_THI" | "CONG_TAC"

export interface SSMTask {
  taskId: string
  taskType: string
  sourceModule: SourceModule
  sourceId: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  deadline: string
  deadlineDate?: string
  assignedUserId: string
  deepLink: string
  createdAt: string
  completedAt?: string | null
  metadata?: {
    moduleLabel?: string
    badgeColor?: string
    studentName?: string
    className?: string
    subjectName?: string
    [key: string]: any
  }
}

export interface TaskSummaryCounts {
  today: number
  thisWeek: number
  overdue: number
  completed: number
  byModule: Record<SourceModule, number>
}
