import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-factorio-darker text-factorio-text p-8">
          <div className="card max-w-lg text-center space-y-4">
            <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
            <p className="text-sm text-factorio-muted">{this.state.error.message}</p>
            <button
              className="btn-primary"
              onClick={() => this.setState({ error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
