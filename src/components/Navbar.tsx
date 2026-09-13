import React, { useState, useRef, useEffect } from 'react';
import { Activity, Sparkles, ChevronDown, Check, Plus, FolderOpen, Layers, BarChart3, Bot, FileText, Database, Camera, Printer, Sliders } from 'lucide-react';
import { StudyInstance, IngestionStream } from '../types';

export type ActiveTab = 'viewer' | 'architecture' | 'leaderboard';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  studies: StudyInstance[];
  selectedStudyId: string;
  onSelectStudy: (study: StudyInstance) => void;
  onCustomUpload?: (newStudy: Partial<StudyInstance>) => void;
  macroAuc: number;
  onRunAiPrediction: () => void;
  isPredicting: boolean;
  onOpenCopilot?: () => void;
  onExportReport?: () => void;
  onOpenIngestionModal?: (stream?: IngestionStream) => void;
  onPrintReport: () => void;
  onOpenPrintModal?: () => void;
}

export const RsnaBrand = () => (
  <div className="flex items-center gap-3 shrink-0">
    <div className="flex flex-col items-center select-none">
      {/* RSNA SVG Emblem */}
      <svg
        viewBox="0 0 220 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-auto"
        aria-label="RSNA"
      >
        <defs>
          <linearGradient id="rsna-swoosh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Diagonal Swoosh on the leg of 'R' */}
        <path
          d="M8 54 L32 10 L44 24 L20 58 Z"
          fill="url(#rsna-swoosh-grad)"
        />

        {/* Bold Serif Letters */}
        <text
          x="22"
          y="50"
          fontFamily="Georgia, Cambria, 'Times New Roman', serif"
          fontSize="52"
          fontWeight="bold"
          letterSpacing="-1.5"
          fill="#38BDF8"
          className="fill-sky-400"
        >
          RSNA
        </text>

        {/* Registered Trademark ® */}
        <circle cx="202" cy="18" r="5" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
        <text
          x="200"
          y="21"
          fontFamily="sans-serif"
          fontSize="6.5"
          fontWeight="bold"
          fill="#94A3B8"
        >
          R
        </text>
      </svg>

      {/* Two-Line Stacked Title */}
      <div className="flex flex-col items-center -mt-0.5 text-center leading-[1.05]">
        <span className="text-[8px] font-normal text-slate-300 tracking-tight">
          Radiological Society
        </span>
        <span className="text-[7.5px] font-normal text-slate-400 tracking-tight">
          of North America
        </span>
      </div>
    </div>

    {/* Subtle Divider */}
    <div className="h-8 w-px bg-slate-800" />

    {/* Platform Name & Field Strength */}
    <div className="flex items-center gap-2">
      <span className="font-semibold text-white tracking-tight text-base">
        OmniKnee
      </span>
      <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
        3.0T
      </span>
    </div>
  </div>
);

