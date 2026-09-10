import { create } from 'zustand'
import type { EditorMode, ElementMode, ShadingMode, TransformTool } from '../core/types'
import { emptySelection, type ElementSelection } from '../modeling/operations'

export type PanelId = 'outliner' | 'properties'
export type DialogId = null | 'projects' | 'shortcuts' | 'about'

export interface ToastMessage {
  id: number
  kind: 'info' | 'error' | 'success'
  text: string
}

export interface UIStore {
  tool: TransformTool
  shading: ShadingMode
  mode: EditorMode
  elementMode: ElementMode
  editTarget: string | null
  elementSelection: ElementSelection
  snapEnabled: boolean
  snapTranslate: number
  snapRotate: number
  snapScale: number
  space: 'world' | 'local'
  showOutliner: boolean
  showProperties: boolean
  showStats: boolean
  dialog: DialogId
  busy: string | null
  toasts: ToastMessage[]
  lastAction: string
  opAmounts: { extrude: number; inset: number; bevel: number }

  setTool: (tool: TransformTool) => void
  setShading: (shading: ShadingMode) => void
  enterEdit: (objectId: string) => void
  exitEdit: () => void
  setElementMode: (mode: ElementMode) => void
  setElementSelection: (selection: ElementSelection) => void
  clearElementSelection: () => void
  toggleSnap: () => void
  setSnap: (patch: Partial<Pick<UIStore, 'snapTranslate' | 'snapRotate' | 'snapScale'>>) => void
  setSpace: (space: 'world' | 'local') => void
  togglePanel: (panel: PanelId) => void
  setDialog: (dialog: DialogId) => void
  setBusy: (busy: string | null) => void
  toast: (text: string, kind?: ToastMessage['kind']) => void
  dismissToast: (id: number) => void
  setLastAction: (text: string) => void
  setOpAmount: (key: 'extrude' | 'inset' | 'bevel', value: number) => void
}

let toastId = 0

export const useUIStore = create<UIStore>((set, get) => ({
  tool: 'move',
  shading: 'material',
  mode: 'object',
  elementMode: 'vertex',
  editTarget: null,
  elementSelection: emptySelection(),
  snapEnabled: false,
  snapTranslate: 0.25,
  snapRotate: 15,
  snapScale: 0.1,
  space: 'world',
  showOutliner: true,
  showProperties: true,
  showStats: true,
  dialog: null,
  busy: null,
  toasts: [],
  lastAction: 'Ready',
  opAmounts: { extrude: 0.25, inset: 0.1, bevel: 0.08 },

  setTool: (tool) => set({ tool }),
  setShading: (shading) => set({ shading }),
  enterEdit: (objectId) => set({ mode: 'edit', editTarget: objectId, elementSelection: emptySelection() }),
  exitEdit: () => set({ mode: 'object', editTarget: null, elementSelection: emptySelection() }),
  setElementMode: (elementMode) => set({ elementMode, elementSelection: emptySelection() }),
  setElementSelection: (elementSelection) => set({ elementSelection }),
  clearElementSelection: () => set({ elementSelection: emptySelection() }),
  toggleSnap: () => {
    const snapEnabled = !get().snapEnabled
    set({ snapEnabled, lastAction: snapEnabled ? 'Grid snapping on' : 'Grid snapping off' })
  },
  setSnap: (patch) => set(patch),
  setSpace: (space) => set({ space }),
  togglePanel: (panel) =>
    set(panel === 'outliner' ? { showOutliner: !get().showOutliner } : { showProperties: !get().showProperties }),
  setDialog: (dialog) => set({ dialog }),
  setBusy: (busy) => set({ busy }),

  toast: (text, kind = 'info') => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, kind, text }] })
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3200)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setLastAction: (lastAction) => set({ lastAction }),
  setOpAmount: (key, value) => set({ opAmounts: { ...get().opAmounts, [key]: value } }),
}))
