import { useEffect } from 'react'
import type { ObjectKind, ShadingMode } from '../core/types'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { frameSelection, setView } from '../render/viewportApi'
import * as cmd from '../app/commands'

const SHADING_CYCLE: ShadingMode[] = ['solid', 'material', 'wireframe']
const SHIFT_PRIMITIVES: Record<string, ObjectKind> = {
  '1': 'cube',
  '2': 'sphere',
  '3': 'cylinder',
  '4': 'cone',
  '5': 'torus',
  '6': 'plane',
}

const TEXT_INPUT_TYPES = new Set(['text', 'number', 'search', 'email', 'password', 'url', 'tel', ''])

/**
 * Only real text entry should swallow shortcuts. Checkboxes, sliders and colour
 * wells keep focus after a click, and blocking on those would silently kill
 * every shortcut until the user clicked elsewhere.
 */
function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  return TEXT_INPUT_TYPES.has((el as HTMLInputElement).type.toLowerCase())
}

export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const ui = useUIStore.getState()
      if (ui.dialog && event.key !== 'Escape') return

      const scene = useSceneStore.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const stop = () => {
        event.preventDefault()
        event.stopPropagation()
      }

      if (mod) {
        switch (key) {
          case 'z':
            stop()
            event.shiftKey ? cmd.redo() : cmd.undo()
            return
          case 'y':
            stop()
            cmd.redo()
            return
          case 's':
            stop()
            void cmd.saveCurrentProject()
            return
          case 'o':
            stop()
            ui.setDialog('projects')
            return
          case 'n':
            stop()
            cmd.newProject()
            return
          case 'c':
            stop()
            cmd.copySelection()
            return
          case 'v':
            stop()
            cmd.pasteClipboard()
            return
          case 'd':
            stop()
            cmd.duplicateSelection()
            return
          case 'g':
            stop()
            event.shiftKey ? cmd.ungroupSelection() : cmd.groupSelection()
            return
          case 'a':
            stop()
            if (ui.mode === 'edit') cmd.selectAllElements()
            else scene.selectAll()
            return
          case 'b':
            stop()
            if (ui.mode === 'edit') cmd.subdivideSelection()
            return
          case '.':
            stop()
            ui.toggleSnap()
            return
          case '1':
            stop()
            ui.togglePanel('outliner')
            return
          case '2':
            stop()
            ui.togglePanel('properties')
            return
          default:
            return
        }
      }

      if (event.altKey) {
        if (key === 'n') {
          stop()
          cmd.flipSelectionNormals()
          return
        }
        if (key === 'h') {
          stop()
          useSceneStore.getState().setFlag(scene.order, 'visible', true)
          ui.setLastAction('Revealed all objects')
          return
        }
        return
      }

      if (event.shiftKey && SHIFT_PRIMITIVES[key]) {
        stop()
        cmd.addPrimitive(SHIFT_PRIMITIVES[key])
        return
      }

      switch (key) {
        case 'Escape':
          stop()
          if (ui.dialog) ui.setDialog(null)
          else if (ui.mode === 'edit') cmd.toggleEditMode()
          else scene.clearSelection()
          return
        case 'Tab':
          stop()
          cmd.toggleEditMode()
          return
        case 'q':
          stop()
          ui.setTool('select')
          return
        case 'w':
          stop()
          ui.setTool('move')
          return
        case 'e':
          stop()
          if (ui.mode === 'edit') cmd.extrudeSelection()
          else ui.setTool('rotate')
          return
        case 'r':
          stop()
          ui.setTool('scale')
          return
        case 'i':
          if (ui.mode === 'edit') {
            stop()
            cmd.insetSelection()
          }
          return
        case 'b':
          if (ui.mode === 'edit') {
            stop()
            cmd.bevelSelection()
          }
          return
        case 'z':
          stop()
          ui.setShading(SHADING_CYCLE[(SHADING_CYCLE.indexOf(ui.shading) + 1) % SHADING_CYCLE.length])
          return
        case 'x':
          stop()
          if (ui.mode === 'edit') cmd.deleteElementSelection()
          else {
            ui.setSpace(ui.space === 'world' ? 'local' : 'world')
            ui.setLastAction(`${ui.space === 'world' ? 'Local' : 'World'} gizmo space`)
          }
          return
        case 'h':
          stop()
          if (scene.selection.length) {
            useSceneStore.getState().setFlag(scene.selection, 'visible', false)
            ui.setLastAction('Hid selection')
          }
          return
        case 'f':
          stop()
          frameSelection()
          return
        case 'Home':
          stop()
          setView('home')
          return
        case 'Delete':
        case 'Backspace':
          stop()
          if (ui.mode === 'edit') cmd.deleteElementSelection()
          else cmd.deleteSelection()
          return
        case '?':
          stop()
          ui.setDialog('shortcuts')
          return
        default:
          break
      }

      if (ui.mode === 'edit') {
        if (key === '1' || key === '2' || key === '3') {
          stop()
          ui.setElementMode(key === '1' ? 'vertex' : key === '2' ? 'edge' : 'face')
        }
        return
      }

      if (key === '1') {
        stop()
        setView('front')
      } else if (key === '3') {
        stop()
        setView('right')
      } else if (key === '7') {
        stop()
        setView('top')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
