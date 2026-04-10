import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Navigate back to the previous page (history) with a safe fallback.
 *
 * This fixes hardcoded "Back" links that always jump to a specific route.
 */
export const useNavigateBack = (fallbackPath = '/') => {
  const navigate = useNavigate();

  return useCallback(() => {
    // React Router v6 stores an index in history.state.idx.
    const idx = typeof window !== 'undefined' ? window?.history?.state?.idx : undefined;

    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }

    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackPath);
  }, [navigate, fallbackPath]);
};