export const RsnaLogo = ({ className = "h-6 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 240 68"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="RSNA Logo"
  >
    <defs>
      <linearGradient id="rsna-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    {/* Stylized Diagonal Swoosh Leg of 'R' */}
    <path
      d="M12 58 L38 10 L52 24 L24 64 Z"
      fill="url(#rsna-cyan-grad)"
    />
    {/* RSNA Letterforms */}
    <text
      x="26"
      y="54"
      fontFamily="Georgia, Cambria, serif"
      fontSize="58"
      fontWeight="bold"
      letterSpacing="-1.5"
      fill="#1E40AF"
      className="dark:fill-[#38BDF8]"
    >
      RSNA
    </text>
    {/* Registered Trademark symbol */}
    <circle cx="218" cy="18" r="5" stroke="currentColor" strokeWidth="1.2" className="text-slate-400" />
    <text x="216" y="21" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="currentColor" className="text-slate-400">R</text>
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  studies,
  selectedStudyId,
  onSelectStudy,
  onCustomUpload,
  macroAuc,
  onRunAiPrediction,
  isPredicting,
  onOpenCopilot,
  onExportReport,
  onOpenIngestionModal,
  onPrintReport,
  onOpenPrintModal
}) => {
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStudy = studies.find(s => s.patientId === selectedStudyId) || studies[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCaseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 shrink-0 w-full bg-[#090D14] border-b border-slate-800/80 px-4 flex items-center justify-between gap-4 z-30 select-none">
      {/* ── ZONE 1: BRAND & CASE SELECTOR ── */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <RsnaBrand />

        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Clean Case Pill (Standard Flex Child, No Absolute/Collision Positioning) */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            id="btn-case-dropdown-trigger"
            onClick={() => setIsCaseMenuOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
          >
            <span className="font-bold text-white tracking-wide">{currentStudy.patientId}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 truncate max-w-[140px] sm:max-w-none">
              {currentStudy.patientAge}yo {currentStudy.patientGender} • {currentStudy.kneeSide} Knee
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
          </button>

          {isCaseMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#0B0F19] border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span>Select Clinical Study</span>
                <span className="text-[#00E5FF] font-mono">{studies.length} Loaded</span>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 py-1">
                {studies.map(study => {
                  const isSelected = study.patientId === selectedStudyId;
                  const positiveCount = Object.values(study.groundTruth).filter(v => v === 1).length;

                  return (
                    <button
                      key={study.patientId}
                      id={`dropdown-case-${study.patientId}`}
                      onClick={() => {
                        onSelectStudy(study);
                        setIsCaseMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? 'bg-[#00E5FF18] text-white border border-[#00E5FF55]'
                          : 'text-slate-300 hover:bg-[#111827] hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-[13px]">{study.patientId}</span>
                          <span className="text-xs text-slate-400">
                            {study.patientAge}yo {study.patientGender} • {study.kneeSide}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                          {study.clinicalIndication}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 ${
                          positiveCount > 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {positiveCount > 0 ? `● ${positiveCount} High Risk` : '● Normal'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Source Fidelity Tag */}
        <div
          className="hidden 2xl:flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-[11px] px-2 py-1 border border-emerald-500/30 rounded-lg font-mono font-semibold"
          title="Clinical PACS DICOM Volumetric Stream"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>PACS 16-BIT</span>
        </div>
      </div>

      {/* ── ZONE 2: CENTER SEGMENTED NAVIGATION GROUP ── */}
      <nav className="hidden lg:flex items-center bg-[#0B0F19] p-1 rounded-lg border border-slate-800 shrink-0">
        <button
          id="nav-tab-viewer"
          onClick={() => onTabChange('viewer')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
            activeTab === 'viewer'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Diagnostic Viewer</span>
        </button>

        <button
          id="nav-tab-architecture"
          onClick={() => onTabChange('architecture')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'architecture'
              ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture</span>
        </button>

        <button
          id="nav-tab-leaderboard"
          onClick={() => onTabChange('leaderboard')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </button>
      </nav>

      {/* ── ZONE 3: TELEMETRY & ACTIONS ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center rounded-lg bg-[#0F172A] border border-slate-800 p-0.5">
          <button
            id="btn-nav-print-report"
            onClick={onPrintReport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-200 hover:text-white text-xs font-semibold hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer"
            title="Immediately invoke system print dialog (Save as PDF or Physical Printer) [Ctrl+P / ⌘P]"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
          {onOpenPrintModal && (
            <button
              id="btn-nav-print-options"
              onClick={onOpenPrintModal}
              className="px-1.5 py-1 text-slate-400 hover:text-cyan-400 hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer border-l border-slate-800"
              title="Configure Print Preferences (Key Slices, Matrix, Attestation)"
            >
              <Sliders className="w-3 h-3" />
            </button>
          )}
        </div>

        {onOpenIngestionModal && (
          <button
            id="btn-nav-ingestion-hub"
            onClick={() => onOpenIngestionModal()}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-cyan-400 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
            title="Open Dual-Stream Ingestion Engine"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold">Ingestion</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0B0F19] border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Macro-AUC:</span>
          <span className="text-cyan-400 font-bold">{macroAuc.toFixed(4)}</span>
        </div>

        <button
          id="btn-run-inference"
          onClick={onRunAiPrediction}
          disabled={isPredicting}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isPredicting ? 'animate-spin' : ''}`} />
          <span>{isPredicting ? 'Inferencing...' : 'Run Inference'}</span>
        </button>
      </div>
    </header>
  );
};


