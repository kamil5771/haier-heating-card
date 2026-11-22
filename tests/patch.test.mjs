import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const registry=new Map();
class Element { attachShadow(){return this.shadowRoot={innerHTML:'',addEventListener(){},querySelector(){return null}};} }
vm.runInNewContext(readFileSync('src/haier-heating-card.js','utf8'),{
  HTMLElement:Element,customElements:{define:(k,v)=>registry.set(k,v),get:k=>registry.get(k)},
  window:{customCards:[]},document:{createElement:()=>({})},requestAnimationFrame:()=>0,console
});
const Card=registry.get('haier-heating-card');
class FakeNode {
  constructor(name,attrs={},children=[],type=1){
    this.nodeType=type;this.localName=name;this.namespaceURI='http://www.w3.org/2000/svg';this._attrs={...attrs};this.parent=null;
    this.childNodes=[];for(const c of children)this.appendChild(c);
    this.nodeValue=type===3?name:null;
  }
  get attributes(){return Object.entries(this._attrs).map(([name,value])=>({name,localName:name,namespaceURI:null,value}));}
  getAttribute(k){return this._attrs[k]??null;}
  getAttributeNS(ns,k){return this.getAttribute(k);}
  hasAttributeNS(ns,k){return k in this._attrs;}
  setAttributeNS(ns,k,v){this._attrs[k]=v;}
  removeAttributeNS(ns,k){delete this._attrs[k];}
  get firstChild(){return this.childNodes[0]||null;}
  get nextSibling(){if(!this.parent)return null;const a=this.parent.childNodes;return a[a.indexOf(this)+1]||null;}
  appendChild(c){if(c.parent)c.remove();this.childNodes.push(c);c.parent=this;return c;}
  insertBefore(c,b){if(c.parent)c.remove();this.childNodes.splice(this.childNodes.indexOf(b),0,c);c.parent=this;}
  remove(){if(this.parent){const a=this.parent.childNodes;a.splice(a.indexOf(this),1);this.parent=null;}}
  replaceWith(c){this.parent.insertBefore(c,this);this.remove();}
  cloneNode(deep){return new FakeNode(this.localName,this._attrs,deep?this.childNodes.map(c=>c.cloneNode(true)):[],this.nodeType);}
}
test('patch updates values without replacing SVG or spinning rotor',()=>{
  const rotor=new FakeNode('g',{'class':'rotor'},[new FakeNode('path',{d:'M0 1'})]);
  const value=new FakeNode('text',{'data-heat-entity':'sensor.a'},[new FakeNode('22',{},[],3)]);
  const svg=new FakeNode('svg',{},[rotor,value]);
  const root=new FakeNode('fragment',{},[svg],11);
  const next=new FakeNode('fragment',{},[new FakeNode('svg',{},[new FakeNode('g',{'class':'rotor'},[new FakeNode('path',{d:'M0 1'})]),new FakeNode('text',{'data-heat-entity':'sensor.a'},[new FakeNode('23',{},[],3)])])],11);
  Card.patchNode(root,next);
  assert.equal(root.firstChild,svg);
  assert.equal(svg.firstChild,rotor);
  assert.equal(svg.childNodes[1],value);
  assert.equal(value.firstChild.nodeValue,'23');
});
