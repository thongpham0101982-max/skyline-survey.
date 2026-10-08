"use client"

import { useMemo } from "react"

export type CampusThemeType = "CS1" | "CS2" | "CS3" | "CS4" | "CS5" | "HILL" | "GLOBAL" | "STANDARD"

export interface CampusTheme {
  type: CampusThemeType
  code: string
  name: string
  shortName: string
  locationName: string
  tagline: string
  motto: string
  
  // Color Specifications
  primaryColor: string       // Màu chính
  accentColor: string        // Màu điểm nhấn
  darkColor: string          // Màu nền tối / header dark
  primaryHover: string
  accentHover: string
  
  // Background & Surface Tints
  lightBg: string            // Soft surface background
  lightAccentBg: string      // Light background for accents & badges
  borderSubtle: string
  borderAccent: string
  
  // Gradients for Header & Banners
  headerGradient: string
  heroBadgeGradient: string
  bannerGradient: string
  buttonGradient: string
  
  // Badge Styles
  campusBadge: {
    bg: string
    text: string
    border: string
    dotColor: string
  }
  
  // Quick Button Colors
  btnPrimaryStyle: string
  btnAccentStyle: string
}

export const CAMPUS_THEMES: Record<string, CampusTheme> = {
  // CS1: Sky-Line Riverside (Đà Nẵng)
  CS1: {
    type: "CS1",
    code: "CS1",
    name: "Sky-Line Riverside",
    shortName: "Riverside Campus",
    locationName: "Đà Nẵng",
    tagline: "Nơi khởi nguồn hạnh phúc & khát vọng vươn xa",
    motto: "Học để sống hạnh phúc ♡",
    
    primaryColor: "#00A19A",
    accentColor: "#48BFE3",
    darkColor: "#003B3A",
    primaryHover: "#008B85",
    accentHover: "#38A9CC",
    
    lightBg: "#F0FDFA",
    lightAccentBg: "#E6F7F5",
    borderSubtle: "rgba(0, 161, 154, 0.2)",
    borderAccent: "#00A19A",
    
    headerGradient: "linear-gradient(135deg, #003B3A 0%, #005B58 50%, #48BFE3 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #003B3A 0%, #00A19A 100%)",
    bannerGradient: "linear-gradient(135deg, #F0FDFA 0%, #E6F7F5 100%)",
    buttonGradient: "from-[#003B3A] to-[#00A19A]",
    
    campusBadge: {
      bg: "bg-[#00A19A]/10",
      text: "text-[#005B58]",
      border: "border-[#00A19A]/30",
      dotColor: "bg-[#00A19A]"
    },
    btnPrimaryStyle: "bg-[#00A19A] hover:bg-[#008B85] text-white shadow-[#00A19A]/25",
    btnAccentStyle: "bg-[#003B3A] hover:bg-[#002827] text-white shadow-[#003B3A]/25"
  },

  // CS2: Sky-Line Central (Đà Nẵng)
  CS2: {
    type: "CS2",
    code: "CS2",
    name: "Sky-Line Central",
    shortName: "Central Campus",
    locationName: "Đà Nẵng",
    tagline: "Năng động trung tâm, hội tụ tinh hoa tri thức",
    motto: "Sáng tạo & bứt phá giới hạn ♡",
    
    primaryColor: "#6C5CE7",
    accentColor: "#A29BFE",
    darkColor: "#2D1B69",
    primaryHover: "#5A49D8",
    accentHover: "#8E84F5",
    
    lightBg: "#F8F7FF",
    lightAccentBg: "#F0EEFE",
    borderSubtle: "rgba(108, 92, 231, 0.2)",
    borderAccent: "#6C5CE7",
    
    headerGradient: "linear-gradient(135deg, #2D1B69 0%, #4834D4 50%, #6C5CE7 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #2D1B69 0%, #6C5CE7 100%)",
    bannerGradient: "linear-gradient(135deg, #F8F7FF 0%, #F0EEFE 100%)",
    buttonGradient: "from-[#2D1B69] to-[#6C5CE7]",
    
    campusBadge: {
      bg: "bg-[#6C5CE7]/10",
      text: "text-[#5F27CD]",
      border: "border-[#6C5CE7]/30",
      dotColor: "bg-[#6C5CE7]"
    },
    btnPrimaryStyle: "bg-[#6C5CE7] hover:bg-[#5A49D8] text-white shadow-[#6C5CE7]/25",
    btnAccentStyle: "bg-[#2D1B69] hover:bg-[#1E1247] text-white shadow-[#2D1B69]/25"
  },

  // CS3: Sky-Line Global (Quốc tế)
  CS3: {
    type: "CS3",
    code: "CS3",
    name: "Sky-Line Global",
    shortName: "Global Campus",
    locationName: "Cơ sở Quốc Tế",
    tagline: "Hội nhập & Khát vọng toàn cầu",
    motto: "Niềm tin, sự tín nhiệm & lòng kiên định ♡",
    
    primaryColor: "#01A49D",
    accentColor: "#6E3D89",
    darkColor: "#2E1065",
    primaryHover: "#008B85",
    accentHover: "#593170",
    
    lightBg: "#FAF8FC",
    lightAccentBg: "#F5EFF9",
    borderSubtle: "rgba(110, 61, 137, 0.2)",
    borderAccent: "#6E3D89",
    
    headerGradient: "linear-gradient(135deg, #2E1065 0%, #6E3D89 50%, #01A49D 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #2E1065 0%, #6E3D89 100%)",
    bannerGradient: "linear-gradient(135deg, #FAF8FC 0%, #F5EFF9 100%)",
    buttonGradient: "from-[#2E1065] to-[#6E3D89]",
    
    campusBadge: {
      bg: "bg-[#6E3D89]/10",
      text: "text-[#6E3D89]",
      border: "border-[#6E3D89]/30",
      dotColor: "bg-[#6E3D89]"
    },
    btnPrimaryStyle: "bg-[#01A49D] hover:bg-[#008B85] text-white shadow-[#01A49D]/25",
    btnAccentStyle: "bg-[#6E3D89] hover:bg-[#593170] text-white shadow-[#6E3D89]/25"
  },

  // CS4: Sky-Line Hill (Hội An - Điện Ngọc)
  CS4: {
    type: "CS4",
    code: "CS4",
    name: "Sky-Line Hill",
    shortName: "Hill Campus",
    locationName: "Hội An - Điện Ngọc",
    tagline: "Ngôi trường sinh thái trên đồi",
    motto: "Nơi khởi nguồn hạnh phúc & đam mê khám phá ♡",
    
    primaryColor: "#AE882E",
    accentColor: "#01A49D",
    darkColor: "#003B3A",
    primaryHover: "#937326",
    accentHover: "#008B85",
    
    lightBg: "#FDFBF7",
    lightAccentBg: "#FEF9EE",
    borderSubtle: "rgba(174, 136, 46, 0.2)",
    borderAccent: "#AE882E",
    
    headerGradient: "linear-gradient(135deg, #003B3A 0%, #01A49D 55%, #AE882E 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #01A49D 0%, #AE882E 100%)",
    bannerGradient: "linear-gradient(135deg, #FDFBF7 0%, #FEF7E6 100%)",
    buttonGradient: "from-[#003B3A] to-[#AE882E]",
    
    campusBadge: {
      bg: "bg-[#AE882E]/10",
      text: "text-[#AE882E]",
      border: "border-[#AE882E]/30",
      dotColor: "bg-[#AE882E]"
    },
    btnPrimaryStyle: "bg-[#AE882E] hover:bg-[#937326] text-white shadow-[#AE882E]/25",
    btnAccentStyle: "bg-[#003B3A] hover:bg-[#002827] text-white shadow-[#003B3A]/25"
  },

  // CS5: Sky-Line Beach (Đà Nẵng)
  CS5: {
    type: "CS5",
    code: "CS5",
    name: "Sky-Line Beach",
    shortName: "Beach Campus",
    locationName: "Liên Chiểu - Đà Nẵng",
    tagline: "Vươn mình cùng sóng biển, hướng tới tương lai",
    motto: "Tự tin, chủ động & hội nhập ♡",
    
    primaryColor: "#0284C7",
    accentColor: "#38BDF8",
    darkColor: "#0C4A6E",
    primaryHover: "#0369A1",
    accentHover: "#0284C7",
    
    lightBg: "#F0F9FF",
    lightAccentBg: "#E0F2FE",
    borderSubtle: "rgba(2, 132, 199, 0.2)",
    borderAccent: "#0284C7",
    
    headerGradient: "linear-gradient(135deg, #0C4A6E 0%, #0284C7 50%, #38BDF8 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)",
    bannerGradient: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
    buttonGradient: "from-[#0C4A6E] to-[#0284C7]",
    
    campusBadge: {
      bg: "bg-[#0284C7]/10",
      text: "text-[#0369A1]",
      border: "border-[#0284C7]/30",
      dotColor: "bg-[#0284C7]"
    },
    btnPrimaryStyle: "bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-[#0284C7]/25",
    btnAccentStyle: "bg-[#0C4A6E] hover:bg-[#083344] text-white shadow-[#0C4A6E]/25"
  },

  // Aliases for backward compatibility
  HILL: null as any,
  GLOBAL: null as any,
  STANDARD: null as any
}

