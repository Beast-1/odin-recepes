import { useState } from 'react'
import { Box, Palette, Sun } from 'lucide-react'
import { Properties } from './panels/Properties'
import { MaterialPanel } from './panels/MaterialPanel'
import { EnvironmentPanel } from './panels/EnvironmentPanel'

const TABS = [
  { id: 'object', label: 'Object', icon: <Box size={13} /> },
  { id: 'material', label: 'Material', icon: <Palette size={13} /> },
  { id: 'world', label: 'World', icon: <Sun size={13} /> },
] as const

type TabId = (typeof TABS)[number]['id']

export function RightPanel() {
  const [tab, setTab] = useState<TabId>('object')
  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex h-8 shrink-0 items-stretch border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 text-2xs font-semibold uppercase tracking-[0.07em] transition-colors focus-ring ${
              tab === t.id
                ? 'border-b-accent text-ink'
                : 'border-b-transparent text-dim hover:bg-hover hover:text-muted'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'object' && <Properties />}
        {tab === 'material' && <MaterialPanel />}
        {tab === 'world' && <EnvironmentPanel />}
      </div>
    </aside>
  )
}
