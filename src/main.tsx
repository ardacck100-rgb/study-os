import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { FocusProvider } from "./focus";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <FocusProvider>
        <App />
      </FocusProvider>
    </StoreProvider>
  </StrictMode>,
);
