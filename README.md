# WashPair

A shared load needs a temperature that both care labels allow. WashPair finds the washing line on each label, shows the text it used, and calculates the lower of the two stated Celsius limits. A separate-wash instruction or an unclear label sends the user back to the original label. Check the remaining fabric, colour, cycle and drying instructions before washing.

## Run on localhost

Use desktop Chrome and Node.js 22.12 or later. Chrome needs an eligible device to download and run its local model. See the [Chrome hardware requirements](https://developer.chrome.com/docs/ai/get-started).

1. Register a Web app in a Firebase project and enable Firebase AI Logic with the Gemini Developer API. Set up Firebase App Check for that Web app.
2. Copy `.env.example` to `.env.local`. Fill in the Firebase Web API key, project ID, Web app ID and reCAPTCHA Enterprise site key. For a private localhost test, you can set `VITE_FIREBASE_APPCHECK_DEBUG=true` and register the browser-generated debug token in your own App Check configuration. Keep the debug token private. Use a registered reCAPTCHA Enterprise provider for the public host with debug mode off.
3. Run these commands from the repository root.

```sh
npm ci
npm test
npm run dev -- --host 127.0.0.1
```

Open the localhost URL printed by Vite. Paste the two English washing labels or use the prefilled example, then select **Compare labels**. If Chrome needs to download its local model, complete the download before retrying.

## Try the two inference paths

- Leave cloud fallback unchecked to request `ONLY_ON_DEVICE`. On an eligible Chrome desktop with the local model ready, the example returned **30°C** and **Read on this device**.
- On a device where the local model is unavailable, check **Allow cloud fallback for these label texts** and run the same example. `PREFER_ON_DEVICE` lets Firebase AI Logic use Gemini 3.5 Flash-Lite in the cloud when on-device inference is unavailable. This path returned **30°C** and **Read using cloud fallback**.

The Firebase SDK reports the inference source. WashPair checks the model's quoted text against the entered labels and calculates the ceiling in application code. The result shows the washing line used from each label.

Run `npm run build` to produce `dist/`. Keep `.env.local`, debug tokens and deployment credentials out of source control.
