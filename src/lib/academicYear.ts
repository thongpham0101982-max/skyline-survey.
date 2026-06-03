import { prisma } from './db'

export async function getDefaultAcademicYear(prismaClient) {
  const db = prismaClient || prisma;
  try {
    const years = await db.academicYear.findMany({
      orderBy: { startDate: 'desc' }
    });
    
    if (!years || years.length === 0) return null;
    
    return years.find(y => y.status === 'ACTIVE' && !y.isOff) 
      || years.find(y => !y.isOff) 
      || years[0];
  } catch (error) {
    console.error('Error in getDefaultAcademicYear:', error);
    return null;
  }
}

export function getDefaultAcademicYearClient(years) {
  if (!years || years.length === 0) return null;
  return years.find(y => y.status === 'ACTIVE' && !y.isOff) 
    || years.find(y => !y.isOff) 
    || years[0];
}
