import { Component, type ReactNode } from 'react'
import { button, card, muted } from '../lib/styles'

type State = { error: Error | undefined }

// Shows what went wrong instead of a blank page: render errors through React, and errors thrown
// outside rendering (rejected promises nobody caught, event handlers) through window listeners.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: undefined }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  private onError = (e: ErrorEvent) => this.setState({ error: e.error instanceof Error ? e.error : new Error(e.message) })
  private onRejection = (e: PromiseRejectionEvent) => this.setState({ error: e.reason instanceof Error ? e.reason : new Error(String(e.reason)) })

  componentDidMount() {
    addEventListener('error', this.onError)
    addEventListener('unhandledrejection', this.onRejection)
  }

  componentWillUnmount() {
    removeEventListener('error', this.onError)
    removeEventListener('unhandledrejection', this.onRejection)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section role="alert" className={card}>
        <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Something went wrong</h1>
        <p className={`mt-1 ${muted}`}>{error.message || 'Unknown error'}</p>
        {error.stack && (
          <details className="mt-3">
            <summary className={`cursor-pointer ${muted}`}>Details</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">{error.stack}</pre>
          </details>
        )}
        <button type="button" className={`mt-4 ${button}`} onClick={() => this.setState({ error: undefined })}>
          Try again
        </button>
      </section>
    )
  }
}
