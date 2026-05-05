import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  const pAny = prisma as any;
  const results: any = {};
  
  try { results.academicYear = await pAny.academicYear.findMany({ take: 1 }); } catch (e: any) { results.academicYear = { error: e.message }; }
  try { results.campus = await pAny.campus.findMany({ take: 1 }); } catch (e: any) { results.campus = { error: e.message }; }
  try { results.user = await pAny.user.findMany({ take: 1, select: { id: true } }); } catch (e: any) { results.user = { error: e.message }; }
  try { results.assessmentSubject = await pAny.assessmentSubject.findMany({ take: 1 }); } catch (e: any) { results.assessmentSubject = { error: e.message }; }
  try { results.assessmentConfig = await pAny.assessmentConfig.findMany({ take: 1 }); } catch (e: any) { results.assessmentConfig = { error: e.message }; }
  try { results.department = await pAny.department.findMany({ take: 1 }); } catch (e: any) { results.department = { error: e.message }; }
  try { results.teacher = await pAny.teacher.findMany({ take: 1 }); } catch (e: any) { results.teacher = { error: e.message }; }
  try { results.activeYear = await pAny.academicYear.findFirst({ where: { status: "ACTIVE" }, include: { educationSystems: true } }); } catch (e: any) { results.activeYear = { error: e.message }; }
  
  return NextResponse.json(results);
}
