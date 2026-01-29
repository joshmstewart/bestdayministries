import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import {
  installStartupRecoveryListeners,
  sanitizeBrowserStorageForStartup,
} from "@/lib/appStartupRecovery";
import { initGA } from "@/lib/analytics";

// Safari (macOS) can occasionally get stuck with stale cache or corrupted localStorage
// that makes the app appear blank until "Clear site data". We proactively recover.
installStartupRecoveryListeners();
sanitizeBrowserStorageForStartup();

// Initialize Google Analytics
initGA();

createRoot(document.getElementById("root")!).render(<App />);

