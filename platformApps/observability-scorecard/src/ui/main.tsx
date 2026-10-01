import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "@dynatrace/strato-components-preview";
import { App } from "./app/App";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <AppRoot>
    <App />
  </AppRoot>
);
