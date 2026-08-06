import "@/styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyAppearance, readAppearance } from "@/lib/theme";
import { router } from "@/routes";

// The API is a local process that can be restarted or briefly unreachable, so
// reads retry with backoff and keep showing the last good data while they do.
// networkMode "always" is load-bearing: the API is a process on this machine,
// so its reachability has nothing to do with internet connectivity. Under the
// default, a failed fetch parks the query at fetchStatus "paused" — no data, no
// error, waiting for a connection that was never the problem — and the app sits
// on zeros forever instead of saying it can't reach the library.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      retry: 2,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 5000),
      staleTime: 5000,
    },
    mutations: { networkMode: "always" },
  },
});

if (import.meta.env.DEV) {
  (window as unknown as { __qc: QueryClient }).__qc = queryClient;
  void import("@tanstack/react-query").then((m) => {
    (window as unknown as { __online: unknown }).__online = m.onlineManager;
  });
}

applyAppearance(readAppearance());

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
