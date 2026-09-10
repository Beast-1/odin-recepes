import { useSceneStore } from '../../state/sceneStore'
import { Slider } from '../primitives/Slider'
import { Section } from '../primitives/Panel'
import { NumberField } from '../primitives/NumberField'

export function EnvironmentPanel() {
  const env = useSceneStore((s) => s.environment)
  const setEnvironment = useSceneStore((s) => s.setEnvironment)
  const record = useSceneStore((s) => s.record)

  return (
    <>
      <Section title="Lighting" defaultOpen={false}>
        <Slider
          label="Ambient"
          value={env.ambientIntensity}
          min={0}
          max={3}
          step={0.05}
          onCommitStart={record}
          onChange={(ambientIntensity) => setEnvironment({ ambientIntensity })}
        />
        <Slider
          label="Key light"
          value={env.keyIntensity}
          min={0}
          max={6}
          step={0.05}
          onCommitStart={record}
          onChange={(keyIntensity) => setEnvironment({ keyIntensity })}
        />
        <Slider
          label="Fill light"
          value={env.fillIntensity}
          min={0}
          max={3}
          step={0.05}
          onCommitStart={record}
          onChange={(fillIntensity) => setEnvironment({ fillIntensity })}
        />
        <Slider
          label="Rim light"
          value={env.rimIntensity}
          min={0}
          max={3}
          step={0.05}
          onCommitStart={record}
          onChange={(rimIntensity) => setEnvironment({ rimIntensity })}
        />
        <div className="mt-2">
          <span className="field-label mb-1 block">Key light position</span>
          <div className="grid grid-cols-3 gap-1">
            {(['x', 'y', 'z'] as const).map((axis, i) => (
              <NumberField
                key={axis}
                label={axis.toUpperCase()}
                accent={axis}
                step={0.05}
                value={env.keyPosition[i]}
                onCommitStart={record}
                onChange={(v) => {
                  const next = [...env.keyPosition] as [number, number, number]
                  next[i] = v
                  setEnvironment({ keyPosition: next })
                }}
              />
            ))}
          </div>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={env.shadows}
            onChange={(e) => setEnvironment({ shadows: e.target.checked })}
            className="h-3 w-3 accent-[#4c8dff]"
          />
          Cast shadows
        </label>
      </Section>

      <Section title="Viewport" defaultOpen={false}>
        <div className="mb-2">
          <span className="field-label mb-1 block">Background</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={env.background}
              onChange={(e) => setEnvironment({ background: e.target.value })}
              className="h-6 w-9 shrink-0 rounded"
              aria-label="Background color"
            />
            <span className="font-mono text-2xs uppercase text-muted">{env.background}</span>
          </div>
        </div>
        <div className="mb-2">
          <span className="field-label mb-1 block">Field of view</span>
          <NumberField
            value={env.fov}
            min={12}
            max={110}
            step={0.5}
            suffix="°"
            precision={1}
            onCommitStart={record}
            onChange={(fov) => setEnvironment({ fov })}
            disabled={env.orthographic}
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={env.showGrid}
              onChange={(e) => setEnvironment({ showGrid: e.target.checked })}
              className="h-3 w-3 accent-[#4c8dff]"
            />
            Show grid
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={env.showAxes}
              onChange={(e) => setEnvironment({ showAxes: e.target.checked })}
              className="h-3 w-3 accent-[#4c8dff]"
            />
            Show axes
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={env.orthographic}
              onChange={(e) => setEnvironment({ orthographic: e.target.checked })}
              className="h-3 w-3 accent-[#4c8dff]"
            />
            Orthographic camera
          </label>
        </div>
      </Section>
    </>
  )
}
