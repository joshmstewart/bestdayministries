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

// Check for build version mismatch and recover proactively
// This is async but we don't await - if recovery is needed, it will reload the page
checkAndRecoverFromBuildMismatch();

// Initialize Google Analytics
initGA();

createRoot(document.getElementById("root")!).render(<App />);

