import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import ReviewerAccept from "./ReviewerAccept";

import "./design.css";


const root = document.getElementById("root");
if (!root) throw new Error("VDMS Central Workspace root is missing");
createRoot(root).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).has("claim") ? <ReviewerAccept /> : <App />}
  </React.StrictMode>,
);
