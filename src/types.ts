export type AbnormalityKey =
  | 'ACL'
  | 'MCL'
  | 'Medial Meniscus'
  | 'Lateral Meniscus'
  | 'Medial OA'
  | 'Lateral OA'
  | 'PF OA'
  | 'Effusion'
  | 'Synovitis'
  | "Baker's"
  | 'Contusion'
  | 'Fracture';

export type ViewPlane = 'Sagittal' | 'Coronal' | 'Axial';

export type IngestionStream = 'PACS_DICOM' | 'FILM_GRID';

export interface PathologyHighlight {
  abnormality: AbnormalityKey;
  x: number;
  y: number;
  radius: number;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface MriSlice {
  sliceIndex: number;
  totalSlices: number;
  plane: ViewPlane;
  sequenceName: string;
  thicknessMm: number;
  findings?: string;
  pathologyHighlights?: PathologyHighlight[];
}

export interface StudyInstance {
  studyInstanceUID: string;
  patientId: string;
  patientAge: number;
  patientGender: string;
  kneeSide: 'Right' | 'Left';
  clinicalIndication: string;
  studyDate: string;
  magnetStrength: string;
  difficulty: string;
  clinicalNotes: string;
  report: {
    clinicalHistory: string;
    technique: string;
    comparison: string;
    findings: {
      cruciateLigaments: string;
      collateralLigaments: string;
      menisci: string;
      articularCartilage: string;
      osseousStructures: string;
      jointFluidSynovium: string;
    };
    impression: string[];
  };
  groundTruth: Record<AbnormalityKey, number>;
  baselinePredictions?: Record<AbnormalityKey, number>;
  slices: {
    sagittal: MriSlice[];
    coronal: MriSlice[];
    axial: MriSlice[];
  };
}

export interface AbnormalityMeta {
  key: AbnormalityKey;
  shortName: string;
  category: string;
  description: string;
  primaryPlane: ViewPlane;
  keySequence: string;
  clinicalSignificance: string;
  color: string;
  urgencyTier: string;
  clinicalRecommendations: string[];
  surgicalIndication: string;
  conservativeProtocol: string;
  imagingFollowUp: string;
  mlModelingRecommendations: string[];
  baselineAuc?: number;
}

export interface EnsembleConfig {
  backbone3D: string;
  nlpModel: string;
  fusionMethod: string;
  ttaEnabled: boolean;
  thresholdPreset: string;
}

export interface PredictionResult {
  scores: Record<AbnormalityKey, number>;
  predictions?: Record<AbnormalityKey, number>;
  groundTruth?: Record<AbnormalityKey, number>;
  inferenceTimeMs: number;
  ensembleConfig?: EnsembleConfig;
  attentionWeights?: Record<AbnormalityKey, { sliceIndex: number; plane: ViewPlane; weight: number }[]>;
  gradCamHighlights?: {
    sliceIndex: number;
    plane: ViewPlane;
    associatedAbnormality: AbnormalityKey;
    x: number;
    y: number;
    radius: number;
    intensity: number;
  }[];
}

export interface ModelSettingsConfig {
  model: string;
  temperature: number;
  topP: number;
  responseFormat: string;
  useMultiplanarContext: boolean;
  customInstructions?: string;
}

export interface StructuredMskCopilotResponse {
  study_id: string;
  primary_diagnosis: string;
  certainty: string;
  macro_risk_level?: string;
  critical_findings: string[];
  secondary_findings: string[];
  clinical_recommendation: string;
  suggested_urgency: string;
  surgical_referral_needed: boolean;
  differential_diagnoses: {
    condition: string;
    likelihood: string;
    rationale: string;
  }[];
  recommended_followup: string;
  anatomical_correlation: {
    plane: ViewPlane;
    slice_number: number;
    finding: string;
  }[];
}

export interface FilmGridTile {
  id: string;
  label: string;
  plane: ViewPlane;
  sliceNumber: number;
  thumbnail: string;
  tags: string[];
}

export interface RocCurvePoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface AbnormalityEvaluation {
  key: AbnormalityKey;
  auc: number;
  accuracy: number;
  sensitivity: number;
  specificity: number;
  f1Score: number;
  rocPoints: RocCurvePoint[];
  optimalThreshold: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  macroAuc: number;
  backbone: string;
  parameters: string;
  inferenceTime: string;
  verificationBadge: string;
  isCurrentUser?: boolean;
}
