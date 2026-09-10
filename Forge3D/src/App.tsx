import { Loader2 } from 'lucide-react'
import { Viewport } from './render/Viewport'
import { TopBar } from './ui/TopBar'
import { ToolRail } from './ui/ToolRail'
import { Outliner } from './ui/panels/Outliner'
import { RightPanel } from './ui/RightPanel'
import { StatusBar } from './ui/StatusBar'
import { EditToolbar } from './ui/EditToolbar'
import { Toasts } from './ui/Toasts'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { ProjectsDialog } from './ui/dialogs/ProjectsDialog'
import { ShortcutsDialog } from './ui/dialogs/ShortcutsDialog'
import { useUIStore } from './state/uiStore'
import { useShortcuts } from './hooks/useShortcuts'
import { useAutosave } from './hooks/useAutosave'

export default function App() {
  const showOutliner = useUIStore((s) => s.showOutliner)
  const showProperties = useUIStore((s) => s.showProperties)
  const dialog = useUIStore((s) => s.dialog)
  const busy = useUIStore((s) => s.busy)

  useShortcuts()
  const boot = useAutosave()

  return (
    <div className="flex h-full w-full flex-col bg-shell text-ink">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <ToolRail />

        {showOutliner && (
          <aside className="flex w-[248px] shrink-0 flex-col border-r border-line bg-panel">
            <Outliner />
          </aside>
        )}

        <main className="relative min-w-0 flex-1 bg-shell">
          <ErrorBoundary title="The 3D viewport could not start">
            <Viewport />
          </ErrorBoundary>
          <EditToolbar />
          <Toasts />

          {boot === 'loading' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-shell text-xs text-dim">
              <Loader2 size={14} className="animate-spin" />
              Restoring workspace…
            </div>
          )}

          {busy && (
            <div className="fade-in pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2 rounded border border-line-strong bg-panel/95 px-2.5 py-1.5 text-2xs text-muted shadow-pop">
              <Loader2 size={12} className="animate-spin" />
              {busy}
            </div>
          )}
        </main>

        {showProperties && <RightPanel />}
      </div>

      <StatusBar />

      {dialog === 'projects' && <ProjectsDialog />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
    </div>
  )
}
