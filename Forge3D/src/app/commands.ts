import type { ObjectKind } from '../core/types'
import { topLevelSelection, useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import {
  bevelVertices,
  deleteElements,
  extrudeFaces,
  insetFaces,
  selectionVertices,
  subdivideFaces,
} from '../modeling/operations'
import { flipNormals } from '../modeling/operations'
import { buildEdges } from '../modeling/mesh'
import { deleteProject, listProjects, loadProject, makeRecord, newProjectId, saveProject, writeMeta } from '../persistence/db'
import { exportProjectJson, exportScene, type ExportFormat } from '../io/exporters'
import { IMPORT_ACCEPT, importFile, pickFiles } from '../io/importers'
import { frameSelection } from '../render/viewportApi'

const scene = () => useSceneStore.getState()
const ui = () => useUIStore.getState()

const note = (text: string) => {
  ui().setLastAction(text)
}

const fail = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : fallback
  ui().toast(message, 'error')
  note(message)
}

/* ---------------------------------------------------------------- objects */

export function addPrimitive(kind: ObjectKind) {
  const id = scene().addObject(kind)
  note(`Added ${scene().objects[id]?.name ?? kind}`)
  return id
}

export function duplicateSelection() {
  const ids = scene().selection
  if (!ids.length) return
  const created = scene().duplicateObjects(ids)
  note(`Duplicated ${created.length} object${created.length === 1 ? '' : 's'}`)
}

export function deleteSelection() {
  const ids = scene().selection
  if (!ids.length) return
  scene().deleteObjects(ids)
  if (ui().editTarget && !scene().objects[ui().editTarget!]) ui().exitEdit()
  note(`Deleted ${ids.length} object${ids.length === 1 ? '' : 's'}`)
}

export function groupSelection() {
  const state = scene()
  const roots = topLevelSelection(state.objects, state.selection)
  if (roots.length < 1) {
    ui().toast('Select at least one object to group.', 'error')
    return
  }
  state.addGroup(roots)
  note(`Grouped ${roots.length} object${roots.length === 1 ? '' : 's'}`)
}

export function ungroupSelection() {
  const state = scene()
  const groups = state.selection.filter((id) => state.objects[id]?.kind === 'group')
  if (!groups.length) {
    ui().toast('Select a group to ungroup.', 'error')
    return
  }
  state.ungroupObjects(groups)
  note(`Ungrouped ${groups.length} group${groups.length === 1 ? '' : 's'}`)
}

export function copySelection() {
  scene().copy()
  const count = scene().clipboard.length
  note(count ? `Copied ${count} object${count === 1 ? '' : 's'}` : 'Nothing to copy')
}

export function pasteClipboard() {
  const created = scene().paste()
  note(created.length ? `Pasted ${created.length} object${created.length === 1 ? '' : 's'}` : 'Clipboard is empty')
}

export function undo() {
  if (!scene().past.length) {
    note('Nothing to undo')
    return
  }
  scene().undo()
  note('Undo')
}

export function redo() {
  if (!scene().future.length) {
    note('Nothing to redo')
    return
  }
  scene().redo()
  note('Redo')
}

/* ------------------------------------------------------------- edit mode */

export function toggleEditMode() {
  const state = ui()
  if (state.mode === 'edit') {
    state.exitEdit()
    note('Object mode')
    return
  }
  const target = scene().selection.find((id) => scene().objects[id]?.mesh)
  if (!target) {
    ui().toast('Select a mesh object to edit.', 'error')
    return
  }
  state.enterEdit(target)
  note(`Editing ${scene().objects[target]?.name}`)
}

function requireEditContext() {
  const { editTarget, elementSelection, elementMode } = ui()
  if (!editTarget) return null
  const mesh = scene().objects[editTarget]?.mesh
  if (!mesh) return null
  return { editTarget, mesh, elementSelection, elementMode }
}

