import * as Model from './builder-model.mjs';
const names={title:'Title slide',divider:'Chapter divider',cards:'Text boxes',video:'Video slide',activity:'Activity'};
const kinds=Object.keys(names),clone=value=>structuredClone(value);
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};

/** Review surfaces use separate render trees and never change the editor selection. */
export function createReviewTools(host){
 const dialog=node('dialog',null,'design-review-dialog');dialog.id='designReviewDialog';document.body.append(dialog);
 let returnFocus,kind,mode,fix,applyFix;
 const restoreFocus=()=>{const target=returnFocus?.isConnected?returnFocus:document.getElementById('selectedElement')||document.getElementById('btnPresent');target?.focus({preventScroll:true});};
 const close=()=>{if(document.fullscreenElement===dialog)document.exitFullscreen?.().catch(()=>{});dialog.close();restoreFocus();};
 dialog.addEventListener('close',()=>{dialog.replaceChildren();restoreFocus();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 function reviewKey(event){
  if(!dialog.open)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.target.closest('select,input,textarea')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();kind=kinds[(kinds.indexOf(kind)+(event.key==='ArrowRight'?1:4))%5];draw();
 }
 dialog.addEventListener('keydown',reviewKey);
 const button=(text,action,id)=>{const b=node('button',text,'btn btn-secondary');b.type='button';if(id)b.id=id;b.onclick=action;return b;};
 function slide(design,label){
  const section=node('section',null,'review-version');section.setAttribute('aria-label',label);
  const frame=node('iframe');frame.title=label+' · '+names[kind];
  // Keyboard events inside an iframe do not bubble to its modal. The parent
  // handles them explicitly. Generated markup is escaped; CSP blocks scripts
  // in the sample while allowing parent keyboard handlers in Safari.
  frame.onload=()=>frame.contentDocument?.addEventListener('keydown',reviewKey);
  // A fresh document preserves actual responsive layouts and isolates duplicate IDs.
  const base=new URL('./',location.href).href;
  const css=Model.cssForDesign(host.catalog,design,{canonical:false});
  const markup=Model.renderSlide(host.catalog,design,kind,{title:design.samples.title,subtitle:design.samples.subtitle,lessonTitle:host.context().lessonTitle,logoUrl:'../SPOKES-Logo.png'});
  frame.srcdoc=`<!doctype html><html lang="en"><head><meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'"><title>BeSpoke design preview</title><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${base}"><style>html,body{margin:0;background:#fff} .bespoke-slide{min-height:100vh!important;box-sizing:border-box} ${css}</style></head><body>${markup}</body></html>`;
  section.append(frame);return section;
 }
 function choose(letter){
  if(host.context().alternatives.active===letter){close();return;}
  host.change('Chose Option '+letter,state=>{
   if(state.alternatives.active!==letter){const previous=state.design;state.design=state.alternatives.otherDesign;state.alternatives={active:letter,otherDesign:previous};}
  });close();
 }
 function draw(){
  const focused=document.activeElement?.id;
  dialog.replaceChildren();dialog.dataset.mode=mode;
  const header=node('div',null,'review-dialog-heading'),title=node('h2',mode==='compare'?'Compare your versions':mode==='fix'?'Preview readability change':'Presentation preview');title.id='designReviewTitle';dialog.setAttribute('aria-labelledby',title.id);
  header.append(title,button('Back to editing',close,'btnExitReview'));dialog.append(header);
  const nav=node('div',null,'review-dialog-navigation'),picker=node('select');picker.id='reviewSlide';picker.setAttribute('aria-label','Preview slide type');
  for(const [id,label] of Object.entries(names)){const o=node('option',label);o.value=id;picker.append(o);}picker.value=kind;picker.onchange=()=>{kind=picker.value;draw();};
  nav.append(button('Previous',()=>{kind=kinds[(kinds.indexOf(kind)+4)%5];draw();},'btnReviewPrevious'),picker,button('Next',()=>{kind=kinds[(kinds.indexOf(kind)+1)%5];draw();},'btnReviewNext'));
  if(mode==='present'&&dialog.requestFullscreen)nav.append(button('Full screen',()=>dialog.requestFullscreen().catch(()=>{document.getElementById('reviewHint').textContent='Presentation fills this window. Your browser did not allow full screen.';}),'btnFullScreen'));
  dialog.append(nav);const content=node('div',null,'review-slides'),{design,alternatives,editable}=host.context();
  if(mode==='compare'){
   for(const letter of ['A','B']){const chosen=alternatives.active===letter,version=slide(chosen?design:alternatives.otherDesign,'Option '+letter);const label=node('h3','Option '+letter+(chosen?' · Current choice':''));version.prepend(label);const select=button(chosen?'Keep Option '+letter:'Choose Option '+letter,()=>choose(letter),'chooseOption'+letter);select.disabled=!editable;version.append(select);content.append(version);}
  }else if(mode==='fix'){
   const current=slide(design,'Current design'),suggested=slide(fix.design,fix.label);current.prepend(node('h3','Current design'));suggested.prepend(node('h3',fix.label));content.append(current,suggested);const apply=button('Use this change',()=>{applyFix();close();},'btnApplyReadability');apply.disabled=!editable;nav.append(apply);
  }else content.append(slide(design,'Current design'));
  dialog.append(content);const hint=node('p',mode==='compare'?'Both versions stay in your saved design. The chosen option is used for review and submission.':mode==='fix'?'Nothing changes until you use this suggestion. Undo can restore your previous colors.':'Use Previous / Next or the arrow keys. Escape returns to editing; in full screen, press Escape again after leaving full screen.','helper');hint.id='reviewHint';dialog.append(hint);
  if(focused)document.getElementById(focused)?.focus({preventScroll:true});
 }
 function open(next,trigger){returnFocus=trigger||document.activeElement;kind=host.context().kind;mode=next;draw();dialog.showModal();document.getElementById('btnExitReview').focus();}
 document.getElementById('btnPresent').onclick=event=>open('present',event.currentTarget);
 document.getElementById('btnCompareVersions').onclick=event=>open('compare',event.currentTarget);
 document.getElementById('btnTryVersion').onclick=()=>{
  if(host.context().alternatives){open('compare');return;}
  host.change('Started Option B; kept Option A',state=>{state.alternatives={active:'B',otherDesign:clone(state.design)};});
 };
 function refresh(){
  const {alternatives,editable}=host.context(),status=document.getElementById('versionStatus');
  document.getElementById('btnTryVersion').hidden=Boolean(alternatives);document.getElementById('btnTryVersion').disabled=!editable;
  document.getElementById('btnCompareVersions').hidden=!alternatives;status.hidden=!alternatives;
  status.textContent=alternatives?'Editing Option '+alternatives.active+' · Option '+(alternatives.active==='A'?'B':'A')+' is kept. Save keeps both.':'';
 }
 refresh();return {refresh,previewFix(suggestion,apply,trigger){fix=suggestion;applyFix=apply;open('fix',trigger);}};
}
