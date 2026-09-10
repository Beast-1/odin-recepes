import { useEffect, useState } from 'react'
import { Boxes, Clock, FilePlus, FolderOpen, HardDrive, Loader2, Save, Trash2 } from 'lucide-react'
import type { ProjectRecord } from '../../core/types'
import { useSceneStore } from '../../state/sceneStore'
import { useUIStore } from '../../state/uiStore'
import { Modal } from './Modal'
import { Button } from '../primitives/Button'
import { EmptyState } from '../primitives/Panel'
import * as cmd from '../../app/commands'

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function ProjectsDialog() {
  const setDialog = useUIStore((s) => s.setDialog)
  const currentId = useSceneStore((s) => s.projectId)
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const refresh = () => {
    setProjects(null)
    void cmd.fetchProjects().then(setProjects)
  }

  useEffect(refresh, [])

  const close = () => setDialog(null)

  return (
    <Modal title="Projects" subtitle="Stored locally in this browser via IndexedDB" onClose={close} width={620}>
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <Button
          icon={<Save size={13} />}
          onClick={() => {
            void cmd.saveCurrentProject().then(refresh)
          }}
        >
          Save Current
        </Button>
        <Button
          icon={<FilePlus size={13} />}
          onClick={() => {
            cmd.newProject()
            close()
          }}
        >
          New Project
        </Button>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-2xs text-dim">
          <HardDrive size={12} />
          {projects ? `${projects.length} stored` : 'reading…'}
        </span>
      </div>

      {projects === null ? (
        <div className="flex items-center justify-center gap-2 py-14 text-xs text-dim">
          <Loader2 size={14} className="animate-spin" />
          Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Boxes size={26} strokeWidth={1.4} />}
          title="No saved projects yet"
          hint="Use Save Current to store this scene in your browser. Projects never leave your machine."
        />
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <li
              key={p.id}
              className={`group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover ${
                p.id === currentId ? 'bg-accent/8' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-xs font-medium text-ink">
                  {p.name}
                  {p.id === currentId && (
                    <span className="rounded bg-accent/15 px-1.5 py-px text-2xs font-semibold uppercase tracking-wide text-accent">
                      open
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-3 text-2xs text-dim">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(p.updatedAt)}
                  </span>
                  <span>{Object.keys(p.scene.objects).length} objects</span>
                </p>
              </div>

              {confirming === p.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-2xs text-dim">Delete?</span>
                  <Button
                    variant="danger"
                    onClick={() => {
                      void cmd.removeProject(p.id).then(() => {
                        setConfirming(null)
                        refresh()
                      })
                    }}
                  >
                    Confirm
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    icon={<FolderOpen size={13} />}
                    onClick={() => {
                      void cmd.openProjectById(p.id).then(close)
                    }}
                  >
                    Open
                  </Button>
                  <Button variant="danger" onClick={() => setConfirming(p.id)} aria-label={`Delete ${p.name}`}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
