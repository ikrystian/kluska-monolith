import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/section';

/**
 * Keeps one broken screen from blanking the whole app: the tab bar stays, so
 * the athlete can walk away from it, and anything mid-workout is unaffected.
 * Mounted per route, so navigating elsewhere starts clean.
 */
export class ScreenErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="page">
        <EmptyState
          icon={TriangleAlert}
          title="Coś poszło nie tak"
          description="Ten ekran się nie załadował. Twoje dane są bezpieczne."
          action={<Button size="sm" variant="secondary" onClick={() => window.location.reload()}>Odśwież</Button>}
        />
      </div>
    );
  }
}
