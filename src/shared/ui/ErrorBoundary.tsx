import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('[DApp Inspector UI]', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="p-6 text-sm text-fg bg-bg h-full">
        <div className="font-semibold mb-2">Something went wrong</div>
        <pre className="text-xs text-muted whitespace-pre-wrap font-mono">{this.state.error.message}</pre>
      </div>
    );
  }
}
