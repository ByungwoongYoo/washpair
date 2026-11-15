# WashPair

WashPair brings the washing instructions on two English care labels into one view. It keeps separate-wash requirements, washing restrictions and other conditions beside the quoted source text. When both labels contain a supported Celsius washing limit, the result shows the lower ceiling. The user checks the cycle, colours and fabrics before combining garments.

The request sends numbered instruction segments to Firebase AI Logic for role tags. Application code binds the tags to the original segments and checks each complete instruction against its supported phrase set. Unsupported wording or conflicting requirements returns a request to review the labels without selecting a temperature.

## Run on localhost

Use desktop Chrome and Node.js 22.12 or later. On-device inference needs an eligible device and a downloaded local model; see the [Chrome hardware requirements](https://developer.chrome.com/docs/ai/get-started).

1. Register a Firebase Web app, enable Firebase AI Logic with the Gemini Developer API, and configure App Check.
2. Copy `.env.example` to `.env.local` and fill in the four Firebase Web app and reCAPTCHA Enterprise values. For a private localhost test, set `VITE_FIREBASE_APPCHECK_DEBUG=true` and register the browser-generated debug token in your own Firebase project. Keep the token private.
3. Run:

```sh
npm ci
npm test
npm run dev -- --host 127.0.0.1
```

Open Vite's localhost URL, enter two labels and select **Compare labels**. The default requests `ONLY_ON_DEVICE`. Selecting **Allow cloud fallback for these label texts** changes the request to `PREFER_ON_DEVICE`. The result identifies the execution source when the SDK supplies it.

`npm test` includes the original eight tests and 30 candidate tests. These tests inject responses and check parsing, conflicts and presentation; they do not execute Firebase inference.

## Build and deploy

```sh
npm run build
```

Vite writes the static application to `dist/`; `firebase.json` serves that directory. For public hosting, use the reCAPTCHA Enterprise key registered for the exact production domain and leave debug mode off. Keep `.env.local`, debug tokens and deployment credentials out of source control.

With the [Firebase CLI](https://firebase.google.com/docs/hosting/quickstart) installed and authenticated to your own project, deploy only the Hosting content:

```sh
firebase deploy --only hosting --project YOUR_PROJECT_ID
```
