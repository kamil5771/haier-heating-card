import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code=readFileSync('dist/haier-heating-card.js','utf8');
const registry=new Map();
class Element {
  constructor(){this.style={setProperty(){},getPropertyValue(){return ""}};}
  setAttribute(){}
  removeAttribute(){}
  attachShadow(){ this.shadowRoot={innerHTML:'',querySelector:()=>null,addEventListener:()=>{}};return this.shadowRoot; }
  dispatchEvent(){}
}
const context={HTMLElement:Element,customElements:{define:(k,v)=>registry.set(k,v),get:k=>registry.get(k)},window:{customCards:[]},document:{createElement:()=>({})},requestAnimationFrame:()=>0,console};
vm.runInNewContext(code,context);
const Card=registry.get('haier-heating-card');
test('SVG renders from original geometry with mapped entities',()=>{
  const c=new Card();c.setConfig({entities:{electric:'sensor.power',fan:'sensor.fan',cwu:'sensor.cwu',bufferTop:'sensor.top'}});
  c.hass={states:{'sensor.power':{state:'55',attributes:{unit_of_measurement:'W'}},'sensor.fan':{state:'100',attributes:{unit_of_measurement:'rpm'}},'sensor.cwu':{state:'42',attributes:{unit_of_measurement:'°C'}},'sensor.top':{state:'30',attributes:{unit_of_measurement:'°C'}}},formatEntityState:e=>e.state};
  const html=c.shadowRoot.innerHTML;
  for(const marker of ['M431 440H385','M651 540','M961 1392H620','viewBox="0 0 1000 1500"','hf-wind','sensor.power','42,0°C'])assert.ok(html.includes(marker),marker);
  assert.ok(!html.includes('franciszkow'));
});
