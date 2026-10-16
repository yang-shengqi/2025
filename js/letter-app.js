/* ============================================================
 * letter-app.js  （完整修复版）
 * 家书 · 交互逻辑
 * 依赖：无
 * ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- localStorage 安全封装（file:// 下可能抛错，避免整脚本崩） ---------- */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ============================================================
   * 语言切换
   * ============================================================ */
  var langBtn = document.getElementById('langBtn');

  function applyLang(lang) {
    var isEn = (lang === 'en');
    root.setAttribute('lang', isEn ? 'en' : 'zh-CN');
    document.title = isEn
      ? 'Yang Xinyu: Strategic Survival Plan'
      : '杨昕玉：人生生存战略方案';
  }

  applyLang(store.get('letter-lang') || 'zh-CN');

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      var next = (root.getAttribute('lang') === 'zh-CN') ? 'en' : 'zh-CN';
      applyLang(next);
      store.set('letter-lang', next);
    });
  }

  /* ============================================================
   * 正计时
   * ============================================================ */
  var START = new Date('2026-07-03T00:00:00+08:00').getTime();
  var END   = new Date('2038-01-01T00:00:00+08:00').getTime();
  var TOTAL = END - START;

  var cdD = document.getElementById('cdD');
  var cdH = document.getElementById('cdH');
  var cdM = document.getElementById('cdM');
  var cdS = document.getElementById('cdS');
  var cdBar = document.getElementById('cdBar');
  var cdPercent = document.getElementById('cdPercent');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    var elapsed = Math.max(0, Date.now() - START);
    var total = Math.floor(elapsed / 1000);
    var d = Math.floor(total / 86400);
    var h = Math.floor((total % 86400) / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (cdD) cdD.textContent = pad(d);
    if (cdH) cdH.textContent = pad(h);
    if (cdM) cdM.textContent = pad(m);
    if (cdS) cdS.textContent = pad(s);

    var p = TOTAL > 0 ? Math.min(Math.max(elapsed / TOTAL, 0), 1) : 0;
    if (cdBar) cdBar.style.width = (p * 100).toFixed(2) + '%';
    if (cdPercent) cdPercent.textContent = (p * 100).toFixed(2) + '%';
  }
  tick();
  setInterval(tick, 1000);

  /* ============================================================
   * 复利计算器
   * ============================================================ */
  function setText(el, val) { if (el) el.textContent = val; }

  function calcDingtou() {
    var pmtEl = document.getElementById('pmt');
    var rateEl = document.getElementById('rate');
    var yearsEl = document.getElementById('years');
    var pmt = parseFloat(pmtEl && pmtEl.value);
    var rate = parseFloat(rateEl && rateEl.value);
    var years = parseFloat(yearsEl && yearsEl.value);

    var rEl = document.getElementById('resultD');
    var tiEl = document.getElementById('totalInput');
    var tiEn = document.getElementById('totalInputEn');
    var tpEl = document.getElementById('totalProfit');
    var tpEn = document.getElementById('totalProfitEn');

    if (isNaN(pmt) || pmt <= 0 || isNaN(rate) || rate < 0 || isNaN(years) || years <= 0) {
      setText(rEl, '--');
      setText(tiEl, '--'); setText(tiEn, '--');
      setText(tpEl, '--'); setText(tpEn, '--');
      return;
    }

    var n = years * 12;
    var fv;
    if (rate === 0) {
      fv = pmt * n;                       // 防止除零
    } else {
      var r = rate / 100 / 12;
      fv = pmt * ((Math.pow(1 + r, n) - 1) / r);
    }
    var input = pmt * n;

    setText(rEl, fv.toFixed(2) + ' HKD');
    setText(tiEl, input.toFixed(2));
    setText(tiEn, input.toFixed(2));
    setText(tpEl, (fv - input).toFixed(2));
    setText(tpEn, (fv - input).toFixed(2));
  }

  function calcSingle() {
    var pvEl = document.getElementById('pv');
    var rateEl = document.getElementById('rateS');
    var yearsEl = document.getElementById('yearsS');
    var pv = parseFloat(pvEl && pvEl.value);
    var rate = parseFloat(rateEl && rateEl.value);
    var years = parseFloat(yearsEl && yearsEl.value);

    var rEl = document.getElementById('resultS');
    var tpEl = document.getElementById('totalProfitS');
    var tpEn = document.getElementById('totalProfitSEn');

    if (isNaN(pv) || pv <= 0 || isNaN(rate) || rate < 0 || isNaN(years) || years <= 0) {
      setText(rEl, '--');
      setText(tpEl, '--'); setText(tpEn, '--');
      return;
    }

    var fv = pv * Math.pow(1 + rate / 100, years);
    setText(rEl, fv.toFixed(2) + ' HKD');
    setText(tpEl, (fv - pv).toFixed(2));
    setText(tpEn, (fv - pv).toFixed(2));
  }

  [
    ['pmt', calcDingtou], ['rate', calcDingtou], ['years', calcDingtou],
    ['pv', calcSingle], ['rateS', calcSingle], ['yearsS', calcSingle]
  ].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    var saved = store.get('calc_xy_' + pair[0]);
    if (saved !== null && saved !== '') el.value = saved;
    el.addEventListener('input', function () {
      store.set('calc_xy_' + pair[0], el.value);
      pair[1]();
    });
  });

  calcDingtou();
  calcSingle();

  /* ============================================================
   * 顶部进度条 + 返回顶部
   * ============================================================ */
  var toTop = document.getElementById('toTop');
  var ringFill = document.getElementById('ringFill');
  var navProg = document.getElementById('navProgress');
  var R = 21, CIRC = 2 * Math.PI * R;

  if (ringFill) {
    ringFill.setAttribute('stroke-dasharray', CIRC.toFixed(2));
    ringFill.setAttribute('stroke-dashoffset', CIRC.toFixed(2));
  }

  var ticking = false;
  function update() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var top = window.pageYOffset || doc.scrollTop || 0;
    var p = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
    if (ringFill) ringFill.setAttribute('stroke-dashoffset', (CIRC * (1 - p)).toFixed(2));
    if (navProg) navProg.style.width = (p * 100).toFixed(2) + '%';
    if (toTop) toTop.classList.toggle('on', top > 300);
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ---------- 慢速返回顶部 ---------- */
  var scrollAnimId = null;
  function stopScrollAnim() {
    if (scrollAnimId !== null) { cancelAnimationFrame(scrollAnimId); scrollAnimId = null; }
  }
  ['wheel', 'touchstart', 'touchmove'].forEach(function (evt) {
    window.addEventListener(evt, stopScrollAnim, { passive: true });
  });

  if (toTop) {
    toTop.addEventListener('click', function () {
      stopScrollAnim();
      var startY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var duration = 600;
      var t0 = null;
      var html = document.documentElement;
      var prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';   // 防止与 CSS 的 smooth 打架

      function step(ts) {
        if (t0 === null) t0 = ts;
        var prog = Math.min(1, (ts - t0) / duration);
        var ease = 1 - Math.pow(1 - prog, 3);   // easeOutCubic
        window.scrollTo(0, Math.round(startY * (1 - ease)));
        if (prog < 1) {
          scrollAnimId = requestAnimationFrame(step);
        } else {
          scrollAnimId = null;
          html.style.scrollBehavior = prevBehavior;
        }
      }
      scrollAnimId = requestAnimationFrame(step);
    });
  }

})();