import {
  AttendanceStatus,
  CriterionConfig,
  EvalLevel,
  FormulaType,
  MandatoryRule,
  ResultRating,
  ThresholdConfig
} from './types';
import { DEFAULT_THRESHOLDS } from './constants';

export interface CalculationResult {
  percentage: number | null;
  rating: ResultRating;
  isMandatoryRestricted: boolean;
  restrictionReason?: string;
  isCompleted: boolean;
}

export function parseDbJson<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function calculateStudentResult(params: {
  attendance?: string;
  evalMode?: string;
  criteriaConfig?: any[];
  criteriaScores?: Record<string, number>;
  formulaType?: string;
  thresholds?: { outstanding?: number; good?: number; pass?: number };
  mandatoryRules?: any[];
}): CalculationResult {
  const {
    attendance = 'PRESENT',
    evalMode = 'CRITERIA',
    criteriaConfig = [],
    criteriaScores = {},
    formulaType = 'EQUAL_WEIGHT',
    thresholds = { outstanding: 85, good: 70, pass: 50 },
    mandatoryRules = []
  } = params;

  if (attendance === 'ABSENT_PERMITTED' || attendance === 'ABSENT_UNPERMITTED' || attendance === 'NOT_PARTICIPATED' || attendance === 'NOT_ATTENDED') {
    return {
      percentage: null,
      rating: 'NOT_PARTICIPATED' as ResultRating,
      isMandatoryRestricted: false,
      isCompleted: true
    };
  }

  if (attendance === 'EXEMPTED' || attendance === 'EXEMPT') {
    return {
      percentage: null,
      rating: 'EXEMPTED' as ResultRating,
      isMandatoryRestricted: false,
      isCompleted: true
    };
  }

  if (evalMode === 'PARTICIPATION_ONLY') {
    return {
      percentage: 100,
      rating: 'PARTICIPATED' as ResultRating,
      isMandatoryRestricted: false,
      isCompleted: true
    };
  }

  if (!criteriaConfig || criteriaConfig.length === 0) {
    return {
      percentage: 100,
      rating: 'PARTICIPATED' as ResultRating,
      isMandatoryRestricted: false,
      isCompleted: true
    };
  }

  // Check how many criteria evaluated
  const scoredKeys = Object.keys(criteriaScores).filter(k => Number(criteriaScores[k]) > 0);
  if (scoredKeys.length === 0) {
    return {
      percentage: null,
      rating: 'CHUA_DANH_GIA' as ResultRating,
      isMandatoryRestricted: false,
      isCompleted: false
    };
  }

  let calculatedPercent = 0;

  if (formulaType === 'WEIGHTED') {
    const totalWeight = criteriaConfig.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) || 100;
    let weightedSum = 0;
    criteriaConfig.forEach(c => {
      const score = Number(criteriaScores[c.id]) || 0;
      const weight = Number(c.weight) || 0;
      if (score > 0) {
        weightedSum += (score / 4) * (weight / totalWeight) * 100;
      }
    });
    calculatedPercent = Math.round(weightedSum);
  } else {
    // EQUAL WEIGHT
    let totalScore = 0;
    let totalMaxScore = criteriaConfig.length * 4;
    criteriaConfig.forEach(c => {
      totalScore += Number(criteriaScores[c.id]) || 0;
    });
    calculatedPercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  }

  const outThresh = thresholds.outstanding ?? 85;
  const goodThresh = thresholds.good ?? 70;
  const passThresh = thresholds.pass ?? 50;

  let baseRating: ResultRating = 'NEEDS_SUPPORT';
  if (calculatedPercent >= outThresh) {
    baseRating = 'OUTSTANDING';
  } else if (calculatedPercent >= goodThresh) {
    baseRating = 'GOOD';
  } else if (calculatedPercent >= passThresh) {
    baseRating = 'PASS';
  } else {
    baseRating = 'NEEDS_SUPPORT';
  }

  // Check mandatory rules capping
  let isRestricted = false;
  let reason: string | undefined;

  for (const rule of mandatoryRules) {
    const score = Number(criteriaScores[rule.criterionId]) || 0;
    if (score <= (rule.ifLevelLessThanOrEqual ?? 1)) {
      if (rule.maxAllowedRating === 'PASS' && (baseRating === 'OUTSTANDING' || baseRating === 'GOOD')) {
        baseRating = 'PASS';
        isRestricted = true;
        reason = rule.reason || 'B? gi?i h?n do ti�u ch� b?t bu?c ch�a �?t';
      } else if (rule.maxAllowedRating === 'NEEDS_SUPPORT' && baseRating !== 'NEEDS_SUPPORT') {
        baseRating = 'NEEDS_SUPPORT';
        isRestricted = true;
        reason = rule.reason || 'B? gi?i h?n do ti�u ch� b?t bu?c';
      }
    }
  }

  const isCompleted = scoredKeys.length === criteriaConfig.length;

  return {
    percentage: calculatedPercent,
    rating: baseRating,
    isMandatoryRestricted: isRestricted,
    restrictionReason: reason,
    isCompleted
  };
}

export function getRatingBadgeProps(rating: string | ResultRating) {
  switch (rating) {
    case 'OUTSTANDING':
    case 'NOI_BAT':
    case 'XS':
      return {
        label: 'N?i b?t',
        containerCls: 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs font-black',
        color: '#9333EA'
      };
    case 'GOOD':
    case 'TOT':
    case 'TO':
      return {
        label: 'T?t',
        containerCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-black',
        color: '#059669'
      };
    case 'PASS':
    case 'DAT':
    case 'DA':
      return {
        label: '�?t',
        containerCls: 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs font-black',
        color: '#0284C7'
      };
    case 'NEEDS_SUPPORT':
    case 'CAN_HO_TRO':
    case 'KDA':
      return {
        label: 'C?n h? tr?',
        containerCls: 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs font-black',
        color: '#D97706'
      };
    case 'PARTICIPATED':
    case 'THAM_GIA':
      return {
        label: 'Tham gia',
        containerCls: 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs font-black',
        color: '#0D9488'
      };
    case 'NOT_PARTICIPATED':
    case 'KHONG_THAM_GIA':
      return {
        label: 'Kh�ng tham gia',
        containerCls: 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs font-bold',
        color: '#E11D48'
      };
    case 'EXEMPTED':
    case 'MIEN':
      return {
        label: 'Mi?n',
        containerCls: 'bg-slate-100 text-slate-600 border-slate-300 shadow-2xs font-bold',
        color: '#64748B'
      };
    default:
      return {
        label: 'Ch�a ��nh gi�',
        containerCls: 'bg-slate-100 text-slate-500 border-slate-200 font-bold',
        color: '#94A3B8'
      };
  }
}

export function getRatingLabel(rating: string | ResultRating) {
  return getRatingBadgeProps(rating).label;
}
