// Haier Heating Card v0.5.9
const GROUPS = {
 'Pompa ciepła': 'electric thermal cop status program controlPc mode control energyDaily heatDaily fan compressor suction discharge ambient defrost expansion tho thi supply supplyTarget return delta limit cooling heater',
 'Dom i pogoda': 'north south groundRoom upperRoom groundThermostat upperThermostat',
 'CWU': 'cwu cwuHaier cwuTarget hysteresis cwuHeater circulation',
 'Bufor CO': 'bufferTop bufferMiddle bufferBottom bufferCharge heatingReturn',
 'Parter': 'groundTemp groundTarget groundValve groundPump',
 'Piętro': 'upperTemp upperTarget upperValve upperPump'
};
const LABELS = {electric:'Moc elektryczna',thermal:'Moc cieplna',cop:'COP',status:'Status pompy',program:'Program',controlPc:'Sterowanie PC',mode:'Tryb',control:'Sterowanie',energyDaily:'Pobrano (energia dobowa)',heatDaily:'Wytworzono (ciepło dobowe)',fan:'Obroty wentylatora',compressor:'Częstotliwość sprężarki',suction:'Temperatura ssania',discharge:'Temperatura tłoczenia',ambient:'Temperatura otoczenia',defrost:'Temperatura odszraniania',expansion:'Otwarcie zaworu rozprężnego',tho:'Wylot wymiennika THO',thi:'Wlot wymiennika THI',supply:'Temperatura CO odczytana',supplyTarget:'Temperatura CO zadana',return:'Powrót CO Haier',delta:'Różnica temperatur ΔT',limit:'Ograniczenie mocy',cooling:'Chłodzenie',heater:'Grzałka Haier',north:'Temperatura zewnętrzna N',south:'Temperatura zewnętrzna S',groundRoom:'Temperatura parteru',upperRoom:'Temperatura piętra',groundThermostat:'Termostat parteru',upperThermostat:'Termostat piętra',cwu:'Temperatura CWU',cwuHaier:'Temperatura CWU Haier',cwuTarget:'Zadana CWU',hysteresis:'Histereza CWU',cwuHeater:'Grzałka CWU',circulation:'Pompa cyrkulacyjna CWU',bufferTop:'Bufor góra',bufferMiddle:'Bufor środek',bufferBottom:'Bufor dół',bufferCharge:'Naładowanie bufora',heatingReturn:'Powrót do bufora',groundTemp:'Temperatura zaworu parter',groundTarget:'Zadana zaworu parter',groundValve:'Otwarcie zaworu parter',groundPump:'Pompa parter',upperTemp:'Temperatura zaworu piętro',upperTarget:'Zadana zaworu piętro',upperValve:'Otwarcie zaworu piętro',upperPump:'Pompa piętro'};
const KEYS = Object.values(GROUPS).flatMap(s=>s.split(' '));
const DEFAULTS = {fit_height:true, missing_entity_mode:'hide', pump_threshold_w:30, max_width:640, height_reserve:170};
const esc = v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const setting = (v, fallback, low, high) => v == null || v === '' || !Number.isFinite(Number(v)) ? fallback : Math.max(low, Math.min(high, Number(v)));
const getWidth = v => v===0 || v==='0' ? 0 : setting(v,640,150,10000);
function key(n) {
 if(n.nodeType!==1)return '';
 const t=n.localName, a=k=>n.getAttribute(k);
 return a('id') || (a('data-heat-entity')||a('data-heat-switch') ? `${a('data-heat-entity')||a('data-heat-switch')}:${a('x')}:${a('y')}:${a('transform')}` : t==='path' ? `${a('d')}:${a('class')||''}:${a('stroke')||''}:${a('stroke-width')||''}:${a('transform')||''}` : t==='stop'?a('offset')||'':t==='g'?a('transform')||'':'');
}
const compatible = (a,b)=>a.nodeType===b.nodeType && (a.nodeType!==1 || a.localName===b.localName && a.namespaceURI===b.namespaceURI && key(a)===key(b));
function patch(a,b) {
 if(a.nodeType===3||a.nodeType===8){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return;}
 if(a.nodeType===1){
  for(const v of [...a.attributes])if(!b.hasAttributeNS(v.namespaceURI,v.localName))a.removeAttributeNS(v.namespaceURI,v.localName);
  for(const v of [...b.attributes])if(a.getAttributeNS(v.namespaceURI,v.localName)!==v.value)a.setAttributeNS(v.namespaceURI,v.name,v.value);
 }
 const old=[...a.childNodes], retained=new Set();let index=0;
 const pairs=[...b.childNodes].map(n=>{
  const here=old[index];
  const match=here&&!retained.has(here)&&compatible(here,n)?here:old.find(c=>!retained.has(c)&&compatible(c,n));
  if(match){retained.add(match);if(match===here)index++;}
  return [n,match];
 });
 for(const n of old)if(!retained.has(n))n.remove();
 let pos=a.firstChild;
 for(const [n,match] of pairs){
  if(match){if(match!==pos)a.insertBefore(match,pos);patch(match,n);pos=match.nextSibling;}
  else a.insertBefore(n.cloneNode(true),pos);
 }
}
class HaierHeatingCard extends HTMLElement {
 static getConfigElement(){return document.createElement('haier-heating-card-editor');}
 static getStubConfig(){return {type:'custom:haier-heating-card'};}
 getCardSize(){return 12;}
 // Dashboard owns the grid allocation; the card does not impose a column count.
 setConfig(config){
  if(!config)throw new Error('Brak konfiguracji');
  this.config={...DEFAULTS,...config};
  if(!['hide','dash','zero'].includes(this.config.missing_entity_mode))throw new Error('Nieprawidłowy tryb brakujących encji');
  this.entities=Object.fromEntries(KEYS.map(k=>[k,typeof config.entities?.[k]==='string'?config.entities[k].trim():'']));
  if(!this.shadowRoot){this.attachShadow({mode:'open'});this.bindEvents();}
  this.render();
 }
 set hass(next){const previous=this._hass;this._hass=next;if(!this.config||!next)return;if(previous&&Object.values(this.entities).every(id=>!id||previous.states[id]===next.states[id]))return;this.render();}
 bindEvents(){
  let pressed=null,x=0,y=0,started=0,timer=null,longFired=false;
  const root=this.shadowRoot;
  const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const info=id=>{if(id)this.dispatchEvent(new CustomEvent('hass-more-info',{bubbles:true,composed:true,detail:{entityId:id}}));};
  const moved=e=>Math.abs(e.clientX-x)>10||Math.abs(e.clientY-y)>10;
  root.addEventListener('pointerdown',e=>{
   if(e.button!==undefined&&e.button!==0)return;
   clear();pressed=e.composedPath().find(el=>el?.dataset&&(el.dataset.heatEntity||el.dataset.heatSwitch));
   x=e.clientX;y=e.clientY;started=Date.now();longFired=false;
   if(!pressed)return;
   const id=pressed.dataset.heatEntity||pressed.dataset.heatSwitch;
   timer=setTimeout(()=>{timer=null;if(!pressed)return;longFired=true;info(id);},500);
  },true);
  root.addEventListener('pointermove',e=>{if(moved(e)){clear();pressed=null;}},true);
  root.addEventListener('pointercancel',()=>{clear();pressed=null;longFired=false;},true);
  root.addEventListener('contextmenu',e=>{
   if(e.composedPath().some(el=>el?.dataset&&(el.dataset.heatEntity||el.dataset.heatSwitch)))e.preventDefault();
  },true);
  root.addEventListener('pointerup',async e=>{
   clear();const el=pressed;pressed=null;
   if(!el||moved(e)||longFired)return;
   e.stopPropagation();
   const h=this._hass,id=el.dataset.heatSwitch;
   if(id){
    if(!['on','off'].includes(h?.states[id]?.state))return;
    try{await h.callService('switch','toggle',{entity_id:id});}
    catch(err){this.dispatchEvent(new CustomEvent('hass-notification',{bubbles:true,composed:true,detail:{message:err?.message||'Nie udało się zmienić stanu.'}}));}
   }else info(el.dataset.heatEntity);
  },true);
 }

