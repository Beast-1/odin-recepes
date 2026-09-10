# FORGE3D

A browser-native 3D modeling workspace. Model, shade, organise and export
geometry entirely on the client — nothing is uploaded anywhere.

![stack](https://img.shields.io/badge/react-18-informational) ![stack](https://img.shields.io/badge/three.js-0.169-informational) ![stack](https://img.shields.io/badge/typescript-5.6-informational)

## Features

**Viewport** — orbit / pan / zoom, infinite grid with world axes, orientation
gizmo, perspective or orthographic camera, adjustable key / fill / rim lighting
and shadows, and three shading modes (solid, material preview, wireframe).

**Objects** — cube, sphere, cylinder, cone, torus and plane primitives;
click-to-select and multi-selection; move / rotate / scale gizmos in world or
local space with optional grid snapping; precise numeric X/Y/Z fields with
drag-scrubbing; rename, duplicate, copy/paste, delete, hide and lock; grouping
and drag-and-drop parenting in the outliner.

**Materials** — base color with swatches, metallic, roughness, opacity,
emission color and strength, flat shading and double-sided toggles, applied
across a multi-selection.

**Edit mode** — vertex, edge and face selection with extrude, inset, corner
bevel, subdivide, flip normals and delete. Element selections can be
transformed with the same gizmos as objects.

**Projects** — projects are stored in IndexedDB, autosaved five seconds after a
change, and restored on the next visit. Import and export GLB, glTF, OBJ and
STL, or round-trip a whole project as JSON.

**Undo / redo** — a 100-step history across every scene mutation, with
interaction-aware grouping so one gizmo drag is one undo step.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and emit dist/
npm run preview  # serve the production build
```

## Deploying to Cloudflare

The app is a fully static bundle.

**Workers**

```bash
npm run build
npx wrangler deploy      # uses wrangler.toml
```

**Pages** — connect the repository and set the build command to `npm run build`
and the output directory to `dist`. `public/_redirects` and `public/_headers`
are picked up automatically.

## Keyboard shortcuts

Press `?` in the app for the full list, or see `src/ui/dialogs/ShortcutsDialog.tsx`.

## Architecture

```
src/
  core/         shared types and vector math
  modeling/     mesh representation, primitive generators, modeling operations
  state/        zustand stores — scene + history, UI state
  render/       react-three-fiber viewport, object rendering, gizmos, overlays
  materials/    material defaults, palette and three.js material factory
  io/           GLB/glTF/OBJ/STL import and export, three.js bridge
  persistence/  IndexedDB project store
  app/          the command layer shared by menus, toolbars and shortcuts
  ui/           panels, primitives and dialogs
  hooks/        keyboard shortcuts, autosave
```

Geometry is stored as a face-soup `MeshData` (`vertices: Vec3[]`,
`faces: number[][]`) rather than as three.js buffers, so n-gons survive editing
and every modeling operation is a pure function from mesh to mesh. Render
buffers are derived from that, with crease-angle normal smoothing so a cube
stays sharp and a sphere stays smooth without per-primitive shading flags.
