import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../observability';

type ErrorBoundaryProps = {
  children: ReactNode;
  // Leaves the broken screen for the setup screen, keeping any saved game.
  onBackToSetup: () => void;
  // Deletes the saved game, then leaves for the setup screen. A save that
  // throws while rendering would otherwise be offered again on every visit.
  onDiscardSave: () => void;
};

type ErrorBoundaryState = { error: Error | null };

// React only catches render errors in a class component. Without this, any
// throw while rendering unmounts the whole tree and leaves a blank page.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, info.componentStack);
  }

  private leave = (action: () => void) => () => {
    this.setState({ error: null });
    action();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main
        className="w-full min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 text-stone-800 flex items-center justify-center p-4"
        style={{ fontFamily: 'ui-serif, Georgia, serif' }}
      >
        <section
          role="alert"
          aria-labelledby="error-boundary-title"
          className="max-w-lg w-full bg-white/90 rounded-lg border border-stone-200 p-6 shadow-sm"
        >
          <h1 id="error-boundary-title" className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="mb-2">
            The game hit an error it couldn&apos;t recover from, so this screen stopped drawing.
          </p>
          <p className="mb-4 text-sm text-stone-700">
            If it happened while resuming a saved game, that save may be what&apos;s broken: discarding it
            starts you fresh.
          </p>
          <p className="mb-4 text-xs text-stone-600 break-words">
            Details: <code>{error.message || error.name}</code>
          </p>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={this.leave(this.props.onDiscardSave)}
              className="border border-stone-400 text-stone-800 hover:bg-stone-100 font-semibold px-4 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Discard saved game
            </button>
            <button
              type="button"
              onClick={this.leave(this.props.onBackToSetup)}
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Back to setup
            </button>
          </div>
        </section>
      </main>
    );
  }
}
