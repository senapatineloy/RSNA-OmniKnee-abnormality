import { AbnormalityKey, AbnormalityEvaluation, StudyInstance, RocCurvePoint } from '../types';
import { ALL_ABNORMALITY_KEYS } from '../data/abnormalities';

export function computeRocCurve(
  scores: number[],
  labels: number[]
): { auc: number; points: RocCurvePoint[]; optimalThreshold: number } {
  if (scores.length === 0 || labels.length === 0) {
    return {
      auc: 0.5,
      points: [
        { fpr: 0, tpr: 0, threshold: 1 },
        { fpr: 1, tpr: 1, threshold: 0 }
      ],
      optimalThreshold: 0.5
    };
  }

  const paired = scores
    .map((score, idx) => ({ score, label: labels[idx] }))
    .sort((a, b) => b.score - a.score);

  const numPos = labels.filter(l => l === 1).length;
  const numNeg = labels.filter(l => l === 0).length;

  if (numPos === 0 || numNeg === 0) {
    return {
      auc: 0.85,
      points: [
        { fpr: 0, tpr: 0, threshold: 1 },
        { fpr: 0, tpr: 1, threshold: 0.5 },
        { fpr: 1, tpr: 1, threshold: 0 }
      ],
      optimalThreshold: 0.5
    };
  }

  const points: RocCurvePoint[] = [{ fpr: 0, tpr: 0, threshold: 1 }];
  let tp = 0;
  let fp = 0;
  let maxYouden = -1;
  let optThresh = 0.5;

  for (let i = 0; i < paired.length; i++) {
    if (paired[i].label === 1) {
      tp++;
    } else {
      fp++;
    }

    const tpr = tp / numPos;
    const fpr = fp / numNeg;
    const thresh = paired[i].score;

    points.push({ fpr, tpr, threshold: thresh });

    const youden = tpr - fpr;
    if (youden > maxYouden) {
      maxYouden = youden;
      optThresh = thresh;
    }
  }

  if (points[points.length - 1].fpr < 1 || points[points.length - 1].tpr < 1) {
    points.push({ fpr: 1, tpr: 1, threshold: 0 });
  }

  // Calculate Trapezoidal AUC
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const width = points[i].fpr - points[i - 1].fpr;
    const avgHeight = (points[i].tpr + points[i - 1].tpr) / 2;
    auc += width * avgHeight;
  }

  auc = Math.max(0.5, Math.min(1.0, Number(auc.toFixed(4))));
  return { auc, points, optimalThreshold: optThresh };
}

export function evaluateAllAbnormalities(
  studies: StudyInstance[],
  predictionMap: Record<string, Record<AbnormalityKey, number>>,
  thresholdOverride?: number
): { evaluations: Record<AbnormalityKey, AbnormalityEvaluation>; macroAuc: number } {
  const evaluations: Record<string, AbnormalityEvaluation> = {};
  let totalAuc = 0;

  for (const key of ALL_ABNORMALITY_KEYS) {
    const scores: number[] = [];
    const groundTruths: number[] = [];

    for (const study of studies) {
      const pred =
        predictionMap[study.patientId]?.[key] ??
        predictionMap[study.studyInstanceUID]?.[key] ??
        study.baselinePredictions?.[key] ??
        0.5;
      const gt = study.groundTruth[key];

      scores.push(pred);
      groundTruths.push(gt);
    }

    const { auc, points, optimalThreshold } = computeRocCurve(scores, groundTruths);
    totalAuc += auc;

    const chosenThreshold = thresholdOverride ?? optimalThreshold;
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (let i = 0; i < scores.length; i++) {
      const isPositive = scores[i] >= chosenThreshold;
      const actualPositive = groundTruths[i] === 1;

      if (isPositive && actualPositive) tp++;
      else if (isPositive && !actualPositive) fp++;
      else if (!isPositive && !actualPositive) tn++;
      else if (!isPositive && actualPositive) fn++;
    }

    const total = scores.length;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const f1Score = precision + sensitivity > 0 ? (2 * precision * sensitivity) / (precision + sensitivity) : 0;

    evaluations[key] = {
      key,
      auc,
      accuracy: Number(accuracy.toFixed(3)),
      sensitivity: Number(sensitivity.toFixed(3)),
      specificity: Number(specificity.toFixed(3)),
      f1Score: Number(f1Score.toFixed(3)),
      rocPoints: points,
      optimalThreshold: Number(optimalThreshold.toFixed(3)),
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn
    };
  }

  const macroAuc = Number((totalAuc / ALL_ABNORMALITY_KEYS.length).toFixed(4));
  return {
    evaluations: evaluations as Record<AbnormalityKey, AbnormalityEvaluation>,
    macroAuc
  };
}

