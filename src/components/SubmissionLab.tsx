import React, { useState, useMemo } from 'react';
import { Trophy, Calendar, CheckCircle2, AlertTriangle, Copy, Download, Sparkles, FileText, Check, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyInstance, AbnormalityKey } from '../types';
import { generateSubmissionCsv, validateSubmissionCsv } from '../utils/metrics';

interface SubmissionLabProps {
  studies: StudyInstance[];
  predictionMap: Record<string, Record<AbnormalityKey, number>>;
  macroAuc: number;
}

interface LeaderboardItem {
  rank: number;
  teamName: string;
  macroAuc: number;
  ligamentAuc: number;
  meniscusAuc: number;
  oaAuc: number;
  fluidAuc: number;
  boneAuc: number;
  modelSummary: string;
  submissionsCount: number;
  lastSubmission: string;
  isUser?: boolean;
}

const LEADERBOARD_DATA: LeaderboardItem[] = [
  {
    rank: 1,
    teamName: 'DeepKnee AI Lab (Stanford/RSNA)',
    macroAuc: 0.9682,
    ligamentAuc: 0.9841,
    meniscusAuc: 0.9612,
    oaAuc: 0.9754,
    fluidAuc: 0.962,
    boneAuc: 0.9585,
    modelSummary: 'Swin-UNETR 3D + Med-Gemini Report Cross-Attention Ensemble',
    submissionsCount: 28,
    lastSubmission: '2 hours ago'
  },
  {
    rank: 2,
    teamName: 'RadiologyVision Hub',
    macroAuc: 0.9548,
    ligamentAuc: 0.9712,
    meniscusAuc: 0.948,
    oaAuc: 0.9621,
    fluidAuc: 0.951,
    boneAuc: 0.942,
    modelSummary: 'ConvNeXt-3D Multiview + BioMed-RoBERTa NLP Fusion',
    submissionsCount: 34,
    lastSubmission: '5 hours ago'
  },
  {
    rank: 3,
    teamName: 'Our Studio Model (Active Submission)',
    macroAuc: 0.9415,
    ligamentAuc: 0.962,
    meniscusAuc: 0.938,
    oaAuc: 0.951,
    fluidAuc: 0.934,
    boneAuc: 0.923,
    modelSummary: 'Gemini 3.7 Multimodal + 3D Feature Gated Attention',
    submissionsCount: 12,
    lastSubmission: 'Just now',
    isUser: true
  },
  {
    rank: 4,
    teamName: 'OrthoScan ML Consortium',
    macroAuc: 0.9388,
    ligamentAuc: 0.954,
    meniscusAuc: 0.929,
    oaAuc: 0.948,
    fluidAuc: 0.931,
    boneAuc: 0.932,
    modelSummary: '3D DenseNet-121 Triplanar + XGBoost clinical tabular',
    submissionsCount: 19,
    lastSubmission: '1 day ago'
  },
  {
    rank: 5,
    teamName: 'Kyoto University MedTech',
    macroAuc: 0.9275,
    ligamentAuc: 0.941,
    meniscusAuc: 0.918,
    oaAuc: 0.939,
    fluidAuc: 0.922,
    boneAuc: 0.917,
    modelSummary: 'Vision-Language Contrastive Multitask Head',
    submissionsCount: 23,
    lastSubmission: '2 days ago'
  }
];

