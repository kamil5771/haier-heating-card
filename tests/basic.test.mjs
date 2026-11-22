import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync('src/haier-heating-card.js','utf8');
test('native custom card and editor',()=>{assert.match(js,/class HaierHeatingCard extends HTMLElement/);assert.match(js,/ha-entity-picker/);});
test('public code excludes private mappings',()=>{assert.doesNotMatch(js,/franciszkow|sensor\.haier_|aqara_salon/i);});
test('original SVG geometry preserved',()=>{for(const path of ['M431 440H385','M651 540','M961 1392H620','viewBox="0 0 1000 1500"'])assert.ok(js.includes(path),path);});
test('three missing entity modes',()=>{for(const mode of ['hide','dash','zero'])assert.ok(js.includes(mode));});
