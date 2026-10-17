# The prototype calls Gemini directly with the API key inside the app

The prototype is a PWA, so any key it contains can be read by anyone who opens it. We still put the Gemini key in the app rather than behind a pass-through function, because the prototype has no server and is only for a few internal testers. Mitigations: the key is restricted to the app's web address and the Generative Language API, has a spending cap, and is never committed to the repo. Before any production build the key moves behind a server-side function.

## Considered Options

- Cloudflare Worker pass-through holding the key (recommended for production)
- Firebase AI Logic with App Check
- Each tester pastes their own key
