/** Selection is transient UI state; every edit goes through the existing history/model. */
export function createPreviewEditor(host) {
 const stage=document.getElementById('modelStage'),toolbar=document.getElementById('contextToolbar');
 const names={title:'Title slide',divider:'Chapter divider',cards:'Text boxes',video:'Video slide',activity:'Activity'};
 let selected='background',targets=[],lastKind;
 // Decorative slide DOM stays isolated from selection, focus and sample controls.
 const thumbnailRoots=new WeakMap();
 const label=(id)=>targets.find(t=>t.id===id)?.label||'Background';
 function select(id,{activate=true,focus=false}={}) {
  selected=id;
  if(activate)host.activate();else refreshSelection();
  if(focus)targets.find(t=>t.id===selected)?.node.focus({preventScroll:true});
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
  if(!host.onlySlide())return `${target} selected · Color picks apply to every slide that shares that color. Fonts, sizes and finish stay on ${names[kind]}. Turn on Only this slide to keep a color here.`;
  return `${target} selected · ${names[kind]} only. Other slide types and shared defaults stay unchanged.`;
 }
 function field(id,title,value,options,onChange){
  const wrapper=document.createElement('label');wrapper.className='toolbar-field';wrapper.append(document.createTextNode(title));
  const select=document.createElement('select');select.id='context-'+id;
  for(const option of options){const el=document.createElement('option');el.value=String(option.id);el.textContent=option.label;select.append(el);}
  select.value=String(value);select.disabled=!host.context().editable;
  select.onchange=()=>{if(!host.context().editable)return;onChange(select.value);document.getElementById(select.id)?.focus({preventScroll:true});};
  wrapper.append(select);toolbar.append(wrapper);
 }
 function check(id,title,value,onChange){
  const wrapper=document.createElement('label');wrapper.className='toolbar-field toolbar-check';
  const box=document.createElement('input');box.type='checkbox';box.id='context-'+id;box.checked=value;box.disabled=!host.context().editable;
  box.onchange=()=>{onChange(box.checked);document.getElementById(box.id)?.focus({preventScroll:true});};
  wrapper.append(box,document.createTextNode(' '+title));toolbar.append(wrapper);
 }
 function renderToolbar(){
  const activeId=toolbar.contains(document.activeElement)?document.activeElement.id:null;
  toolbar.replaceChildren();
  const {design,kind,editable,optionsOpen,mode}=host.context();
  if(!design)return;
  // Guide me owns the preview while it runs; Start and Review offer one explicit way into editing.
  toolbar.hidden=mode==='guide';
  for(const id of ['editScope','selectionHelp'])document.getElementById(id).hidden=mode!=='edit';
  if(mode==='guide')return;
  if(mode==='browse'){
   const edit=document.createElement('button');edit.id='btnEditSlide';edit.type='button';edit.className='btn btn-primary';edit.textContent='Edit this slide';
   edit.onclick=()=>{host.activate();document.getElementById('selectedElement')?.focus({preventScroll:true});};
   toolbar.append(edit);return;
  }
  field('element','Selected element',selected,targets.map(t=>({id:t.id,label:t.label})),value=>select(value,{focus:true}));
  document.getElementById('context-element').id='selectedElement';
  const saved={...host.model.roleStyleDefaults(host.catalog,design,kind),...design.roleStyles?.[kind]};
  const effective=host.model.effectiveRoleStyle(host.catalog,design,kind);
  const shared=['primary','secondary','headingColor','bodyColor'];
  const apply=(key,value)=>host.change(`${names[kind]}: ${key.replace(/([A-Z])/g,' $1').toLowerCase()}`,d=>Object.assign(d,(shared.includes(key)&&!host.onlySlide()?host.model.setSharedColor:host.model.setRoleStyle)(host.catalog,d,kind,key,value)));
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
   check('only-slide','Only this slide',host.onlySlide(),v=>host.setOnlySlide(v));
  }else if(selected.startsWith('box')){
   const decisions=host.catalog.slideGroups.find(g=>g.id==='cards').decisions;
   for(const key of ['look','layout']){const decision=decisions.find(d=>d.id===key);field(key,key==='look'?'Fill & border style':'Box arrangement',design.slides.cards[key],decision.options,v=>host.change('Text boxes: '+decision.label,d=>{d.slides.cards[key]=v;}));}
  }else{
   field('finish','Background finish',saved.backgroundMode,[{id:'inherit',label:'Match arrangement'},{id:'solid',label:'Solid'},{id:'gradient',label:'Two-color gradient'}],v=>apply('backgroundMode',v));
   field('background','Background color',saved.primary,colors('primary'),v=>apply('primary',v));
   if(effective.backgroundMode==='gradient')field('second','Second color',saved.secondary,colors('secondary'),v=>apply('secondary',v));
   check('only-slide','Only this slide',host.onlySlide(),v=>host.setOnlySlide(v));
  }
  const more=document.createElement('button');more.id='btnMoreOptions';more.type='button';more.className='btn btn-secondary';more.textContent=optionsOpen?'Hide options':'More options';more.setAttribute('aria-expanded',String(optionsOpen));more.setAttribute('aria-controls','detailControls');more.onclick=()=>host.more(selected);toolbar.append(more);
  if(!editable){const note=document.createElement('span');note.className='toolbar-readonly';note.textContent='View only · open your team design to edit.';toolbar.append(note);}
  if(activeId)document.getElementById(activeId)?.focus({preventScroll:true});
 }
 function refresh({thumbnails=true}={}){
  const {kind}=host.context();if(lastKind!==kind){selected='background';lastKind=kind;}
  targets=[];
  const editing=host.context().mode==='edit';
  // Text keeps its visible words as its name; the background and boxes are labeled groups.
  const add=(id,label,node)=>{if(!node||getComputedStyle(node).display==='none'||!node.getClientRects().length)return;targets.push({id,label,node});if(!editing)return;node.dataset.editTarget=id;node.tabIndex=0;if(node.matches('.bespoke-slide,.slide-card,.slide-sidebar')){node.setAttribute('role','group');node.setAttribute('aria-label',label);}};
  add('background','Background',stage.querySelector('.bespoke-slide'));
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
  if(host.context().mode!=='edit'||event.target.closest('summary,a,input,select,textarea,button'))return;
  const node=event.target.closest('[data-edit-target]');if(node)select(node.dataset.editTarget,{focus:true});
 });
 stage.addEventListener('keydown',event=>{
  if(host.context().mode!=='edit'||event.target.closest('summary,a,input,select,textarea,button'))return;
  if(event.key==='Escape'){event.preventDefault();select('background',{focus:true});}
  else if(event.key==='Enter'||event.key===' '){const node=event.target.closest('[data-edit-target]');if(node){event.preventDefault();select(node.dataset.editTarget,{focus:true});}}
 });
 return {refresh};
}
