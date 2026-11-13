import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Copy, RotateCw } from 'lucide-react';

interface State { error: Error | null; where: string }

/**
 * Keeps one broken page from blanking the whole app: shows what went wrong,
 * with a button to copy the details. Keyed by the page address, so moving to
 * another page clears it.
 */
export default class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, where: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
    this.setState({ where: info.componentStack ?? '' });
  }

  render() {
    const { error, where } = this.state;
    if (!error) return this.props.children;
    const details = `${error.name}: ${error.message}\nPage: ${window.location.pathname}\n${(error.stack ?? '').split('\n').slice(0, 6).join('\n')}\n${where.trim().split('\n').slice(0, 8).join('\n')}`;
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-4">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertTriangle size={20} />
          <h2 className="text-lg font-semibold">This page hit an error</h2>
        </div>
        <p className="text-sm text-slate-400">Your data is safe. The rest of the journal still works from the menu. Copy the details below and send them over so it can be fixed.</p>
        <pre className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg p-3 whitespace-pre-wrap break-words max-h-72 overflow-auto">{details}</pre>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(details).catch(() => {})}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Copy size={14} /> Copy details
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
          >
            <RotateCw size={14} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
