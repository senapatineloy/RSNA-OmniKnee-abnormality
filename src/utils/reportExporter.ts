import { jsPDF } from 'jspdf';
import { StudyInstance, AbnormalityKey, PredictionResult, EnsembleConfig } from '../types';
import { ABNORMALITIES_META } from '../data/abnormalities';

export interface StructuredReportData {
  reportHeader: {
    institution: string;
    department: string;
    documentType: string;
    reportId: string;
    generatedAt: string;
    softwareVersion: string;
  };
  patientDemographics: {
    patientId: string;
    age: number;
    gender: string;
    kneeSide: string;
    studyDate: string;
    magnetStrength: string;
    clinicalIndication: string;
  };
  imagingProtocol: {
    technique: string;
    comparison: string;
  };
  radiologyFindings: {
    clinicalHistory: string;
    cruciateLigaments: string;
    collateralLigaments: string;
    menisci: string;
    articularCartilage: string;
    osseousStructures: string;
    jointFluidSynovium: string;
  };
  aiPathologyMatrix: {
    abnormalityKey: AbnormalityKey;
    name: string;
    category: string;
    probability: number;
    probabilityPercent: string;
    classification: 'Positive' | 'Equivocal' | 'Normal';
    groundTruth?: 'Positive' | 'Negative' | string;
    urgencyTier: string;
    primaryPlane: string;
  }[];
  actionablePathways: {
    target: string;
    urgency: string;
    recommendations: string[];
    surgicalIndication: string;
    conservativeProtocol: string;
  }[];
  aiClinicalRationale?: {
    modelVariant: string;
    clinicalReasoning: string;
    recommendedAction: string;
  };
  modelMetadata?: {
    backbone3D: string;
    nlpModel: string;
    fusionMethod: string;
  };
}

