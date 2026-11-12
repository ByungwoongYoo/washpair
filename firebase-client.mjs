import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';

let ai;

export async function generateLabelEvidence(prompt, { allowCloud }) {
  if (!ai) {
    const env = import.meta.env;
    const config = { apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID };
    if (Object.values(config).some((value) => !value) || !env.VITE_RECAPTCHA_SITE_KEY) {
      throw new Error('Configure a Firebase Web app and App Check to run live inference.');
    }
    const app = initializeApp(config);
    if (env.DEV && env.VITE_FIREBASE_APPCHECK_DEBUG === 'true') {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true });
    ai = getAI(app, { backend: new GoogleAIBackend() });
  }
  const model = getGenerativeModel(ai, {
    mode: allowCloud ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE,
    inCloudParams: { model: 'gemini-3.5-flash-lite' },
    onDeviceParams: { createOptions: {
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }]
    } }
  });
  // Start device initialization while the form click still has user activation.
  const deviceReady = model.initializeDeviceModel();
  if (allowCloud) {
    // Let the SDK use cloud inference while the device download is in progress.
    void deviceReady.catch(() => {});
  } else {
    await deviceReady;
  }
  const result = await model.generateContent(prompt);
  return { text: result.response.text(), inferenceSource: result.response.inferenceSource };
}
