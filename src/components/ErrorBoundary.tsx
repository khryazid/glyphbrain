'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-gb-surface rounded-xl border border-gb-border">
          <h2 className="text-xl font-bold text-gb-error mb-2">Algo salió mal</h2>
          <p className="text-gb-text mb-4 text-sm max-w-md text-center">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-gb-accent text-gb-bg rounded font-medium hover:opacity-90 transition-opacity"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
