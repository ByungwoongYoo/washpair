// Private candidate presentation contract; the public application is unchanged.
export function carePlanView(output) {
  const restrictions=output.machineRestrictions||[];
  const prohibited=[...new Set(restrictions.map(x=>x.label))];
  const separate=[...new Set(output.conditions.filter(x=>x.kind==='separate').map(x=>x.label))];
  let headline,detail;
  if(output.action==='machine_prohibited') {
    headline=`Do not machine-wash ${prohibited.map(x=>`garment ${x}`).join(' or ')}.`;
    detail='Follow the hand-washing, dry-cleaning or no-wash instruction quoted below.';
  } else if(output.action==='separate') {
    headline=`Wash ${separate.map(x=>`garment ${x}`).join(' and ')} separately.`;
    detail='The quoted instruction excludes a shared load. It does not itself prohibit machine washing.';
  } else if(output.action==='shared_ceiling_with_conditions') {
    headline=`Lower stated washing ceiling: ${output.ceilingC}°C.`;
    detail='Match the cycle, colours and fabrics to the original instructions before combining garments.';
  } else {
    headline='Review the instructions listed below before choosing a machine wash.';
    detail='A washing temperature is not selected for these inputs.';
  }
  return {headline,detail,restrictions,conditions:output.conditions,unresolved:output.unresolved,evidence:output.evidence};
}