// Map aliases
CAMPUS_THEMES.HILL = CAMPUS_THEMES.CS4
CAMPUS_THEMES.GLOBAL = CAMPUS_THEMES.CS3
CAMPUS_THEMES.STANDARD = CAMPUS_THEMES.CS1

/**
 * Determine campus theme from campus code, campus name or class name
 * Nhận diện chính xác 5 cơ sở Sky-Line:
 * - CS1: Sky-Line Riverside
 * - CS2: Sky-Line Central
 * - CS3: Sky-Line Global (Quốc tế)
 * - CS4: Sky-Line Hill (Hội An / Điện Ngọc)
 * - CS5: Sky-Line Beach
 */
export function resolveCampusTheme(campusCodeOrName?: string | null): CampusTheme {
  if (!campusCodeOrName) return CAMPUS_THEMES.CS1
  
  const text = campusCodeOrName.toLowerCase().trim()

  // 1. CS4 - Sky-Line Hill (Hội An / Điện Ngọc)
  if (
    text.includes("cs4") ||
    text.includes("cs 4") ||
    text.includes("cs_4") ||
    text.includes("cs-4") ||
    text.includes("cơ sở 4") ||
    text.includes("co so 4") ||
    text.includes("hill") ||
    text.includes("hội an") ||
    text.includes("hoi an") ||
    text.includes("đồi") ||
    text.includes("doi") ||
    text.includes("dien ngoc") ||
    text.includes("điện ngọc")
  ) {
    return CAMPUS_THEMES.CS4
  }

  // 2. CS3 - Sky-Line Global (Quốc Tế)
  if (
    text.includes("cs3") ||
    text.includes("cs 3") ||
    text.includes("cs_3") ||
    text.includes("cs-3") ||
    text.includes("cơ sở 3") ||
    text.includes("co so 3") ||
    text.includes("global") ||
    text.includes("quốc tế") ||
    text.includes("quoc te") ||
    text.includes("international")
  ) {
    return CAMPUS_THEMES.CS3
  }

  // 3. CS2 - Sky-Line Central
  if (
    text.includes("cs2") ||
    text.includes("cs 2") ||
    text.includes("cs_2") ||
    text.includes("cs-2") ||
    text.includes("cơ sở 2") ||
    text.includes("co so 2") ||
    text.includes("central") ||
    text.includes("trung tâm") ||
    text.includes("trung tam")
  ) {
    return CAMPUS_THEMES.CS2
  }

  // 4. CS5 - Sky-Line Beach
  if (
    text.includes("cs5") ||
    text.includes("cs 5") ||
    text.includes("cs_5") ||
    text.includes("cs-5") ||
    text.includes("cơ sở 5") ||
    text.includes("co so 5") ||
    text.includes("beach") ||
    text.includes("biển") ||
    text.includes("bien") ||
    text.includes("liên chiểu") ||
    text.includes("lien chieu")
  ) {
    return CAMPUS_THEMES.CS5
  }

  // 5. CS1 - Sky-Line Riverside (hoặc mặc định)
  if (
    text.includes("cs1") ||
    text.includes("cs 1") ||
    text.includes("cs_1") ||
    text.includes("cs-1") ||
    text.includes("cơ sở 1") ||
    text.includes("co so 1") ||
    text.includes("riverside")
  ) {
    return CAMPUS_THEMES.CS1
  }

  return CAMPUS_THEMES.CS1
}

/**
 * Hook to get campus theme dynamically
 */
export function useCampusTheme(campusCodeOrName?: string | null) {
  return useMemo(() => resolveCampusTheme(campusCodeOrName), [campusCodeOrName])
}
