import {computeToolbarPosition,isQuickField} from './canvas-toolbar.mjs';
import {colorWell,segmentedControl,SEGMENTED_FIELDS,MAX_SEGMENTS} from './canvas-controls.mjs';
/** Selection is transient UI state; every edit goes through the existing history/model. */
export function createPreviewEditor(host) {
 const wide=matchMedia('(min-width:1101px)');
 // Where the next control goes: the floating toolbar, or (wide screens only) the options drawer.
 let place=()=>document.getElementById('contextToolbar');
 // Wide screens swap small dropdowns for segmented controls and a color well.
 let richControls=false;
 const stage=document.getElementById('modelStage'),toolbar=document.getElementById('contextToolbar'),inspector=document.getElementById('selectionInspector');
 const names={title:'Title slide',divider:'Chapter divider',cards:'Text boxes',video:'Video slide',activity:'Activity'};
 let selected='background',targets=[],lastKind,editingText=false;
 // Decorative slide DOM stays isolated from selection, focus and sample controls.
 const thumbnailRoots=new WeakMap();
 const label=(id)=>targets.find(t=>t.id===id)?.label||'Background';
 function select(id,{activate=true,focus=false}={}) {
  selected=id;
  if(activate)host.activate();else refreshSelection();
  if(focus)targets.find(t=>t.id===selected)?.node.focus({preventScroll:true});
  if(activate&&matchMedia('(max-width:760px)').matches)inspector.scrollIntoView({block:'start',behavior:'instant'});
 }
 function refreshSelection(){
  const {kind}=host.context();
  for(const t of targets){const on=t.id===selected;t.node.classList.toggle('editor-selected',on);t.node.setAttribute('aria-describedby','selectionHelp');if(on)t.node.setAttribute('aria-current','true');else t.node.removeAttribute('aria-current');}
  const picker=document.getElementById('selectedElement');if(picker)picker.value=selected;
  document.getElementById('editScope').textContent=scope(kind,selected);
  renderToolbar();
 }
 function scope(kind,id){
  const target=label(id);
  if(id.startsWith('sidebar'))return `${target} selected · The sidebar is shared by every content slide.`;
  if(id.startsWith('box'))return `${target} selected · Fill/border treatment and arrangement affect ALL boxes on Text boxes slides.`;
  if(kind==='cards'&&id.startsWith('heading'))return `${target} selected · Formatting affects the title bar and ALL box headings on Text boxes slides.`;
  if(kind==='cards'&&id.startsWith('body'))return `${target} selected · Formatting affects ALL box text on Text boxes slides. Sample words remain independent.`;
  if(kind==='divider'&&id.startsWith('body'))return `${target} selected · Formatting affects the chapter label and supporting text on Chapter divider slides.`;
  if(kind==='activity'&&id.startsWith('heading'))return `${target} selected · Formatting affects the heading and activity label on Activity slides.`;
  return `${target} selected · ${names[kind]} only. Other slide types and shared defaults stay unchanged.`;
 }
 function field(id,title,value,options,onChange,{color=false}={}){
  const select=document.createElement('select');select.id='context-'+id;
  for(const option of options){const el=document.createElement('option');el.value=String(option.id);el.textContent=option.label;select.append(el);}
  const editable=host.context().editable;
  select.value=String(value);select.disabled=!editable;
  select.onchange=()=>{if(!host.context().editable)return;onChange(select.value);document.getElementById(select.id)?.focus({preventScroll:true});};
  const dest=place(id),rich=richControls&&dest===toolbar;
  if(rich&&color)return void dest.append(colorWell({id,title,select,swatches:host.catalog.palette,value,editable,onChoose:onChange}));
  if(rich&&SEGMENTED_FIELDS.includes(id)&&options.length>=2&&options.length<=MAX_SEGMENTS)return void dest.append(segmentedControl({id,title,select,options,value,editable,onChoose:onChange}));
  const wrapper=document.createElement('label');wrapper.className='toolbar-field';wrapper.append(document.createTextNode(title),select);dest.append(wrapper);
 }
 function renderToolbar(){
  if(editingText)return;
  const activeId=toolbar.contains(document.activeElement)?document.activeElement.id:null;
  toolbar.replaceChildren();document.getElementById('inspectorMore')?.replaceChildren();
  document.querySelector('.preview-actions #btnMoreOptions')?.remove();
  const {design,kind,editable,optionsOpen,mode}=host.context();
  if(!design)return;
  // Wide editing: quick controls float over the slide, the rest wait in the options drawer.
  const floating=mode==='edit'&&wide.matches,moreBox=document.getElementById('inspectorMore');
  place=id=>floating&&!isQuickField(selected,id)?moreBox:toolbar;
  richControls=floating;
  toolbar.classList.toggle('is-floating',floating);
  if(!floating){toolbar.style.left='';toolbar.style.top='';delete toolbar.dataset.placement;}
  // Guide me owns the preview while it runs; Start and Review offer one explicit way into editing.
  inspector.hidden=mode!=='edit';
  const phone=mode==='edit'&&matchMedia('(max-width:760px)').matches;
  const followup=document.getElementById('inspectorFollowup');followup.hidden=!phone;
  const after=phone?followup:document.getElementById('previewPane');
  for(const node of document.querySelectorAll('.similarity,.preview-caption'))if(node.parentElement!==after)after.append(node);

  const mount=mode==='edit'&&!floating?document.getElementById('inspectorFields'):document.getElementById('previewToolbarMount');
  if(toolbar.parentElement!==mount)mount.append(toolbar);
  toolbar.hidden=mode==='guide';
  document.getElementById('inspectorTitle').textContent=label(selected);

  for(const id of ['editScope','selectionHelp'])document.getElementById(id).hidden=mode!=='edit';
  if(mode==='guide')return;
  if(mode==='browse'){
   const edit=document.createElement('button');edit.id='btnEditSlide';edit.type='button';edit.className='btn btn-primary';edit.textContent='Edit this slide';
   edit.onclick=()=>{host.activate();document.getElementById('selectedElement')?.focus({preventScroll:true});};
   toolbar.append(edit);return;
  }
  const scopeBadge=document.createElement('strong');scopeBadge.className='scope-badge';scopeBadge.id='formattingScope';scopeBadge.textContent=selected==='sidebar'?'Shared navigation':selected==='button'?'All action buttons':selected==='accent'?'Shared accent':kind==='cards'&&selected.startsWith('heading')?'Title bar & all box headings':kind==='cards'&&selected.startsWith('body')?'All box text':selected.startsWith('box')?'All text boxes':kind==='activity'&&selected.startsWith('heading')?'Heading & activity label':kind==='divider'&&selected.startsWith('body')?'Chapter label & supporting text':'This slide type only';place('scope').append(scopeBadge);
  field('element','Selected element',selected,targets.map(t=>({id:t.id,label:t.label})),value=>select(value,{focus:true}));
  document.getElementById('context-element').id='selectedElement';
  const saved={...host.model.roleStyleDefaults(host.catalog,design,kind),...design.roleStyles?.[kind]};
  const effective=host.model.effectiveRoleStyle(host.catalog,design,kind);
  const apply=(key,value)=>host.change(`${names[kind]}: ${key.replace(/([A-Z])/g,' $1').toLowerCase()}`,d=>Object.assign(d,host.model.setRoleStyle(host.catalog,d,kind,key,value)));
  const colors=key=>[{id:'inherit',label:'Use shared theme'},...host.catalog.palette.map(c=>({id:c.id,label:c.name}))];
  if(selected.startsWith('sidebar')){
   const palette=host.catalog.palette.map(c=>({id:c.id,label:c.name}));
   field('sidebar-color','Sidebar color',design.roles.sidebar,palette,v=>host.change('Sidebar color',d=>{d.roles.sidebar=v;}));
   field('sidebar-text','Sidebar text color',design.roles.sidebarText||'auto',[{id:'auto',label:'Automatic'},...palette],v=>host.change('Sidebar text color',d=>Object.assign(d,host.model.setSidebarText(host.catalog,d,v))));
  }else if(selected.startsWith('heading')||selected.startsWith('body')){
   const type=selected.startsWith('heading')?'heading':'body';
   field('font','Font',saved[type+'Font'],[{id:'inherit',label:'Use shared font'},...host.catalog.fonts.map(f=>({id:f.id,label:f.label}))],v=>apply(type+'Font',v));
   field('size','Size',saved[type+'Size'],[{id:'small',label:'Smaller'},{id:'default',label:'Match arrangement'},{id:'large',label:'Larger'}],v=>apply(type+'Size',v));
   field('color','Text color',saved[type+'Color'],colors(type+'Color'),v=>apply(type+'Color',v));
  }else if(selected.startsWith('box')){
   featureColors('box',{border:true});
   for(const key of ['look','layout','count','treatment'])decision('cards',key);
  }else{
   field('finish','Background',effective.backgroundMode,[{id:'solid',label:'Solid'},{id:'gradient',label:'Gradient'}],v=>apply('backgroundMode',v));
   colorField('background',effective.backgroundMode==='gradient'?'Start color':'Background color',effective.primary,v=>apply('primary',v));
   if(effective.backgroundMode==='gradient')colorField('second','End color',effective.secondary,v=>apply('secondary',v));
   field('pattern','Texture',effective.pattern,host.catalog.backgrounds.map(p=>({id:p.id,label:p.label})),v=>apply('pattern',v));
   decision(kind,'layout');
  }
  const addText=document.createElement('button');addText.type='button';addText.id='btnAddText';addText.className='btn btn-secondary';addText.textContent=effective.extraText===null?'Add text':'Select added text';addText.disabled=!editable;addText.onclick=()=>{selected='extra';if(effective.extraText===null)apply('extraText','Your text here');else refreshSelection();document.getElementById('context-text')?.focus();};if(selected==='background'||selected==='extra'||selected.startsWith('heading')||selected.startsWith('body'))toolbar.append(addText);
  const featureId=selected.startsWith('box')?'box':selected;
  if(design.featureStyles?.[featureId]){const reset=document.createElement('button');reset.type='button';reset.className='btn btn-secondary';reset.id='btnResetFeature';reset.textContent='Use shared defaults';reset.disabled=!editable;reset.onclick=()=>host.change(label(selected)+': shared defaults',d=>{delete d.featureStyles[featureId];if(!Object.keys(d.featureStyles).length)delete d.featureStyles;});place('reset').append(reset);}
  const more=document.createElement('button');more.id='btnMoreOptions';more.type='button';more.className='btn btn-secondary';more.textContent=optionsOpen?'Hide slide options':'More slide options';more.setAttribute('aria-expanded',String(optionsOpen));more.setAttribute('aria-controls','detailControls');more.onclick=()=>host.more(selected);
  // Wide screens keep the pane toggle in the canvas header beside Present, so the toolbar stays on one row.
  (floating?document.querySelector('.preview-actions'):toolbar).append(more);
  if(!editable){const note=document.createElement('span');note.className='toolbar-readonly';note.textContent='View only · open your team design to edit.';toolbar.append(note);}
  if(activeId)document.getElementById(activeId)?.focus({preventScroll:true});
  toolbar.classList.toggle('has-copy',Boolean(toolbar.querySelector('.toolbar-copy')));
  positionToolbar();
 }
 // Dock the floating toolbar above the slide, never over it, so every element stays clickable.
 function positionToolbar(){
  if(!toolbar.classList.contains('is-floating'))return;
  const pane=document.getElementById('previewPane'),node=stage.querySelector('.bespoke-slide');
  if(!pane||!node)return;
  const c=pane.getBoundingClientRect(),a=node.getBoundingClientRect(),t=toolbar.getBoundingClientRect();
  const pos=computeToolbarPosition({anchor:{left:a.left-c.left,top:a.top-c.top,width:a.width,height:a.height},canvas:{width:c.width,height:c.height},toolbar:{width:t.width,height:t.height}});
  toolbar.style.left=pos.left+'px';toolbar.style.top=pos.top+'px';toolbar.dataset.placement=pos.placement;
 }
 function refresh({thumbnails=true}={}){
  const {kind}=host.context();if(lastKind!==kind){selected='background';lastKind=kind;}
  targets=[];
  const editing=host.context().mode==='edit';
  // Text keeps its visible words as its name; the background and boxes are labeled groups.
  const add=(id,label,node)=>{if(!node||getComputedStyle(node).display==='none'||!node.getClientRects().length)return;targets.push({id,label,node});if(!editing)return;node.dataset.editTarget=id;node.tabIndex=0;if(node.matches('.bespoke-slide,.slide-card,.slide-sidebar')){node.setAttribute('role','group');node.setAttribute('aria-label',label);}};
  add('background','Background',stage.querySelector('.bespoke-slide'));
  const visible=selector=>[...stage.querySelectorAll(selector)].find(node=>getComputedStyle(node).display!=='none'&&node.getClientRects().length&&(node.matches('summary')||!node.closest('details:not([open])')));
  add('sidebar','Navigation sidebar',visible('.slide-sidebar,.slide-sidebar-drawer')||visible('.slide-sidebar-disclosure > summary'));
  add('button','Action button',stage.querySelector('.slide-button'));
  add('logo','SPOKES logo',stage.querySelector('.slide-logo'));
  add('accent','Accent rule',stage.querySelector('.slide-accent'));
  add('titlebar','Title bar',stage.querySelector('.slide-title-bar'));
  add('video','Video frame',stage.querySelector('.slide-video-frame'));
  add('activity','Activity panel',stage.querySelector('.slide-activity'));
  add('watermark','Watermark',visible('.role-watermark,.slide-watermark'));
  add('extra','Added text',stage.querySelector('.slide-extra-text'));
  stage.querySelectorAll('.slide-title-text,.slide-heading,.slide-card h3,.slide-activity-label').forEach((node,i)=>add('heading-'+i,node.closest('.slide-card')?'Box '+(Array.from(stage.querySelectorAll('.slide-card')).indexOf(node.closest('.slide-card'))+1)+' heading':node.classList.contains('slide-activity-label')?'Activity label':'Heading',node));
  stage.querySelectorAll('.slide-subtitle,.slide-body').forEach((node,i)=>add('body-'+i,node.closest('.slide-card')?'Box '+(Array.from(stage.querySelectorAll('.slide-card')).indexOf(node.closest('.slide-card'))+1)+' text':'Supporting text',node));
  stage.querySelectorAll('.slide-card').forEach((node,i)=>add('box-'+i,'Box '+(i+1),node));
  add('sidebar','Sidebar',stage.querySelector('.slide-sidebar'));
  add('sidebar-text','Sidebar text',stage.querySelector('.slide-sidebar .sample-sidebar-title'));
  if(!targets.some(t=>t.id===selected))selected='background';
  refreshSelection();
  if(!thumbnails)return;
  for(const button of document.querySelectorAll('#previewTabs [data-view]')){
   let thumb=button.querySelector('.slide-thumbnail');if(!thumb){const text=button.textContent;button.replaceChildren();thumb=document.createElement('span');thumb.className='slide-thumbnail';thumb.setAttribute('aria-hidden','true');thumb.inert=true;thumbnailRoots.set(thumb,thumb.attachShadow({mode:'closed'}));button.append(thumb);const name=document.createElement('span');name.textContent=text;button.append(name);}
   thumbnailRoots.get(thumb).innerHTML='<style>'+document.getElementById('designStyle').textContent+'.bespoke-slide{width:640px!important;max-width:none!important;min-height:360px;transform:scale(.19);transform-origin:top left;box-shadow:none}@media(max-width:760px){.bespoke-slide{transform:scale(.153)}}</style>'+host.thumbnail(button.dataset.view);
  }
 }
 stage.addEventListener('click',event=>{
  if(host.context().mode!=='edit'||event.target.closest('a,input,select,textarea'))return;
  if(event.target.closest('.slide-sidebar-disclosure > summary')){event.preventDefault();const disclosure=stage.querySelector('.slide-sidebar-disclosure');disclosure.open=!disclosure.open;const keepToggle=event.detail===0||!disclosure.open;select('sidebar',{focus:!keepToggle});if(keepToggle)stage.querySelector('.slide-sidebar-disclosure > summary').focus({preventScroll:true});return;}
  const node=event.target.closest('[data-edit-target]');if(node)select(node.dataset.editTarget,{focus:true});
 });
 stage.addEventListener('keydown',event=>{
  if(host.context().mode!=='edit'||event.target.closest('summary,a,input,select,textarea'))return;
  if(event.key==='Escape'){event.preventDefault();select('background',{focus:true});}
  else if(event.key==='Enter'||event.key===' '){const node=event.target.closest('[data-edit-target]');if(node){event.preventDefault();select(node.dataset.editTarget,{focus:false});document.getElementById('selectedElement')?.focus({preventScroll:true});}}
 });
 matchMedia('(max-width:760px)').addEventListener('change',()=>refresh());
 wide.addEventListener('change',()=>refresh());
 window.addEventListener('resize',positionToolbar);
 document.fonts?.ready.then(positionToolbar);
 return {refresh,select};
}
