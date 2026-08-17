import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[panel] Yakalanan hata:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-white">
              Panelde bir hata oluştu
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {this.state.error.message || 'Beklenmeyen bir sorun çıktı.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
