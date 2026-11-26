'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onSearch?: () => void;
  onNewNote?: () => void;
  onToggleChat?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        // Only let Escape pass through
        if (e.key === 'Escape' && options.onEscape) {
          e.preventDefault();
          options.onEscape();
        }
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'k':
            if (options.onSearch) {
              e.preventDefault();
              options.onSearch();
            }
            break;
          case 'n':
            if (options.onNewNote) {
              e.preventDefault();
              options.onNewNote();
            }
            break;
          case 'j':
            if (options.onToggleChat) {
              e.preventDefault();
              options.onToggleChat();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        if (options.onEscape) {
          e.preventDefault();
          options.onEscape();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}
