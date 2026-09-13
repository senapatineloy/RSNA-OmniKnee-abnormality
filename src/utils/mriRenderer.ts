export type WindowLevelPreset =
  | 'SoftTissue'
  | 'Bone'
  | 'MAR'
  | 'STIR'
  | 'Cartilage'
  | 'Default';

export interface WindowLevelPresetConfig {
  name: string;
  shortName: string;
  windowWidth: number;
  windowLevel: number;
  description: string;
  optimizedPathologies: string[];
}

export const WL_PRESETS: Record<WindowLevelPreset, WindowLevelPresetConfig> = {
  SoftTissue: {
    name: 'Soft Tissue (Ligaments / Menisci)',
    shortName: 'Soft Tissue',
    windowWidth: 90,
    windowLevel: 52,
    description: 'High contrast for cruciate & collateral ligaments, meniscal horns, and tendon slips',
    optimizedPathologies: ['ACL Tear', 'PCL Tear', 'Medial Meniscus', 'Lateral Meniscus', 'MCL / LCL Sprain']
  },
  Bone: {
    name: 'Bone / Cortical Sclerosis',
    shortName: 'Bone',
    windowWidth: 160,
    windowLevel: 42,
    description: 'Wide dynamic range for trabecular bone, subchondral sclerosis, marrow contusions & fractures',
    optimizedPathologies: ['Bone Contusion / Fracture', 'Subchondral Sclerosis', 'Osteophytes', 'Tibial Plateau']
  },
  MAR: {
    name: 'Metal Artifact Reduction (MARS)',
    shortName: 'Metal Artifact Reduction',
    windowWidth: 220,
    windowLevel: 38,
    description: 'Suppresses susceptibility blooming, hardware flare & gradient distortion around metallic anchors or implants',
    optimizedPathologies: ['Post-Surgical Hardware', 'ACL Interference Screws', 'Knee Arthroplasty', 'Suture Anchors']
  },
  STIR: {
    name: 'Fluid Sensitive / STIR',
    shortName: 'Fluid / STIR',
    windowWidth: 75,
    windowLevel: 72,
    description: 'Emphasizes joint effusion, synovitis, popliteal Baker cysts, and high-signal marrow edema',
    optimizedPathologies: ['Joint Effusion', 'Baker Cyst', 'Synovial Thickening', 'Bone Marrow Edema']
  },
  Cartilage: {
    name: 'Cartilage Detail',
    shortName: 'Cartilage',
    windowWidth: 85,
    windowLevel: 56,
    description: 'Specialized intermediate contrast for articular surface thinning, chondral defects & wear',
    optimizedPathologies: ['Medial Cartilage Defect', 'Lateral Cartilage Wear', 'Patellofemoral Chondromalacia']
  },
  Default: {
    name: 'Standard / Proton Density',
    shortName: 'Standard',
    windowWidth: 100,
    windowLevel: 50,
    description: 'Balanced baseline contrast for general musculoskeletal survey',
    optimizedPathologies: ['General Knee Survey', 'Multi-Compartment Assessment']
  }
};

export function getFilterStyles(
  presetKey: WindowLevelPreset,
  isInverted: boolean,
  customWidth?: number | null,
  customLevel?: number | null
): { filter: string } {
  const preset = WL_PRESETS[presetKey] || WL_PRESETS.Default;
  const width = customWidth ?? preset.windowWidth ?? 100;
  const level = customLevel ?? preset.windowLevel ?? 50;

  const contrastPct = (120 / width) * 100;
  const brightnessPct = (level / 50) * 100;
  const invertStr = isInverted ? 'invert(100%)' : '';

  let extra = '';
  if (presetKey === 'MAR') extra = 'saturate(85%)';
  else if (presetKey === 'Bone') extra = 'contrast(108%)';
  else if (presetKey === 'SoftTissue') extra = 'contrast(104%)';

  const filterString = [
    `contrast(${contrastPct.toFixed(1)}%)`,
    `brightness(${brightnessPct.toFixed(1)}%)`,
    extra,
    invertStr
  ]
    .filter(Boolean)
    .join(' ');

  return { filter: filterString };
}
