import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  title: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FORGE3D]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-panel px-8 text-center">
        <AlertCircle size={26} className="text-danger" strokeWidth={1.6} />
        <h2 className="text-sm font-semibold text-ink">{this.props.title}</h2>
        <p className="max-w-[420px] text-xs leading-relaxed text-muted">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-1 h-7 rounded border border-line bg-raised px-3 text-xs text-ink transition-colors hover:border-line-strong"
        >
          Try again
        </button>
      </div>
    )
  }
}
