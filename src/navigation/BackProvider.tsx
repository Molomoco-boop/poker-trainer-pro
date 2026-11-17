import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { createBackController, BackController } from './backStack';

const Ctx = createContext<BackController | null>(null);

const TOAST_MS = 2000;

declare global {
  interface Window { __ptpBack?: () => boolean; }
}

export const BackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ctl = useMemo(() => createBackController(), []);
  const [toast, setToast] = useState(false);
  const last = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRoot = useCallback(() => {
    const now = Date.now();
    if (now - last.current < TOAST_MS) {
      last.current = 0;
      setToast(false);
      if (Capacitor.getPlatform() === 'android') {
        App.minimizeApp().catch(() => { void App.exitApp(); });
      }
      return;
    }
    last.current = now;
    setToast(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToast(false), TOAST_MS);
  }, []);

  useEffect(() => {
    const raw = ctl.register.bind(ctl);
    ctl.register = (close: () => void) => {
      setToast(false);
      return raw(close);
    };
    const detach = ctl.attach(window.history);
    const onPop = () => {
      const res = ctl.notifyPop();
      if (res === 'root') {
        window.history.pushState({ ptp: 0 }, '');
        onRoot();
      }
    };
    window.addEventListener('popstate', onPop);
    window.__ptpBack = () => {
      if (ctl.handleBack()) { setToast(false); return true; }
      onRoot();
      return false;
    };
    let sub: ReturnType<typeof App.addListener> | undefined;
    if (Capacitor.getPlatform() === 'android') {
      sub = App.addListener('backButton', () => {
        if (!ctl.handleBack()) onRoot();
      });
    }
    return () => {
      detach();
      window.removeEventListener('popstate', onPop);
      delete window.__ptpBack;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      void sub?.then(s => s.remove());
    };
  }, [ctl, onRoot]);

  return (
    <Ctx.Provider value={ctl}>
      {children}
      {toast && (
        <div
          className="exit-toast fixed left-1/2 -translate-x-1/2 z-[80] px-3 h-10 rounded-[4px] bg-panel2 border border-line text-[13px] text-hi whitespace-nowrap pointer-events-none"
          style={{ bottom: '76px' }}
          role="status"
        >
          Pulsa otra vez para salir
        </div>
      )}
    </Ctx.Provider>
  );
};

/** While `active`, the hardware / browser back button runs `close` before anything under it. */
export function useBackLayer(active: boolean, close: () => void) {
  const ctl = useContext(Ctx);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!active || !ctl) return;
    return ctl.register(() => closeRef.current());
  }, [active, ctl]);
}
