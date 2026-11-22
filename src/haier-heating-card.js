// Haier Heating Card v0.4.0: original user SVG retained in renderOriginal().
const ENTITY_KEYS = ["electric", "thermal", "cop", "north", "south", "groundRoom", "upperRoom", "groundThermostat", "upperThermostat", "status", "program", "controlPc", "mode", "control", "ambient", "defrost", "fan", "compressor", "discharge", "suction", "expansion", "tho", "thi", "supply", "supplyTarget", "return", "delta", "cwu", "cwuHaier", "cwuTarget", "hysteresis", "cwuHeater", "circulation", "bufferTop", "bufferMiddle", "bufferBottom", "bufferCharge", "groundTemp", "groundTarget", "groundValve", "groundPump", "upperTemp", "upperTarget", "upperValve", "upperPump", "heatingReturn", "limit", "cooling", "heater"];
const DEFAULTS = Object.fromEntries(ENTITY_KEYS.map(key => [key, '']));
class HaierHeatingCard extends HTMLElement {
  static getConfigElement() { return document.createElement('haier-heating-card-editor'); }
  static getStubConfig() { return { type: 'custom:haier-heating-card' }; }
  setConfig(config) {
    if (!config) throw new Error('Brak konfiguracji');
    this.config = { fit_height: true, missing_entity_mode: 'hide', pump_threshold_w: 30, ...config };
    if (!['hide','dash','zero'].includes(this.config.missing_entity_mode)) throw new Error('Nieprawidłowy tryb brakujących encji');
    this.entities = { ...DEFAULTS, ...(config.entities || {}) };
    if (!this.shadowRoot) this.attachShadow({mode:'open'});
    this.render();
  }
  set hass(value) { this._hass = value; this.render(); }
  getCardSize() { return 12; }
  getGridOptions() { return { columns:'full', rows:'auto' }; }
  connectedCallback() {
    this._onResize = () => this.fit();
    window.addEventListener('resize', this._onResize, {passive:true});
    window.visualViewport?.addEventListener('resize', this._onResize, {passive:true});
    this.fit();
  }
  disconnectedCallback() {
    window.removeEventListener('resize', this._onResize);
    window.visualViewport?.removeEventListener('resize', this._onResize);
  }
  fit() {
    const wrap = this.shadowRoot?.querySelector('.hf-wrap');
    if (!wrap || !this.config?.fit_height) return;
    const viewport = window.visualViewport;
    const vh = viewport?.height || window.innerHeight;
    const top = wrap.getBoundingClientRect().top - (viewport?.offsetTop || 0);
    const height = Math.max(1, vh - Math.max(0,top) - 16);
    wrap.style.maxWidth = `${Math.min(640,height*1000/1500)}px`;
  }
  bindEvents() {
    let pressed = null, x = 0, y = 0, started = 0;
    const root = this.shadowRoot;
    root.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      pressed = e.composedPath().find(el => el?.dataset && (el.dataset.heatEntity || el.dataset.heatSwitch));
      x = e.clientX; y = e.clientY; started = Date.now();
    }, true);
    root.addEventListener('pointermove', e => { if (Math.abs(e.clientX-x)>10 || Math.abs(e.clientY-y)>10) pressed=null; }, true);
    root.addEventListener('pointercancel', () => { pressed=null; }, true);
    root.addEventListener('pointerup', e => {
      const el=pressed; pressed=null;
      if (!el || Math.abs(e.clientX-x)>10 || Math.abs(e.clientY-y)>10 || Date.now()-started>800) return;
      e.stopPropagation();
      if (el.dataset.heatSwitch) {
        const id=el.dataset.heatSwitch;
        if (!['on','off'].includes(this._hass?.states[id]?.state)) return;
        this._hass.callService('switch','toggle',{entity_id:id}).catch(err=>console.error('Haier Heating Card:',err));
      } else {
        if (!el.dataset.heatEntity) return;
        this.dispatchEvent(new CustomEvent('hass-more-info',{bubbles:true,composed:true,detail:{entityId:el.dataset.heatEntity}}));
      }
    }, true);
  }
  render() {
    if (!this._hass || !this.shadowRoot || !this.config) return;
    if (!Object.values(this.entities).some(id => id && this._hass.states[id])) {
      this.shadowRoot.innerHTML = `<div style="padding:24px;border:1px solid var(--divider-color);border-radius:12px;color:var(--primary-text-color)">Haier Heating Card: wybierz encje w edytorze karty.</div>`;
      return;
    }
    const html=this.renderOriginal();
    this.shadowRoot.innerHTML=html;
    if (!this._eventsBound) { this.bindEvents(); this._eventsBound = true; }
    requestAnimationFrame(()=>this.fit());
  }
  renderOriginal() {
    const states=this._hass.states;
    const hass=this._hass;
    if (!this._heatingFinalUid) this._heatingFinalUid='hf'+Math.random().toString(36).slice(2,10);
    const uid=this._heatingFinalUid;
    const gid=name=>`${uid}-${name}`;
    const url=name=>`url(#${gid(name)})`;

  const E = this.entities;
  const esc = v => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const missing = id => !id || !states[id];
  const hidden = id => this.config.missing_entity_mode === 'hide' && missing(id);
  const fallback = id => missing(id) && this.config.missing_entity_mode === 'zero' ? '0' : '—';
  const num = id => {
    if (missing(id)) return null;
    const s = states[id]?.state;
    if (
      s == null || s === '' ||
      ['unknown', 'unavailable'].includes(s)
    ) return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };

  const on = id => states[id]?.state === 'on';
  const unit = id => states[id]?.attributes?.unit_of_measurement || '';
  const fmt = (v, d = 1) =>
    v == null ? '—' : Number(v).toFixed(d).replace('.', ',');
  const temp = id =>
    num(id) == null ? fallback(id) : fmt(num(id)) + '°C';

  const value = (id, d = 1, forcedUnit = null) => {
    const v = num(id);
    if (v == null) return fallback(id);
    const u = forcedUnit == null ? unit(id) : forcedUnit;
    return fmt(v, d) + (u ? ' ' + u : '');
  };

  const state = id => {
    const e = states[id];
    if (!e || ['unknown', 'unavailable'].includes(e.state)) return fallback(id);
    return hass.formatEntityState ? hass.formatEntityState(e) : e.state;
  };

  const target = id => {
    const v = states[id]?.attributes?.temperature;
    return v == null || !Number.isFinite(Number(v))
      ? fallback(id) : fmt(v) + '°C';
  };

  const watts = id => {
    const v = num(id);
    if (v == null) return null;
    const u = unit(id).trim().toLowerCase();
    return v * (u === 'kw' ? 1000 : u === 'mw' ? 1000000 : 1);
  };

  const power = id => {
    const v = watts(id);
    if (v == null) return fallback(id);
    return Math.abs(v) >= 1000
      ? fmt(v / 1000, 2) + ' kW'
      : Math.round(v) + ' W';
  };

  const percent = id =>
    Math.max(0, Math.min(100, num(id) || 0));

  const palette = [
    [40, 139, 231],
    [28, 180, 214],
    [35, 190, 100],
    [255, 164, 24],
    [231, 53, 65]
  ];

  const cwuStops = [20, 30, 40, 45, 55];
  const coStops = [20, 25, 30, 35, 45];

  const colorAt = (v, stops) => {
    if (v == null) return '#718087';
    if (v <= stops[0]) return 'rgb(' + palette[0].join(',') + ')';

    const last = stops.length - 1;
    if (v >= stops[last]) {
      return 'rgb(' + palette[last].join(',') + ')';
    }

    for (let i = 1; i < stops.length; i++) {
      if (v <= stops[i]) {
        const p = (v - stops[i - 1]) / (stops[i] - stops[i - 1]);
        return 'rgb(' + palette[i - 1].map((c, j) =>
          Math.round(c + (palette[i][j] - c) * p)
        ).join(',') + ')';
      }
    }
  };

  const cwuColor = colorAt(num(E.cwu), cwuStops);
  const coTopColor = colorAt(num(E.bufferTop), coStops);
  const coMiddleColor = colorAt(num(E.bufferMiddle), coStops);
  const coBottomColor = colorAt(num(E.bufferBottom), coStops);

  const text = (
    id, x, y, content,
    size = 28, color = '#f4f6f7',
    anchor = 'middle', weight = 700, maxWidth = 0
  ) => {
    if (hidden(id)) return '';
    const s = String(content ?? '');
    const fit = maxWidth && s.length * size * .56 > maxWidth
      ? `textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : '';

    return `
      <text ${id ? `data-heat-entity="${id}" class="hf-click"` : ''}
        x="${x}" y="${y}" fill="${color}" font-size="${size}"
        text-anchor="${anchor}" font-weight="${weight}" ${fit}>
        ${esc(s)}
      </text>
    `;
  };

  const running = (num(E.compressor) || 0) > 0;
  const fanRunning = (num(E.fan) || 0) > 0;
  const haierPumpRunning = (watts(E.electric) || 0) > (this.config.pump_threshold_w ?? 30);
  const groundRunning = on(E.groundPump);
  const upperRunning = on(E.upperPump);
  const circulationRunning = on(E.circulation);
  const cwuHeaterRunning = on(E.cwuHeater);
  const limitActive = on(E.limit);
  const coolingActive = on(E.cooling);

  const heaterState = String(states[E.heater]?.state || '')
    .trim().toLocaleUpperCase('pl-PL');

  const haierHeaterRunning = heaterState === 'WŁ';

  const hot = '#f33756';
  const cold = '#29bfea';
  const supplyY = 627;
  const returnY = 775;
  const deltaY = (supplyY + returnY) / 2;

  const pipe = (
    d, color, active = false, reverse = false, width = 12
  ) => `
    <path d="${d}" fill="none" stroke="#010405"
      stroke-width="${width + 6}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${color}"
      stroke-width="${width}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-opacity=".23"
      stroke-width="${Math.max(2, width * .26)}"
      stroke-linecap="round" stroke-linejoin="round"
      pointer-events="none"/>
    ${active ? `
      <path d="${d}" class="hf-flow ${reverse ? 'hf-reverse' : ''}"
        fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round"
        pointer-events="none"/>
    ` : ''}
  `;

  const spin = (active, duration = '1.8s') => active ? `
    <animateTransform attributeName="transform" type="rotate"
      from="0 0 0" to="360 0 0"
      dur="${duration}" repeatCount="indefinite"/>
  ` : '';

  const pump = (
    id, x, y, color, radius = 27, active = on(id)
  ) => hidden(id) ? '' : `
    <g transform="translate(${x} ${y})"
      data-heat-entity="${id}" class="hf-click">
      <title>${esc(state(id))}</title>
      <circle r="${radius + 3}" fill="#10171a"
        stroke="#b7c3c9" stroke-width="3"/>
      <circle r="${radius}" fill="${url('pumpMetal')}"/>
      <circle r="${radius - 5}" fill="${active ? color : '#46565e'}"/>
      <g>
        ${spin(active, '1.2s')}
        <path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z" fill="#f3f6f7"/>
        <path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z"
          fill="#f3f6f7" transform="rotate(120)"/>
        <path d="M0 -3C4 -23 18 -22 16 -12C15 -4 5 1 0 0Z"
          fill="#f3f6f7" transform="rotate(240)"/>
        <circle r="5" fill="#f3f6f7"/>
      </g>
      <circle r="${radius + 8}" fill="transparent"/>
    </g>
  `;

  const control = (
    id, x, y, kind, toggle = false, radius = 32, active = false
  ) => {
    const c = active
      ? kind === 'snow' ? '#6bd6ff' : '#ffc16c'
      : '#c1cbd0';

    const icon = kind === 'snow' ? `
      <g>
        ${spin(active, '8s')}
        <path d="M0 -21V21M-18 -10L18 10M-18 10L18 -10
          M-7 -16L0 -10L7 -16M-7 16L0 10L7 16
          M-17 -2L-10 -5L-11 -13M17 2L10 5L11 13"
          fill="none" stroke="${c}" stroke-width="2.7"/>
      </g>
    ` : kind === 'gauge' ? `
      <path d="M-21 12A25 25 0 1 1 21 12"
        fill="none" stroke="${c}" stroke-width="3.5"/>
      <path d="M-18 -8L-14 -6M-8 -20L-6 -15
        M8 -20L6 -15M18 -8L14 -6"
        fill="none" stroke="${c}" stroke-width="3"/>
      <g>
        ${active ? `
          <animateTransform attributeName="transform" type="rotate"
            values="-12 0 0;8 0 0;-12 0 0"
            dur="2.4s" repeatCount="indefinite"/>
        ` : ''}
        <path d="M0 2L14 -13" fill="none" stroke="${c}" stroke-width="3"/>
        <circle r="5" fill="${c}"/>
      </g>
    ` : `
      <g>
        ${active ? `
          <animate attributeName="opacity"
            values=".4;1;.4" dur="1.5s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate"
            values="0,3;0,-3;0,3" dur="1.5s" repeatCount="indefinite"/>
        ` : ''}
        <path d="M-13 18C-27 4 0 -3 -13 -18
          M0 18C-14 4 13 -3 0 -18
          M13 18C-1 4 26 -3 13 -18"
          fill="none" stroke="${c}" stroke-width="3.2"
          stroke-linecap="round"/>
      </g>
    `;

    return hidden(id) ? '' : `
      <g transform="translate(${x} ${y})"
        ${toggle ? `data-heat-switch="${id}"` : `data-heat-entity="${id}"`}
        class="hf-click">
        <title>${esc(state(id))}</title>
        <circle r="${radius}" fill="${url('control')}"
          stroke="#77848b" stroke-width="1.5"/>
        ${icon}
        <circle r="${radius + 5}" fill="transparent"/>
      </g>
    `;
  };

  const wind = (x, y, delay = '') => `
    <g transform="translate(${x} ${y})">
      <g class="${fanRunning ? 'hf-wind' : 'hf-wind-still'}"
        style="${delay ? `animation-delay:${delay};` : ''}"
        fill="none" stroke="#b9c9d0"
        stroke-width="4" stroke-linecap="round">
        <path d="M-28 0H19C42 0 40 -27 22 -27C10 -27 7 -17 12 -11"/>
        <path d="M-36 13H40C62 13 61 39 43 39C31 39 27 30 32 24"/>
        <path d="M-22 26H11"/>
      </g>
    </g>
  `;

  const tank = (
    x, width, name, fillId, topId, middleId, bottomId, cwu = false
  ) => {
    if (this.config.missing_entity_mode === 'hide' && ![topId,middleId,bottomId].some(id => id && states[id])) return '';
    const innerX = x + 14;
    const innerW = width - 28;
    const level = cwu ? 92 : percent(E.bufferCharge);
    const surface = 1404 - 330 * level / 100;
    const surfaceColor = cwu ? cwuColor : coTopColor;

    return `
      ${text(null, x + width / 2, 1018, name, 39, '#f0f3f4', 'middle', 600)}
      <rect x="${x}" y="1050" width="${width}" height="375" rx="39"
        fill="${url('tankMetal')}" stroke="#d7dfe3" stroke-width="2"/>
      <rect x="${x + 7}" y="1057" width="${width - 14}" height="361" rx="33"
        fill="#131b1f" stroke="#5d6b73" stroke-width="3"/>
      <rect x="${innerX}" y="1065" width="${innerW}" height="339" rx="27"
        fill="#0b1519"/>
      <g clip-path="${url(cwu ? 'cwuClip' : 'bufferClip')}">
        <rect x="${innerX}" y="${surface}" width="${innerW}"
          height="${1404 - surface}" fill="${url(fillId)}"/>
        ${level > 0 ? `
          <ellipse cx="${x + width / 2}" cy="${surface}"
            rx="${innerW / 2 + 4}" ry="12" fill="${surfaceColor}"
            stroke="#f2ffff" stroke-opacity=".45" stroke-width="2"/>
          <rect x="${innerX}" y="${surface}" width="${innerW}"
            height="${1404 - surface}" fill="${url('liquidGloss')}"/>
        ` : ''}
      </g>
      ${cwu ? `
        ${text(topId, x + width / 2, 1150, temp(topId), 43)}
        ${text(E.cwuTarget, x + width / 2, 1238,
          temp(E.cwuTarget), 31, '#ff244a')}
        ${text(bottomId, x + width / 2, 1320, temp(bottomId), 43)}
        ${text(E.hysteresis, x + width / 2, 1382,
          num(E.hysteresis) == null
            ? '± —' : '± ' + fmt(num(E.hysteresis)) + '°C',
          27, '#ff244a')}
      ` : `
        ${text(topId, x + width / 2, 1146, temp(topId), 43)}
        ${text(middleId, x + width / 2, 1234, temp(middleId), 43)}
        ${text(bottomId, x + width / 2, 1322, temp(bottomId), 43)}
        ${text(E.bufferCharge, x + width / 2, 1382,
          value(E.bufferCharge, 0), 30)}
      `}
    `;
  };

  const zone = (
    name, y, tempId, targetId, valveId, pumpId
  ) => ![tempId,targetId,valveId,pumpId].some(id => id && states[id]) && this.config.missing_entity_mode === 'hide' ? '' : `
    ${pipe(`M620 ${y + 72}H752`, hot, on(pumpId), false, 11)}
    ${pump(pumpId, 685, y + 72, hot, 26)}
    <rect x="752" y="${y}" width="226" height="148" rx="23"
      fill="${url('panel')}" stroke="#829097" stroke-width="2"/>
    ${text(null, 772, y + 28, name, 28, '#f1f4f5', 'start')}
    ${text(tempId, 772, y + 65, temp(tempId),
      27, '#f5f7f8', 'start', 700, 99)}
    ${text(targetId, 958, y + 65, temp(targetId),
      27, '#ff3554', 'end', 700, 99)}
    ${text(null, 772, y + 101, 'Zawór', 23, '#d7e0e4', 'start')}
    ${text(valveId, 958, y + 101, value(valveId, 0), 25, '#fff', 'end')}
    <rect x="772" y="${y + 125}" width="186" height="10"
      rx="5" fill="#303c42"/>
    <rect x="772" y="${y + 125}"
      width="${186 * percent(valveId) / 100}"
      height="10" rx="5" fill="${hot}"/>
  `;

  const evap = `
    M431 440H385
    Q361 440 361 464
    V512
    Q361 535 337 535H293
    C255 535 255 576 293 576H379
    C418 576 418 617 379 617H293
    C255 617 255 658 293 658H379
    C418 658 418 699 379 699H293
    C255 699 255 740 293 740H379
    C418 740 418 781 379 781H293
    C255 781 255 822 293 822H337
    Q361 822 361 846
    V851
    Q361 875 385 875
    H453
  `;

  const condenserCoil = `
    M651 540
    C751 553 751 579 651 590
    C551 603 551 631 651 644
    C751 657 751 685 651 698
    C551 711 551 739 651 752
    C751 765 751 796 651 809
  `;

  return `
    <style>
      .hf-wrap {
        width:100%;
        max-width:640px;
        max-width:min(640px, calc((100dvh - 100px) * 0.6666667));
        margin:0 auto;
        min-width:0;
      }
      .hf-svg {
        display:block;
        width:100%;
        height:auto;
        aspect-ratio:2 / 3;
        font-family:Manrope,Roboto,Arial,sans-serif;
        overflow:hidden;
        border-radius:20px;
        background:#080d10;
      }
      .hf-svg text {
        dominant-baseline:middle;
        paint-order:stroke;
        stroke:#070d10;
        stroke-width:2px;
        stroke-linejoin:round;
      }
      .hf-svg .hf-click {
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
      }
      .hf-svg .hf-flow {
        stroke-dasharray:6 32;
        animation:hf-flow 1.7s linear infinite;
      }
      .hf-svg .hf-reverse {
        animation-direction:reverse;
      }
      .hf-svg .hf-wind {
        animation:hf-wind 2.2s ease-in-out infinite;
      }
      .hf-svg .hf-wind-still {
        opacity:.55;
      }
      @keyframes hf-flow {
        to { stroke-dashoffset:-76; }
      }
      @keyframes hf-wind {
        0% { opacity:.15; transform:translateX(-8px); }
        45% { opacity:.9; }
        100% { opacity:.15; transform:translateX(10px); }
      }
      @media (prefers-reduced-motion:reduce) {
        .hf-svg * { animation:none !important; }
      }
    </style>

    <div class="hf-wrap">
      <svg class="hf-svg" xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Schemat instalacji grzewczej Haier">

        <defs>
          <radialGradient id="${gid('background')}" cx=".5" cy=".35" r=".8">
            <stop offset="0" stop-color="#111a1f"/>
            <stop offset=".6" stop-color="#080e12"/>
            <stop offset="1" stop-color="#05090c"/>
          </radialGradient>

          <linearGradient id="${gid('tankMetal')}" x1="0" x2="1">
            <stop offset="0" stop-color="#6c7a83"/>
            <stop offset=".035" stop-color="#e4eaed"/>
            <stop offset=".08" stop-color="#f8fafb"/>
            <stop offset=".14" stop-color="#7c8b94"/>
            <stop offset=".48" stop-color="#3e4c55"/>
            <stop offset=".85" stop-color="#8e9da5"/>
            <stop offset=".94" stop-color="#e4eaed"/>
            <stop offset="1" stop-color="#5a6972"/>
          </linearGradient>

          <linearGradient id="${gid('metal')}" x1="0" x2="1">
            <stop offset="0" stop-color="#77858e"/>
            <stop offset=".16" stop-color="#e6ebee"/>
            <stop offset=".45" stop-color="#a7b3bb"/>
            <stop offset=".72" stop-color="#657680"/>
            <stop offset="1" stop-color="#c5cfd5"/>
          </linearGradient>

          <linearGradient id="${gid('pumpMetal')}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f3f6f7"/>
            <stop offset=".45" stop-color="#a2b0b8"/>
            <stop offset="1" stop-color="#475962"/>
          </linearGradient>

          <radialGradient id="${gid('control')}">
            <stop offset="0" stop-color="#253239"/>
            <stop offset=".75" stop-color="#10191f"/>
            <stop offset="1" stop-color="#060b0e"/>
          </radialGradient>

          <linearGradient id="${gid('panel')}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#182126"/>
            <stop offset="1" stop-color="#080e12"/>
          </linearGradient>

          <linearGradient id="${gid('blade')}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#d0d8dd"/>
            <stop offset=".45" stop-color="#82929d"/>
            <stop offset="1" stop-color="#354954"/>
          </linearGradient>

          <linearGradient id="${gid('cwuFill')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${cwuColor}"/>
            <stop offset="1" stop-color="${cwuColor}"/>
          </linearGradient>

          <linearGradient id="${gid('bufferFill')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${coTopColor}"/>
            <stop offset=".5" stop-color="${coMiddleColor}"/>
            <stop offset="1" stop-color="${coBottomColor}"/>
          </linearGradient>

          <linearGradient id="${gid('liquidGloss')}" x1="0" x2="1">
            <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
            <stop offset=".18" stop-color="#fff" stop-opacity=".03"/>
            <stop offset=".65" stop-color="#000" stop-opacity="0"/>
            <stop offset="1" stop-color="#000" stop-opacity=".24"/>
          </linearGradient>

          <clipPath id="${gid('cwuClip')}">
            <rect x="54" y="1065" width="202" height="339" rx="27"/>
          </clipPath>
          <clipPath id="${gid('bufferClip')}">
            <rect x="414" y="1065" width="202" height="339" rx="27"/>
          </clipPath>
        </defs>

        <rect width="1000" height="1500" rx="32" fill="${url('background')}"/>
        <rect x="12" y="12" width="976" height="1476" rx="31"
          fill="none" stroke="#6b7981" stroke-width="2"/>
        <rect x="17" y="17" width="966" height="1466" rx="28"
          fill="none" stroke="#d6e1e6" stroke-opacity=".07"/>

        <path d="M245 48V186M585 48V186M38 211H962M38 307H962"
          stroke="#839099" stroke-opacity=".5" stroke-width="1.5"/>

        ${text(E.electric, 126, 70, power(E.electric), 36)}
        ${text(E.thermal, 126, 118, power(E.thermal), 34)}
        ${text(E.cop, 126, 166, 'COP ' + value(E.cop, 2, ''), 30)}

        <g transform="translate(321 119)" fill="none" stroke="#d6e1e6"
          stroke-width="4" stroke-linecap="round">
          <path d="M-29 8C-30 -10 -15 -22 0 -21
            C15 -21 27 -12 29 1C48 1 54 34 29 38H-26
            C-49 38 -50 12 -29 8Z"/>
          <circle cx="-16" cy="-41" r="11"/>
          <path d="M-16 -60V-66M-39 -53L-44 -58M7 -53L12 -58"/>
        </g>

        ${text(E.north, 472, 82, 'N: ' + temp(E.north), 31)}
        ${text(E.south, 472, 145, 'S: ' + temp(E.south), 31)}

        <g transform="translate(648 101)" fill="none"
          stroke="#dce6eb" stroke-width="5" stroke-linejoin="round">
          <path d="M-28 5L0 -23L28 5V54H-28Z"/>
          <path d="M-8 54V23H8V54"/>
        </g>

        ${text(E.groundRoom, 778, 82, temp(E.groundRoom), 32)}
        ${text(E.groundThermostat, 924, 82,
          target(E.groundThermostat), 31, '#ff3655')}
        ${text(E.upperRoom, 778, 145, temp(E.upperRoom), 32)}
        ${text(E.upperThermostat, 924, 145,
          target(E.upperThermostat), 31, '#ff3655')}

        ${text(E.status, 104, 259,
          state(E.status), 48, '#f4f7f8', 'middle', 700, 122)}
        <path d="M176 232V284" stroke="#64757e" stroke-width="1.5"/>
        ${text(E.program, 278, 253,
          state(E.program), 29, '#f4f7f8', 'middle', 700, 160)}
        ${text(E.controlPc, 278, 282,
          state(E.controlPc), 15, '#aebec7', 'middle', 600, 160)}
        ${text(E.mode, 951, 243,
          state(E.mode), 30, '#f4f7f8', 'end', 700, 280)}
        ${text(E.control, 951, 280,
          state(E.control), 23, '#c7d2d9', 'end', 500, 300)}

        ${text(E.suction, 373, 365, temp(E.suction), 32)}
        ${text(E.discharge, 633, 365, temp(E.discharge), 32)}

        ${pipe('M563 440H627Q651 440 651 465V540',
          hot, running, false, 12)}

        <g transform="translate(497 440)"
          data-heat-entity="${E.compressor}" class="hf-click">
          <circle r="66" fill="${url('metal')}" stroke="#e4ebef" stroke-width="3"/>
          <circle r="56" fill="none" stroke="#f5f8fa"
            stroke-opacity=".5" stroke-width="2"/>
          <circle r="49" fill="#4a5963" stroke="#273c48" stroke-width="3"/>
          <path d="M-18 -29H18V-6H-18Z"
            fill="none" stroke="#e4ecef" stroke-width="4"/>
          <g>
            ${running ? `
              <animateTransform attributeName="transform" type="translate"
                values="0,-3;0,4;0,-3" dur=".7s" repeatCount="indefinite"/>
            ` : ''}
            <rect x="-14" y="-22" width="28" height="9" fill="#dbe5ea"/>
            <path d="M0 -13V24" stroke="#dbe5ea" stroke-width="4"/>
          </g>
          <circle cy="28" r="8" fill="none" stroke="#dbe5ea" stroke-width="4"/>
          <circle r="73" fill="transparent"/>
        </g>

        ${text(E.compressor, 497, 528, value(E.compressor, 0), 30)}
        ${text(E.ambient, 151, 512,
          temp(E.ambient), 32, '#f4f6f7', 'end')}
        ${wind(195, 506)}

        <g transform="translate(158 662)"
          data-heat-entity="${E.fan}" class="hf-click">
          <g>
            ${spin(fanRunning, '2s')}
            ${[0, 72, 144, 216, 288].map(a => `
              <path d="M-10 -13C-54 -34 -64 -98 -27 -104
                C9 -110 39 -45 15 -13Z"
                fill="${url('blade')}" stroke="#c0cbd2"
                stroke-opacity=".6" stroke-width="1.5"
                transform="rotate(${a})"/>
            `).join('')}
            <circle r="29" fill="${url('metal')}"
              stroke="#d8e2e8" stroke-width="2"/>
            <circle r="11" fill="#233843" stroke="#899da9" stroke-width="2"/>
          </g>
          <circle r="113" fill="transparent"/>
        </g>

        ${wind(85, 802, '-1.1s')}
        ${text(E.defrost, 160, 812,
          temp(E.defrost), 31, '#f4f6f7', 'start')}
        ${text(E.fan, 151, 915, value(E.fan, 0), 30)}

        ${pipe(evap, cold, running, false, 12)}

        ${control(E.heater, 497, 590,
          'heat', false, 32, haierHeaterRunning)}
        ${control(E.limit, 497, 681,
          'gauge', true, 32, limitActive)}
        ${control(E.cooling, 497, 772,
          'snow', true, 32, coolingActive)}

        <g>
          <rect x="608" y="540" width="86" height="286" rx="25"
            fill="${url('metal')}" stroke="#c9d5dc" stroke-width="2"/>
          <ellipse cx="651" cy="548" rx="42" ry="12"
            fill="#dce4e9" stroke="#7d919e" stroke-width="1"/>
          <path d="M620 567V804M682 567V804"
            stroke="#f2f6f8" stroke-opacity=".3" stroke-width="2"/>
          <ellipse cx="651" cy="816" rx="40" ry="9"
            fill="#7e919d" stroke="#c1d0d9" stroke-width="1"/>
        </g>

        ${pipe(condenserCoil, hot, running, false, 11)}
        ${pipe('M651 809V852Q651 875 628 875H535',
          hot, running, false, 12)}

        ${pipe(`M694 ${supplyY}H960`, hot, haierPumpRunning, false, 12)}
        ${pipe(`M960 ${returnY}H694`, cold, haierPumpRunning, false, 12)}
        ${pump(E.electric, 791, supplyY, hot, 29, haierPumpRunning)}

        ${text(E.tho, 752, 506, temp(E.tho), 30)}
        ${text(E.supplyTarget, 959, 533,
          temp(E.supplyTarget), 31, '#ff3554', 'end')}
        ${text(E.supply, 959, 578,
          temp(E.supply), 34, '#f4f6f7', 'end')}
        ${text(E.delta, 957, deltaY,
          'Δ ' + temp(E.delta), 31, '#f4f6f7', 'end')}
        ${text(E.return, 957, 817,
          temp(E.return), 32, '#f4f6f7', 'end')}
        ${text(E.thi, 744, 859, temp(E.thi), 30)}

        <g transform="translate(494 875)"
          data-heat-entity="${E.expansion}" class="hf-click">
          <path d="M-39 -20L0 0L-39 20ZM39 -20L0 0L39 20Z"
            fill="${url('metal')}" stroke="#e1e9ed" stroke-width="2"/>
          <rect x="-14" y="-39" width="28" height="20" rx="4"
            fill="${url('metal')}" stroke="#e1e9ed" stroke-width="2"/>
          <path d="M0 -19V-1" stroke="#e0e9ef" stroke-width="4"/>
          <ellipse cy="-39" rx="14" ry="4" fill="#e1e9ed"/>
          <rect x="-45" y="-45" width="90" height="75" fill="transparent"/>
        </g>

        ${text(E.expansion, 494, 925, value(E.expansion, 1), 34)}

        ${pipe('M270 1145H345', hot, circulationRunning, false, 11)}
        ${pump(E.circulation, 324, 1145, hot, 24, circulationRunning)}
        <path d="M351 1137V1153M358 1137V1153"
          stroke="#b6c4cc" stroke-width="2" stroke-linecap="round"/>

        ${pipe('M352 1350H270', cold, false, false, 11)}
        <path d="M321 1344L309 1350L321 1356"
          fill="none" stroke="#dceaf1" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"/>

        ${control(E.cwuHeater, 324, 1298,
          'heat', true, 30, cwuHeaterRunning)}

        ${zone('PARTER', 1040,
          E.groundTemp, E.groundTarget, E.groundValve, E.groundPump)}
        ${zone('PIĘTRO', 1210,
          E.upperTemp, E.upperTarget, E.upperValve, E.upperPump)}

        ${pipe('M961 1392H620',
          cold, groundRunning || upperRunning, false, 12)}
        <path d="M698 1424H663L674 1413M663 1424L674 1435"
          fill="none" stroke="#e0e9ee" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round"/>
        ${text(E.heatingReturn, 962, 1427,
          'Powrót ' + temp(E.heatingReturn), 26, '#eaf0f3', 'end')}

        ${tank(40, 230, 'CWU', 'cwuFill',
          E.cwu, null, E.cwuHaier, true)}
        ${tank(400, 230, 'bufor CO', 'bufferFill',
          E.bufferTop, E.bufferMiddle, E.bufferBottom)}
      </svg>
    </div>
  `;

  }
}

const ENTITY_GROUPS = {
  'Pompa ciepła': ['electric','thermal','cop','status','program','controlPc','mode','control','fan','compressor','suction','discharge','ambient','defrost','expansion','tho','thi','supply','supplyTarget','return','delta','limit','cooling','heater'],
  'Dom i pogoda': ['north','south','groundRoom','upperRoom','groundThermostat','upperThermostat'],
  'CWU': ['cwu','cwuHaier','cwuTarget','hysteresis','cwuHeater','circulation'],
  'Bufor CO': ['bufferTop','bufferMiddle','bufferBottom','bufferCharge','heatingReturn'],
  'Parter': ['groundTemp','groundTarget','groundValve','groundPump'],
  'Piętro': ['upperTemp','upperTarget','upperValve','upperPump']
};
const LABELS = {
  electric:'Moc elektryczna',thermal:'Moc cieplna',cop:'COP',status:'Status pompy',program:'Program',controlPc:'Sterowanie PC',mode:'Tryb',control:'Sterowanie',fan:'Obroty wentylatora',compressor:'Częstotliwość sprężarki',suction:'Temperatura ssania',discharge:'Temperatura tłoczenia',ambient:'Temperatura otoczenia',defrost:'Temperatura odszraniania',expansion:'Otwarcie zaworu rozprężnego',tho:'Wylot wymiennika THO',thi:'Wlot wymiennika THI',supply:'Temperatura CO odczytana',supplyTarget:'Temperatura CO zadana',return:'Powrót CO Haier',delta:'Różnica temperatur ΔT',limit:'Ograniczenie mocy',cooling:'Chłodzenie',heater:'Grzałka Haier',north:'Temperatura zewnętrzna N',south:'Temperatura zewnętrzna S',groundRoom:'Temperatura parteru',upperRoom:'Temperatura piętra',groundThermostat:'Termostat parteru',upperThermostat:'Termostat piętra',cwu:'Temperatura CWU',cwuHaier:'Temperatura CWU Haier',cwuTarget:'Zadana CWU',hysteresis:'Histereza CWU',cwuHeater:'Grzałka CWU',circulation:'Pompa cyrkulacyjna CWU',bufferTop:'Bufor góra',bufferMiddle:'Bufor środek',bufferBottom:'Bufor dół',bufferCharge:'Naładowanie bufora',heatingReturn:'Powrót do bufora',groundTemp:'Temperatura zaworu parter',groundTarget:'Zadana zaworu parter',groundValve:'Otwarcie zaworu parter',groundPump:'Pompa parter',upperTemp:'Temperatura zaworu piętro',upperTarget:'Zadana zaworu piętro',upperValve:'Otwarcie zaworu piętro',upperPump:'Pompa piętro'
};
class HaierHeatingCardEditor extends HTMLElement {
  setConfig(config) { this.config = { ...config, entities: { ...(config.entities || {}) } }; this.render(); }
  set hass(hass) { this._hass = hass; if (this.config && !this._initialized) this.render(); else this.refreshPickers(); }
  emit() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true })); }
  refreshPickers() {
    if (!this._hass) return;
    this.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = this._hass; });
  }
  render() {
    if (!this.config) return;
    this._initialized = true;
    const options = Object.entries(ENTITY_GROUPS).map(([group, keys]) => `<details><summary>${group} (${keys.length})</summary><div class="fields">${keys.map(key => `<label class="field"><span>${LABELS[key] || key}</span><ha-entity-picker data-key="${key}" allow-custom-entity></ha-entity-picker><button type="button" class="clear" data-clear="${key}" title="Wyłącz mapowanie">×</button></label>`).join('')}</div></details>`).join('');
    this.innerHTML = `<style>:host{display:block;color:var(--primary-text-color)}.editor{padding:12px 16px;max-height:70vh;overflow:auto}.row{display:flex;align-items:center;gap:12px;margin:12px 0}.row label{flex:1}select,input[type=number]{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:8px}.fields{display:grid;gap:8px;padding:10px 0}.field{display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,1.5fr) 30px;align-items:center;gap:8px;font-size:13px}.field ha-entity-picker{min-width:0}.clear{border:0;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-size:22px}details{border-bottom:1px solid var(--divider-color);padding:10px 0}summary{cursor:pointer;font-weight:600}small{color:var(--secondary-text-color)}</style><div class="editor"><b>Haier Heating Card</b><div class="row"><label><input id="fit" type="checkbox"> Dopasuj do wysokości ekranu</label></div><div class="row"><label>Brak encji</label><select id="missing"><option value="hide">Ukryj element</option><option value="dash">Pokaż —</option><option value="zero">Pokaż 0</option></select></div><div class="row"><label>Próg pompy Haier (W)</label><input id="threshold" type="number" min="0" max="100000" step="1"></div><p><small>Wybierz encje z Home Assistant. Nowa instalacja nie ma przypisanych encji. Przycisk × wyłącza dane mapowanie; możesz wybrać inną encję w każdej pozycji.</small></p>${options}</div>`;
    this.querySelector('#fit').checked = this.config.fit_height !== false;
    this.querySelector('#missing').value = this.config.missing_entity_mode || 'hide';
    this.querySelector('#threshold').value = this.config.pump_threshold_w ?? 30;
    this.querySelector('#fit').addEventListener('change', e => { this.config.fit_height = e.target.checked; this.emit(); });
    this.querySelector('#missing').addEventListener('change', e => { this.config.missing_entity_mode = e.target.value; this.emit(); });
    this.querySelector('#threshold').addEventListener('change', e => { const n=Number(e.target.value); if(Number.isFinite(n)&&n>=0&&n<=100000){this.config.pump_threshold_w=n;this.emit();} });
    this.querySelectorAll('ha-entity-picker').forEach(picker => {
      const key = picker.dataset.key;
      picker.hass = this._hass;
      picker.value = Object.prototype.hasOwnProperty.call(this.config.entities,key) ? (this.config.entities[key] || '') : (DEFAULTS[key] || '');
      picker.addEventListener('value-changed', e => {
        if (!e.detail || !Object.prototype.hasOwnProperty.call(e.detail,'value')) return;
        const next = e.detail.value || '';
        if (next === DEFAULTS[key]) delete this.config.entities[key];
        else this.config.entities[key] = next;
        this.emit();
      });
    });
    this.querySelectorAll('[data-clear]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.clear;
      this.config.entities[key] = '';
      const picker = this.querySelector(`ha-entity-picker[data-key="${key}"]`);
      if (picker) picker.value = '';
      this.emit();
    }));
  }
}

if (!customElements.get('haier-heating-card')) customElements.define('haier-heating-card', HaierHeatingCard);
if (!customElements.get('haier-heating-card-editor')) customElements.define('haier-heating-card-editor', HaierHeatingCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'haier-heating-card', name: 'Haier Heating Card', description: 'Animated Haier heat-pump installation schematic.' });
