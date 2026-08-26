import { useEffect } from "react";
import { RouterProvider } from "react-router/dom";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./context/ThemeProvider";
import { Toaster } from "./components/ui/Toast";
import { useAuthStore } from "./stores/authStore";
import { router } from "./routes";

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  // One probe on load. Until it answers the router holds on `unknown`, which is what
  // lets a hard refresh land back on the page the user was already on.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider>
      {/* reducedMotion="user" makes every motion component in the tree honour the OS
          setting, so no individual animation has to remember to. */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
        <Toaster />
      </MotionConfig>
    </ThemeProvider>
  );
}