export function selectAllElements() {
  const ctx = requireEditContext()
  if (!ctx) return
  const { mesh, elementMode } = ctx
  if (elementMode === 'vertex') {
    ui().setElementSelection({ vertices: mesh.vertices.map((_, i) => i), edges: [], faces: [] })
  } else if (elementMode === 'edge') {
    ui().setElementSelection({ vertices: [], edges: buildEdges(mesh).map((e) => e.key), faces: [] })
  } else {
    ui().setElementSelection({ vertices: [], edges: [], faces: mesh.faces.map((_, i) => i) })
  }
  note('Selected all elements')
}

export function extrudeSelection() {
  const ctx = requireEditContext()
  if (!ctx) return
  if (!ctx.elementSelection.faces.length) {
    ui().toast('Extrude needs a face selection.', 'error')
    return
  }
  scene().record()
  const result = extrudeFaces(ctx.mesh, ctx.elementSelection.faces, ui().opAmounts.extrude)
  scene().updateMesh(ctx.editTarget, result.mesh)
  ui().setElementSelection(result.selection)
  note(`Extruded ${ctx.elementSelection.faces.length} face(s)`)
}

export function insetSelection() {
  const ctx = requireEditContext()
  if (!ctx) return
  if (!ctx.elementSelection.faces.length) {
    ui().toast('Inset needs a face selection.', 'error')
    return
  }
  scene().record()
  const result = insetFaces(ctx.mesh, ctx.elementSelection.faces, ui().opAmounts.inset)
  scene().updateMesh(ctx.editTarget, result.mesh)
  ui().setElementSelection(result.selection)
  note(`Inset ${ctx.elementSelection.faces.length} face(s)`)
}

export function bevelSelection() {
  const ctx = requireEditContext()
  if (!ctx) return
  const verts = selectionVertices(ctx.mesh, ctx.elementSelection)
  if (!verts.length) {
    ui().toast('Bevel needs a vertex, edge or face selection.', 'error')
    return
  }
  scene().record()
  const result = bevelVertices(ctx.mesh, verts, ui().opAmounts.bevel)
  scene().updateMesh(ctx.editTarget, result.mesh)
  ui().setElementMode('face')
  ui().setElementSelection(result.selection)
  note(`Bevelled ${verts.length} vertex/vertices`)
}

export function subdivideSelection() {
  const ctx = requireEditContext()
  if (!ctx) return
  const faces = ctx.elementSelection.faces.length
    ? ctx.elementSelection.faces
    : ctx.mesh.faces.map((_, i) => i)
  scene().record()
  const result = subdivideFaces(ctx.mesh, faces)
  scene().updateMesh(ctx.editTarget, result.mesh)
  ui().setElementSelection(result.selection)
  note(`Subdivided ${faces.length} face(s)`)
}

export function flipSelectionNormals() {
  const ctx = requireEditContext()
  if (ctx) {
    scene().record()
    scene().updateMesh(ctx.editTarget, flipNormals(ctx.mesh, ctx.elementSelection.faces))
    note('Flipped normals')
    return
  }
  const ids = scene().selection.filter((id) => scene().objects[id]?.mesh)
  if (!ids.length) return
  scene().record()
  for (const id of ids) {
    const mesh = scene().objects[id]?.mesh
    if (mesh) scene().updateMesh(id, flipNormals(mesh))
  }
  note('Flipped normals')
}

export function deleteElementSelection() {
  const ctx = requireEditContext()
  if (!ctx) return
  const { elementSelection, elementMode } = ctx
  const count =
    elementMode === 'vertex'
      ? elementSelection.vertices.length
      : elementMode === 'edge'
        ? elementSelection.edges.length
        : elementSelection.faces.length
  if (!count) {
    ui().toast('Nothing selected to delete.', 'error')
    return
  }
  scene().record()
  const result = deleteElements(ctx.mesh, elementSelection, elementMode)
  scene().updateMesh(ctx.editTarget, result.mesh)
  ui().setElementSelection(result.selection)
  note(`Deleted ${count} ${elementMode}${count === 1 ? '' : 's'}`)
}

/* ----------------------------------------------------------- persistence */

