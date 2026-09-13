import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewPlane, MriSlice, AbnormalityKey } from '../types';
import { ABNORMALITIES_META, ABNORMALITY_KEY_SLICES } from '../data/abnormalities';
import { WL_PRESETS, getFilterStyles, WindowLevelPreset } from '../utils/mriRenderer';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Eye,
  Sliders,
  Ruler,
  Crosshair,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Move,
  SlidersHorizontal,
  ShieldAlert,
  X,
  Check,
  Zap,
  Activity,
  HelpCircle,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  AlertTriangle
} from 'lucide-react';

interface MriViewerProps {
  currentPlane: ViewPlane;
  onPlaneChange: (plane: ViewPlane) => void;
  slices: {
    sagittal: MriSlice[];
    coronal: MriSlice[];
    axial: MriSlice[];
  };
  activeAbnormality?: AbnormalityKey | null;
  onSelectAbnormality?: (key: AbnormalityKey, plane?: ViewPlane, sliceIndex?: number) => void;
  sourceFidelity?: string;
  ingestionStream?: string;
  onOpenIngestionModal?: () => void;
  targetSliceIndex?: number;
  onSliceChange?: (index: number) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  abnormalCount?: number;
  macroAuc?: number;
}

export const MriViewer: React.FC<MriViewerProps> = ({
  currentPlane,
  onPlaneChange,
  slices,
  activeAbnormality,
  onSelectAbnormality,
  sourceFidelity,
  ingestionStream,
  onOpenIngestionModal,
  targetSliceIndex,
  onSliceChange,
  isSidebarOpen = true,
  onToggleSidebar,
  abnormalCount = 0,
  macroAuc = 1.000
}) => {
  const [sliceIndex, setSliceIndex] = useState<number>(12);

  useEffect(() => {
    onSliceChange?.(sliceIndex);
  }, [sliceIndex, onSliceChange]);
  const [wlPreset, setWlPreset] = useState<string>('SoftTissue');
  const [customWw, setCustomWw] = useState<number | null>(null);
  const [customWl, setCustomWl] = useState<number | null>(null);
  const [showWlControls, setShowWlControls] = useState<boolean>(false);
  const [invert, setInvert] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<'pan' | 'measure' | 'pointer'>('pointer');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [cineFps, setCineFps] = useState<number>(6);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredFinding, setHoveredFinding] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const isDraggingPanRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingPanRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (activeTool === 'measure') return;
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    if (e.button === 0 || e.button === 1) {
      isDraggingPanRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  const handleMouseMoveViewport = (e: React.MouseEvent) => {
    if (isDraggingPanRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      setPan({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy)
      });
    }
  };

  const handleMouseUpViewport = () => {
    isDraggingPanRef.current = false;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(2.5, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom(z => Math.max(0.75, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFitView = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      toggleFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const activeSliceList = currentPlane === 'Sagittal' ? slices.sagittal : currentPlane === 'Coronal' ? slices.coronal : slices.axial;
  const totalSlices = activeSliceList.length || 20;
  const currentSliceData = activeSliceList[Math.min(sliceIndex - 1, totalSlices - 1)] || activeSliceList[0];

  const currentPresetData = WL_PRESETS[wlPreset] || WL_PRESETS.SoftTissue;
  const activeWw = customWw ?? currentPresetData.windowWidth;
  const activeWl = customWl ?? currentPresetData.windowLevel;

  // React to targetSliceIndex prop if provided
  useEffect(() => {
    if (targetSliceIndex && targetSliceIndex >= 1 && targetSliceIndex <= totalSlices) {
      setSliceIndex(targetSliceIndex);
      setShowHeatmap(true);
    }
  }, [targetSliceIndex, totalSlices]);

  // Helper to recommend preset based on selected knee pathology
  const getRecommendedPreset = (key: AbnormalityKey): string => {
    if (['ACL', 'PCL', 'MM', 'LM', 'MCL', 'LCL'].includes(key)) return 'SoftTissue';
    if (['BONE_CONTUSION', 'FRACTURE', 'PATELLAR_TRACKING', 'Fracture', 'Contusion'].includes(key)) return 'Bone';
    if (['EFFUSION', 'BAKER_CYST', 'Effusion', "Baker's"].includes(key)) return 'STIR';
    if (['CARTILAGE', 'CARTILAGE_MEDIAL', 'CARTILAGE_LATERAL', 'Medial OA', 'Lateral OA', 'PF OA'].includes(key)) return 'Cartilage';
    return 'SoftTissue';
  };

  // Auto-jump to relevant slice and optimize windowing preset if an abnormality is selected
  useEffect(() => {
    if (activeAbnormality) {
      const meta = ABNORMALITIES_META[activeAbnormality];
      const sliceInfo = ABNORMALITY_KEY_SLICES[activeAbnormality];

      if (meta && meta.primaryPlane !== currentPlane) {
        onPlaneChange(meta.primaryPlane);
      }
      
      if (sliceInfo) {
        setSliceIndex(sliceInfo.slice);
      } else {
        const targetList = meta?.primaryPlane === 'Coronal' ? slices.coronal : meta?.primaryPlane === 'Axial' ? slices.axial : slices.sagittal;
        const targetIdx = targetList.findIndex(s => s.pathologyHighlights?.some(h => h.abnormality === activeAbnormality));
        if (targetIdx !== -1) {
          setSliceIndex(targetIdx + 1);
        }
      }

      // Always ensure Grad-CAM heatmap is enabled on jump
      setShowHeatmap(true);

      // Automatically suggest or tune windowing preset for this pathology
      const recommendedPreset = getRecommendedPreset(activeAbnormality);
      if (recommendedPreset && WL_PRESETS[recommendedPreset] && customWw === null && customWl === null) {
        setWlPreset(recommendedPreset);
      }
    }
  }, [activeAbnormality]);

  const handleSelectPreset = (presetKey: string) => {
    setWlPreset(presetKey);
    setCustomWw(null);
    setCustomWl(null);
  };

  const cyclePreset = () => {
    const presetKeys = Object.keys(WL_PRESETS);
    const currentIndex = presetKeys.indexOf(wlPreset);
    const nextIndex = (currentIndex + 1) % presetKeys.length;
    handleSelectPreset(presetKeys[nextIndex]);
  };

  // Cine Playback Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSliceIndex(prev => (prev >= totalSlices ? 1 : prev + 1));
    }, 1000 / cineFps);
    return () => clearInterval(interval);
  }, [isPlaying, totalSlices, cineFps]);

  // Keyboard navigation & shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSliceIndex(prev => Math.min(totalSlices, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSliceIndex(prev => Math.max(1, prev - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === '1') {
        onPlaneChange('Sagittal');
      } else if (e.key === '2') {
        onPlaneChange('Coronal');
      } else if (e.key === '3') {
        onPlaneChange('Axial');
      } else if (e.key === 'c' || e.key === 'C') {
        setShowHeatmap(prev => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        cyclePreset();
      } else if (e.key === 't' || e.key === 'T') {
        onToggleSidebar?.();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsHelpModalOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsHelpModalOpen(false);
      }
    },
    [totalSlices, onPlaneChange, wlPreset, onToggleSidebar]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== 'measure') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (measurePoints.length >= 2) {
      setMeasurePoints([{ x, y }]);
    } else {
      setMeasurePoints(prev => [...prev, { x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const calculateDistanceMm = () => {
    if (measurePoints.length < 2) return null;
    const [p1, p2] = measurePoints;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const distMm = Math.sqrt(dx * dx + dy * dy) * 1.6;
    return distMm.toFixed(1);
  };

  // Render SVG cross-section based on plane and slice position
  const renderMriVisual = () => {
    const norm = sliceIndex / totalSlices;

    return (
      <g>
        {/* Dark MRI Background with subtle noise grid */}
        <rect width="100" height="100" fill="#04070D" />
        <circle cx="50" cy="50" r="47" fill="#0A0F1A" opacity="0.95" />

        {/* Dynamic anatomical structures based on current plane */}
        {currentPlane === 'Sagittal' && (
          <g>
            {/* Femoral Shaft & Condyle */}
            <path
              d={`M 32 10 L 34 ${30 + norm * 4} Q 36 50, 48 54 Q 68 56, 74 44 Q 78 30, 68 20 Q 60 14, 52 10 Z`}
              fill="#182332"
              stroke="#33475D"
              strokeWidth="0.8"
            />
            {/* Femoral Cartilage layer */}
            <path
              d="M 38 48 Q 50 56, 64 54 Q 72 48, 73 42"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Tibial Plateau & Shaft */}
            <path
              d={`M 30 64 Q 50 ${60 + (1 - norm) * 4}, 76 62 Q 78 68, 70 82 L 64 96 L 36 96 L 30 80 Z`}
              fill="#182332"
              stroke="#33475D"
              strokeWidth="0.8"
            />
            {/* Tibial Cartilage */}
            <path
              d="M 32 63 Q 50 61, 74 62"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Patella (Anterior) */}
            <path
              d="M 18 28 Q 24 24, 28 32 Q 26 44, 20 46 Q 16 38, 18 28 Z"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Patellar Cartilage */}
            <path d="M 27 28 Q 28 36, 23 44" fill="none" stroke="#94a3b8" strokeWidth="1.2" />

            {/* Quadriceps & Patellar Tendons */}
            <path d="M 22 10 L 22 26" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 20 46 L 32 68" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />

            {/* Hoffa's Fat Pad */}
            <path
              d="M 25 48 Q 36 48, 38 60 Q 32 64, 26 56 Z"
              fill="#1e293b"
              opacity="0.75"
            />

            {/* Cruciate Ligaments (ACL & PCL in middle slices 8-14) */}
            {sliceIndex >= 7 && sliceIndex <= 15 && (
              <g id="acl-group">
                {/* PCL Curve */}
                <path
                  d="M 58 38 Q 62 50, 48 64"
                  fill="none"
                  stroke="#0b111e"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* ACL Fibers (intercondylar notch) */}
                <path
                  d="M 44 64 L 62 38"
                  fill="none"
                  stroke={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'ACL') ? '#ef4444' : '#0b111e'}
                  strokeWidth="2.8"
                  strokeDasharray={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'ACL') ? '3,2' : 'none'}
                />
              </g>
            )}

            {/* Meniscal Triangles (Anterior & Posterior horns in slices 3-8 and 12-18) */}
            {(sliceIndex <= 8 || sliceIndex >= 12) && (
              <g id="meniscus-group">
                {/* Anterior horn triangle */}
                <polygon points="34,62 42,62 38,56" fill="#0b111e" stroke="#334155" strokeWidth="0.5" />
                {/* Posterior horn triangle */}
                <polygon points="66,62 74,62 70,54" fill="#0b111e" stroke="#334155" strokeWidth="0.5" />
              </g>
            )}

            {/* Suprapatellar bursa / Effusion */}
            <path
              d="M 28 16 Q 34 22, 32 30 Q 24 28, 26 18 Z"
              fill="#38bdf8"
              opacity={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'Effusion') ? 0.8 : 0.2}
            />

            {/* Popliteal Fossa / Baker Cyst */}
            {sliceIndex >= 14 && (
              <circle
                cx="74"
                cy="68"
                r={currentSliceData.pathologyHighlights?.some(h => h.abnormality === "Baker's") ? 10 : 3}
                fill="#10b981"
                opacity={currentSliceData.pathologyHighlights?.some(h => h.abnormality === "Baker's") ? 0.75 : 0.15}
              />
            )}
          </g>
        )}

        {currentPlane === 'Coronal' && (
          <g>
            {/* Medial & Lateral Femoral Condyles */}
            <path
              d="M 28 10 L 30 36 Q 26 52, 38 54 Q 48 54, 50 44 Q 52 54, 62 54 Q 74 52, 70 36 L 72 10 Z"
              fill="#182332"
              stroke="#33475D"
              strokeWidth="0.8"
            />
            {/* Joint Cartilage Condyles */}
            <path d="M 30 50 Q 38 55, 46 51" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 54 51 Q 62 55, 70 50" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

            {/* Tibial Plateau with Intercondylar Eminence Spines */}
            <path
              d="M 26 62 Q 38 61, 48 56 L 50 53 L 52 56 Q 62 61, 74 62 L 72 96 L 28 96 Z"
              fill="#182332"
              stroke="#33475D"
              strokeWidth="0.8"
            />
            {/* Proximal Fibula Head (Lateral) */}
            <path d="M 74 70 Q 82 72, 80 90 L 76 96 L 72 90 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />

            {/* Medial Collateral Ligament (MCL band on left medial side) */}
            <path
              d="M 24 34 Q 20 54, 23 78"
              fill="none"
              stroke={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'MCL') ? '#f97316' : '#0b111e'}
              strokeWidth={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'MCL') ? '3.5' : '2.2'}
              opacity="0.9"
            />

            {/* Lateral Collateral Ligament (LCL on right lateral side) */}
            <path d="M 74 38 Q 78 56, 76 74" fill="none" stroke="#0b111e" strokeWidth="2.0" opacity="0.9" />

            {/* Medial & Lateral Meniscus bodies */}
            <polygon points="26,58 34,58 30,53" fill="#0b111e" stroke="#334155" strokeWidth="0.5" />
            <polygon points="66,58 74,58 70,53" fill="#0b111e" stroke="#334155" strokeWidth="0.5" />

            {/* Joint Fluid in gutters */}
            <ellipse
              cx="50"
              cy="36"
              rx="18"
              ry="6"
              fill="#38bdf8"
              opacity={currentSliceData.pathologyHighlights?.some(h => h.abnormality === 'Effusion') ? 0.7 : 0.1}
            />
          </g>
        )}

        {currentPlane === 'Axial' && (
          <g>
            {/* Patellofemoral Trochlear Groove & Patella */}
            <path
              d="M 30 18 Q 50 14, 70 18 Q 66 32, 50 36 Q 34 32, 30 18 Z"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Patellar Cartilage */}
            <path d="M 34 26 Q 50 34, 66 26" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />

            {/* Distal Femur Metaphysis / Condylar cross-section */}
            <path
              d="M 24 50 Q 50 42, 76 50 Q 82 72, 68 84 Q 50 78, 32 84 Q 18 72, 24 50 Z"
              fill="#182332"
              stroke="#33475D"
              strokeWidth="0.8"
            />
            {/* Trochlear Cartilage */}
            <path d="M 28 48 Q 50 42, 72 48" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />

            {/* Retinacular Bands */}
            <path d="M 28 22 L 20 48" stroke="#334155" strokeWidth="1.2" />
            <path d="M 72 22 L 80 48" stroke="#334155" strokeWidth="1.2" />

            {/* Popliteal Vessels & Baker's pouch (Posteromedial) */}
            <circle cx="50" cy="88" r="3" fill="#ef4444" opacity="0.6" />
            <circle cx="55" cy="87" r="3" fill="#3b82f6" opacity="0.6" />

            {/* Baker Cyst */}
            {currentSliceData.pathologyHighlights?.some(h => h.abnormality === "Baker's") && (
              <path
                d="M 62 70 Q 78 68, 76 86 Q 64 88, 62 70 Z"
                fill="#10b981"
                opacity="0.8"
                stroke="#34d399"
                strokeWidth="0.8"
              />
            )}
          </g>
        )}

        {/* Grad-CAM Saliency / AI Attention Heatmap Overlay */}
        {showHeatmap && currentSliceData.pathologyHighlights && currentSliceData.pathologyHighlights.length > 0 && (
          <g id="gradcam-overlay" opacity="0.85">
            {currentSliceData.pathologyHighlights.map((hl, i) => (
              <g key={i}>
                <radialGradient id={`heatmapGrad-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff0055" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#ffaa00" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#00E5FF" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                </radialGradient>
                <circle
                  cx={hl.x}
                  cy={hl.y}
                  r={hl.radius * 1.5}
                  fill={`url(#heatmapGrad-${i})`}
                  className="animate-pulse"
                />
              </g>
            ))}
          </g>
        )}

        {/* Vector Target Marker & Focus Ring */}
        {showAnnotations && currentSliceData.pathologyHighlights && (
          <g id="pathology-annotations">
            {currentSliceData.pathologyHighlights.map((hl, i) => {
              const isSelected = activeAbnormality === hl.abnormality;
              return (
                <g key={i} className="cursor-pointer" onClick={() => onSelectAbnormality?.(hl.abnormality)}>
                  {/* Trajectory dashed guide line */}
                  <line
                    x1={hl.x - 12}
                    y1={hl.y - 12}
                    x2={hl.x}
                    y2={hl.y}
                    stroke="#FF3B5C"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                  {/* Red circular focus ring */}
                  <circle
                    cx={hl.x}
                    cy={hl.y}
                    r={hl.radius}
                    fill="none"
                    stroke={isSelected ? '#00E5FF' : '#FF3B5C'}
                    strokeWidth={isSelected ? '2.4' : '1.4'}
                    strokeDasharray={isSelected ? 'none' : '3,2'}
                  />
                  {/* Center Target Point */}
                  <circle cx={hl.x} cy={hl.y} r="2.2" fill={isSelected ? '#00E5FF' : '#FF3B5C'} />
                  {/* Target Pill */}
                  <rect
                    x={hl.x - 12}
                    y={hl.y - hl.radius - 8}
                    width="24"
                    height="7"
                    rx="2"
                    fill="#06080B"
                    stroke={isSelected ? '#00E5FF' : '#FF3B5C'}
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                  <text
                    x={hl.x}
                    y={hl.y - hl.radius - 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="3.6"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {hl.abnormality}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Caliper Measurement Drawing */}
        {measurePoints.length > 0 && (
          <g id="caliper-group">
            {measurePoints.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="2" fill="#00E5FF" stroke="#ffffff" strokeWidth="0.6" />
            ))}
            {measurePoints.length === 2 && (
              <g>
                <line
                  x1={measurePoints[0].x}
                  y1={measurePoints[0].y}
                  x2={measurePoints[1].x}
                  y2={measurePoints[1].y}
                  stroke="#00E5FF"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
                <rect
                  x={(measurePoints[0].x + measurePoints[1].x) / 2 - 12}
                  y={(measurePoints[0].y + measurePoints[1].y) / 2 - 6}
                  width="24"
                  height="6"
                  rx="1.5"
                  fill="#06080B"
                  stroke="#00E5FF"
                  strokeWidth="0.6"
                />
                <text
                  x={(measurePoints[0].x + measurePoints[1].x) / 2}
                  y={(measurePoints[0].y + measurePoints[1].y) / 2 - 1.8}
                  fill="#00E5FF"
                  fontSize="3.4"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {calculateDistanceMm()} mm
                </text>
              </g>
            )}
          </g>
        )}

        {/* Crosshair Cursor */}
        {showCrosshairs && (
          <g id="crosshairs" opacity="0.6" pointerEvents="none">
            <line x1="0" y1={mousePos.y} x2="100" y2={mousePos.y} stroke="#00E5FF" strokeWidth="0.4" strokeDasharray="1,1" />
            <line x1={mousePos.x} y1="0" x2={mousePos.x} y2="100" stroke="#00E5FF" strokeWidth="0.4" strokeDasharray="1,1" />
            <circle cx={mousePos.x} cy={mousePos.y} r="3" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="h-full w-full relative bg-[#07090E] text-slate-100 overflow-hidden select-none flex flex-col">
      {/* Header Toolbar - Pure horizontal layout with strict gap and truncation protection */}
      <div className="flex items-center justify-between w-full px-4 py-2 bg-slate-900/90 border-b border-slate-800 gap-2 overflow-x-auto min-w-0 shrink-0 z-30">
        {/* Left Group: Planes & Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/70 shadow-sm shrink-0">
            {(['Sagittal', 'Coronal', 'Axial'] as ViewPlane[]).map((plane, idx) => (
              <button
                key={plane}
                id={`btn-plane-${plane.toLowerCase()}`}
                onClick={() => onPlaneChange(plane)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  currentPlane === plane
                    ? 'bg-[#00E5FF] text-[#07090E] shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>{plane}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${currentPlane === plane ? 'bg-[#07090E]/20 text-[#07090E]' : 'text-slate-500'}`}>
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Ingestion Stream Fidelity Badge */}
          {onOpenIngestionModal ? (
            <button
              id="btn-hud-stream-fidelity"
              onClick={onOpenIngestionModal}
              className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border shadow-sm transition-all hover:scale-105 shrink-0 ${
                sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-amber-950/70 text-amber-300 border-amber-500/40 hover:border-amber-400'
              }`}
              title="Click to Switch Ingestion Pipeline or Upload DICOM / Film"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400 animate-pulse'
              }`} />
              <span className="whitespace-nowrap">
                {sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'PACS C-STORE (16-BIT)'
                  : 'FILM SHEET (8-BIT TILES)'}
              </span>
            </button>
          ) : (
            <div
              className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border shadow-sm shrink-0 ${
                sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`} />
              <span className="whitespace-nowrap">
                {sourceFidelity?.includes('16-bit') || ingestionStream === 'PACS_DICOM' || (!sourceFidelity && !ingestionStream)
                  ? 'PACS C-STORE (16-BIT)'
                  : 'FILM SHEET (8-BIT TILES)'}
              </span>
            </div>
          )}
        </div>

        {/* Center Group: Focus & Sequence Parameters */}
        <div className="flex items-center gap-2 shrink min-w-0">
          {/* Focus: Target Abnormality Badge (shrink-0) */}
          {activeAbnormality && (
            <div className="text-xs font-mono bg-slate-800/90 border border-rose-500/60 text-rose-400 font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              <span>Focus: {activeAbnormality}</span>
            </div>
          )}

          {/* Sequence metadata container with truncate min-w-0 shrink */}
          <div
            id="mri-sequence-param-pill"
            className="shrink min-w-0 truncate text-xs bg-slate-800/70 border border-slate-700/60 rounded-full px-3 py-1 text-slate-300 flex items-center gap-2"
            title={`${currentSliceData.sequenceName} • ${currentSliceData.thicknessMm}mm • ${currentPresetData.shortName}`}
          >
            <span className="truncate font-semibold text-slate-100 min-w-0">
              {currentSliceData.sequenceName}
            </span>
            <span className="text-slate-500 shrink-0">•</span>
            <span className="text-cyan-300 font-mono shrink-0 whitespace-nowrap">
              {currentSliceData.thicknessMm}mm
            </span>
            <span className="text-slate-500 shrink-0">•</span>
            <span className="text-cyan-400 font-mono font-bold shrink-0 whitespace-nowrap">
              {currentPresetData.shortName}
            </span>
          </div>
        </div>

        {/* Right Group: Diagnostic Summary Badge & Help */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Diagnostic Summary Badge (shrink-0 whitespace-nowrap) */}
          {abnormalCount !== undefined && (
            onToggleSidebar ? (
              <button
                id="btn-diagnostic-summary-badge"
                onClick={onToggleSidebar}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-rose-500/50 text-rose-400 text-xs font-semibold shadow-md hover:bg-slate-800 hover:border-[#00E5FF]/60 transition-all cursor-pointer group shrink-0 whitespace-nowrap"
                title={isSidebarOpen ? "Collapse sidebar into Theater Mode (T)" : "Click to re-expand Diagnostic Analysis Matrix (T)"}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                <span className="font-bold text-white group-hover:text-[#00E5FF] transition-colors whitespace-nowrap">
                  {abnormalCount > 0 ? `${abnormalCount} Abnormal` : '0 Abnormal'}
                </span>
                <span className="text-slate-600 shrink-0">|</span>
                <span className="text-[#00E5FF] font-mono font-bold whitespace-nowrap">
                  AUC: {macroAuc.toFixed(3)}
                </span>
                <ChevronLeft className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform shrink-0 ${!isSidebarOpen ? 'group-hover:-translate-x-0.5' : 'rotate-180 group-hover:translate-x-0.5'}`} />
              </button>
            ) : (
              <div
                id="status-diagnostic-summary-badge"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-rose-500/50 text-rose-400 text-xs font-semibold shadow-md shrink-0 whitespace-nowrap"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                <span className="font-bold text-white whitespace-nowrap">
                  {abnormalCount > 0 ? `${abnormalCount} Abnormal` : '0 Abnormal'}
                </span>
                <span className="text-slate-600 shrink-0">|</span>
                <span className="text-[#00E5FF] font-mono font-bold whitespace-nowrap">
                  AUC: {macroAuc.toFixed(3)}
                </span>
              </div>
            )
          )}

          {/* Floating ? Help & Shortcuts Button */}
          <button
            id="btn-viewer-keyboard-help"
            onClick={() => setIsHelpModalOpen(true)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-[#00E5FF] border border-slate-700/60 shadow-sm transition-all shrink-0 cursor-pointer"
            title="Keyboard Shortcuts & Workstation Navigation (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        id="mri-viewport-container"
        className="relative w-full flex-1 min-h-0 bg-[#07090E] overflow-hidden flex items-center justify-center select-none"
        onMouseMove={handleMouseMoveViewport}
        onMouseUp={handleMouseUpViewport}
      >
        {/* Dedicated Left Floating Dock for Zoom & Viewport Tools */}
        <div
          id="mri-viewport-tool-dock"
          className="absolute left-4 top-16 z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            id="btn-zoom-out"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            id="btn-zoom-reset"
            onClick={handleResetZoom}
            title="Reset View"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-fit-view"
            onClick={handleFitView}
            title="Fit to Screen"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Zoom Level Indicator */}
          {zoom !== 1 && (
            <div className="text-[9px] font-mono text-cyan-300 font-bold text-center px-1.5 py-0.5 bg-cyan-950/40 rounded border border-cyan-500/30 select-none">
              {(zoom * 100).toFixed(0)}%
            </div>
          )}
        </div>

        {/* Transformed Stage for SVG MRI Canvas */}
        <div
          id="mri-canvas-stage"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transition: isDraggingPanRef.current ? 'none' : 'transform 0.15s ease-out'
          }}
          className={`w-full h-full flex items-center justify-center p-3 sm:p-4 overflow-hidden ${
            zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDownCanvas}
        >
          <svg
            viewBox="0 0 100 100"
            id="mri-primary-svg"
            className={`w-full h-full object-contain cursor-crosshair transition-transform ${
              !isSidebarOpen
                ? 'max-w-[720px] max-h-[720px] xl:max-w-[780px] xl:max-h-[780px] 2xl:max-w-[860px] 2xl:max-h-[860px]'
                : 'max-w-[580px] max-h-[580px] xl:max-w-[640px] xl:max-h-[640px]'
            }`}
            style={getFilterStyles(wlPreset, invert, activeWw, activeWl)}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
          >
            {renderMriVisual()}

            {/* Visual Feedback: Non-obscuring Anatomical Focal Reticle */}
            {currentSliceData.pathologyHighlights?.map((hl, i) => {
              const isTargeted = activeAbnormality === hl.abnormality || hoveredFinding === hl.abnormality;
              if (!isTargeted && !showAnnotations) return null;
              return (
                <g key={`feedback-reticle-${i}`} className="pointer-events-none transition-all duration-200">
                  {/* Hairline subtle outer ring */}
                  <circle
                    cx={hl.x}
                    cy={hl.y}
                    r={hl.radius + 2.5}
                    fill="none"
                    stroke={isTargeted ? '#00E5FF' : '#FF3B5C'}
                    strokeWidth="0.9"
                    strokeDasharray="2,2"
                    opacity={isTargeted ? 0.95 : 0.6}
                    className={isTargeted ? 'animate-pulse' : ''}
                  />
                  {/* Non-obscuring Hairline Reticle Ticks (Leaves internal anatomy 100% visible) */}
                  <line x1={hl.x} y1={hl.y - hl.radius - 4} x2={hl.x} y2={hl.y - hl.radius - 1} stroke={isTargeted ? '#00E5FF' : '#FF3B5C'} strokeWidth="0.8" />
                  <line x1={hl.x} y1={hl.y + hl.radius + 1} x2={hl.x} y2={hl.y + hl.radius + 4} stroke={isTargeted ? '#00E5FF' : '#FF3B5C'} strokeWidth="0.8" />
                  <line x1={hl.x - hl.radius - 4} y1={hl.y} x2={hl.x - hl.radius - 1} y2={hl.y} stroke={isTargeted ? '#00E5FF' : '#FF3B5C'} strokeWidth="0.8" />
                  <line x1={hl.x + hl.radius + 1} y1={hl.y} x2={hl.x + hl.radius + 4} y2={hl.y} stroke={isTargeted ? '#00E5FF' : '#FF3B5C'} strokeWidth="0.8" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Minimal Scrubbing Toast (Visible only when actively scrubbing) */}
        {isScrubbing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-[#00E5FF]/50 text-white font-mono text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none backdrop-blur-md flex items-center gap-2 z-20">
            <span className="text-[#00E5FF] font-bold">Slice {sliceIndex} of {totalSlices}</span>
            {currentSliceData.findings && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 truncate max-w-xs">{currentSliceData.findings}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Anchored Bottom Edge Scrubber & Workstation Controls Bar */}
      <div className="w-full bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 shrink-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
        {/* Left Part: Play/Pause, Step Controls, Scrubber Slider & Slice Counter */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
          {/* Play/Pause High-Contrast Button */}
          <button
            id="btn-hud-play-pause"
            onClick={() => setIsPlaying(p => !p)}
            className={`p-2 rounded-xl transition-all shrink-0 border shadow-sm ${
              isPlaying
                ? 'bg-[#00E5FF] text-[#07090E] border-[#00E5FF] shadow-[#00E5FF]/20 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-[#00E5FF] border-slate-700'
            }`}
            title={isPlaying ? "Pause Cine Playback (Space)" : "Play Cine Loop (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Prev / Next Step Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              id="btn-hud-slice-prev"
              onClick={() => setSliceIndex(prev => Math.max(1, prev - 1))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous Slice (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-hud-slice-next"
              onClick={() => setSliceIndex(prev => Math.min(totalSlices, prev + 1))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Next Slice (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Slice Scrubber Line with High-Contrast Active State */}
          <div className="flex-1 flex items-center gap-2 min-w-[120px]">
            <input
              type="range"
              id="mri-slice-slider-hud"
              min="1"
              max={totalSlices}
              value={sliceIndex}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              onTouchStart={() => setIsScrubbing(true)}
              onTouchEnd={() => setIsScrubbing(false)}
              onChange={e => setSliceIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-[#00E5FF] transition-colors"
            />
          </div>

          {/* High-Visibility Slice Label */}
          <div className="font-mono text-xs font-bold text-white shrink-0 min-w-[85px] text-right tracking-tight bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            Slice {sliceIndex} / {totalSlices}
          </div>
        </div>

        {/* Right Part: Window Preset Selector, CAM Toggle & Annotations Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Finding sub-label if present */}
          {currentSliceData.findings && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-300 max-w-[220px] truncate font-medium bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] shrink-0" />
              <span className="truncate">{currentSliceData.findings}</span>
            </div>
          )}

          {/* Window Preset Selector */}
          <select
            id="select-hud-window"
            value={wlPreset}
            onChange={e => handleSelectPreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-600 shrink-0"
            title="Windowing Preset (W)"
          >
            <option value="SoftTissue">Soft Tissue</option>
            <option value="Bone">Bone</option>
            <option value="MAR">MAR</option>
            <option value="STIR">STIR</option>
            <option value="Cartilage">Cartilage</option>
          </select>

          {/* Attention Heatmap (Grad-CAM) Toggle with High-Contrast Active State */}
          <button
            id="btn-hud-toggle-cam"
            onClick={() => setShowHeatmap(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              showHeatmap
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-sm shadow-rose-950 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Attention Heatmap (Grad-CAM) [C]"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs">CAM</span>
          </button>
        </div>
      </div>

      {/* SLEEK DARK-GLASS KEYBOARD SHORTCUTS HUD & HELP MODAL */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0E17] border border-slate-700/80 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#00E5FF15] text-[#00E5FF] border border-[#00E5FF33]">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Workstation Keyboard Shortcuts
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-speed navigation for radiologists & judges
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Play / Pause Cine Loop</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                  Space
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Step Slice by Slice</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    ←
                  </kbd>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    →
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Switch MRI Planes (Sag / Cor / Ax)</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    1
                  </kbd>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    2
                  </kbd>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    3
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Toggle Grad-CAM Heatmap</span>
                <kbd className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                  C
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Cycle Window / Level Presets</span>
                <kbd className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                  W
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Toggle Theater Mode (100% Canvas)</span>
                <kbd className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                  T
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Toggle Fullscreen Display</span>
                <kbd className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                  F
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D131F] border border-slate-800">
                <span className="text-slate-300 font-medium">Open / Close Help Overlay</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    ?
                  </kbd>
                  <span className="text-slate-500 font-mono">or</span>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-lg text-white font-mono text-[11px] border border-slate-700 shadow-sm">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-2 bg-[#00E5FF] text-[#07090E] font-bold text-xs rounded-xl shadow-md transition-all hover:brightness-110"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


