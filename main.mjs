import { compareLabels } from './labels.mjs';
import { generateLabelEvidence } from './firebase-client.mjs';
import { InferenceSource } from 'firebase/ai';

const form = document.querySelector('#check-labels');
const result = document.querySelector('#result');
const button = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.hidden = false;
  result.textContent = 'Reading label text…';
  button.disabled = true;
  try {
    const output = await compareLabels({ labels: [document.querySelector('#first').value,
      document.querySelector('#second').value], allowCloud: document.querySelector('#cloud').checked }, generateLabelEvidence);
    const verdict = document.createElement('p');
    verdict.textContent = output.kind === 'temperature' ? `Shared temperature ceiling: ${output.ceilingC}°C. Check the cycle and colour instructions separately.` :
      output.kind === 'separate' ? 'Keep these garments out of the same machine load.' : 'Check the original labels before choosing a shared machine load.';
    const evidence = document.createElement('ul');
    for (const quote of output.quotes) {
      const item = document.createElement('li');
      item.textContent = quote || 'No washing line found.';
      evidence.append(item);
    }
    const source = document.createElement('small');
    source.textContent = output.inferenceSource === InferenceSource.ON_DEVICE ? 'Read on this device' :
      output.inferenceSource === InferenceSource.IN_CLOUD ? 'Read using cloud fallback' : 'Inference source unavailable';
    result.replaceChildren(verdict, evidence, source);
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
