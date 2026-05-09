'use client';

import * as React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = { hasError: boolean };

export default class ClientErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined') {
      console.error('ClientErrorBoundary caught an error:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p className='text-sm text-destructive'>Something went wrong.</p>;
    }
    return this.props.children;
  }
}