 render(){
  if(!this._hass||!this.config)return;
  const width=getWidth(this.config.max_width);
  this.style.setProperty('--hf-width',width?`${width}px`:'100%');
  this.style.setProperty('--hf-reserve',`${setting(this.config.height_reserve,170,0,600)}px`);
  this.toggleAttribute('data-fit-height',this.config.fit_height!==false);
  const mapped=Object.values(this.entities).some(id=>id&&this._hass.states[id]);
  const html=mapped?this.renderOriginal():`<div style="padding:24px;border:1px solid var(--divider-color);border-radius:12px;color:var(--primary-text-color)">Haier Heating Card: wybierz encje w edytorze karty.</div>`;
  if(this._mounted!==mapped){this.shadowRoot.innerHTML=html;this._mounted=mapped;return;}
  if(!mapped)return;
  const template=document.createElement('template');template.innerHTML=html;patch(this.shadowRoot,template.content);
 }
 renderOriginal(){
  const E=this.entities,h=this._hass,states=h.states;
  const uid=this._heatingFinalUid ||= 'hf'+Math.random().toString(36).slice(2,10), gid=k=>`${uid}-${k}`,url=k=>`url(#${gid(k)})`;
  const mode=this.config.missing_entity_mode, missing=id=>!id||!states[id],hidden=id=>mode==='hide'&&missing(id),fallback=id=>missing(id)&&mode==='zero'?'0':'—';
  const num=id=>{const s=states[id]?.state;return s==null||String(s).trim()===''||!Number.isFinite(Number(s))?null:Number(s);};
  const on=id=>states[id]?.state==='on',unit=id=>states[id]?.attributes?.unit_of_measurement||'',fmt=(v,d=1)=>Number(v).toFixed(d).replace('.',',');
  const temp=id=>num(id)==null?fallback(id):fmt(num(id))+'°C';
  const val=(id,d=1,u=unit(id))=>num(id)==null?fallback(id):fmt(num(id),d)+(u?' '+u:'');
  const state=id=>missing(id)||['unknown','unavailable'].includes(states[id].state)?fallback(id):(h.formatEntityState?h.formatEntityState(states[id]):states[id].state);
  const target=id=>{const v=states[id]?.attributes?.temperature;return v==null||!Number.isFinite(Number(v))?fallback(id):fmt(v)+'°C';};
  const watts=id=>{const n=num(id),u=unit(id).trim().toLowerCase();return n==null?null:n*(u==='kw'?1000:u==='mw'?1000000:1);};
  const power=id=>{const v=watts(id);return v==null?fallback(id):Math.abs(v)>=1000?fmt(v/1000,2)+' kW':Math.round(v)+' W';};
  const pct=id=>Math.max(0,Math.min(100,num(id)||0));
  const palette=[[40,139,231],[28,180,214],[35,190,100],[255,164,24],[231,53,65]];
  function color(v,stops){if(v==null)return '#718087';if(v<=stops[0])return `rgb(${palette[0]})`;if(v>=stops[4])return `rgb(${palette[4]})`;const i=stops.findIndex(s=>s>=v),p=(v-stops[i-1])/(stops[i]-stops[i-1]);return `rgb(${palette[i-1].map((c,j)=>Math.round(c+(palette[i][j]-c)*p))})`;}
  const cwu=color(num(E.cwu),[20,30,40,45,55]),co=[E.bufferTop,E.bufferMiddle,E.bufferBottom].map(id=>color(num(id),[20,25,30,35,45]));
  const entity=(id,toggle=false)=>id?` data-heat-${toggle?'switch':'entity'}="${esc(id)}" class="hf-click"`:'';
  function text(id,x,y,s,size=28,c='#f4f6f7',anchor='middle',weight=700,max=0){if(id!==null&&hidden(id))return '';const fit=max&&String(s).length*size*.56>max?` textLength="${max}" lengthAdjust="spacingAndGlyphs"`:'';return `<text${entity(id)} x="${x}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}"${fit}>${esc(s)}</text>`;}
  const running=(num(E.compressor)||0)>0,fan=(num(E.fan)||0)>0, hp=(watts(E.electric)||0)>(this.config.pump_threshold_w??30),circ=on(E.circulation),hot='#f33756',cold='#29bfea';
  const pipe=(d,c,active=false,reverse=false,w=12)=>{
   const p=`<path d="${d}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
   return `${p} stroke="#010405" stroke-width="${w+6}"/>${p} stroke="${c}" stroke-width="${w}"/>${p} stroke="#fff" stroke-opacity=".23" stroke-width="${Math.max(2,w*.26)}" pointer-events="none"/>${active?`${p} class="hf-flow${reverse?' hf-reverse':''}" stroke="#fff" stroke-opacity=".7" stroke-width="3" pointer-events="none"/>`:''}`;
  };
  const spin=(active,dur='1.8s')=>active?`<animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="${dur}" repeatCount="indefinite"/>`:'';
  const motion=(type,values,dur)=>`<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" repeatCount="indefinite"/>`;
  const pump=(id,x,y,c,r=27,active=on(id))=>hidden(id)?'':`<g transform="translate(${x} ${y})"${entity(id)}><title>${esc(state(id))}</title><circle r="${r+3}" fill="#10171a" stroke="#b7c3c9" stroke-width="3"/><circle r="${r}" fill="${url('pumpMetal')}"/><circle r="${r-5}" fill="${active?c:'#46565e'}"/><g>${spin(active,'1.2s')}${[0,120,240].map(a=>`<path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z" fill="#f3f6f7"${a?` transform="rotate(${a})"`:''}/>`).join('')}<circle r="5" fill="#f3f6f7"/></g><circle r="${r+8}" fill="transparent"/></g>`;
  function control(id,x,y,kind,toggle,r,active){
   if(hidden(id))return '';
   const c=active?(kind==='snow'?'#6bd6ff':'#ffc16c'):'#c1cbd0';
   const icon=kind==='snow'?`<g>${spin(active,'8s')}<path d="M0 -21V21M-18 -10L18 10M-18 10L18 -10 M-7 -16L0 -10L7 -16M-7 16L0 10L7 16 M-17 -2L-10 -5L-11 -13M17 2L10 5L11 13" fill="none" stroke="${c}" stroke-width="2.7"/></g>`:kind==='gauge'?`<path d="M-21 12A25 25 0 1 1 21 12" fill="none" stroke="${c}" stroke-width="3.5"/><path d="M-18 -8L-14 -6M-8 -20L-6 -15 M8 -20L6 -15M18 -8L14 -6" fill="none" stroke="${c}" stroke-width="3"/><g>${active?motion('rotate','-12 0 0;8 0 0;-12 0 0','2.4s'):''}<path d="M0 2L14 -13" fill="none" stroke="${c}" stroke-width="3"/><circle r="5" fill="${c}"/></g>`:`<g>${active?`<animate attributeName="opacity" values=".4;1;.4" dur="1.5s" repeatCount="indefinite"/>${motion('translate','0,3;0,-3;0,3','1.5s')}`:''}<path d="M-13 18C-27 4 0 -3 -13 -18 M0 18C-14 4 13 -3 0 -18 M13 18C-1 4 26 -3 13 -18" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/></g>`;
   return `<g transform="translate(${x} ${y})"${entity(id,toggle)}><title>${esc(state(id))}</title><circle r="${r}" fill="${url('control')}" stroke="#77848b" stroke-width="1.5"/>${icon}<circle r="${r+5}" fill="transparent"/></g>`;
  }
  const wind=(x,y,delay='')=>`<g transform="translate(${x} ${y})"><g class="${fan?'hf-wind':'hf-wind-still'}" style="${delay?`animation-delay:${delay};`:''}" fill="none" stroke="#b9c9d0" stroke-width="4" stroke-linecap="round"><path d="M-28 0H19C42 0 40 -27 22 -27C10 -27 7 -17 12 -11"/><path d="M-36 13H40C62 13 61 39 43 39C31 39 27 30 32 24"/><path d="M-22 26H11"/></g></g>`;
  function tank(x,width,name,fill,top,mid,bottom,isCwu=false){
   if(mode==='hide'&&[top,mid,bottom].every(missing))return '';
   const cx=x+width/2,ix=x+14,iw=width-28,l=isCwu?100:pct(E.bufferCharge),s=isCwu?1065:1404-330*l/100;
   return `${text(null,cx,1018,name,39,'#f0f3f4','middle',600)}<rect x="${x}" y="1050" width="${width}" height="375" rx="39" fill="${url('tankMetal')}" stroke="#d7dfe3" stroke-width="2"/><rect x="${x+7}" y="1057" width="${width-14}" height="361" rx="33" fill="#131b1f" stroke="#5d6b73" stroke-width="3"/><rect x="${ix}" y="1065" width="${iw}" height="339" rx="27" fill="#0b1519"/><g clip-path="${url(isCwu?'cwuClip':'bufferClip')}"><rect x="${ix}" y="${s}" width="${iw}" height="${1404-s}" fill="${url(fill)}"/>${l>0?`<ellipse cx="${cx}" cy="${s}" rx="${iw/2+4}" ry="12" fill="${isCwu?cwu:co[0]}" stroke="#f2ffff" stroke-opacity=".45" stroke-width="2"/><rect x="${ix}" y="${s}" width="${iw}" height="${1404-s}" fill="${url('liquidGloss')}"/>`:''}</g>${isCwu?`${text(top,cx,1150,temp(top),43)}${text(E.cwuTarget,cx,1238,temp(E.cwuTarget),31,'#ff244a')}${text(bottom,cx,1320,temp(bottom),43)}${text(E.hysteresis,cx,1382,num(E.hysteresis)==null?'± —':'± '+fmt(num(E.hysteresis))+'°C',27,'#ff244a')}`:`${text(top,cx,1146,temp(top),43)}${text(mid,cx,1234,temp(mid),43)}${text(bottom,cx,1322,temp(bottom),43)}${text(E.bufferCharge,cx,1382,val(E.bufferCharge,0),30)}`}`;
  }
  // Original panel geometry, labels and colors, with missing-entity handling.
  function zone(name,y,t,tr,v,p){
   if(mode==='hide'&&[t,tr,v,p].every(missing))return '';
   return `${hidden(p)?'':pipe(`M620 ${y+72}H752`,hot,on(p),false,11)}${pump(p,685,y+72,hot,26)}<rect x="752" y="${y}" width="226" height="148" rx="23" fill="${url('panel')}" stroke="#829097" stroke-width="2"/>${text(null,772,y+28,name,28,'#f1f4f5','start')}${text(t,772,y+65,temp(t),27,'#f5f7f8','start',700,99)}${text(tr,958,y+65,temp(tr),27,'#ff3554','end',700,99)}${hidden(v)?'':`${text(null,772,y+101,'Zawór',23,'#d7e0e4','start')}${text(v,958,y+101,val(v,0),25,'#fff','end')}<rect x="772" y="${y+125}" width="186" height="10" rx="5" fill="#303c42"/><rect x="772" y="${y+125}" width="${186*pct(v)/100}" height="10" rx="5" fill="${hot}"/>`}`;
  }
  const evap='M431 440H385 Q361 440 361 464 V512 Q361 535 337 535H293 C255 535 255 576 293 576H379 C418 576 418 617 379 617H293 C255 617 255 658 293 658H379 C418 658 418 699 379 699H293 C255 699 255 740 293 740H379 C418 740 418 781 379 781H293 C255 781 255 822 293 822H337 Q361 822 361 846 V851 Q361 875 385 875 H453';
  // Refrigerant circuit connects to the cylinder, not to the external water coil.
  const refrigerantHot='M563 440H627 Q651 440 651 464 V540';
  const refrigerantOutlet='M651 826 V851 Q651 875 627 875 H535';
  // Keep 44-unit spacing and a continuous stroke between the fixed pipe ends.
  // The final front pass keeps its slope until it eases into the blue return.
  const coilFront=[[641,675],[685,719],[729,780]];
  const waterRoute=[
   'M960 627 H722 C710 627 704 629 695 630',
   'C670 633 596 625 596 641',
   'C596 647 621 648 651 658 C681 668 704 669 704 675',
   'C704 681 673 679 651 680 C629 681 596 679 596 685',
   'C596 691 621 692 651 702 C681 712 704 713 704 719',
   'C704 725 673 723 651 724 C629 725 596 723 596 729',
   'C596 735 621 736 651 746 C681 756 718 775 752 775 H960'
  ].join(' ');
  const waterPipe=pipe(waterRoute,url('coilHeat'),hp,true,12);
  const gradient=(id,axis,stops,tag='linearGradient')=>`<${tag} id="${gid(id)}" ${axis}>${stops.map(([o,c,alpha])=>`<stop offset="${o}" stop-color="${c}"${alpha==null?'':` stop-opacity="${alpha}"`}/>`).join('')}</${tag}>`;
  const defs=`${gradient('background','cx=".5" cy=".35" r=".8"',[[0,'#111a1f'],[.6,'#080e12'],[1,'#05090c']],'radialGradient')}${gradient('tankMetal','x1="0" x2="1"',[[0,'#6c7a83'],[.035,'#e4eaed'],[.08,'#f8fafb'],[.14,'#7c8b94'],[.48,'#3e4c55'],[.85,'#8e9da5'],[.94,'#e4eaed'],[1,'#5a6972']])}${gradient('metal','x1="0" x2="1"',[[0,'#77858e'],[.16,'#e6ebee'],[.45,'#a7b3bb'],[.72,'#657680'],[1,'#c5cfd5']])}${gradient('pumpMetal','x1="0" y1="0" x2="1" y2="1"',[[0,'#f3f6f7'],[.45,'#a2b0b8'],[1,'#475962']])}${gradient('control','',[[0,'#253239'],[.75,'#10191f'],[1,'#060b0e']],'radialGradient')}${gradient('panel','x1="0" y1="0" x2="1" y2="1"',[[0,'#182126'],[1,'#080e12']])}${gradient('blade','x1="0" y1="0" x2="1" y2="1"',[[0,'#d0d8dd'],[.45,'#82929d'],[1,'#354954']])}${gradient('cwuFill','x1="0" y1="0" x2="0" y2="1"',[[0,cwu],[1,cwu]])}${gradient('bufferFill','x1="0" y1="0" x2="0" y2="1"',[[0,co[0]],[.5,co[1]],[1,co[2]]])}${gradient('coilHeat','gradientUnits="userSpaceOnUse" x1="651" y1="775" x2="651" y2="627"',[[0,'#29bfea'],[.45,'#a544d4'],[1,'#f33756']])}${gradient('liquidGloss','x1="0" x2="1"',[[0,'#fff',.18],[.18,'#fff',.03],[.65,'#000',0],[1,'#000',.24]])}<clipPath id="${gid('cwuClip')}"><rect x="54" y="1065" width="202" height="339" rx="27"/></clipPath><clipPath id="${gid('bufferClip')}"><rect x="414" y="1065" width="202" height="339" rx="27"/></clipPath><clipPath id="${gid('coilFrontClip')}" clipPathUnits="userSpaceOnUse">${coilFront.map(([start,end])=>`<rect x="607" y="${start}" width="88" height="${end-start}"/>`).join('')}</clipPath>`;
  return `<style>
   :host{display:block;box-sizing:border-box;min-width:0;max-width:100%}
   .hf-wrap{width:100%;max-width:var(--hf-width,640px);margin:0 auto;min-width:0}
   :host([data-fit-height]) .hf-wrap{max-width:min(var(--hf-width,640px),max(150px,calc((100vh - var(--hf-reserve,170px)) * .6666667)));max-width:min(var(--hf-width,640px),max(150px,calc((100dvh - var(--hf-reserve,170px)) * .6666667)))}
   .hf-svg{display:block;width:100%;height:auto;aspect-ratio:2/3;font-family:Manrope,Roboto,Arial,sans-serif;overflow:hidden;border-radius:20px;background:#080d10}
   .hf-svg text{dominant-baseline:middle;paint-order:stroke;stroke:#070d10;stroke-width:2px;stroke-linejoin:round}.hf-click{cursor:pointer;-webkit-tap-highlight-color:transparent}.hf-flow{stroke-dasharray:6 32;animation:hf-flow 1.7s linear infinite}.hf-reverse{animation-direction:reverse}.hf-wind{animation:hf-wind 2.2s ease-in-out infinite}.hf-wind-still{opacity:.55}@keyframes hf-flow{from{stroke-dashoffset:var(--hf-phase,0px)}to{stroke-dashoffset:calc(var(--hf-phase,0px) - 76px)}}@keyframes hf-wind{0%{opacity:.15;transform:translateX(-8px)}45%{opacity:.9}100%{opacity:.15;transform:translateX(10px)}}@media(prefers-reduced-motion:reduce){.hf-svg *{animation:none!important}}
  </style><div class="hf-wrap"><svg class="hf-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Schemat instalacji grzewczej Haier"><defs>${defs}</defs>
  <rect width="1000" height="1500" rx="32" fill="${url('background')}"/><rect x="12" y="12" width="976" height="1476" rx="31" fill="none" stroke="#6b7981" stroke-width="2"/><rect x="17" y="17" width="966" height="1466" rx="28" fill="none" stroke="#d6e1e6" stroke-opacity=".07"/><path d="M245 48V186M585 48V186M38 211H962M38 307H962" stroke="#839099" stroke-opacity=".5" stroke-width="1.5"/>
  ${text(E.electric,126,70,power(E.electric),36)}${text(E.thermal,126,118,power(E.thermal),34)}${text(E.cop,126,166,'COP '+val(E.cop,2,''),30)}
  <g transform="translate(321 119)" fill="none" stroke="#d6e1e6" stroke-width="4" stroke-linecap="round"><path d="M-29 8C-30 -10 -15 -22 0 -21 C15 -21 27 -12 29 1C48 1 54 34 29 38H-26 C-49 38 -50 12 -29 8Z"/><circle cx="-16" cy="-41" r="11"/><path data-sun-rays="5" d="M-16 -60V-66 M-30 -54L-35 -59 M-35 -42L-42 -42 M-2 -54L3 -59 M3 -42L10 -42"/></g>
  ${text(E.north,472,82,'N: '+temp(E.north),31)}${text(E.south,472,145,'S: '+temp(E.south),31)}
  <g transform="translate(648 101)" fill="none" stroke="#dce6eb" stroke-width="5" stroke-linejoin="round"><path d="M-28 5L0 -23L28 5V54H-28Z"/><path d="M-8 54V23H8V54"/></g>
  ${text(E.groundRoom,778,82,temp(E.groundRoom),32)}${text(E.groundThermostat,924,82,target(E.groundThermostat),31,'#ff3655')}${text(E.upperRoom,778,145,temp(E.upperRoom),32)}${text(E.upperThermostat,924,145,target(E.upperThermostat),31,'#ff3655')}
  ${text(E.status,104,259,state(E.status),48,'#f4f7f8','middle',700,122)}<path d="M176 232V284" stroke="#64757e" stroke-width="1.5"/>${text(E.program,278,253,state(E.program),29,'#f4f7f8','middle',700,160)}${text(E.controlPc,278,282,state(E.controlPc),15,'#aebec7','middle',600,160)}${text(E.mode,951,243,state(E.mode),30,'#f4f7f8','end',700,280)}${text(E.control,951,280,state(E.control),23,'#c7d2d9','end',500,300)}<path d="M392 232V284M747 232V284" stroke="#64757e" stroke-width="1.5"/>
  ${text(E.energyDaily,570,247,'Pobrano: '+val(E.energyDaily,2),22,'#f4f7f8','middle',600,340)}
  ${text(E.heatDaily,570,281,'Wytworzono: '+val(E.heatDaily,2),22,'#f4f7f8','middle',600,340)}
  ${text(E.suction,373,365,temp(E.suction),32)}${text(E.discharge,633,365,temp(E.discharge),32)}
  <g transform="translate(497 440)"${entity(E.compressor)}><circle r="66" fill="${url('metal')}" stroke="#e4ebef" stroke-width="3"/><circle r="56" fill="none" stroke="#f5f8fa" stroke-opacity=".5" stroke-width="2"/><circle r="49" fill="#4a5963" stroke="#273c48" stroke-width="3"/><path d="M-18 -29H18V-6H-18Z" fill="none" stroke="#e4ecef" stroke-width="4"/><g>${running?motion('translate','0,-3;0,4;0,-3','.7s'):''}<rect x="-14" y="-22" width="28" height="9" fill="#dbe5ea"/><path d="M0 -13V24" stroke="#dbe5ea" stroke-width="4"/></g><circle cy="28" r="8" fill="none" stroke="#dbe5ea" stroke-width="4"/><circle r="73" fill="transparent"/></g>
  ${text(E.compressor,497,528,val(E.compressor,0),30)}${text(E.ambient,151,512,temp(E.ambient),32,'#f4f6f7','end')}${wind(195,506)}
  <g transform="translate(158 662)"${entity(E.fan)}><g>${spin(fan,'2s')}${[0,72,144,216,288].map(a=>`<path d="M-10 -13C-54 -34 -64 -98 -27 -104 C9 -110 39 -45 15 -13Z" fill="${url('blade')}" stroke="#c0cbd2" stroke-opacity=".6" stroke-width="1.5" transform="rotate(${a})"/>`).join('')}<circle r="29" fill="${url('metal')}" stroke="#d8e2e8" stroke-width="2"/><circle r="11" fill="#233843" stroke="#899da9" stroke-width="2"/></g><circle r="113" fill="transparent"/></g>
  ${wind(85,802,'-1.1s')}${text(E.defrost,160,812,temp(E.defrost),31,'#f4f6f7','start')}${text(E.fan,151,915,val(E.fan,0),30)}${pipe(evap,cold,running,true)}
  ${control(E.heater,497,590,'heat',false,32,String(states[E.heater]?.state||'').trim().toLocaleUpperCase('pl-PL')==='WŁ')}${control(E.limit,497,681,'gauge',true,32,on(E.limit))}${control(E.cooling,497,772,'snow',true,32,on(E.cooling))}
  ${pipe(refrigerantHot,hot,running,false,12)}
  ${pipe(refrigerantOutlet,hot,running,false,12)}
  <g data-condenser-back="true">${waterPipe}</g>
  <g data-condenser-body="true"><rect x="608" y="540" width="86" height="286" rx="25" fill="${url('metal')}" stroke="#c9d5dc" stroke-width="2"/><ellipse cx="651" cy="548" rx="42" ry="12" fill="#dce4e9" stroke="#7d919e" stroke-width="1"/><path d="M620 567V804M682 567V804" stroke="#f2f6f8" stroke-opacity=".3" stroke-width="2"/><ellipse cx="651" cy="816" rx="40" ry="9" fill="#7e919d" stroke="#c1d0d9" stroke-width="1"/></g>
  <g data-condenser-front="true" clip-path="${url('coilFrontClip')}">${waterPipe}</g>
  ${pump(E.electric,791,627,hot,29,hp)}
  ${text(E.tho,752,506,temp(E.tho),30)}${text(E.supplyTarget,959,533,temp(E.supplyTarget),31,'#ff3554','end')}${text(E.supply,959,578,temp(E.supply),34,'#f4f6f7','end')}${text(E.delta,957,701,'Δ '+temp(E.delta),31,'#f4f6f7','end')}${text(E.return,957,817,temp(E.return),32,'#f4f6f7','end')}${text(E.thi,744,859,temp(E.thi),30)}
  <g transform="translate(494 875)"${entity(E.expansion)}><path d="M-39 -20L0 0L-39 20ZM39 -20L0 0L39 20Z" fill="${url('metal')}" stroke="#e1e9ed" stroke-width="2"/><rect x="-14" y="-39" width="28" height="20" rx="4" fill="${url('metal')}" stroke="#e1e9ed" stroke-width="2"/><path d="M0 -19V-1" stroke="#e0e9ef" stroke-width="4"/><ellipse cy="-39" rx="14" ry="4" fill="#e1e9ed"/><rect x="-45" y="-45" width="90" height="75" fill="transparent"/></g>${text(E.expansion,494,925,val(E.expansion,1),34)}
  ${pipe('M270 1145H345',hot,circ,false,11)}${pump(E.circulation,324,1145,hot,24,circ)}<path d="M351 1137V1153M358 1137V1153" stroke="#b6c4cc" stroke-width="2" stroke-linecap="round"/>
  ${pipe('M352 1350H270',cold,false,false,11)}<path d="M321 1344L309 1350L321 1356" fill="none" stroke="#dceaf1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${control(E.cwuHeater,324,1298,'heat',true,30,on(E.cwuHeater))}
  ${zone('PARTER',1040,E.groundTemp,E.groundTarget,E.groundValve,E.groundPump)}${zone('PIĘTRO',1210,E.upperTemp,E.upperTarget,E.upperValve,E.upperPump)}
  ${pipe('M961 1392H620',cold,on(E.groundPump)||on(E.upperPump))}<path d="M698 1424H663L674 1413M663 1424L674 1435" fill="none" stroke="#e0e9ee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${text(E.heatingReturn,962,1427,'Powrót '+temp(E.heatingReturn),26,'#eaf0f3','end')}
  ${tank(40,230,'CWU','cwuFill',E.cwu,null,E.cwuHaier,true)}${tank(400,230,'bufor CO','bufferFill',E.bufferTop,E.bufferMiddle,E.bufferBottom)}
  </svg></div>`;
 }
}

class HaierHeatingCardEditor extends HTMLElement {
 setConfig(config){this.config={...config,entities:{...config.entities}};this.render();}
 set hass(hass){this._hass=hass;this.querySelectorAll('ha-entity-picker').forEach(p=>{p.hass=hass;});}
 emit(update){this.config={...this.config,...update};this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));}
 render(){
  if(!this.config)return;
  const opened=[...this.querySelectorAll('details[open]')].map(d=>d.dataset.group);
  const options=Object.entries(GROUPS).map(([group,keys],i)=>`<details data-group="${i}"${opened.includes(String(i))?' open':''}><summary>${group}</summary><div class="hf-fields">${keys.split(' ').map(k=>`<div class="hf-field"><ha-entity-picker data-key="${k}" allow-custom-entity></ha-entity-picker><button type="button" data-clear="${k}" aria-label="Usuń przypisanie: ${LABELS[k]}">×</button></div>`).join('')}</div></details>`).join('');
  this.innerHTML=`<style>haier-heating-card-editor .hf-editor{display:grid;gap:12px;padding:12px 16px}haier-heating-card-editor .hf-editor label{display:flex;gap:10px;align-items:center;flex-wrap:wrap}haier-heating-card-editor .hf-editor input[type=number]{width:7em}haier-heating-card-editor .hf-fields{display:grid;gap:8px;padding:8px 0}haier-heating-card-editor .hf-field{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}haier-heating-card-editor summary{cursor:pointer;padding:6px 0}haier-heating-card-editor .hf-editor button{cursor:pointer}</style><div class="hf-editor"><label><input id="fit" type="checkbox"> Dopasuj do wysokości ekranu</label><label><input id="full" type="checkbox"> Pełna dostępna szerokość</label><label>Szerokość maksymalna (px) <input id="width" type="number" min="150" max="10000" step="1"></label><label>Rezerwa wysokości (px) <input id="reserve" type="number" min="0" max="600" step="1"></label><small>Dashboard przydziela miejsce karcie. Dopasowanie do wysokości może dodatkowo zmniejszyć szerokość.</small><label>Brak encji <select id="missing"><option value="hide">Ukryj element</option><option value="dash">Pokaż —</option><option value="zero">Pokaż 0</option></select></label><label>Próg pompy Haier (W) <input id="threshold" type="number" min="0" max="100000" step="1"></label>${options}</div>`;
  const q=s=>this.querySelector(s),fit=q('#fit'),full=q('#full'),width=q('#width'),reserve=q('#reserve'),missing=q('#missing'),threshold=q('#threshold');
  fit.checked=this.config.fit_height!==false; full.checked=getWidth(this.config.max_width)===0;
  width.value=getWidth(this.config.max_width)||this._lastWidth||640;width.disabled=full.checked;
  reserve.value=setting(this.config.height_reserve,170,0,600);reserve.disabled=!fit.checked;
  missing.value=this.config.missing_entity_mode||'hide';threshold.value=setting(this.config.pump_threshold_w,30,0,100000);
  fit.addEventListener('change',()=>{reserve.disabled=!fit.checked;this.emit({fit_height:fit.checked});});
  full.addEventListener('change',()=>{this._lastWidth=setting(width.value,640,150,10000);width.disabled=full.checked;this.emit({max_width:full.checked?0:this._lastWidth});});
  for(const [input,key,normalize] of [[width,'max_width',v=>setting(v,640,150,10000)],[reserve,'height_reserve',v=>setting(v,170,0,600)],[threshold,'pump_threshold_w',v=>setting(v,30,0,100000)]]) input.addEventListener('change',()=>{const v=normalize(input.value);input.value=v;this.emit({[key]:v});});
  missing.addEventListener('change',()=>this.emit({missing_entity_mode:missing.value}));
  const assign=(k,value)=>{const entities={...this.config.entities};if(value)entities[k]=value;else delete entities[k];this.emit({entities});};
  this.querySelectorAll('ha-entity-picker').forEach(p=>{const k=p.dataset.key;p.label=LABELS[k];p.hass=this._hass;p.value=this.config.entities[k]||'';p.allowCustomEntity=true;p.addEventListener('value-changed',e=>{if(e.detail&&'value' in e.detail&&(e.detail.value||'')!==(this.config.entities[k]||''))assign(k,e.detail.value);});});
  this.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.clear,p=q(`[data-key="${k}"]`);assign(k,'');if(p)p.value='';}));
 }
}
if(!customElements.get('haier-heating-card'))customElements.define('haier-heating-card',HaierHeatingCard);
if(!customElements.get('haier-heating-card-editor'))customElements.define('haier-heating-card-editor',HaierHeatingCardEditor);
window.customCards ||= [];
if(!window.customCards.some(c=>c.type==='haier-heating-card'))window.customCards.push({type:'haier-heating-card',name:'Haier Heating Card',description:'Animated Haier heat-pump installation schematic.'});