export async function saveCurrentProject(nameOverride?: string) {
  const state = scene()
  const id = state.projectId ?? newProjectId()
  const name = nameOverride?.trim() || state.projectName
  try {
    ui().setBusy('Saving project…')
    const existing = state.projectId ? await loadProject(state.projectId) : undefined
    await saveProject(makeRecord(id, name, state.snapshot(), existing?.createdAt))
    await writeMeta('lastProjectId', id)
    useSceneStore.getState().markSaved(id, name)
    ui().toast(`Saved "${name}"`, 'success')
    note(`Saved "${name}"`)
  } catch (error) {
    fail(error, 'Could not save the project.')
  } finally {
    ui().setBusy(null)
  }
}

export async function openProjectById(id: string) {
  try {
    ui().setBusy('Opening project…')
    const record = await loadProject(id)
    if (!record) throw new Error('That project no longer exists.')
    useUIStore.getState().exitEdit()
    useSceneStore.getState().loadSnapshot(record.scene, record.id, record.name)
    await writeMeta('lastProjectId', record.id)
    frameSelection()
    ui().toast(`Opened "${record.name}"`, 'success')
    note(`Opened "${record.name}"`)
  } catch (error) {
    fail(error, 'Could not open the project.')
  } finally {
    ui().setBusy(null)
  }
}

export async function removeProject(id: string) {
  try {
    await deleteProject(id)
    if (scene().projectId === id) useSceneStore.setState({ projectId: null, dirty: true })
    note('Project deleted')
  } catch (error) {
    fail(error, 'Could not delete the project.')
  }
}

export async function fetchProjects() {
  try {
    return await listProjects()
  } catch (error) {
    fail(error, 'Could not read local projects.')
    return []
  }
}

export function newProject() {
  useUIStore.getState().exitEdit()
  useSceneStore.getState().newScene()
  void writeMeta('lastProjectId', null)
  note('New project')
}

export function renameProject(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  useSceneStore.setState({ projectName: trimmed, dirty: true })
  note(`Renamed project to "${trimmed}"`)
}

/* -------------------------------------------------------------- exchange */

export async function runExport(format: ExportFormat, selectionOnly = false) {
  const state = scene()
  if (!state.order.length) {
    ui().toast('The scene is empty.', 'error')
    return
  }
  try {
    ui().setBusy(`Exporting ${format.toUpperCase()}…`)
    const filename = await exportScene(
      state.snapshot(),
      format,
      state.projectName,
      selectionOnly ? state.selection : undefined,
    )
    ui().toast(`Exported ${filename}`, 'success')
    note(`Exported ${filename}`)
  } catch (error) {
    fail(error, 'Export failed.')
  } finally {
    ui().setBusy(null)
  }
}

export function exportProjectFile() {
  const state = scene()
  exportProjectJson(state.snapshot(), state.projectName)
  note('Exported project file')
}

export async function runImport() {
  const files = await pickFiles(IMPORT_ACCEPT, true)
  if (!files.length) return
  try {
    ui().setBusy('Importing…')
    let imported = 0
    for (const file of files) {
      const result = await importFile(file)
      if (result.kind === 'project' && result.project) {
        useUIStore.getState().exitEdit()
        useSceneStore.getState().loadSnapshot(result.project.scene, null, result.project.name)
        ui().toast(`Loaded project "${result.project.name}"`, 'success')
        note(`Loaded project "${result.project.name}"`)
        return
      }
      if (!result.meshes.length) throw new Error(`No geometry found in "${file.name}".`)
      const ids: string[] = []
      for (const m of result.meshes) {
        ids.push(useSceneStore.getState().addMeshObject(m.name, m.mesh, m.material))
      }
      if (ids.length > 1) useSceneStore.getState().addGroup(ids)
      imported += result.meshes.length
    }
    frameSelection()
    ui().toast(`Imported ${imported} mesh${imported === 1 ? '' : 'es'}`, 'success')
    note(`Imported ${imported} mesh${imported === 1 ? '' : 'es'}`)
  } catch (error) {
    fail(error, 'Import failed.')
  } finally {
    ui().setBusy(null)
  }
}
