import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import { AccessProvider } from "./contexts/AccessContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AccessProvider>
            <App />
        </AccessProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);