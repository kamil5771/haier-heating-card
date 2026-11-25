import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const registry=new Map();
class Host {
 css=new Map();
 style={setProperty:(k,v)=>this.css.set(k,v)};
 toggleAttribute(){}
 attachShadow(){this.shadowRoot={innerHTML:'',addEventListener(){}};}
}
const src=readFileSync('dist/haier-heating-card.js','utf8');
vm.runInNewContext(src,{HTMLElement:Host,customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},window:{},setTimeout,clearTimeout,CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}},document:{createElement:()=>({set innerHTML(v){this.content={childNodes:[]};}})}});
const Card=registry.get('haier-heating-card');
const make=(config={})=>{
 const c=new Card();c.setConfig({max_width:0,entities:{electric:'sensor.electric',compressor:'sensor.comp',groundTemp:'sensor.ground',upperTemp:'sensor.upper',bufferTop:'sensor.top',cwu:'sensor.cwu',bufferCharge:'sensor.charge'},...config});
 c.hass={states:{'sensor.electric':{state:'597'},'sensor.comp':{state:'42'},'sensor.ground':{state:'31.5'},'sensor.upper':{state:'29.5'},'sensor.top':{state:'33'},'sensor.cwu':{state:'41'},'sensor.charge':{state:'50'}}};return c;
};
test('no imposed Sections columns; full and manual width',()=>{
 assert.equal(Card.prototype.getGridOptions,undefined);
 assert.equal(make().css.get('--hf-width'),'100%');
 assert.equal(make({max_width:750}).css.get('--hf-width'),'750px');
});
test('original panel geometry and labels with missing optional sensors',()=>{
 const s=make().shadowRoot.innerHTML;
 assert.match(s,/x="752" y="1040" width="226" height="148" rx="23"/);
 assert.match(s,/x="752" y="1210" width="226" height="148" rx="23"/);
 for(const text of ['PARTER','PIĘTRO','31,5°C','29,5°C','bufor CO','CWU']) assert.ok(s.includes(text),text);
});
test('five rays and continuous condenser; refrigerant runs clockwise',()=>{
 const s=make().shadowRoot.innerHTML;
 const sun=s.match(/data-sun-rays="5" d="([^"]+)"/)[1];assert.equal((sun.match(/M/g)||[]).length,5);
 const red=s.match(/<path d="(M563 440[^"]+)"[^>]*class="hf-flow"/)[1];assert.equal((red.match(/M/g)||[]).length,1);assert.match(red,/V540$/);assert.match(s,/M651 826 V851 Q651 875 627 875 H535/);assert.match(s,/data-condenser-front="true"/);assert.match(s,/data-condenser-back="true"/);assert.match(s,/gradientUnits="userSpaceOnUse"/);
 assert.match(s,/<path d="M431 440H385[^\"]+"[^>]*class="hf-flow hf-reverse"/);
});
test('public source has no private entity IDs or pasted chat markup',()=>assert.doesNotMatch(src,/franciszkow|sensor\.haier_|fai-ChatInputEntity/i));
test('CWU visually full and two daily readings with separators',()=>{
 const c=make({entities:{compressor:'sensor.comp',cwu:'sensor.cwu',bufferTop:'sensor.top',energyDaily:'sensor.energy',heatDaily:'sensor.heat'}});
 c._hass={states:{'sensor.comp':{state:'42'},'sensor.cwu':{state:'41'},'sensor.top':{state:'33'},'sensor.energy':{state:'5.75',attributes:{unit_of_measurement:'kWh'}},'sensor.heat':{state:'17.2',attributes:{unit_of_measurement:'kWh'}}}};
 c.shadowRoot.innerHTML=c.renderOriginal();
 const s=c.shadowRoot.innerHTML;
 assert.match(s,/x="54" y="1065" width="202" height="339"/);
 assert.match(s,/Pobrano: 5,75 kWh/);
 assert.match(s,/Wytworzono: 17,20 kWh/);
 assert.match(s,/M392 232V284M747 232V284/);
});
test('long press opens more info without switch toggle',async()=>{
 const c=make(); const listeners=new Map(),events=[],calls=[];
 c.shadowRoot.addEventListener=(type,handler)=>listeners.set(type,handler);
 c.dispatchEvent=e=>events.push(e);
 c._hass.callService=async(...args)=>calls.push(args);
 c.bindEvents();
 const el={dataset:{heatSwitch:'switch.test'}};
 c._hass.states['switch.test']={state:'off'};
 const e={button:0,clientX:10,clientY:20,composedPath:()=>[el],stopPropagation(){}};
 listeners.get('pointerdown')(e);
 await new Promise(resolve=>setTimeout(resolve,530));
 await listeners.get('pointerup')(e);
 assert.equal(calls.length,0);
 assert.equal(events.filter(e=>e.type==='hass-more-info').length,1);
 assert.equal(events[0].detail.entityId,'switch.test');
});
test('one routed water circuit and three phase-aligned visible turns',()=>{
 const s=make().shadowRoot.innerHTML;
 const flows=[...s.matchAll(/data-water-flow="true" d="([^"]+)" class="hf-flow hf-reverse" style="--hf-phase:([\d.]+)px"/g)];
 assert.equal(flows.length,4);
 const d=flows[0][1];
 assert.equal((d.match(/M/g)||[]).length,1);
 assert.match(d,/^M960 627 H671.*685 775 H960$/);
 for(const [i,p] of flows.slice(1).entries()){
  assert.ok(d.includes(p[1].split(' ').slice(2).join(' ')));
  assert.equal(Number(p[2]),[25.88,2.4,16.92][i]);
 }
 assert.ok(s.indexOf('data-condenser-back')<s.indexOf('data-condenser-body'));
 assert.ok(s.indexOf('data-condenser-body')<s.indexOf('data-condenser-front'));
});
