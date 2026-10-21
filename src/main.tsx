import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import "@revelator/pro-ui/styles.css";
import { TodayProvider } from "@revelator/pro-ui";

import { TODAY } from "./graph/fixtures";
import { useGraph } from "./graph/resolve";
import { useRoute, type SurfaceName } from "./route";
import { ArtistApp } from "./surfaces/artist";
import { GraphConsole } from "./surfaces/console";
import { ContributorPortal } from "./surfaces/contributor";
import { Docs } from "./surfaces/docs";
import { Home } from "./surfaces/home";
import { PartnerPortal } from "./surfaces/partner";
import { RevelatorPro } from "./surfaces/pro";
import { VerificationPortal } from "./surfaces/verify";

/** Each surface draws its own product around its own pages. */
const SURFACE: Record<SurfaceName, (path: readonly string[]) => ReactNode> = {
  home: (path) => <Home path={path} />,
  docs: (path) => <Docs path={path} />,
  pro: (path) => <RevelatorPro path={path} />,
  artist: (path) => <ArtistApp path={path} />,
  contributor: (path) => <ContributorPortal path={path} />,
  partner: (path) => <PartnerPortal path={path} />,
  console: (path) => <GraphConsole path={path} />,
  verify: (path) => <VerificationPortal path={path} />,
};

function App() {
  const route = useRoute();
  // Whatever a surface wrote to the graph, every page draws again from it as it now is.
  useGraph();
  return SURFACE[route.surface](route.path);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodayProvider date={TODAY}>
      <App />
    </TodayProvider>
  </StrictMode>,
);
