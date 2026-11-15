import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCarePlan, broadRuleBaseline, carePlanFromSegments, segmentInputs } from './labels-next.mjs';
import { carePlanView } from './labels-next-view.mjs';
const make=(label,temperature,conditions=[])=>({method:{value:'machine',quote:label.split('. ')[0]},temperature:{celsius:temperature,quote:label.split('. ')[0]},conditions,notes:[label]});
const second='Machine wash at 40°C.';
test('retains bleach and cycle requirements beside the numeric ceiling',()=>{
  const a='Machine wash at 30°C on a gentle cycle. Do not bleach.';
  const value=evaluateCarePlan([a,second],[make(a,30,[{kind:'cycle',quote:'Machine wash at 30°C on a gentle cycle.'},{kind:'no_bleach',quote:'Do not bleach.'}]),make(second,40)]);
  assert.equal(value.action,'shared_ceiling_with_conditions');assert.equal(value.ceilingC,30);assert.equal(value.conditions.length,2);
});
test('unrepresented source instruction prevents a positive joint action',()=>{
  const a='Machine wash at 30°C. Use special detergent.';
  const f=make(a,30);f.notes=[];
  assert.equal(evaluateCarePlan([a,second],[f,make(second,40)]).action,'check_conditions');
});
test('a component-specific hand-wash instruction is not generalised to the whole garment',()=>{
  const a='Machine wash at 30°C. Removable liners should be hand-washed.';
  const r=evaluateCarePlan([a,second],[make(a,30),make(second,40)]);
  assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);assert.equal(r.machineRestrictions.length,0);
});
test('invented quotations and ironing-based temperatures are rejected',()=>{
  const a='Machine wash cold. Iron at 40°C.';
  const f=make(a,40);f.temperature.quote='Iron at 40°C.';
  assert.throws(()=>evaluateCarePlan([a,second],[f,make(second,40)]),/ceiling/);
  f.temperature.quote='Machine wash at 60°C.';
  assert.throws(()=>evaluateCarePlan([a,second],[f,make(second,40)]),/substring/);
});
test('different heavy-duty and gentle cycle requirements remain unresolved',()=>{
  const a='Machine wash, heavy duty programme, at 30°C.';
  const b='Machine wash at 40°C on a gentle cycle.';
  assert.equal(broadRuleBaseline([a,b]).action,'check_conditions');
});
test('cold water is never converted to an invented Celsius limit',()=>{
  const a='Machine wash cold. Do not use fabric softener.';
  const r=broadRuleBaseline([a,second]);assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
});
test('model role rows are bound to every original instruction',()=>{
  const labels=['Machine wash at 30°C. Do not bleach.',second];
  assert.throws(()=>carePlanFromSegments(labels,[['machine_wash'],['machine_wash']]),/per original/);
  const r=carePlanFromSegments(labels,[['machine_wash','cycle'],['no_bleach'],['machine_wash','cycle']]);
  assert.equal(r.ceilingC,30);assert.deepEqual(r.conditions.map(x=>x.kind),['no_bleach']);
});
test('gentle ironing is not a washing-cycle requirement in the broader baseline',()=>{
  const r=broadRuleBaseline(['Machine wash at 30°C. Iron on gentle heat.',second]);
  assert.equal(r.action,'shared_ceiling_with_conditions');assert.equal(r.conditions.length,0);
});
test('conditional and exact temperatures cannot become an unconditional joint action',()=>{
  for(const a of ['Machine wash at 30°C only after prewashing.','Machine wash at exactly 30°C.']) {
    const r=evaluateCarePlan([a,second],[make(a,30),make(second,40)]);
    assert.equal(r.action,'check_conditions',a);
    if(a.includes('exactly'))assert.equal(r.ceilingC,undefined);
  }
});
test('source restrictions survive the model assigning every condition to drying',()=>{
  const a='Machine wash at 30°C. Avoid using fabric conditioner. Do not bleach. Use a mesh laundry bag.';
  const r=carePlanFromSegments([a,second],[['machine_wash'],['dry'],['dry'],['dry'],['machine_wash']]);
  for(const kind of ['no_softener','no_bleach','laundry_bag']) assert.ok(r.conditions.some(c=>c.kind===kind),kind);
});
test('a later washing limit is not discarded in favour of the first quoted limit',()=>{
  for(const a of ['Machine wash at 30°C. Machine wash at 20°C.','Machine wash at 30°C. Maximum 20°C.']) {
    const r=evaluateCarePlan([a,second],[make(a,30),make(second,40)]);
    assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
  }
});
test('exclusive cycles are checked from source text even when omitted by the model',()=>{
  const a='Machine wash at 30°C. Use normal cycle only.';
  const b='Machine wash at 40°C. Use delicate cycle only.';
  const r=carePlanFromSegments([a,b],[['machine_wash'],['dry'],['machine_wash'],['dry']]);
  assert.equal(r.action,'check_conditions');
});
test('special detergent requires confirmation and does not invent a wool cycle',()=>{
  const a='Machine wash at 30°C. Always wash with wool detergent.';
  const r=carePlanFromSegments([a,second],[['machine_wash'],['dry'],['machine_wash']]);
  assert.equal(r.action,'check_conditions');assert.ok(r.conditions.some(c=>c.kind==='detergent'));
  assert.ok(!r.conditions.some(c=>c.kind==='cycle'));
});
test('chlorine-specific bleach wording is not changed into a total bleach prohibition',()=>{
  const a='Machine wash at 30°C. Do not use chlorine bleach.';
  const r=evaluateCarePlan([a,second],[make(a,30,[{kind:'no_bleach',quote:'Do not use chlorine bleach.'}]),make(second,40)]);
  assert.ok(r.conditions.some(c=>c.kind==='bleach'));assert.ok(!r.conditions.some(c=>c.kind==='no_bleach'));
});
test('uninterpreted preparation is not covered merely by copying it into notes',()=>{
  const a='Machine wash at 30°C. Pretreat stains with product X.';
  assert.equal(evaluateCarePlan([a,second],[make(a,30),make(second,40)]).action,'check_conditions');
});
test('opposing chemical requirements prevent a joint recommendation',()=>{
  const a='Machine wash at 30°C. Use fabric softener.';
  const b='Machine wash at 40°C. Do not use fabric softener.';
  assert.equal(evaluateCarePlan([a,b],[make(a,30),make(b,40)]).action,'check_conditions');
});
test('reverse-order dry-clean-only and trailing machine prohibitions remain exclusions',()=>{
  for(const ending of ['Only dry clean.','Machine washing is not permitted.']) {
    const a=`Machine wash at 30°C. ${ending}`;
    assert.equal(evaluateCarePlan([a,second],[make(a,30),make(second,40)]).action,'machine_prohibited');
  }
});
test('a stated minimum is not returned as an upper temperature ceiling',()=>{
  const a='Machine wash at a minimum 30°C.';
  const r=evaluateCarePlan([a,second],[make(a,30),make(second,40)]);
  assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
});
test('alternative lower-bound phrases cannot become a cooler shared ceiling',()=>{
  const b='Machine wash at 30°C.';
  for(const bound of ['no less than','not less than','not under','above']) {
    const a=`Machine wash at ${bound} 40°C.`;
    for(const r of [evaluateCarePlan([a,b],[make(a,40),make(b,30)]),broadRuleBaseline([a,b])]) {
      assert.equal(r.action,'check_conditions',bound);assert.equal(r.ceilingC,undefined,bound);
    }
  }
});
test('only in the same instruction as a numeric temperature leaves its scope unresolved',()=>{
  for(const a of ['Machine wash at 30°C only.','Machine wash at 30°C on a gentle cycle only.']) {
    for(const r of [evaluateCarePlan([a,second],[make(a,30),make(second,40)]),broadRuleBaseline([a,second])]) {
      assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
    }
  }
});
test('the Pro wash-alone, written lower-limit and hyphenated dry-clean counterexamples suppress temperature output',()=>{
  const cases=[
    ['Machine wash at 30°C. Wash alone.','separate'],
    ['Machine wash at 30°C. Temperature must not exceed 20 degrees Celsius.','check_conditions'],
    ['Machine wash at 30°C. Dry-clean only.','machine_prohibited']
  ];
  for(const [a,action] of cases)for(const r of [evaluateCarePlan([a,second],[make(a,30),make(second,40)]),broadRuleBaseline([a,second])]) {
    assert.equal(r.action,action,a);assert.equal(r.ceilingC,undefined,a);
  }
});
test('a hand-washing prohibition is never reversed into a machine-washing prohibition',()=>{
  const a='Do not hand wash. Machine wash at 30°C.';
  const f={method:{value:'machine',quote:'Machine wash at 30°C.'},temperature:{celsius:30,quote:'Machine wash at 30°C.'},conditions:[],notes:[a]};
  for(const r of [evaluateCarePlan([a,second],[f,make(second,40)]),broadRuleBaseline([a,second])]) {
    assert.equal(r.action,'shared_ceiling_with_conditions');assert.equal(r.ceilingC,30);assert.equal(r.machineRestrictions.length,0);
  }
  const mistagged=carePlanFromSegments([a,second],[['hand_wash'],['machine_wash'],['machine_wash']]);
  assert.equal(mistagged.action,'check_conditions');assert.equal(mistagged.machineRestrictions.length,0);
});
test('known keywords cannot cover unsupported text in the same original clause',()=>{
  const cases=[
    'Machine wash at 30°C unless another label says otherwise.',
    'Machine wash at 30°C with the temperature reduced by 20 degrees Celsius.',
    'Machine wash at 30°C and disinfect at 90°C.',
    'Machine wash at 30°C. Iron gently but keep washing below 20 degrees Celsius.',
    'Machine wash at 30°C. Do not bleach unless diluted.',
    'Machine wash at 30°C. Wash alone while the indicator is red.'
  ];
  for(const a of cases) {
    const f=make(a,30);f.temperature.quote='Machine wash at 30°C';
    for(const r of [evaluateCarePlan([a,second],[f,make(second,40)]),broadRuleBaseline([a,second])]) {
      assert.equal(r.action,'check_conditions',a);assert.equal(r.ceilingC,undefined,a);
      assert.ok(r.unresolved.some(x=>x.reason.includes('full-clause')),a);
    }
  }
});
test('a machine ban and wash-separately instruction have different garment-specific presentation',()=>{
  const prohibited=broadRuleBaseline([second,'Hand wash only.']);
  assert.equal(prohibited.action,'machine_prohibited');assert.equal(prohibited.ceilingC,undefined);
  assert.equal(carePlanView(prohibited).headline,'Do not machine-wash garment 2.');
  assert.equal(prohibited.machineRestrictions[0].quote,'Hand wash only.');
  const separate=broadRuleBaseline(['Machine wash at 30°C. Wash separately.',second]);
  assert.equal(separate.action,'separate');assert.equal(carePlanView(separate).headline,'Wash garment 1 separately.');
  assert.equal(separate.machineRestrictions.length,0);assert.equal(separate.ceilingC,undefined);
});
test('an explicit full supported compound instruction is accepted but an unknown component is not',()=>{
  const a='Machine wash at 30°C and do not bleach.';
  const r=broadRuleBaseline([a,second]);
  assert.equal(r.action,'shared_ceiling_with_conditions');assert.equal(r.ceilingC,30);
  assert.ok(r.conditions.some(x=>x.kind==='no_bleach'));
  assert.equal(broadRuleBaseline(['Machine wash at 30°C and consult label X.',second]).action,'check_conditions');
});
test('opposing chemical or exclusive-cycle instructions on the same label prevent a numeric result',()=>{
  for(const ending of ['Use fabric softener. Do not use fabric softener.','Use bleach. Do not bleach.','Use normal cycle only. Use delicate cycle only.']) {
    const a=`Machine wash at 30°C. ${ending}`;
    for(const r of [evaluateCarePlan([a,second],[make(a,30),make(second,40)]),broadRuleBaseline([a,second])]) {
      assert.equal(r.action,'check_conditions',ending);assert.equal(r.ceilingC,undefined,ending);
    }
  }
});
test('a compound prohibition is not split into an invented positive permission',()=>{
  for(const a of ['Machine wash at 30°C. Do not bleach and use fabric softener.','Machine wash at 30°C and do not bleach and use fabric softener.']) {
    for(const r of [evaluateCarePlan([a,second],[make(a,30),make(second,40)]),broadRuleBaseline([a,second])]) {
      assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
      assert.ok(r.unresolved.some(x=>x.reason.includes('full-clause')));
    }
  }
});
test('exact Pro2 compound-chemical and compound-cycle conflicts are blocked even if model condition tags are omitted',()=>{
  const cases=[
    ['Machine wash at 30°C and use fabric softener and do not bleach.','Machine wash at 40°C. Do not use fabric softener.'],
    ['Machine wash at 30°C. Use normal cycle only and use delicate cycle only.','Machine wash at 40°C.']
  ];
  for(const labels of cases){
    const omitted=segmentInputs(labels).flatMap(clauses=>clauses.map((_,i)=>[i===0?'machine_wash':'dry']));
    for(const r of [broadRuleBaseline(labels),carePlanFromSegments(labels,omitted)]){
      assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
      assert.ok(r.unresolved.some(x=>x.reason.includes('full-clause')));
    }
  }
});
test('exact Pro2 pairwise-overlapping cycle sets need one globally common permitted cycle',()=>{
  const labels=[
    'Machine wash at 30°C. Machine wash on normal or gentle cycle only. Machine wash on normal or wool cycle only.',
    'Machine wash at 40°C. Machine wash on gentle or wool cycle only.'
  ];
  const omitted=segmentInputs(labels).flatMap(clauses=>clauses.map((_,i)=>[i===0?'machine_wash':'dry']));
  for(const r of [broadRuleBaseline(labels),carePlanFromSegments(labels,omitted)]){
    assert.equal(r.action,'check_conditions');assert.equal(r.ceilingC,undefined);
    assert.ok(r.unresolved.some(x=>x.reason.includes('all exclusive')));
  }
  const compatible=[labels[0],'Machine wash at 40°C. Machine wash on normal or wool cycle only.'];
  assert.equal(broadRuleBaseline(compatible).action,'shared_ceiling_with_conditions');
});
test('baseline and role route split a full stop without a following space identically',()=>{
  const labels=['Machine wash at 30°C.Do not bleach.','Machine wash at 40°C.'];
  const baseline=broadRuleBaseline(labels),model=carePlanFromSegments(labels,[['machine_wash'],['no_bleach'],['machine_wash']]);
  assert.equal(baseline.action,'shared_ceiling_with_conditions');assert.equal(model.action,baseline.action);
  assert.equal(baseline.ceilingC,30);assert.equal(model.ceilingC,baseline.ceilingC);
  assert.deepEqual(model.conditions,baseline.conditions);
});
