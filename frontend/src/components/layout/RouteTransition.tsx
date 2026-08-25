import { useEffect } from "react";
import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";

/**
 * The page transition, and the only one in the product.
 *
 * `useOutlet()` rather than `<Outlet/>` is the load-bearing detail. An `<Outlet/>` placed
 * inside `AnimatePresence` renders whatever the *current* route is, so during a
 * `mode="wait"` exit the outgoing panel would already be showing the incoming screen and
 * the transition would read as a flicker. Capturing the element at render time gives the
 * exiting panel something stable to hold while it leaves.
 *
 * Six pixels and 180ms: enough to say "this is a different page", not enough to stand
 * between a coordinator and the next screen forty times an hour. `MotionConfig
 * reducedMotion="user"` in `App` drops it to a plain opacity change — and then to nothing
 * — for anyone who has asked the OS for less movement.
 */
export function RouteTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  // A route change is a new document as far as the reader is concerned; inheriting the
  // previous screen's scroll offset means landing halfway down a page you have not read.
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
