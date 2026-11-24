import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ReviewerAccept from "./ReviewerAccept";
import "./styles.css";
import "./design.css";
import "./demo-banner";

const root = document.getElementById("root");
if (!root) throw new Error("VDMS Central Workspace root is missing");
createRoot(root).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).has("claim") ? <ReviewerAccept /> : <App />}
  </React.StrictMode>,
);
