/* ============================================================
 * countdown-widget.js —— 2035 倒计时自定义元素
 * ------------------------------------------------------------
 * 新拟物皮肤版：
 *   ★ 外层卡片 + 数字格：统一凸起（双光源）
 *   ★ 进度条：凹槽 + 纯紫实色条（无动画）
 *   ★ 移除：发光 / 脉冲 / 呼吸 / 流光 / 闪烁 / 深色主题分支
 *   ★ 每个变量都带 fallback，即使主 CSS 缺变量也能正常显示
 * ============================================================ */
(function () {
  'use strict';

  if (customElements.get('countdown-2035')) return;

  var STRINGS = {
    zh: {
      badge:   '⏳ 2025年12月1日起计时',
      sub:     '倒计时只是静态计算，变量会压缩窗口期。',
      days:    '天',
      hours:   '时',
      minutes: '分',
      seconds: '秒',
      elapsed: '已流逝',
      live:    '实时'
    },
    en: {
      badge:   '⏳ Counting from Dec 1, 2025',
      sub:     'The countdown is only a static calculation — variables will compress the window.',
      days:    'Days',
      hours:   'Hours',
      minutes: 'Min',
      seconds: 'Sec',
      elapsed: 'Elapsed',
      live:    'Live'
    }
  };

  function getLang() {
    var app = window.App;
    if (app && app.i18n && typeof app.i18n.lang === 'function') {
      var l = app.i18n.lang();
      if (l === 'en' || l === 'zh') return l;
    }
    return 'zh';
  }

  function t(lang, key) {
    var pack = STRINGS[lang] || STRINGS.zh;
    return pack[key] != null ? pack[key] : key;
  }

  function dateLine(lang) {
    if (lang === 'en') {
      return 'Until <span class="gold">Jan 1, 2035</span>';
    }
    return '距离 <span class="gold">2035</span> 年 <span class="gold">1</span> 月 <span class="gold">1</span> 日';
  }

  class Countdown2035 extends HTMLElement {
    constructor() {
      super();
      this.target = new Date('2035-01-01T00:00:00+08:00').getTime();
      this.start  = new Date('2025-12-01T00:00:00+08:00').getTime();
      this.total  = this.target - this.start;
      this.attachShadow({ mode: 'open' });
      this.timer = null;
      this._offLang = null;
    }

    connectedCallback() {
      this.render();
      this.tick();
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), 1000);
      this._bindLang();
    }

    disconnectedCallback() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this._unbindLang();
    }

    _bindLang() {
      this._unbindLang();
      var app = window.App;
      if (!app || !app.events || typeof app.events.on !== 'function') return;
      var self = this;
      this._offLang = app.events.on('langchange', function () {
        self.render();
        self.tick();
      });
    }

    _unbindLang() {
      if (typeof this._offLang === 'function') {
        try { this._offLang(); } catch (e) { /* ignore */ }
      }
      this._offLang = null;
    }

    _set(el, value) {
      if (!el) return;
      if (el.textContent === value) return;
      el.textContent = value;
    }

    render() {
      var lang = getLang();

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: var(--font-sans, "Microsoft YaHei", "PingFang SC", sans-serif);
            width: 100%;
            box-sizing: border-box;
            margin: 0;
          }

          /* ---- 外层卡片：凸起 ---- */
          .card {
            background: var(--bg, #e0e5ec);
            border: none;
            border-radius: var(--r-lg, 20px);
            padding: 30px 36px 34px;
            color: var(--text, #2f333a);
            box-sizing: border-box;
            width: 100%;
            margin-bottom: 16px;
            box-shadow:
              12px 12px 24px #b8bcc2,
              -12px -12px 24px #ffffff;
          }

          /* ---- 头部 ---- */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(184,188,194,.45);
            padding-bottom: 12px;
            margin-bottom: 22px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .logo {
            font-size: 17px;
            font-weight: 700;
            color: var(--text, #2f333a);
          }
          .logo span { color: var(--accent, #6d5dfc); }
          .badge {
            font-size: 11.5px;
            color: var(--text-3, #8f97a6);
            padding: 4px 12px;
            border-radius: 999px;
            background: var(--bg, #e0e5ec);
            box-shadow:
              inset 1px 1px 3px #b8bcc2,
              inset -1px -1px 3px #ffffff;
          }

          /* ---- 标题日期 ---- */
          .hero { text-align: center; margin-bottom: 24px; }
          .hero .date {
            font-size: 26px;
            font-weight: 700;
            color: var(--text, #2f333a);
          }
          .hero .date .gold { color: var(--accent, #6d5dfc); }
          .hero .sub {
            font-size: 12.5px;
            color: var(--text-3, #8f97a6);
            margin-top: 4px;
          }

          /* ---- 四个数字格：凸起 ---- */
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 22px;
          }
          .item {
            background: var(--bg, #e0e5ec);
            border: none;
            border-radius: var(--r-md, 16px);
            padding: 16px 4px 14px;
            text-align: center;
            box-shadow:
              4px 4px 8px #b8bcc2,
              -4px -4px 8px #ffffff;
          }
          .item .num {
            display: inline-block;
            font-size: 34px;
            font-weight: 700;
            color: var(--text, #2f333a);
            line-height: 1.1;
            font-variant-numeric: tabular-nums;
          }
          .item .num.glow { color: var(--accent, #6d5dfc); }
          .item .lbl {
            font-size: 11px;
            color: var(--text-3, #8f97a6);
            letter-spacing: 1.5px;
            margin-top: 4px;
            text-transform: uppercase;
          }

          /* ---- 进度条：凹槽 + 纯紫实色（无动画） ---- */
          .progress-wrap { margin-bottom: 16px; }
          .progress-wrap .info {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            color: var(--text-3, #8f97a6);
            margin-bottom: 8px;
          }
          .progress-wrap .track {
            width: 100%;
            height: 10px;
            border-radius: 999px;
            background: var(--bg, #e0e5ec);
            box-shadow:
              inset 2px 2px 4px #b8bcc2,
              inset -2px -2px 4px #ffffff;
            overflow: hidden;
          }
          .progress-wrap .bar {
            height: 100%;
            width: 0%;
            background: var(--accent, #6d5dfc);
            border-radius: 999px;
            transition: width .4s ease-in-out;
          }

          /* ---- 底部 ---- */
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 14px;
            border-top: 1px solid rgba(184,188,194,.45);
            font-size: 11.5px;
            color: var(--text-3, #8f97a6);
          }
          .footer .live {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--accent, #6d5dfc);
          }
          .footer .dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent, #6d5dfc);
          }

          @media (max-width: 600px) {
            .card { padding: 22px 16px 26px; }
            .hero .date { font-size: 20px; }
            .grid { gap: 10px; }
            .item { padding: 12px 4px 10px; border-radius: 12px; }
            .item .num { font-size: 24px; }
          }
          @media (max-width: 400px) {
            .grid { grid-template-columns: 1fr 1fr; }
          }
        </style>

        <div class="card" data-lang="${lang}" role="group" aria-label="${t(lang, 'badge')}">
          <div class="header">
            <span class="logo">FINAL·<span>DEFENSE</span></span>
            <span class="badge">${t(lang, 'badge')}</span>
          </div>

          <div class="hero">
            <div class="date">${dateLine(lang)}</div>
            <div class="sub">${t(lang, 'sub')}</div>
          </div>

          <div class="grid">
            <div class="item"><div class="num glow" id="days">00</div><div class="lbl">${t(lang, 'days')}</div></div>
            <div class="item"><div class="num" id="hours">00</div><div class="lbl">${t(lang, 'hours')}</div></div>
            <div class="item"><div class="num" id="minutes">00</div><div class="lbl">${t(lang, 'minutes')}</div></div>
            <div class="item"><div class="num" id="seconds">00</div><div class="lbl">${t(lang, 'seconds')}</div></div>
          </div>

          <div class="progress-wrap">
            <div class="info"><span>${t(lang, 'elapsed')}</span><span id="percent">0.00%</span></div>
            <div class="track"><div class="bar" id="bar"></div></div>
          </div>

          <div class="footer">
            <span class="live"><span class="dot"></span> ${t(lang, 'live')}</span>
            <span id="currentTime">--:--:--</span>
          </div>
        </div>`;

      this.daysEl    = this.shadowRoot.getElementById('days');
      this.hoursEl   = this.shadowRoot.getElementById('hours');
      this.minutesEl = this.shadowRoot.getElementById('minutes');
      this.secondsEl = this.shadowRoot.getElementById('seconds');
      this.barEl     = this.shadowRoot.getElementById('bar');
      this.percentEl = this.shadowRoot.getElementById('percent');
      this.timeEl    = this.shadowRoot.getElementById('currentTime');
    }

    tick() {
      const now = Date.now();
      const diff = this.target - now;

      if (diff <= 0) {
        this._set(this.daysEl,    '00');
        this._set(this.hoursEl,   '00');
        this._set(this.minutesEl, '00');
        this._set(this.secondsEl, '00');
        this.barEl.style.width = '100%';
        this.percentEl.textContent = '100.00%';
      } else {
        const s = Math.floor(diff / 1000);
        this._set(this.daysEl,    String(Math.floor(s / 86400)).padStart(2, '0'));
        this._set(this.hoursEl,   String(Math.floor((s % 86400) / 3600)).padStart(2, '0'));
        this._set(this.minutesEl, String(Math.floor((s % 3600) / 60)).padStart(2, '0'));
        this._set(this.secondsEl, String(s % 60).padStart(2, '0'));

        const elapsed = Math.max(0, Math.min(now - this.start, this.total));
        const percent = (elapsed / this.total * 100).toFixed(2);
        this.barEl.style.width = percent + '%';
        this.percentEl.textContent = percent + '%';
      }

      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      this.timeEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
  }

  customElements.define('countdown-2035', Countdown2035);
})();