// @ts-nocheck
import { prisma } from './db';
import { getCachedAcademicYears } from './cache/reference-cache';

export async function getDefaultAcademicYear(prismaClient) {
  const db = prismaClient || prisma;

  let cookieYearId;
  try {
    if (typeof window === 'undefined') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      cookieYearId = cookieStore.get('selectedAcademicYear')?.value;
    }
  } catch (error) {}

  try {
    const years = await getCachedAcademicYears(db);

    if (!years || years.length === 0) return null;

    if (cookieYearId) {
      const matched = years.find(y => y.id === cookieYearId);
      if (matched) return matched;
    }

    return years.find(y => y.status === 'ACTIVE' && !y.isOff)
      || years.find(y => !y.isOff)
      || years[0];
  } catch (error) {
    console.error('Error in getDefaultAcademicYear:', error);
    return null;
  }
}

export function getDefaultAcademicYearClient(years) {
  if (!years || !Array.isArray(years) || years.length === 0) return null;

  return years.find(y => y && y.status === 'ACTIVE' && !y.isOff)
    || years.find(y => y && !y.isOff)
    || years[0]
    || null;
}
