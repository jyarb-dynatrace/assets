import { Page } from "@dynatrace/strato-components-preview";
import React from "react";
import { Scorecard } from "./pages/Scorecard";

export const App = () => {
  return (
    <Page>
      <Page.Main>
        <Scorecard />
      </Page.Main>
    </Page>
  );
};
