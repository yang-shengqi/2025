/* ============================================================
 * practical-playbook.js
 * The Global Wealth Bible · 交互逻辑
 * 依赖：无
 * ============================================================ */
(function () {
  'use strict';

  /* ============================================================
   * 顶部进度条 + 滚动高亮
   * ============================================================ */
  var progress = document.getElementById('progress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.cn-qw-pill[data-sec]'));
  var sections = navLinks.map(function(a){
    return document.getElementById(a.getAttribute('data-sec'));
  });

  var ticking = false;
  function update(){
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var top = window.pageYOffset || doc.scrollTop || 0;
    var p = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;

    if (progress) progress.style.width = (p * 100).toFixed(2) + '%';

    var probe = top + 140;
    var curIdx = 0;
    for (var i = 0; i < sections.length; i++){
      var el = sections[i];
      if (el && el.offsetTop <= probe) curIdx = i;
    }
    var curId = sections[curIdx] ? sections[curIdx].id : '';
    navLinks.forEach(function(a){
      a.classList.toggle('cn-qw-on', a.getAttribute('data-sec') === curId);
    });
  }
  function onScroll(){
    if (!ticking){ ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ============================================================
   * 运行计时
   * ============================================================ */
  var birth = new Date('2025-12-01');
  function setText(sel, txt){
    document.querySelectorAll(sel).forEach(function(el){ el.textContent = txt; });
  }
  function tick(){
    var diff = Date.now() - birth.getTime();
    if (diff < 0) diff = 0;
    var ts = Math.floor(diff / 1000);
    setText('.cn-qw-days', Math.floor(ts / 86400));
    setText('.cn-qw-hours', String(Math.floor((ts % 86400) / 3600)).padStart(2, '0'));
    setText('.cn-qw-minutes', String(Math.floor((ts % 3600) / 60)).padStart(2, '0'));
    setText('.cn-qw-seconds', String(ts % 60).padStart(2, '0'));
  }
  tick();
  setInterval(tick, 1000);

  console.log('✅ Global Wealth Bible page ready');
})();