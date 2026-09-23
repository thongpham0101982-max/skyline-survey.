"use client"

import { useMemo } from "react"

export type CampusThemeType = "HILL" | "GLOBAL" | "STANDARD"

export interface CampusTheme {
  type: CampusThemeType
  code: string
  name: string
  shortName: string
  locationName: string
  tagline: string
  motto: string
  
  // Color Specifications
  primaryColor: string       // Teal (#01A49D for Hill/Global, #00A19A for Standard)
  accentColor: string        // Gold (#AE882E for Hill) / Violet (#6E3D89 for Global) / Deep Pine (#003B3A for Standard)
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

export const CAMPUS_THEMES: Record<CampusThemeType, CampusTheme> = {
  HILL: {
    type: "HILL",
    code: "HILL",
    name: "Sky-Line Hill",
    shortName: "Hill Campus",
    locationName: "Hội An - Điện Ngọc",
    tagline: "Ngôi trường sinh thái trên đồi",
    motto: "Nơi khởi nguồn hạnh phúc & đam mê khám phá ♡",
    
    // Official Hill Colors (C79 M12 Y44 K0 & C31 M42 Y100 K7)
    primaryColor: "#01A49D",
    accentColor: "#AE882E",
    primaryHover: "#008B85",
    accentHover: "#937326",
    
    lightBg: "#FDFBF7",
    lightAccentBg: "#FEF9EE",
    borderSubtle: "rgba(174, 136, 46, 0.2)",
    borderAccent: "#AE882E",
    
    headerGradient: "linear-gradient(135deg, #003B3A 0%, #01A49D 55%, #AE882E 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #01A49D 0%, #AE882E 100%)",
    bannerGradient: "linear-gradient(135deg, #FDFBF7 0%, #FEF7E6 100%)",
    
    campusBadge: {
      bg: "bg-[#AE882E]/10",
      text: "text-[#AE882E]",
      border: "border-[#AE882E]/30",
      dotColor: "bg-[#AE882E]"
    },
    btnPrimaryStyle: "bg-[#01A49D] hover:bg-[#008B85] text-white shadow-[#01A49D]/25",
    btnAccentStyle: "bg-[#AE882E] hover:bg-[#937326] text-white shadow-[#AE882E]/25"
  },
  
  GLOBAL: {
    type: "GLOBAL",
    code: "GLOBAL",
    name: "Sky-Line Global",
    shortName: "Global Campus",
    locationName: "Cơ sở Quốc Tế",
    tagline: "Hội nhập & Khát vọng toàn cầu",
    motto: "Niềm tin, sự tín nhiệm & lòng kiên định ♡",
    
    // Official Global Colors (C84 M13 Y46 K0 & C69 M91 Y11 K1)
    primaryColor: "#01A49D",
    accentColor: "#6E3D89",
    primaryHover: "#008B85",
    accentHover: "#593170",
    
    lightBg: "#FAF8FC",
    lightAccentBg: "#F5EFF9",
    borderSubtle: "rgba(110, 61, 137, 0.2)",
    borderAccent: "#6E3D89",
    
    headerGradient: "linear-gradient(135deg, #003B3A 0%, #01A49D 50%, #6E3D89 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #01A49D 0%, #6E3D89 100%)",
    bannerGradient: "linear-gradient(135deg, #FAF8FC 0%, #F5EFF9 100%)",
    
    campusBadge: {
      bg: "bg-[#6E3D89]/10",
      text: "text-[#6E3D89]",
      border: "border-[#6E3D89]/30",
      dotColor: "bg-[#6E3D89]"
    },
    btnPrimaryStyle: "bg-[#01A49D] hover:bg-[#008B85] text-white shadow-[#01A49D]/25",
    btnAccentStyle: "bg-[#6E3D89] hover:bg-[#593170] text-white shadow-[#6E3D89]/25"
  },
  
  STANDARD: {
    type: "STANDARD",
    code: "SYSTEM",
    name: "Sky-Line Education",
    shortName: "Riverside / Toàn Hệ Thống",
    locationName: "Đà Nẵng",
    tagline: "Học để sống hạnh phúc",
    motto: "Nơi khởi nguồn hạnh phúc ♡",
    
    // Official Standard Brand Colors (C84 M13 Y46 K0 & Deep Pine)
    primaryColor: "#00A19A",
    accentColor: "#003B3A",
    primaryHover: "#008B85",
    accentHover: "#002827",
    
    lightBg: "#F0FDFA",
    lightAccentBg: "#E6F7F5",
    borderSubtle: "rgba(0, 161, 154, 0.2)",
    borderAccent: "#00A19A",
    
    headerGradient: "linear-gradient(135deg, #003B3A 0%, #00736E 50%, #00A19A 100%)",
    heroBadgeGradient: "linear-gradient(135deg, #003B3A 0%, #00A19A 100%)",
    bannerGradient: "linear-gradient(135deg, #F0FDFA 0%, #E6F7F5 100%)",
    
    campusBadge: {
      bg: "bg-[#00A19A]/10",
      text: "text-[#00736E]",
      border: "border-[#00A19A]/30",
      dotColor: "bg-[#00A19A]"
    },
    btnPrimaryStyle: "bg-[#00A19A] hover:bg-[#008B85] text-white shadow-[#00A19A]/25",
    btnAccentStyle: "bg-[#003B3A] hover:bg-[#002827] text-white shadow-[#003B3A]/25"
  }
}

/**
 * Determine campus theme from campus code or name
 */
export function resolveCampusTheme(campusCodeOrName?: string | null): CampusTheme {
  if (!campusCodeOrName) return CAMPUS_THEMES.STANDARD
  
  const text = campusCodeOrName.toLowerCase()
  if (text.includes("hill") || text.includes("hội an") || text.includes("đồi") || text.includes("dien ngoc")) {
    return CAMPUS_THEMES.HILL
  }
  if (text.includes("global") || text.includes("quốc tế") || text.includes("international")) {
    return CAMPUS_THEMES.GLOBAL
  }
  return CAMPUS_THEMES.STANDARD
}

/**
 * Hook to get campus theme dynamically
 */
export function useCampusTheme(campusCodeOrName?: string | null) {
  return useMemo(() => resolveCampusTheme(campusCodeOrName), [campusCodeOrName])
}
