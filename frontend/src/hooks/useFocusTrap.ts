import { useCallback, useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  /** Locks background scrolling while the layer is up. Off for a drawer that is not full height. */
  lockScroll?: boolean;
}

/**
 * Everything an overlay owes a keyboard: Esc dismisses it, Tab cycles inside it rather
 * than wandering into the page underneath, focus lands on the first control when it opens,
 * and it returns to whatever opened it when it closes.
 *
 * Shared by the modal and the mobile navigation drawer. It lives in one place because the
 * second implementation of a focus trap is always the one that quietly forgets to restore
 * focus — which strands a keyboard user at the top of the document with no way back to the
 * button they pressed.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  { lockScroll = true }: FocusTrapOptions = {},
) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [containerRef, onDismiss],
  );

  useEffect(() => {
    if (!active) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = overflow;
      restoreTo?.focus();
    };
  }, [active, containerRef, onKeyDown, lockScroll]);
}
