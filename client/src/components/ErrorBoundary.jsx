import { Component } from 'react';

/** Catches render crashes so one broken section never blanks the whole site. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[EmployHunt] page crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-[26px] font-bold">This page hit a problem</h1>
        <p className="mt-2 text-[15px] text-muted">{String(this.state.error?.message || this.state.error)}</p>
        <button onClick={() => window.location.reload()} className="mt-6 inline-flex h-10 items-center rounded-ctl bg-brand px-4 text-[14px] font-semibold text-brand-ink">
          Reload the page
        </button>
      </div>
    );
  }
}
