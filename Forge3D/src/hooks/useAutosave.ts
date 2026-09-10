import { useEffect, useState } from 'react'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { loadProject, makeRecord, newProjectId, readMeta, saveProject, writeMeta } from '../persistence/db'
import { frameSelection } from '../render/viewportApi'

const AUTOSAVE_DELAY = 5000

export type BootState = 'loading' | 'ready' | 'error'

/** Restores the last session and keeps writing it back to IndexedDB. */
export function useAutosave() {
  const [boot, setBoot] = useState<BootState>('loading')

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        const lastId = await readMeta<string | null>('lastProjectId')
        if (cancelled) return
        if (lastId) {
          const record = await loadProject(lastId)
          if (record && !cancelled) {
            useSceneStore.getState().loadSnapshot(record.scene, record.id, record.name)
            useUIStore.getState().setLastAction(`Restored "${record.name}"`)
            requestAnimationFrame(() => frameSelection())
          }
        }
        if (!cancelled) setBoot('ready')
      } catch {
        if (!cancelled) {
          setBoot('error')
          useUIStore
            .getState()
            .toast('Local storage is unavailable — your work will not be saved automatically.', 'error')
        }
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (boot !== 'ready') return
    let timer: number | undefined

    const flush = async () => {
      const state = useSceneStore.getState()
      if (!state.dirty) return
      const id = state.projectId ?? newProjectId()
      try {
        const existing = state.projectId ? await loadProject(state.projectId) : undefined
        await saveProject(makeRecord(id, state.projectName, state.snapshot(), existing?.createdAt))
        await writeMeta('lastProjectId', id)
        useSceneStore.getState().markSaved(id, state.projectName)
        useUIStore.getState().setLastAction(`Autosaved ${new Date().toLocaleTimeString()}`)
      } catch {
        useUIStore.getState().setLastAction('Autosave failed — use File ▸ Save Project')
      }
    }

    const unsubscribe = useSceneStore.subscribe((state, previous) => {
      if (!state.dirty || state.dirty === previous.dirty) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void flush(), AUTOSAVE_DELAY)
    })

    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [boot])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (useSceneStore.getState().dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return boot
}
