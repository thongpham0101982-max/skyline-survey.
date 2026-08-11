import { prisma } from './db'

export async function getDefaultAcademicYear(prismaClient) {
  const db = prismaClient || prisma;
  
  // Try to read the selected year from the cookie first using dynamic require to avoid client bundling errors
  try {
    if (typeof window === 'undefined') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      const cookieYearId = cookieStore.get('selectedAcademicYear')?.value;
      
      if (cookieYearId) {
        const year = await db.academicYear.findUnique({
          where: { id: cookieYearId }
        });
        if (year) return year;
      }
    }
  } catch (error) {
    // cookies() can throw in non-request contexts or static pre-renders
  }

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

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("selectedAcademicYear");
    if (stored) {
      const year = years.find(y => y.id === stored);
      if (year) return year;
    }
  }

  return years.find(y => y.status === 'ACTIVE' && !y.isOff) 
    || years.find(y => !y.isOff) 
    || years[0];
}
