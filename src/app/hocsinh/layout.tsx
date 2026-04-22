import { GraduationCap } from "lucide-react"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Authentication is handled by each page via requireStudentSession()
  // which reads the hs_token cookie. Do NOT use NextAuth here.
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {children}
    </div>
  )
}