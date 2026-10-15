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
  if(id==='sidebar')return 'Navigation sidebar selected · Shared across Text boxes, Video and Activity. Its fill, text color and font are independent of slide content.';
  if(id==='button')return 'Action button selected · Shared across Video and Activity buttons. Text and fill changes stay on buttons.';
  if(id==='accent')return 'Accent rule selected · Shared accent color also supplies inherited borders and navigation markers.';
  if(id==='logo')return 'SPOKES logo selected · Title slide only. Choose its position; the brand artwork stays intact.';
  if(id==='titlebar')return 'Title bar selected · Text boxes slides only. Click its heading to edit the words and type.';
  if(id==='video')return 'Video frame selected · Video slides only. The sample stands in for your video.';
  if(id==='activity')return 'Activity panel selected · Activity slides only. Click its text to format the words.';

  if(id.startsWith('box'))return `${target} selected · Fill, border and arrangement affect ALL boxes on Text boxes slides.`;
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
  const colors=()=>host.catalog.palette.map(c=>({id:c.id,label:c.name}));
  const colorField=(id,title,value,callback)=>{field(id,title,value,colors(),callback,{color:true});const input=document.getElementById('context-'+id);input.style.borderLeft='12px solid '+host.catalog.palette.find(c=>c.id===value).hex;};
  const feature=(id,key,value)=>host.change(label(selected)+': '+key,d=>Object.assign(d,host.model.setFeatureStyle(host.catalog,d,id,key,value)));
  const featureColors=(id,{text=false,border=false}={})=>{
   const values=host.model.effectiveFeatureStyle(host.catalog,design,id);
   colorField('background',id==='video'?'Placeholder color':'Background color',values.background,v=>feature(id,'background',v));
   if(text){colorField('color','Text color',values.color,v=>feature(id,'color',v));field('font','Font',values.font,host.catalog.fonts.map(f=>({id:f.id,label:f.label})),v=>feature(id,'font',v));}
   if(border)colorField('border','Border color',values.border,v=>feature(id,'border',v));
  };
  const decision=(group,key,title)=>{
   const item=host.catalog.slideGroups.find(g=>g.id===group).decisions.find(d=>d.id===key);
   field(key,title||item.label,design.slides[group][key],item.options,v=>host.change(names[group]+': '+item.label,d=>{d.slides[group][key]=item.type==='boolean'?v==='true':v;}));
  };
  const textField=(id,title,value,maxLength,callback)=>{
   const wrapper=document.createElement('label');wrapper.className='toolbar-copy';wrapper.textContent=title;
   const input=document.createElement('input');input.id='context-'+id;input.value=value;input.maxLength=maxLength;input.disabled=!editable;input.onchange=()=>{if(editable)callback(input.value);};wrapper.append(input);place(id).append(wrapper);
  };
  if(['sidebar','button'].includes(selected)){
   featureColors(selected,{text:true});
  }else if(selected==='accent'){
   colorField('color','Accent color',design.roles.accent,v=>host.change('Shared accent color',d=>{d.roles.accent=v;}));
  }else if(selected==='logo'){
   decision('title','logo');
  }else if(selected==='video'){
   decision('video','frame');featureColors('video',{border:design.slides.video.frame==='accent'});decision('video','layout');
  }else if(selected==='activity'){
   featureColors('activity',{border:true});decision('activity','layout');decision('activity','labelStyle');
  }else if(selected==='titlebar'){
   featureColors('titlebar',{border:true});decision('cards','titleBar');
  }else if(selected==='watermark'){
   const mark=(key,value)=>host.change('Watermark: '+key,d=>{Object.assign(d,host.model.setRoleStyle(host.catalog,d,kind,'watermarkMode','text'));Object.assign(d,host.model.setRoleStyle(host.catalog,d,kind,key,value));});
   textField('watermark-text','Watermark text',saved.watermarkText,40,v=>mark('watermarkText',v));
   field('font','Font',effective.watermarkFont,host.catalog.fonts.map(f=>({id:f.id,label:f.label})),v=>mark('watermarkFont',v));
   colorField('color','Watermark color',effective.watermarkColor,v=>mark('watermarkColor',v));
   field('size','Size',saved.watermarkSize,['small','medium','large'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)})),v=>mark('watermarkSize',v));
   field('placement','Position',saved.watermarkPlacement,['top-left','top-right','bottom-left','bottom-right'].map(id=>({id,label:id.replace('-',' ')})),v=>mark('watermarkPlacement',v));
   field('opacity','Opacity',saved.watermarkOpacity,[{id:'low',label:'Subtle'},{id:'medium',label:'Medium'},{id:'high',label:'Strong'}],v=>mark('watermarkOpacity',v));
   field('watermark-visible','Visibility','text',[{id:'text',label:'Show'},{id:'off',label:'Hide'}],v=>apply('watermarkMode',v));
  }else if(selected.startsWith('heading')||selected.startsWith('body')||selected==='extra'){
   const type=selected==='extra'?'extra':selected.startsWith('heading')?'heading':'body';
   field('font','Font',effective[type+'Font'],host.catalog.fonts.map(f=>({id:f.id,label:f.label})),v=>apply(type+'Font',v));
   field('size','Size',saved[type+'Size'],[{id:'small',label:'Smaller'},{id:'default',label:'Medium'},{id:'large',label:'Larger'}],v=>apply(type+'Size',v));
   colorField('color','Text color',effective[type+'Color'],v=>apply(type+'Color',v));
   field('align','Align',effective[type+'Alignment'],['left','center','right'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)})),v=>apply(type+'Alignment',v));
   field('placement','Place in text area',saved[type+'Placement']==='layout'?(kind==='title'&&design.slides.title.layout==='bottom'?'bottom':kind==='title'&&['corner','headline','masthead'].includes(design.slides.title.layout)?'top':'middle'):saved[type+'Placement'],['top','middle','bottom'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)})),v=>apply(type+'Placement',v));
   const target=targets.find(t=>t.id===selected)?.node;
   const box=target?.closest('.slide-card'),boxIndex=box?[...stage.querySelectorAll('.slide-card')].indexOf(box):-1;
   const isLabel=kind==='activity'&&target?.classList.contains('slide-activity-label')||kind==='divider'&&target?.matches('.slide-body:first-of-type');
   const copyKey=isLabel?'labelText':type+'Text';
   const wrapper=document.createElement('label');wrapper.className='toolbar-copy';wrapper.textContent='Sample text';
   const input=document.createElement('textarea');input.id='context-text';input.rows=2;
   input.maxLength=boxIndex>=0?(type==='heading'?100:host.catalog.sampleLimits.box):isLabel?80:kind==='title'&&type!=='extra'?host.catalog.sampleLimits[type==='heading'?'title':'subtitle']:type==='heading'?200:type==='extra'?500:1200;
   input.value=boxIndex>=0?(type==='heading'?(saved.boxHeadings?.[boxIndex]??`Step ${boxIndex+1}`):design.samples.boxes[boxIndex]):effective[copyKey]??'';
   input.disabled=!editable;let checkpoint=true;
   input.onfocus=()=>{editingText=true;checkpoint=true;};input.onblur=()=>{editingText=false;};
   input.oninput=()=>{if(!editable)return;host.textChange('Edit sample text',d=>{
    if(boxIndex>=0&&type==='body')d.samples.boxes[boxIndex]=input.value;
    else if(boxIndex>=0){const headings=saved.boxHeadings?.slice()??['Step 1','Step 2','Step 3','Step 4'];headings[boxIndex]=input.value;Object.assign(d,host.model.setRoleStyle(host.catalog,d,kind,'boxHeadings',headings));}
    else Object.assign(d,host.model.setRoleStyle(host.catalog,d,kind,copyKey,input.value));
   },checkpoint);checkpoint=false;};wrapper.append(input);place('text').append(wrapper);
   if(type==='extra'){const remove=document.createElement('button');remove.type='button';remove.className='text-link';remove.textContent='Remove added text';remove.disabled=!editable;remove.onclick=()=>{selected='background';apply('extraText',null);};place('text').append(remove);}

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
  const add=(id,label,node)=>{if(!node||getComputedStyle(node).display==='none'||!node.getClientRects().length)return;targets.push({id,label,node});if(!editing)return;node.classList.remove('editor-selected');node.removeAttribute('data-edit-target');const paint=getComputedStyle(node);node.style.setProperty('--editor-art-shadow',paint.boxShadow==='none'?'0 0 0 0 transparent':paint.boxShadow);if(id==='video'){node.style.setProperty('--editor-frame-outline',paint.outline);node.style.setProperty('--editor-frame-offset',paint.outlineOffset);}if(id==='accent'&&getComputedStyle(node).position==='static')node.style.position='relative';node.dataset.editTarget=id;node.tabIndex=0;if(!id.startsWith('heading')&&!id.startsWith('body')&&id!=='extra'){node.removeAttribute('aria-hidden');if(!node.matches('button,summary,img'))node.setAttribute('role','group');node.setAttribute('aria-label',node.matches('button,summary')?label+': '+node.textContent.trim():label);if(id==='watermark'){const text=node.textContent;const artwork=document.createElement('span');artwork.setAttribute('aria-hidden','true');artwork.textContent=text;node.replaceChildren(artwork);node.setAttribute('role','img');node.setAttribute('aria-label','Decorative watermark: '+text);}}};
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
