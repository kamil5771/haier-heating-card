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
vm.runInNewContext(src,{HTMLElement:Host,customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},window:{}});
const Card=registry.get('haier-heating-card');
const make=(config={})=>{
 const c=new Card();c.setConfig({max_width:0,entities:{compressor:'sensor.comp',groundTemp:'sensor.ground',upperTemp:'sensor.upper',bufferTop:'sensor.top',cwu:'sensor.cwu',bufferCharge:'sensor.charge'},...config});
 c.hass={states:{'sensor.comp':{state:'42'},'sensor.ground':{state:'31.5'},'sensor.upper':{state:'29.5'},'sensor.top':{state:'33'},'sensor.cwu':{state:'41'},'sensor.charge':{state:'50'}}};return c;
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
test('five rays and continuous condenser; evaporator follows leftward start',()=>{
 const s=make().shadowRoot.innerHTML;
 const sun=s.match(/data-sun-rays="5" d="([^"]+)"/)[1];assert.equal((sun.match(/M/g)||[]).length,5);
 const red=s.match(/<path d="(M563 440[^"]+)"[^>]*class="hf-flow"/)[1];assert.equal((red.match(/M/g)||[]).length,1);assert.match(red,/V540 C651 553/);assert.match(red,/651 809 V851 Q651 875 627 875 H535$/);
 assert.match(s,/<path d="M431 440H385[^\"]+"[^>]*class="hf-flow"/);
});
test('public source has no private entity IDs or pasted chat markup',()=>assert.doesNotMatch(src,/franciszkow|sensor\.haier_|fai-ChatInputEntity/i));
