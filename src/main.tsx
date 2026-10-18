import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { browserEnvironment } from "./adapters/browserEnvironment";
import { canvasImageProcessor } from "./adapters/canvasImageProcessor";
import { createDexieStorage } from "./adapters/dexieStorage";
import { createHomeCheck } from "./core";
import { bundledReferenceData } from "./referenceData";
import { App } from "./ui/App";
import { HomeCheckProvider } from "./ui/homeCheckContext";
import "./ui/styles.css";

const homeCheck = createHomeCheck({
  storage: createDexieStorage(),
  environment: browserEnvironment,
  referenceData: bundledReferenceData,
  imageProcessor: canvasImageProcessor,
});

// Finish any photo whose smaller versions couldn't be made at capture.
homeCheck.finishPhotoProcessing();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HomeCheckProvider value={homeCheck}>
      <App />
    </HomeCheckProvider>
  </StrictMode>,
);
