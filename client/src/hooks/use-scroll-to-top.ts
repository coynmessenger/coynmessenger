import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top instantly when location changes
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
}