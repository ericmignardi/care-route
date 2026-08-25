import { useEffect } from "react";
import { RouterProvider } from "react-router/dom";
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
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
