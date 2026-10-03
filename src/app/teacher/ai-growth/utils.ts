export const LEVEL_TIERS = [
  { level: 1, name: "Người Khởi Động", icon: "🌱", minXp: 0, maxXp: 299 },
  { level: 2, name: "Người Gieo Hạt", icon: "🌿", minXp: 300, maxXp: 799 },
  { level: 3, name: "Bậc Thầy Sáng Tạo", icon: "🌟", minXp: 800, maxXp: 1599 },
  { level: 4, name: "Đại Sứ Đổi Mới", icon: "👑", minXp: 1600, maxXp: 99999 }
];

export function calculateLevelFromPoints(points: number) {
  const currentTier = LEVEL_TIERS.find(t => points >= t.minXp && points <= t.maxXp) || LEVEL_TIERS[0];
  const nextTier = LEVEL_TIERS.find(t => t.level === currentTier.level + 1) || null;
  const progressPercent = nextTier 
    ? Math.min(100, Math.max(0, Math.round(((points - currentTier.minXp) / (nextTier.minXp - currentTier.minXp)) * 100)))
    : 100;
  return {
    level: currentTier.level,
    levelName: currentTier.name,
    levelIcon: currentTier.icon,
    currentPoints: points,
    nextLevelPoints: nextTier ? nextTier.minXp : currentTier.maxXp,
    progressPercent,
    pointsNeeded: nextTier ? Math.max(0, nextTier.minXp - points) : 0
  };
}
