import {COMPONENTS,PRESETS} from '../v2/bleile-model.mjs';
const repairs=['confounding','measurement','sensitivity'];
// Validate messages from the adapted game's fixed Susan scenario.
export function spotlightAssessment(scores){
  if(!scores || typeof scores!=='object')throw new TypeError('Missing spotlight profile');
  const profile={},basis={...PRESETS.start.basis};
  for(const {id} of COMPONENTS){
    const value=scores[id],min=PRESETS.recover.scores[id],max=PRESETS.start.scores[id];
    if(!Number.isInteger(value)||value<min||value>max)throw new RangeError('Invalid spotlight score for '+id);
    profile[id]=value;
    if(repairs.includes(id)&&value===min)basis[id]='evidence';
  }
  return {profile,basis};
}