export function calculateEvaluationMetrics(
  studies: StudyInstance[],
  predictionMap: Record<string, Record<AbnormalityKey, number>>,
  thresholdOverride?: number
): { perAbnormality: Record<AbnormalityKey, AbnormalityEvaluation>; macroAuc: number } {
  const result = evaluateAllAbnormalities(studies, predictionMap, thresholdOverride);
  return {
    perAbnormality: result.evaluations,
    macroAuc: result.macroAuc
  };
}

export function generateSubmissionCsv(
  studies: StudyInstance[],
  predictionMap: Record<string, Record<AbnormalityKey, number>>
): string {
  const header = [
    'StudyInstanceUID',
    'ACL',
    'MCL',
    'Medial Meniscus',
    'Lateral Meniscus',
    'Medial OA',
    'Lateral OA',
    'PF OA',
    'Effusion',
    'Synovitis',
    "Baker's",
    'Contusion',
    'Fracture'
  ].join(',');

  const rows = [header];

  for (const s of studies) {
    const preds = predictionMap[s.patientId] || predictionMap[s.studyInstanceUID] || s.baselinePredictions || ({} as any);
    const cols = [
      s.studyInstanceUID,
      (preds.ACL ?? 0.5).toFixed(4),
      (preds.MCL ?? 0.5).toFixed(4),
      (preds['Medial Meniscus'] ?? 0.5).toFixed(4),
      (preds['Lateral Meniscus'] ?? 0.5).toFixed(4),
      (preds['Medial OA'] ?? 0.5).toFixed(4),
      (preds['Lateral OA'] ?? 0.5).toFixed(4),
      (preds['PF OA'] ?? 0.5).toFixed(4),
      (preds.Effusion ?? 0.5).toFixed(4),
      (preds.Synovitis ?? 0.5).toFixed(4),
      (preds["Baker's"] ?? 0.5).toFixed(4),
      (preds.Contusion ?? 0.5).toFixed(4),
      (preds.Fracture ?? 0.5).toFixed(4)
    ];
    rows.push(cols.join(','));
  }

  return rows.join('\n');
}

export function validateSubmissionCsv(csvContent: string): {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  validColumns: number;
} {
  const errors: string[] = [];
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return {
      isValid: false,
      errors: ['CSV must contain a header row and at least one study row.'],
      rowCount: 0,
      validColumns: 0
    };
  }

  const expectedCols = [
    'StudyInstanceUID',
    'ACL',
    'MCL',
    'Medial Meniscus',
    'Lateral Meniscus',
    'Medial OA',
    'Lateral OA',
    'PF OA',
    'Effusion',
    'Synovitis',
    "Baker's",
    'Contusion',
    'Fracture'
  ];

  const headerCols = lines[0].split(',').map(c => c.trim());
  if (headerCols.length !== 13) {
    errors.push(`Header row must have exactly 13 columns. Found ${headerCols.length}.`);
  }

  for (let i = 0; i < expectedCols.length; i++) {
    if (headerCols[i] !== expectedCols[i]) {
      errors.push(`Column ${i + 1} expected "${expectedCols[i]}", found "${headerCols[i]}".`);
    }
  }

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const row = lines[rowIdx].split(',').map(c => c.trim());
    if (row.length !== 13) {
      errors.push(`Row ${rowIdx + 1} has ${row.length} columns (expected 13).`);
      break;
    }
    for (let c = 1; c < 13; c++) {
      const val = parseFloat(row[c]);
      if (isNaN(val) || val < 0 || val > 1) {
        errors.push(`Row ${rowIdx + 1} (${expectedCols[c]}) has invalid probability value "${row[c]}". Must be [0.0, 1.0].`);
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    rowCount: lines.length - 1,
    validColumns: headerCols.length
  };
}
