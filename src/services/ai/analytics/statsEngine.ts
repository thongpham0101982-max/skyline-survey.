/**
 * Deterministic Analytics Engine for SSM AI Assistant
 * Provides mathematical and statistical precision for scores and distributions.
 */

export interface BasicStats {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  min: number;
  max: number;
}

export interface BenchmarkDistribution {
  total: number;
  aboveBenchmarkCount: number;
  aboveBenchmarkRate: number; // percentage 0-100
  atBenchmarkCount: number;
  atBenchmarkRate: number;
  belowBenchmarkCount: number;
  belowBenchmarkRate: number;
  benchmarkScore: number;
}

export function calcMean(scores: number[]): number {
  if (!scores.length) return 0;
  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / scores.length).toFixed(2));
}

export function calcMedian(scores: number[]): number {
  if (!scores.length) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

export function calcMode(scores: number[]): number[] {
  if (!scores.length) return [];
  const freqMap = new Map<number, number>();
  let maxFreq = 0;

  scores.forEach(score => {
    const freq = (freqMap.get(score) || 0) + 1;
    freqMap.set(score, freq);
    if (freq > maxFreq) {
      maxFreq = freq;
    }
  });

  if (maxFreq <= 1 && scores.length > 1) {
    return []; // No distinct mode
  }

  const modes: number[] = [];
  freqMap.forEach((freq, score) => {
    if (freq === maxFreq) {
      modes.push(score);
    }
  });

  return modes.sort((a, b) => a - b);
}

export function calcStdDev(scores: number[]): number {
  if (scores.length <= 1) return 0;
  const mean = calcMean(scores);
  const variance = scores.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (scores.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

export function calcMinMax(scores: number[]): { min: number; max: number } {
  if (!scores.length) return { min: 0, max: 0 };
  return {
    min: Math.min(...scores),
    max: Math.max(...scores)
  };
}

export function calcPercentiles(scores: number[], percentiles: number[] = [25, 50, 75, 90]): Record<number, number> {
  if (!scores.length) return {};
  const sorted = [...scores].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  percentiles.forEach(p => {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      result[p] = sorted[lower];
    } else {
      result[p] = Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2));
    }
  });

  return result;
}

export function calcBasicStats(scores: number[]): BasicStats {
  const count = scores.length;
  if (!count) {
    return { count: 0, mean: 0, median: 0, mode: [], stdDev: 0, min: 0, max: 0 };
  }
  const minMax = calcMinMax(scores);
  return {
    count,
    mean: calcMean(scores),
    median: calcMedian(scores),
    mode: calcMode(scores),
    stdDev: calcStdDev(scores),
    min: minMax.min,
    max: minMax.max
  };
}

export function calcBenchmarkDistribution(scores: number[], benchmarkScore: number = 6.0): BenchmarkDistribution {
  const total = scores.length;
  if (!total) {
    return {
      total: 0,
      aboveBenchmarkCount: 0,
      aboveBenchmarkRate: 0,
      atBenchmarkCount: 0,
      atBenchmarkRate: 0,
      belowBenchmarkCount: 0,
      belowBenchmarkRate: 0,
      benchmarkScore
    };
  }

  let above = 0;
  let at = 0;
  let below = 0;

  scores.forEach(s => {
    if (s > benchmarkScore) {
      above++;
    } else if (s === benchmarkScore) {
      at++;
    } else {
      below++;
    }
  });

  return {
    total,
    aboveBenchmarkCount: above,
    aboveBenchmarkRate: Number(((above / total) * 100).toFixed(1)),
    atBenchmarkCount: at,
    atBenchmarkRate: Number(((at / total) * 100).toFixed(1)),
    belowBenchmarkCount: below,
    belowBenchmarkRate: Number(((below / total) * 100).toFixed(1)),
    benchmarkScore
  };
}
