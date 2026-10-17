# V1 builds its own AI step instead of waiting for the shared Rizurf ingestion system

The blueprint proposed reusing the shared Rizurf ingestion system (capture → queue → AI router → structured output → human validation) being built for documents. V1 builds Home Check's vision step on its own, behind one narrow interface (photo + Area + Item in, AI Suggestions out), so delivery isn't blocked on that system and the step can be moved onto it later without changing the rest of the app.