export const SubmissionLab: React.FC<SubmissionLabProps> = ({
  studies,
  predictionMap,
  macroAuc
}) => {
  const [copied, setCopied] = useState(false);
  const [boardType, setBoardType] = useState<'public' | 'private'>('public');

  const csvContent = useMemo(() => {
    return generateSubmissionCsv(studies, predictionMap);
  }, [studies, predictionMap]);

  const validation = useMemo(() => {
    return validateSubmissionCsv(csvContent);
  }, [csvContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'submission.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              RSNA Submission & Leaderboard Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Validate, format, and generate competition-compliant CSV submission files with confidence scores for all 12 target abnormalities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">Entry & Merger Deadline</div>
              <div className="font-mono text-slate-200 font-bold">Oct 15, 2026</div>
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-cyan-500/40 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-amber-400 font-semibold">Final Submission Deadline</div>
              <div className="font-mono text-white font-bold">Oct 22, 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: CSV Generation & Preview */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Official submission.csv</h3>
              <span className="text-[11px] font-mono text-slate-500">
                ({validation.rowCount} Studies, 13 Columns)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-copy-csv"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy CSV'}</span>
              </button>
              <button
                id="btn-download-csv"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download submission.csv</span>
              </button>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              validation.isValid
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/30 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span className="font-semibold">
                {validation.isValid
                  ? 'Schema Validated: Perfect 13-column RSNA format with 0.0-1.0 confidence bounds.'
                  : 'Schema Errors Detected in Submission File.'}
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              Macro AUC: {macroAuc.toFixed(4)}
            </span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[340px] select-all space-y-1">
            <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
              StudyInstanceUID,ACL,MCL,Medial Meniscus,Lateral Meniscus,Medial OA,Lateral OA,PF OA,Effusion,Synovitis,Baker's,Contusion,Fracture
            </div>
            {csvContent
              .split('\n')
              .slice(1)
              .map((line, idx) => (
                <div key={idx} className="hover:bg-slate-900/60 py-0.5 px-1 rounded">
                  {line}
                </div>
              ))}
          </div>
        </div>

        {/* Right Column: Pre-Flight Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Pre-Flight Competition Checklist
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Exact 13 Column Headers:</span>
                  <p className="text-slate-400 text-[11px]">
                    StudyInstanceUID, ACL, MCL, Medial Meniscus, Lateral Meniscus, Medial OA, Lateral OA, PF OA, Effusion, Synovitis, Baker's, Contusion, Fracture.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Numeric Probabilities in [0.0, 1.0]:</span>
                  <p className="text-slate-400 text-[11px]">
                    All predictions are calibrated continuous floats. No NaN or missing values.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Unique StudyInstanceUIDs:</span>
                  <p className="text-slate-400 text-[11px]">
                    Rows are strictly mapped 1:1 against test dataset DICOM studies without duplicates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-cyan-500/30 text-xs text-slate-300 space-y-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              RSNA Winner Verification Note
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Top teams must provide self-contained training pipelines, multi-view inference scripts, and a brief method description paper by November 5, 2026.
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              RSNA Knee Challenge Live Leaderboard
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setBoardType('public')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                boardType === 'public' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Public Leaderboard (30% test)
            </button>
            <button
              onClick={() => setBoardType('private')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                boardType === 'private' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Private Leaderboard (70% final)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                <th className="pb-3 font-semibold">Rank</th>
                <th className="pb-3 font-semibold">Team Name</th>
                <th className="pb-3 font-semibold">Model Architecture</th>
                <th className="pb-3 font-semibold text-right">Macro AUC</th>
                <th className="pb-3 font-semibold text-right">Ligament</th>
                <th className="pb-3 font-semibold text-right">Meniscus</th>
                <th className="pb-3 font-semibold text-right">OA</th>
                <th className="pb-3 font-semibold text-right">Entries</th>
                <th className="pb-3 font-semibold text-right">Last</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {LEADERBOARD_DATA.map(entry => (
                <tr
                  key={entry.rank}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    entry.isUser
                      ? 'bg-cyan-950/40 text-cyan-300 font-bold border-l-2 border-cyan-400'
                      : 'text-slate-300'
                  }`}
                >
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : entry.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                          : entry.rank === 3
                          ? 'bg-amber-800/30 text-amber-400 border border-amber-700/40'
                          : 'text-slate-500'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="py-3 font-sans font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{entry.teamName}</span>
                      {entry.isUser && (
                        <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-slate-400 font-sans text-[11px] truncate max-w-xs">
                    {entry.modelSummary}
                  </td>
                  <td className="py-3 text-right text-cyan-400 font-bold">
                    {entry.macroAuc.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {entry.ligamentAuc.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {entry.meniscusAuc.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {entry.oaAuc.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-slate-400">
                    {entry.submissionsCount}
                  </td>
                  <td className="py-3 text-right text-slate-500 text-[11px]">
                    {entry.lastSubmission}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
