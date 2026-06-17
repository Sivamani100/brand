"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackLevel?: "page" | "section" | "component";
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  errorId: string;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: "",
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = Math.random().toString(36).substring(2, 10).toUpperCase();
    return { hasError: true, errorId, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log structured error to console
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "fatal",
        service: "ui-error-boundary",
        message: error.message,
        errorId: this.state.errorId,
        errorInfo,
        error: {
          message: error.message,
          stack: error.stack,
        },
      })
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorId: "", error: null });
  };

  public render() {
    if (this.state.hasError) {
      const level = this.props.fallbackLevel || "page";

      if (level === "component") {
        return (
          <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg text-xs text-red-400 flex items-center justify-between gap-2">
            <span>Failed to load component. (ID: {this.state.errorId})</span>
            <button
              onClick={this.handleRetry}
              className="underline hover:text-white font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        );
      }

      if (level === "section") {
        return (
          <div className="p-6 border border-red-500/20 bg-[#0d0d0d] rounded-xl text-center space-y-3 shadow-md max-w-lg mx-auto my-4">
            <span className="text-2xl">⚠️</span>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
              Couldn&apos;t load section
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Error ID: {this.state.errorId}
            </p>
            <button
              onClick={this.handleRetry}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-surface-3)] transition-all scale-active cursor-pointer"
            >
              Retry
            </button>
          </div>
        );
      }

      // Default: Page level fallback
      return (
        <div className="flex min-h-[60vh] items-center justify-center bg-black px-6 py-12">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#0d0d0d] p-8 border border-red-500/20 shadow-glow text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-red-500/10 text-red-500 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Something went wrong
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {this.props.errorMessage || "We couldn't load this page. Please try again or return home."}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
              Error ID: ERR-{this.state.errorId}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="bg-[var(--color-accent)] text-[var(--color-invert-text)] font-semibold text-xs px-5 py-2.5 rounded-full hover:opacity-90 transition-all scale-active cursor-pointer"
              >
                Try Again
              </button>
              <a
                href="/"
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-xs px-5 py-2.5 rounded-full hover:bg-[var(--color-surface-3)] transition-all scale-active"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
