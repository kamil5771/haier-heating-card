const DEFAULTS = {
  electric: 'sensor.haier_licznik_power',
  thermal: 'sensor.haier_moc_cieplna',
  cop: 'sensor.haier_cop',
  north: 'sensor.franciszkow_temperatura_zewnetrzna_temperatura',
  south: 'sensor.franciszkow_czujnik_dodatkowy_3_temperatura',
  groundRoom: 'sensor.aqara_salon_temperature',
  upperRoom: 'sensor.aqara_sypialnia_temperature',
  groundThermostat: 'climate.termostat_parter',
  upperThermostat: 'climate.termostat_pietro',
  status: 'sensor.haier_status_pc_2',
  program: 'select.haier_program',
  controlPc: 'select.haier_sterowanie_pc',
  mode: 'select.haier_tryb',
  control: 'select.haier_sterowanie',
  ambient: 'sensor.haier_temp_otoczenia_tao_diag',
  defrost: 'sensor.haier_temp_odszraniania_tdef_diag',
  fan: 'sensor.haier_predkosc_wentylatora_1_diag',
  compressor: 'sensor.haier_czestotliwosc_sprezarki',
  discharge: 'sensor.haier_temp_strony_tlocznej_td_diag',
  suction: 'sensor.haier_temp_strony_ssacej_ts_diag',
  expansion: 'sensor.haier_stopien_otwarcia_elektronicznego_zaworu_rozpreznego_diag',
  tho: 'sensor.haier_czynnik_chlodniczy_na_wylocie_wymiennika_ciepla_tho_diag',
  thi: 'sensor.haier_czynnik_chlodniczy_na_wlocie_wymiennika_ciepla_thi_diag',
  supply: 'sensor.haier_aktualna_temperatura_co',
  supplyTarget: 'sensor.haier_temperatura_zadana_co',
  return: 'sensor.haier_temperatura_powrotu',
  delta: 'sensor.haier_dt',
  cwu: 'sensor.franciszkow_czujnik_cwu_temperatura',
  cwuHaier: 'sensor.haier_aktualna_temperatura_cwu',
  cwuTarget: 'number.haier_temperatura_zadana_cwu',
  hysteresis: 'number.haier_histereza_cwu',
  cwuHeater: 'switch.cwu',
  circulation: 'binary_sensor.franciszkow_pompa_cyrkulacyjna',
  bufferTop: 'sensor.franciszkow_czujnik_co_temperatura',
  bufferMiddle: 'sensor.franciszkow_czujnik_dodatkowy_1_temperatura',
  bufferBottom: 'sensor.franciszkow_czujnik_dodatkowy_2_temperatura',
  bufferCharge: 'sensor.naladowanie_bufora',
  groundTemp: 'sensor.franciszkow_czujnik_zaworu_1_temperatura',
  groundTarget: 'sensor.franciszkow_zawor_wbudowany_1_temp_zadana',
  groundValve: 'sensor.franciszkow_zawor_wbudowany_1',
  groundPump: 'binary_sensor.pompa_parter_2',
  upperTemp: 'sensor.franciszkow_czujnik_zaworu_2_temperatura',
  upperTarget: 'sensor.franciszkow_zawor_wbudowany_2_temp_zadana',
  upperValve: 'sensor.franciszkow_zawor_wbudowany_2',
  upperPump: 'binary_sensor.pompa_pietro_2',
  heatingReturn: 'sensor.franciszkow_temperatura_powrotu_temperatura',
  limit: 'switch.atw_haier_ograniczenie_mocy',
  cooling: 'switch.kotlownia_atw_haier_chlodzenie',
  heater: 'select.haier_grzalka'
};

class HaierHeatingCard extends HTMLElement {
  static getConfigElement() { return document.createElement('haier-heating-card-editor'); }
  static getStubConfig() { return { type: 'custom:haier-heating-card' }; }

