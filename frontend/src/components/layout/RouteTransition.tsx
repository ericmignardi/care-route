import { useEffect } from "react";
import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";

/**
 * `useOutlet()` rather than `<Outlet/>` is the load-bearing detail: an `<Outlet/>` inside
 * `AnimatePresence` renders whatever the current route is, so during a `mode="wait"` exit
 * the outgoing panel would already show the incoming screen and read as a flicker.
 * Capturing the element at render time gives the exiting panel something stable to hold.
 */
export function RouteTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  // Inheriting the previous screen's scroll offset lands the reader halfway down a new page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
