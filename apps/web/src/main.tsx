import "@/styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { applyAppearance, readAppearance } from "@/lib/theme";

// Before first paint, so there's no flash of the wrong ground.
applyAppearance(readAppearance());

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
