"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import ShellIcon from "./ShellIcon";

export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const previousOverflow = useRef("");
  const locked = useRef(false);
  const titleId = useId();
  const restore = useCallback((element: HTMLDialogElement | null) => {
    element?.close();
    if (!locked.current) return;
    document.body.style.overflow = previousOverflow.current;
    locked.current = false;
    const target = previousFocus.current;
    if (target instanceof HTMLElement && target.isConnected && target.checkVisibility() && !target.closest("[inert]")) {
      target.focus({ preventScroll: true });
    } else {
      document.querySelector<HTMLButtonElement>(".shell-menu")?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const play = () => {
      animation?.cancel();
      if (open) {
        if (!element.open) {
          previousFocus.current = document.activeElement;
          previousOverflow.current = document.body.style.overflow;
          locked.current = true;
          element.showModal();
          document.body.style.overflow = "hidden";
        }
        element.classList.remove("shell-modal-closing");
        animation = element.animate(media.matches ? [{ opacity: 0 }, { opacity: 1 }] : [
          { opacity: 0, transform: "translateY(6px) scale(0.98)" },
          { opacity: 1, transform: "none" },
        ], { duration: media.matches ? 80 : 200, easing: "ease-out" });
      } else if (element.open) {
        element.classList.add("shell-modal-closing");
        animation = element.animate(media.matches ? [{ opacity: 1 }, { opacity: 0 }] : [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateY(6px) scale(0.98)" },
        ], { duration: media.matches ? 80 : 150, easing: "ease-in", fill: "forwards" });
        void animation.finished.then(() => restore(element)).catch(() => { /* A mudança de estado cancela a animação anterior. */ });
      }
    };
    play();
    media.addEventListener("change", play);
    return () => { animation?.cancel(); media.removeEventListener("change", play); };
  }, [open, restore]);

  useEffect(() => {
    const element = dialog.current;
    return () => restore(element);
  }, [restore]);

  return (
    <dialog ref={dialog} className="shell-modal" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="shell-modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="shell-icon-button" aria-label="Fechar" onClick={onClose}><ShellIcon name="close" /></button>
      </div>
      {children}
    </dialog>
  );
}
