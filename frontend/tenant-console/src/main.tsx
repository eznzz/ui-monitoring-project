import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./design.css";

const target = document.getElementById("root");
if (!target) throw new Error("VDMS React root missing");
createRoot(target).render(<React.StrictMode><App /></React.StrictMode>);
