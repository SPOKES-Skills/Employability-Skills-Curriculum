import * as Model from './builder-model.mjs';
const key=issue=>[issue.kind,issue.feature,issue.role,issue.textType,issue.surface].join(':');
/** Try real palette colors against the model's sampled gradients and feature fills.
 * No automatic repair: return only candidates that clear the selected warning
 * without introducing another warning or worsening an existing one. */
export function readabilitySuggestions(catalog,design,kind,issues){
 const effective=Model.effectiveRoleStyle(catalog,design,kind);
 const normalized=Model.setRoleStyle(catalog,design,kind,'headingColor',effective.headingColor);
 const suggestions=[],seen=new Set();
 for(const issue of issues){
  const source=['sidebar','button'].includes(issue.feature)?design:normalized;
  const before=Model.contrastIssues(catalog,source),baseline=new Map(before.map(i=>[key(i),i]));
  if(issue.feature==='video')continue; // Video placeholder ink follows shared roles.
  const type=issue.textType||(issue.role==='body'||issue.role==='subtitle'?'body':'heading');
  const field=type+'Color';
  for(const color of [...catalog.palette].sort((a,b)=>Number(b.id==='light')-Number(a.id==='light'))){
   let trial;
   if(['sidebar','button'].includes(issue.feature))trial=Model.setFeatureStyle(catalog,source,issue.feature,'color',color.id);
   else trial=Model.setRoleStyle(catalog,source,kind,field,color.id);
   const after=Model.contrastIssues(catalog,trial);
   const targetRemains=after.some(i=>issue.feature?i.feature===issue.feature&&i.role===issue.role:i.kind===kind&&(i.textType===type||!i.textType&&i.role===issue.role));
   if(targetRemains||after.some(i=>!baseline.has(key(i))||i.ratio+1e-9<baseline.get(key(i)).ratio))continue;
   const target=issue.feature==='sidebar'?'navigation text':issue.feature==='button'?'button text':type+' text';
   const label='Try '+color.name.toLowerCase()+' '+target;
   if(!seen.has(label)){suggestions.push({label,design:trial});seen.add(label);}break;
  }
 }
 return suggestions;
}
