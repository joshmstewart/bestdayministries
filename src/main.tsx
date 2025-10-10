import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSentry } from "./lib/sentry";

// Initialize Sentry for error tracking
initializeSentry();

createRoot(document.getElementById("root")!).render(<App />);
