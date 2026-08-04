/**
 * Utility for sorting Vietnamese names according to standard Vietnamese alphabetical rules:
 * - Primary sort: Tên (Given Name - last word of full name) using 'vi-VN' locale.
 * - Secondary sort: Họ và Tên đệm (Family & Middle Name - preceding words) using 'vi-VN' locale.
 */

export function getVietnameseSortKey(fullName: string): string {
  if (!fullName) return ""
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[parts.length - 1] || ""
  const middleAndLastName = parts.slice(0, parts.length - 1).join(" ")
  return `${firstName.toLowerCase()} | ${middleAndLastName.toLowerCase()}`
}

export function compareVietnameseNames(nameA: string, nameB: string): number {
  const strA = nameA || ""
  const strB = nameB || ""
  
  const partsA = strA.trim().split(/\s+/)
  const partsB = strB.trim().split(/\s+/)
  
  const firstNameA = partsA[partsA.length - 1] || ""
  const firstNameB = partsB[partsB.length - 1] || ""
  
  // Compare Tên (Given Name) first
  const firstCmp = firstNameA.localeCompare(firstNameB, "vi-VN", { sensitivity: "base" })
  if (firstCmp !== 0) return firstCmp
  
  // If Tên is identical, compare Họ và Tên đệm (Family & Middle Name)
  const restA = partsA.slice(0, partsA.length - 1).join(" ")
  const restB = partsB.slice(0, partsB.length - 1).join(" ")
  return restA.localeCompare(restB, "vi-VN", { sensitivity: "base" })
}

export function sortVietnameseStudents<T>(
  students: T[],
  getName: (s: T) => string = (s: any) => s.studentName || s.fullName || ""
): T[] {
  return [...students].sort((a, b) => compareVietnameseNames(getName(a), getName(b)))
}
