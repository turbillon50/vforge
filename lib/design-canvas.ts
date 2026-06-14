export interface DesignPreset {
  id: string; name: string; contrast: number; brightness: number;
  accent: string; density: 'compact'|'normal'|'spacious';
  iconStyle: 'filled'|'outline'; contentMode: 'live'|'demo';
}

export const DEFAULT_PRESET: DesignPreset = {
  id:'linear-default', name:'Linear Default', contrast:1.0, brightness:50,
  accent:'#7c3aed', density:'normal', iconStyle:'filled', contentMode:'live'
}

export const PRESETS: DesignPreset[] = [
  { ...DEFAULT_PRESET },
  { id:'high-contrast', name:'Alto Contraste', contrast:1.35, brightness:45, accent:'#7c3aed', density:'normal', iconStyle:'outline', contentMode:'live' },
  { id:'midnight', name:'Midnight', contrast:0.85, brightness:28, accent:'#6d28d9', density:'compact', iconStyle:'filled', contentMode:'live' },
  { id:'bright-day', name:'Dia Brillante', contrast:1.1, brightness:82, accent:'#7c3aed', density:'spacious', iconStyle:'outline', contentMode:'live' },
]

export function applyDesignPreset(preset: DesignPreset): void {
  const root = document.documentElement
  const isDark = root.getAttribute('data-theme') !== 'light'
  const c = preset.contrast
  if (isDark) {
    root.style.setProperty('--fg-primary',   `rgba(255,255,255,${Math.min(0.97,0.92*c)})`)
    root.style.setProperty('--fg-secondary', `rgba(255,255,255,${Math.min(0.90,0.68*c)})`)
    root.style.setProperty('--fg-tertiary',  `rgba(255,255,255,${Math.min(0.80,0.48*c)})`)
    root.style.setProperty('--fg-muted',     `rgba(255,255,255,${Math.min(0.60,0.30*c)})`)
    root.style.setProperty('--fg-subtle',    `rgba(255,255,255,${Math.min(0.40,0.16*c)})`)
    const b = preset.brightness / 100
    const bg = [3+Math.round(17*b), 2+Math.round(14*b), 10+Math.round(30*b)]
    root.style.setProperty('--color-void',       `rgb(${bg[0]},${bg[1]},${bg[2]})`)
    root.style.setProperty('--color-background', `rgb(${bg[0]+7},${bg[1]+6},${bg[2]+4})`)
    root.style.setProperty('--color-surface',    `rgb(${bg[0]+13},${bg[1]+11},${bg[2]+14})`)
    root.style.setProperty('--color-surface-low',`rgb(${bg[0]+20},${bg[1]+17},${bg[2]+21})`)
  } else {
    root.style.setProperty('--fg-primary',   `rgba(10,10,20,${Math.min(0.97,0.92*c)})`)
    root.style.setProperty('--fg-secondary', `rgba(10,10,20,${Math.min(0.85,0.68*c)})`)
    root.style.setProperty('--fg-tertiary',  `rgba(10,10,20,${Math.min(0.70,0.48*c)})`)
    root.style.setProperty('--fg-muted',     `rgba(10,10,20,${Math.min(0.55,0.30*c)})`)
    root.style.setProperty('--fg-subtle',    `rgba(10,10,20,${Math.min(0.35,0.16*c)})`)
  }
  root.style.setProperty('--color-violet-500', preset.accent)
  const densityMap = {compact:'0.625rem', normal:'1rem', spacious:'1.375rem'}
  root.style.setProperty('--spacing-nav', densityMap[preset.density])
  localStorage.setItem('vf-design-preset', JSON.stringify(preset))
}

export function loadDesignPreset(): DesignPreset {
  try {
    const s = localStorage.getItem('vf-design-preset')
    if (s) return {...DEFAULT_PRESET, ...JSON.parse(s)}
  } catch {}
  return DEFAULT_PRESET
}
