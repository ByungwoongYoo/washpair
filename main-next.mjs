// Private candidate entry point. This does not replace the released main.mjs.
import { compareCareLabels } from './labels-next.mjs';
import { carePlanView } from './labels-next-view.mjs';
import { generateLabelEvidence } from './firebase-client.mjs';
import { InferenceSource } from 'firebase/ai';

const form=document.querySelector('#check-labels');
const result=document.querySelector('#result');
const button=form.querySelector('button');
const itemList=(heading,rows)=>{
  if(!rows.length)return [];
  const title=document.createElement('h2');title.textContent=heading;
  const list=document.createElement('ul');
  for(const row of rows) {
    const item=document.createElement('li');
    item.textContent=`${row.label?`Garment ${row.label}: `:''}${row.quote?`“${row.quote}” `:''}${row.reason||''}`;
    list.append(item);
  }
  return [title,list];
};

form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;result.hidden=false;result.textContent='Reading label text…';
  try {
    const labels=[document.querySelector('#first').value,document.querySelector('#second').value];
    const output=await compareCareLabels({labels,allowCloud:document.querySelector('#cloud').checked},generateLabelEvidence);
    const view=carePlanView(output);
    const headline=document.createElement('h2');headline.textContent=view.headline;
    const detail=document.createElement('p');detail.textContent=view.detail;
    const originals=labels.map((quote,i)=>({label:i+1,quote}));
    const source=document.createElement('small');
    source.textContent=output.inferenceSource===InferenceSource.ON_DEVICE?'Read on this device':
      output.inferenceSource===InferenceSource.IN_CLOUD?'Read using cloud fallback':'Inference source unavailable';
    result.replaceChildren(headline,detail,...itemList('Machine-washing restrictions',view.restrictions),
      ...itemList('Conditions to retain',view.conditions),...itemList('Instructions to check',view.unresolved),
      ...itemList('Original label text',originals),source);
  } catch(error) {
    // Validation errors must not leave a previous temperature result visible.
    result.textContent=`Could not interpret these labels. Check the original instructions. ${error.message}`;
  } finally {button.disabled=false;}
});