  setConfig(config) {
    if (!config) throw new Error('Brak konfiguracji karty');
    this.config = { fit_height: true, pump_threshold_w: 30, missing_entity_mode: 'hide', ...config };
    if (!['hide', 'dash', 'zero'].includes(this.config.missing_entity_mode)) throw new Error('missing_entity_mode: hide, dash lub zero');
    this.entities = { ...DEFAULTS, ...(config.entities || {}) };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config) this.render();
  }

  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  connectedCallback() {
    this._resize = () => this.fit();
    window.addEventListener('resize', this._resize, { passive: true });
    window.visualViewport?.addEventListener('resize', this._resize, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._resize);
    window.visualViewport?.removeEventListener('resize', this._resize);
  }

  bindEvents() {
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(el => {
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true, detail: { entityId: el.dataset.entity }
        }));
      });
    });
    this.shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.dataset.toggle;
        if (['on', 'off'].includes(this._hass?.states[id]?.state)) {
          this._hass.callService('switch', 'toggle', { entity_id: id });
        }
      });
    });
  }

  fit() {
    if (!this.config?.fit_height) return;
    const wrap = this.shadowRoot?.querySelector('.wrap');
    if (!wrap) return;
    const viewport = window.visualViewport;
    const vh = viewport?.height || window.innerHeight;
    const top = wrap.getBoundingClientRect().top - (viewport?.offsetTop || 0);
    const available = Math.max(320, vh - Math.max(0, top) - 16);
    wrap.style.maxWidth = `${Math.min(640, available * 2 / 3)}px`;
  }

  render() {
    if (!this.shadowRoot || !this._hass) return;
    const h = this._hass, E = this.entities;
    const missing = id => !id || !h.states[id];
    const unavailable = id => !missing(id) && ['unknown', 'unavailable', ''].includes(h.states[id].state);
    const mode = this.config.missing_entity_mode;
    const hidden = id => mode === 'hide' && missing(id);
    const n = id => {
      if (missing(id) || unavailable(id)) return null;
      const v = Number(h.states[id].state);
      return Number.isFinite(v) ? v : null;
    };
    const fallback = id => missing(id) && mode === 'zero' ? '0' : '—';
    const groupVisible = (...ids) => mode !== 'hide' || ids.some(id => !missing(id));
    const on = id => h.states[id]?.state === 'on';
    const unit = id => h.states[id]?.attributes?.unit_of_measurement || '';
    const fmt = (v, d=1) => v == null ? '—' : Number(v).toFixed(d).replace('.', ',');
    const temp = id => n(id) == null ? fallback(id) : `${fmt(n(id))}°C`;
    const val = (id,d=1) => n(id)==null?fallback(id):`${fmt(n(id),d)}${unit(id)?' '+unit(id):''}`;
    const state = id => { const e=h.states[id]; return !e||['unknown','unavailable'].includes(e.state)?fallback(id):(h.formatEntityState?h.formatEntityState(e):e.state); };
    const target = id => { const v=h.states[id]?.attributes?.temperature; return v==null?fallback(id):`${fmt(v)}°C`; };
    const watts = id => { const v=n(id); if(v==null)return null; const u=unit(id).toLowerCase(); return v*(u==='kw'?1000:u==='mw'?1000000:1); };
    const power = id => { const v=watts(id); return v==null?fallback(id):Math.abs(v)>=1000?`${fmt(v/1000,2)} kW`:`${Math.round(v)} W`; };
    const pct = id => Math.max(0,Math.min(100,n(id)||0));
    const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const palette=[[40,139,231],[28,180,214],[35,190,100],[255,164,24],[231,53,65]];
    const colorAt=(v,stops)=>{if(v==null)return'#718087';if(v<=stops[0])return`rgb(${palette[0]})`;if(v>=stops[4])return`rgb(${palette[4]})`;for(let i=1;i<5;i++){if(v<=stops[i]){const p=(v-stops[i-1])/(stops[i]-stops[i-1]);return`rgb(${palette[i-1].map((c,j)=>Math.round(c+(palette[i][j]-c)*p))})`;}}};
    const cwuColor=colorAt(n(E.cwu),[20,30,40,45,55]);
    const co=[colorAt(n(E.bufferTop),[20,25,30,35,45]),colorAt(n(E.bufferMiddle),[20,25,30,35,45]),colorAt(n(E.bufferBottom),[20,25,30,35,45])];
    const running=(n(E.compressor)||0)>0, fanRunning=(n(E.fan)||0)>0, hpPump=(watts(E.electric)||0)>(this.config.pump_threshold_w||30);
    const hot='#f33756', cold='#29bfea';
    const text=(id,x,y,s,size=28,color='#f4f6f7',anchor='middle')=>hidden(id)?'':`<text ${id?`data-entity="${id}" class="click"`:''} x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
    const pipe=(d,color,active=false,reverse=false,w=12)=>`<path d="${d}" fill="none" stroke="#010405" stroke-width="${w+6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".23" stroke-width="${Math.max(2,w*.26)}" stroke-linecap="round" stroke-linejoin="round"/>${active?`<path d="${d}" class="flow ${reverse?'reverse':''}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`:''}`;
    const pump=(id,x,y,color,active=on(id),r=26)=>hidden(id)?'':`<g transform="translate(${x} ${y})" data-entity="${id}" class="click"><circle r="${r+3}" fill="#10171a" stroke="#b7c3c9" stroke-width="3"/><circle r="${r}" fill="url(#pumpMetal)"/><circle r="${r-5}" fill="${active?color:'#46565e'}"/><g class="${active?'rotor':''}"><path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z" fill="#fff"/><path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z" fill="#fff" transform="rotate(120)"/><path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z" fill="#fff" transform="rotate(240)"/><circle r="5" fill="#fff"/></g></g>`;
    const zone=(name,y,t,tr,v,p)=>!groupVisible(t,tr,v,p)?'':`${hidden(p)?'':pipe(`M620 ${y+72}H752`,hot,on(p),false,11)}${pump(p,685,y+72,hot)}<rect x="752" y="${y}" width="226" height="148" rx="23" fill="url(#panel)" stroke="#829097" stroke-width="2"/>${text(null,772,y+28,name,28,'#fff','start')}${text(t,772,y+65,temp(t),27,'#fff','start')}${text(tr,958,y+65,temp(tr),27,'#ff3554','end')}${text(null,772,y+101,'Zawór',23,'#d7e0e4','start')}${text(v,958,y+101,val(v,0),25,'#fff','end')}${hidden(v)?'':`<rect x="772" y="${y+125}" width="186" height="10" rx="5" fill="#303c42"/><rect x="772" y="${y+125}" width="${186*pct(v)/100}" height="10" rx="5" fill="${hot}"/>`}`;

    const evap=`M431 440H385Q361 440 361 464V512Q361 535 337 535H293C255 535 255 576 293 576H379C418 576 418 617 379 617H293C255 617 255 658 293 658H379C418 658 418 699 379 699H293C255 699 255 740 293 740H379C418 740 418 781 379 781H293C255 781 255 822 293 822H337Q361 822 361 846V851Q361 875 385 875H453`;
    const backCoil=`M651 540C751 553 751 579 651 590C551 603 551 631 651 644C751 657 751 685 651 698C551 711 551 739 651 752C751 765 751 796 651 809`;
    const frontCoil=`M651 540C551 553 551 579 651 590M651 644C751 657 751 685 651 698M651 752C551 765 551 796 651 809`;
    const charge=pct(E.bufferCharge), level=1065; // Both tanks physically full; charge is energy, not water level.

    this.shadowRoot.innerHTML=`<style>:host{display:block}.wrap{width:100%;max-width:640px;margin:auto}.card{display:block;width:100%;height:auto;aspect-ratio:2/3;border-radius:20px;background:#080d10;font-family:Manrope,Roboto,Arial,sans-serif}.card text{dominant-baseline:middle;font-weight:700;paint-order:stroke;stroke:#070d10;stroke-width:2px}.click{cursor:pointer}.flow{stroke-dasharray:6 32;animation:flow 1.7s linear infinite}.reverse{animation-direction:reverse}.rotor{transform-box:fill-box;transform-origin:center;animation:spin 1.2s linear infinite}.fan{transform-box:fill-box;transform-origin:center;animation:spin 2s linear infinite}.wind{animation:wind 2.2s ease-in-out infinite}@keyframes flow{to{stroke-dashoffset:-76}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes wind{0%{opacity:.15;transform:translateX(-8px)}45%{opacity:.9}100%{opacity:.15;transform:translateX(10px)}}</style><div class="wrap"><svg class="card" viewBox="0 0 1000 1500"><defs><linearGradient id="metal"><stop stop-color="#77858e"/><stop offset=".35" stop-color="#e6ebee"/><stop offset="1" stop-color="#657680"/></linearGradient><linearGradient id="pumpMetal" x2="1" y2="1"><stop stop-color="#f3f6f7"/><stop offset="1" stop-color="#475962"/></linearGradient><linearGradient id="panel" x2="1" y2="1"><stop stop-color="#182126"/><stop offset="1" stop-color="#080e12"/></linearGradient><linearGradient id="cwu" x2="0" y2="1"><stop stop-color="${cwuColor}"/><stop offset="1" stop-color="${cwuColor}"/></linearGradient><linearGradient id="buffer" x2="0" y2="1"><stop stop-color="${co[0]}"/><stop offset=".5" stop-color="${co[1]}"/><stop offset="1" stop-color="${co[2]}"/></linearGradient></defs><rect width="1000" height="1500" rx="32" fill="#080d10"/><rect x="12" y="12" width="976" height="1476" rx="31" fill="none" stroke="#6b7981" stroke-width="2"/><path d="M245 48V186M585 48V186M38 211H962M38 307H962" stroke="#839099" stroke-opacity=".5"/>
    ${text(E.electric,126,70,power(E.electric),36)}${text(E.thermal,126,118,power(E.thermal),34)}${text(E.cop,126,166,'COP '+val(E.cop,2),30)}${text(E.north,472,82,'N: '+temp(E.north),31)}${text(E.south,472,145,'S: '+temp(E.south),31)}${text(E.groundRoom,778,82,temp(E.groundRoom),32)}${text(E.groundThermostat,924,82,target(E.groundThermostat),31,'#ff3655')}${text(E.upperRoom,778,145,temp(E.upperRoom),32)}${text(E.upperThermostat,924,145,target(E.upperThermostat),31,'#ff3655')}${text(E.status,104,259,state(E.status),44)}${text(E.program,278,253,state(E.program),26)}${text(E.controlPc,278,282,state(E.controlPc),14)}${text(E.mode,951,243,state(E.mode),27,'#fff','end')}${text(E.control,951,280,state(E.control),20,'#c7d2d9','end')}${text(E.suction,373,365,temp(E.suction),32)}${text(E.discharge,633,365,temp(E.discharge),32)}
    ${pipe('M361 440H431',cold,running,true)}${pipe('M563 440H627Q651 440 651 465V540',hot,running)}<g transform="translate(497 440)" data-entity="${E.compressor}" class="click"><circle r="66" fill="url(#metal)" stroke="#e4ebef" stroke-width="3"/><circle r="49" fill="#4a5963"/><path d="M-18 -29H18V-6H-18Z" fill="none" stroke="#e4ecef" stroke-width="4"/><g class="${running?'rotor':''}"><rect x="-14" y="-22" width="28" height="9" fill="#dbe5ea"/><path d="M0 -13V24" stroke="#dbe5ea" stroke-width="4"/></g></g>${text(E.compressor,497,528,val(E.compressor,0),30)}${text(E.ambient,151,512,temp(E.ambient),32,'#fff','end')}
    <g transform="translate(158 662)" data-entity="${E.fan}" class="click"><g class="${fanRunning?'fan':''}">${[0,72,144,216,288].map(a=>`<path d="M-10 -13C-54 -34 -64 -98 -27 -104C9 -110 39 -45 15 -13Z" fill="url(#metal)" transform="rotate(${a})"/>`).join('')}<circle r="29" fill="url(#metal)"/><circle r="11" fill="#233843"/></g></g>${text(E.defrost,160,812,temp(E.defrost),31,'#fff','start')}${text(E.fan,151,915,val(E.fan,0),30)}${pipe(evap,cold,running)}
    ${pipe(backCoil,hot,running)}<rect x="608" y="540" width="86" height="286" rx="25" fill="url(#metal)" stroke="#c9d5dc" stroke-width="2"/>${pipe(frontCoil,hot,running)}${pipe('M651 809V852Q651 875 628 875H535',hot,running)}${pipe('M694 627H960',hot,hpPump)}${pipe('M960 775H694',cold,hpPump)}${pump(E.electric,791,627,hot,hpPump,29)}${text(E.tho,752,506,temp(E.tho),30)}${text(E.supplyTarget,959,533,temp(E.supplyTarget),31,'#ff3554','end')}${text(E.supply,959,578,temp(E.supply),34,'#fff','end')}${text(E.delta,957,701,'Δ '+temp(E.delta),31,'#fff','end')}${text(E.return,957,817,temp(E.return),32,'#fff','end')}${text(E.thi,744,859,temp(E.thi),30)}
    <g transform="translate(494 875)"><path d="M-39 -20L0 0L-39 20ZM39 -20L0 0L39 20Z" fill="url(#metal)"/></g>${text(E.expansion,494,925,val(E.expansion,1),34)}
    ${groupVisible(E.cwu,E.cwuHaier,E.cwuTarget,E.hysteresis)?`<rect x="40" y="1050" width="230" height="375" rx="39" fill="url(#metal)"/><rect x="54" y="1065" width="202" height="339" rx="27" fill="url(#cwu)"/>${text(null,155,1018,'CWU',39)}${text(E.cwu,155,1150,temp(E.cwu),43)}${text(E.cwuTarget,155,1238,temp(E.cwuTarget),31,'#ff244a')}${text(E.cwuHaier,155,1320,temp(E.cwuHaier),43)}${text(E.hysteresis,155,1382,n(E.hysteresis)==null?fallback(E.hysteresis):'± '+fmt(n(E.hysteresis))+'°C',27,'#ff244a')}`:''}
    ${groupVisible(E.bufferTop,E.bufferMiddle,E.bufferBottom,E.bufferCharge)?`<rect x="400" y="1050" width="230" height="375" rx="39" fill="url(#metal)"/><rect x="414" y="${level}" width="202" height="339" rx="27" fill="url(#buffer)"/><rect x="414" y="1065" width="202" height="339" rx="27" fill="none" stroke="#31434c" stroke-width="3"/>${text(null,515,1018,'bufor CO',39)}${text(E.bufferTop,515,1146,temp(E.bufferTop),43)}${text(E.bufferMiddle,515,1234,temp(E.bufferMiddle),43)}${text(E.bufferBottom,515,1322,temp(E.bufferBottom),43)}${text(E.bufferCharge,515,1382,val(E.bufferCharge,0),30)}`:''}
    ${hidden(E.circulation)?'':pipe('M270 1145H345',hot,on(E.circulation))}${pump(E.circulation,324,1145,hot)}${groupVisible(E.cwu,E.cwuHaier)?pipe('M352 1350H270',cold,false):''}${zone('PARTER',1040,E.groundTemp,E.groundTarget,E.groundValve,E.groundPump)}${zone('PIĘTRO',1210,E.upperTemp,E.upperTarget,E.upperValve,E.upperPump)}${groupVisible(E.groundPump,E.upperPump)?pipe('M961 1392H620',cold,on(E.groundPump)||on(E.upperPump)):''}${text(E.heatingReturn,962,1427,'Powrót '+temp(E.heatingReturn),26,'#fff','end')}</svg></div>`;
    this.bindEvents();
    requestAnimationFrame(() => this.fit());
  }
}

