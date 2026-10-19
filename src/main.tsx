import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { browserEnvironment } from "./adapters/browserEnvironment";
import { canvasImageProcessor } from "./adapters/canvasImageProcessor";
import { createDexieStorage } from "./adapters/dexieStorage";
import { createGeminiAiClient } from "./adapters/geminiAiClient";
import { createHomeCheck } from "./core";
import { bundledReferenceData } from "./referenceData";
import { App } from "./ui/App";
import { ErrorNotice, listenForUnexpectedErrors } from "./ui/ErrorNotice";
import { HomeCheckProvider } from "./ui/homeCheckContext";
import { StatusBar } from "./ui/StatusBar";
import "./ui/styles.css";

listenForUnexpectedErrors();

const homeCheck = createHomeCheck({
  storage: createDexieStorage(),
  environment: browserEnvironment,
  referenceData: bundledReferenceData,
  imageProcessor: canvasImageProcessor,
  aiClient: createGeminiAiClient(import.meta.env.VITE_GEMINI_API_KEY),
});

// Finish any photo or video whose smaller versions couldn't be made at capture, then send waiting
// photos to the AI now, whenever the phone comes online and after each capture.
homeCheck.finishMediaProcessing().finally(() => homeCheck.startAiQueue());

// Settings show whether the browser keeps the app's storage.
homeCheck.checkStorageDurability();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HomeCheckProvider value={homeCheck}>
      <App />
      <StatusBar />
      <ErrorNotice />
    </HomeCheckProvider>
  </StrictMode>,
);
