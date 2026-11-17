import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Renders modals on document.body (above the bottom nav) and locks background scroll. */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return createPortal(children, document.body);
};
