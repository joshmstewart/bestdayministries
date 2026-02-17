import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import {
  installStartupRecoveryListeners,
  sanitizeBrowserStorageForStartup,
  checkAndRecoverFromBuildMismatch,
} from "@/lib/appStartupRecovery";
import { initGA } from "@/lib/analytics";

// Safari (macOS) can occasionally get stuck with stale cache or corrupted localStorage
// that makes the app appear blank until "Clear site data". We proactively recover.
installStartupRecoveryListeners();
sanitizeBrowserStorageForStartup();

// Proactively clear stale caches when a new build is detected (prevents Safari chunk errors)
checkAndRecoverFromBuildMismatch();

// Safari's back-forward cache can resurrect a dead/stuck page state.
// Force a fresh reload when that happens.
window.addEventListener('pageshow', (event) => {
  if ((event as PageTransitionEvent).persisted) {
    window.location.reload();
  }
});

// Initialize Google Analytics
initGA();

createRoot(document.getElementById("root")!).render(<App />);