class HaierHeatingCardEditor extends HTMLElement {
  setConfig(config) { this.config = config; this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  render() {
    if (!this.config) return;
    this.innerHTML = `<div style="padding:16px"><p><b>Haier Heating Card</b></p><p>Karta działa od razu z domyślnymi encjami. Nadpisania encji dodaj w YAML w sekcji <code>entities:</code>.</p><label><input id="fit" type="checkbox" ${this.config.fit_height !== false ? 'checked' : ''}> Dopasuj do wysokości ekranu</label><p><label>Brak encji: <select id="missing"><option value="hide">Ukryj element</option><option value="dash">Pokaż —</option><option value="zero">Pokaż 0</option></select></label></p></div>`;
    this.querySelector('#missing').value = this.config.missing_entity_mode || 'hide';
    this.querySelector('#missing').addEventListener('change', e => {
      this.config = { ...this.config, missing_entity_mode: e.target.value };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
    });
    this.querySelector('#fit')?.addEventListener('change', e => {
      this.config = { ...this.config, fit_height: e.target.checked };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
    });
  }
}

customElements.define('haier-heating-card', HaierHeatingCard);
customElements.define('haier-heating-card-editor', HaierHeatingCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'haier-heating-card', name: 'Haier Heating Card', description: 'Animated Haier heat-pump installation schematic.' });