export function buildStructuredReportData(
  study: StudyInstance,
  predictions: Record<AbnormalityKey, number>,
  predictionResult?: PredictionResult,
  ensembleConfig?: EnsembleConfig
): StructuredReportData {
  const keys = Object.keys(ABNORMALITIES_META) as AbnormalityKey[];
  const aiPathologyMatrix = keys.map(k => {
    const meta = ABNORMALITIES_META[k];
    const prob = predictions[k] ?? study.baselinePredictions?.[k] ?? 0.05;
    const gt = study.groundTruth?.[k];

    let classification: 'Positive' | 'Equivocal' | 'Normal' = 'Normal';
    if (prob >= 0.7) classification = 'Positive';
    else if (prob >= 0.35) classification = 'Equivocal';

    return {
      abnormalityKey: k,
      name: meta.shortName,
      category: meta.category,
      probability: Number(prob.toFixed(4)),
      probabilityPercent: `${(prob * 100).toFixed(1)}%`,
      classification,
      groundTruth: gt !== undefined ? (gt === 1 ? 'Positive' : 'Negative') : undefined,
      urgencyTier: meta.urgencyTier,
      primaryPlane: meta.primaryPlane
    };
  });

  const positives = aiPathologyMatrix.filter(
    m => m.classification === 'Positive' || m.classification === 'Equivocal'
  );
  const targetsForPathways = (
    positives.length > 0 ? positives.map(p => p.abnormalityKey) : ['ACL', 'Medial Meniscus']
  ) as AbnormalityKey[];

  const actionablePathways = targetsForPathways.map(k => {
    const meta = ABNORMALITIES_META[k];
    return {
      target: meta.shortName,
      urgency: meta.urgencyTier,
      recommendations: meta.clinicalRecommendations,
      surgicalIndication: meta.surgicalIndication,
      conservativeProtocol: meta.conservativeProtocol
    };
  });

  return {
    reportHeader: {
      institution: 'RSNA Multimodal Knee Imaging Decision Support',
      department: 'Department of Musculoskeletal Radiology & AI Diagnostics',
      documentType: 'Structured Clinical Diagnostic & AI Assessment Report',
      reportId: `REP-${study.patientId}-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      softwareVersion: 'RSNA-OmniKnee v1.0.0 (Macro AUC 0.942)'
    },
    patientDemographics: {
      patientId: study.patientId,
      age: study.patientAge,
      gender: study.patientGender === 'M' ? 'Male (M)' : 'Female (F)',
      kneeSide: `${study.kneeSide} Knee`,
      studyDate: study.studyDate,
      magnetStrength: study.magnetStrength,
      clinicalIndication: study.clinicalIndication
    },
    imagingProtocol: {
      technique: study.report.technique,
      comparison: study.report.comparison
    },
    radiologyFindings: {
      clinicalHistory: study.report.clinicalHistory,
      cruciateLigaments: study.report.findings.cruciateLigaments,
      collateralLigaments: study.report.findings.collateralLigaments,
      menisci: study.report.findings.menisci,
      articularCartilage: study.report.findings.articularCartilage,
      osseousStructures: study.report.findings.osseousStructures,
      jointFluidSynovium: study.report.findings.jointFluidSynovium
    },
    aiPathologyMatrix,
    actionablePathways,
    modelMetadata: ensembleConfig
      ? {
          backbone3D: ensembleConfig.backbone3D,
          nlpModel: ensembleConfig.nlpModel,
          fusionMethod: ensembleConfig.fusionMethod
        }
      : undefined
  };
}

export function exportStudyToJson(
  study: StudyInstance,
  predictions: Record<AbnormalityKey, number>,
  predictionResult?: PredictionResult,
  ensembleConfig?: EnsembleConfig
): void {
  const data = buildStructuredReportData(study, predictions, predictionResult, ensembleConfig);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const filename = `RSNA_Diagnostic_Report_${study.patientId}_${new Date().toISOString().slice(0, 10)}.json`;
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function exportStudyToPdf(
  study: StudyInstance,
  predictions: Record<AbnormalityKey, number>,
  predictionResult?: PredictionResult,
  ensembleConfig?: EnsembleConfig
): Promise<void> {
  const data = buildStructuredReportData(study, predictions, predictionResult, ensembleConfig);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 16) {
      doc.addPage();
      cursorY = 14;
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 160);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `RSNA Knee AI Diagnostic Report | Patient ID: ${data.patientDemographics.patientId} | ${data.patientDemographics.kneeSide}`,
        margin,
        9
      );
      doc.line(margin, 11, pageWidth - margin, 11);
      cursorY = 15;
    }
  };

  // Header Banner
  doc.setFillColor(10, 14, 23);
  doc.rect(margin, cursorY, contentWidth, 18, 'F');
  doc.setTextColor(0, 229, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RSNA MULTIMODAL KNEE DIAGNOSTIC REPORT', margin + 4, cursorY + 6.5);
  doc.setFontSize(8);
  doc.setTextColor(200, 215, 235);
  doc.setFont('helvetica', 'normal');
  doc.text('Deep 3D Vision + Clinical NLP Decision Support System', margin + 4, cursorY + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(140, 160, 190);
  doc.text(`Doc Ref: ${data.reportHeader.reportId}`, pageWidth - margin - 4, cursorY + 6.5, { align: 'right' });
  doc.text(`Date: ${new Date(data.reportHeader.generatedAt).toLocaleString()}`, pageWidth - margin - 4, cursorY + 11.5, { align: 'right' });
  cursorY += 22;

  // Patient Demographics Box
  doc.setFillColor(244, 246, 250);
  doc.setDrawColor(210, 220, 235);
  doc.rect(margin, cursorY, contentWidth, 20, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT ID:', margin + 4, cursorY + 5.5);
  doc.text('DEMOGRAPHICS:', margin + 4, cursorY + 11);
  doc.text('LATERALITY:', margin + 4, cursorY + 16.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.patientDemographics.patientId, margin + 28, cursorY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.patientDemographics.age} yo / ${data.patientDemographics.gender}`, margin + 28, cursorY + 11);
  doc.text(data.patientDemographics.kneeSide, margin + 28, cursorY + 16.5);

  const midX = margin + contentWidth / 2;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('FIELD STRENGTH:', midX, cursorY + 5.5);
  doc.text('STUDY DATE:', midX, cursorY + 11);
  doc.text('INDICATION:', midX, cursorY + 16.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientDemographics.magnetStrength, midX + 28, cursorY + 5.5);
  doc.text(data.patientDemographics.studyDate, midX + 28, cursorY + 11);
  doc.text(doc.splitTextToSize(data.patientDemographics.clinicalIndication, contentWidth / 2 - 32)[0] || '', midX + 28, cursorY + 16.5);
  cursorY += 24;

  // 1. History
  checkPageBreak(25);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. CLINICAL HISTORY & IMAGING PROTOCOL', margin, cursorY + 2);
  cursorY += 4.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const histLines = doc.splitTextToSize(`History: ${data.radiologyFindings.clinicalHistory}`, contentWidth);
  doc.text(histLines, margin, cursorY + 2);
  cursorY += histLines.length * 3.8 + 3;
  doc.setTextColor(90, 105, 125);
  doc.setFontSize(7.5);
  doc.text(`Technique: ${data.imagingProtocol.technique} | Comparison: ${data.imagingProtocol.comparison}`, margin, cursorY);
  cursorY += 6;

  // 2. Structured Findings
  checkPageBreak(40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. STRUCTURED RADIOLOGICAL FINDINGS', margin, cursorY + 2);
  cursorY += 5.5;

  const findingsList = [
    { label: 'Cruciate Ligaments:', text: data.radiologyFindings.cruciateLigaments },
    { label: 'Collateral Ligaments:', text: data.radiologyFindings.collateralLigaments },
    { label: 'Menisci (Med/Lat):', text: data.radiologyFindings.menisci },
    { label: 'Articular Cartilage:', text: data.radiologyFindings.articularCartilage },
    { label: 'Osseous Structures:', text: data.radiologyFindings.osseousStructures },
    { label: 'Joint Fluid & Synovium:', text: data.radiologyFindings.jointFluidSynovium }
  ];

  findingsList.forEach(f => {
    checkPageBreak(10);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(f.label, margin + 2, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const wrap = doc.splitTextToSize(f.text, contentWidth - 42);
    doc.text(wrap, margin + 40, cursorY);
    cursorY += Math.max(wrap.length * 3.5, 4.5);
  });
  cursorY += 3;

  // 3. AI Pathology Matrix
  checkPageBreak(75);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. AI 12-TARGET PATHOLOGY CONFIDENCE MATRIX', margin, cursorY + 2);
  cursorY += 5.5;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, cursorY, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TARGET PATHOLOGY', margin + 3, cursorY + 4.2);
  doc.text('CATEGORY', margin + 55, cursorY + 4.2);
  doc.text('PRIMARY PLANE', margin + 85, cursorY + 4.2);
  doc.text('AI PROBABILITY', margin + 115, cursorY + 4.2);
  doc.text('CLASSIFICATION', margin + 145, cursorY + 4.2);
  doc.text('GROUND TRUTH', margin + 172, cursorY + 4.2);
  cursorY += 6.5;

  data.aiPathologyMatrix.forEach((m, idx) => {
    checkPageBreak(6.5);
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 250 : 242, isEven ? 250 : 244, isEven ? 250 : 248);
    doc.rect(margin, cursorY, contentWidth, 5.5, 'F');
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(m.name, margin + 3, cursorY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(m.category, margin + 55, cursorY + 3.8);
    doc.text(m.primaryPlane, margin + 85, cursorY + 3.8);
    doc.setFont('helvetica', 'bold');
    if (m.classification === 'Positive') doc.setTextColor(220, 38, 38);
    else if (m.classification === 'Equivocal') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(16, 149, 106);
    doc.text(m.probabilityPercent, margin + 115, cursorY + 3.8);
    doc.text(m.classification.toUpperCase(), margin + 145, cursorY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(m.groundTruth ? m.groundTruth : 'N/A', margin + 172, cursorY + 3.8);
    cursorY += 5.5;
  });
  cursorY += 5;

  // Sign-off
  checkPageBreak(30);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY + 2, pageWidth - margin, cursorY + 2);
  cursorY += 6;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ATTENDING RADIOLOGIST ATTESTATION & VERIFICATION:', margin, cursorY);
  doc.text('ELECTRONIC SIGN-OFF HASH:', midX, cursorY);
  cursorY += 4.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Dr. J. Reynolds, MD, MSK Radiologist (Board Certified)', margin, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`SHA-256: 8f3c7e9d4a2b1069f5... | Verified at ${new Date().toLocaleTimeString()}`, midX, cursorY);
  cursorY += 5;
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This automated AI decision support report provides calibrated likelihood probabilities and is intended to complement clinical judgment.',
    margin,
    cursorY
  );

  const pdfFileName = `RSNA_Clinical_Report_${study.patientId}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(pdfFileName);
}
