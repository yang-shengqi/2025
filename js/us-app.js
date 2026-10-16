/* ============================================================
 * us-app.js
 * 美国账户 Charles Schwab 仪表盘 · 主逻辑
 * 依赖：us-i18n.js（必须在前）、xlsx.full.min.js、chart.umd.min.js
 * ============================================================ */
(function () {
  'use strict';

  if (typeof XLSX === 'undefined') {
    alert('❌ XLSX 解析库未加载。\n请确认 xlsx.full.min.js 与网页同级，或改用 CDN 引入。');
    return;
  }
  if (typeof Chart === 'undefined') { console.warn('⚠️ Chart.js 未加载'); }

  var root = document.documentElement;
  var DICT = window.US_I18N.DICT;

  var PREF_KEY = 'schwab_dash_prefs_v2';
  var prefs = { lang: 'zh' };
  try {
    var sp = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    if (sp && sp.lang) prefs.lang = sp.lang;
  } catch (e) {}
  function savePrefs(){ try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

  /* ================= ★ 移动端抽屉菜单 ================= */
  var drawerEl = document.getElementById('mobileDrawer');
  var menuBtn = document.getElementById('menuBtn');

  function openDrawer(){
    if (!drawerEl) return;
    drawerEl.classList.add('open');
    drawerEl.setAttribute('aria-hidden', 'false');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('drawer-open');
  }
  function closeDrawer(){
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    drawerEl.setAttribute('aria-hidden', 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    root.classList.remove('drawer-open');
  }
  function toggleDrawer(){
    if (!drawerEl) return;
    if (drawerEl.classList.contains('open')) closeDrawer();
    else openDrawer();
  }

  if (menuBtn){
    menuBtn.addEventListener('click', function(e){
      e.stopPropagation();
      toggleDrawer();
    });
  }
  if (drawerEl){
    drawerEl.querySelectorAll('[data-drawer-close]').forEach(function(el){
      el.addEventListener('click', function(){ closeDrawer(); });
    });
  }
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && drawerEl && drawerEl.classList.contains('open')) closeDrawer();
  });
  window.addEventListener('resize', function(){
    if (window.innerWidth > 1024 && drawerEl && drawerEl.classList.contains('open')) closeDrawer();
  });

  /* ================= i18n ================= */
  var lang = prefs.lang;
  function T(k){
    var d = DICT[lang] || DICT.zh;
    return (d[k] !== undefined) ? d[k] : (DICT.zh[k] !== undefined ? DICT.zh[k] : k);
  }
  function fmt(s, o){
    return String(s).replace(/\{(\w+)\}/g, function(m, key){
      return (o && o[key] !== undefined) ? o[key] : m;
    });
  }

  /* ================= 弹窗 ================= */
  var helpBtn = document.getElementById('helpBtn');
  var modal = document.getElementById('profitFactorModal');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  function openModal(){ modal.style.display='flex'; document.body.style.overflow='hidden'; }
  function closeModal(){ modal.style.display='none'; document.body.style.overflow=''; }
  if (helpBtn) helpBtn.addEventListener('click', openModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if (e.target === this) closeModal(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });

  function renderModal(){
    var badge = {
      danger:'background:rgba(239,107,107,.15);color:var(--state-fail);',
      info:'background:rgba(242,156,107,.15);color:var(--chart-3);',
      gold:'background:rgba(78,205,196,.15);color:var(--chart-2);',
      good:'background:rgba(53,199,179,.15);color:var(--state-ok);'
    };
    document.getElementById('modalBody').innerHTML = (DICT[lang].modal || []).map(function(r){
      return '<tr><td><span class="rating-badge" style="'+(badge[r.k]||'')+'">'+r.v+'</span></td>'
           + '<td>'+r.g+'</td><td>'+r.d+'</td></tr>';
    }).join('');
  }

  /* ================= 工具 ================= */
  function extractSymbolFromDesc(desc){
    if (!desc) return '';
    var upper = desc.toUpperCase();
    var map = [
      { kw:['CAN-FITE','CANF'], code:'CANF' },
      { kw:['INCANNEX','IXHL'], code:'IXHL' },
      { kw:['MANGOCEUTICALS','MGRX'], code:'MGRX' },
      { kw:['IO BIOTECH','IOBT'], code:'IOBT' },
      { kw:['LIMINATUS','LIMN'], code:'LIMN' },
      { kw:['PROFUSA','PFSA'], code:'PFSA' },
      { kw:['CALIDI','CLDI'], code:'CLDI' },
      { kw:['SYNERGY','SNYR'], code:'SYNR' }
    ];
    for (var i=0;i<map.length;i++){
      for (var j=0;j<map[i].kw.length;j++){
        if (upper.indexOf(map[i].kw[j]) !== -1) return map[i].code;
      }
    }
    var m = desc.match(/\(([A-Z]{1,6})\)/);
    return m ? m[1] : '';
  }

  function parseDate(raw){
    if (!raw) return { display:'', sortKey:null };
    var s = raw.toString().trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m){
      var mo=parseInt(m[1],10), da=parseInt(m[2],10), ye=parseInt(m[3],10);
      if (ye<100) ye+=2000;
      var d=new Date(ye,mo-1,da);
      if (d.getFullYear()===ye && d.getMonth()===mo-1 && d.getDate()===da)
        return { display: mo+'/'+da+'/'+ye, sortKey:d.getTime() };
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m){
      var y2=parseInt(m[1],10), m2=parseInt(m[2],10), d2=parseInt(m[3],10);
      var dd=new Date(y2,m2-1,d2);
      if (dd.getFullYear()===y2 && dd.getMonth()===m2-1 && dd.getDate()===d2)
        return { display: m2+'/'+d2+'/'+y2, sortKey:dd.getTime() };
    }
    return { display:s, sortKey:null };
  }

  function formatNum(v, d){
    d = d || 2;
    if (v === undefined || v === null || isNaN(v)) return '0.00';
    return Number(v).toFixed(d);
  }

  var toastTimer = null;
  function showToast(msg, duration){
    duration = duration || 3000;
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, duration);
  }

  /* ============================================================
   * 缓存：IndexedDB + localStorage 价格
   * ============================================================ */
  var LEGACY_DATA_KEY = 'schwab_dashboard_data';
  var PRICE_KEY = 'schwab_dashboard_prices';

  var IDB_NAME = 'schwab_dashboard_db';
  var IDB_VERSION = 1;
  var IDB_STORE = 'kv';
  var IDB_DATA_KEY = 'main';
  var _idbPromise = null;
  var _saveFailNotified = false;

  function openIDB(){
    if (_idbPromise) return _idbPromise;
    _idbPromise = new Promise(function(resolve, reject){
      if (!window.indexedDB){ reject(new Error('当前浏览器不支持 IndexedDB')); return; }
      var req;
      try { req = indexedDB.open(IDB_NAME, IDB_VERSION); }
      catch(e){ reject(e); return; }
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)){
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = function(e){ resolve(e.target.result); };
      req.onerror = function(e){ reject(e.target.error || new Error('打开 IndexedDB 失败')); };
    });
    return _idbPromise;
  }

  function idbPut(key, val){
    return openIDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var st = tx.objectStore(IDB_STORE);
        var r = st.put(val, key);
        r.onsuccess = function(){ resolve(true); };
        r.onerror = function(){ reject(r.error); };
        tx.onabort = function(){ reject(tx.error || new Error('写入事务中止')); };
      });
    });
  }

  function idbGet(key){
    return openIDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readonly');
        var st = tx.objectStore(IDB_STORE);
        var r = st.get(key);
        r.onsuccess = function(){ resolve(r.result); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function idbDel(key){
    return openIDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var st = tx.objectStore(IDB_STORE);
        var r = st.delete(key);
        r.onsuccess = function(){ resolve(true); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function saveDataCache(d){
    return idbPut(IDB_DATA_KEY, d).catch(function(err){
      console.warn('❌ IndexedDB 保存失败，尝试降级 localStorage：', err);
      try {
        localStorage.setItem(LEGACY_DATA_KEY, JSON.stringify(d));
        console.warn('⚠️ 已降级为 localStorage 存储（容量有限）');
      } catch(e2){
        console.warn('❌ localStorage 也保存失败：', e2);
        if (!_saveFailNotified){
          _saveFailNotified = true;
          showToast('⚠️ 本地缓存写入失败（可能数据过大或处于隐私模式）', 6000);
        }
      }
    });
  }

  function loadDataCache(){
    return idbGet(IDB_DATA_KEY).then(function(d){
      if (d && d.allTransactions && d.results) return d;
      var legacy = null;
      try {
        var raw = localStorage.getItem(LEGACY_DATA_KEY);
        if (raw){
          var parsed = JSON.parse(raw);
          if (parsed && parsed.allTransactions && parsed.results) legacy = parsed;
        }
      } catch(e){}
      if (legacy){
        idbPut(IDB_DATA_KEY, legacy).then(function(){
          try { localStorage.removeItem(LEGACY_DATA_KEY); } catch(e){}
          console.log('✅ 已将旧 localStorage 缓存迁移到 IndexedDB');
        }).catch(function(){});
        return legacy;
      }
      return null;
    }).catch(function(err){
      console.warn('IndexedDB 读取失败，退回 localStorage：', err);
      try {
        var raw = localStorage.getItem(LEGACY_DATA_KEY);
        if (raw){
          var parsed = JSON.parse(raw);
          if (parsed && parsed.allTransactions && parsed.results) return parsed;
        }
      } catch(e){}
      return null;
    });
  }

  function clearDataCache(){
    try { localStorage.removeItem(LEGACY_DATA_KEY); } catch(e){}
    return idbDel(IDB_DATA_KEY).catch(function(){});
  }

  function savePriceCache(m){ try { localStorage.setItem(PRICE_KEY, JSON.stringify(m)); } catch(e){} }
  function loadPriceCache(){
    try {
      var raw = localStorage.getItem(PRICE_KEY);
      if (!raw) return {};
      var d = JSON.parse(raw);
      return (typeof d === 'object' && d !== null) ? d : {};
    } catch(e){ return {}; }
  }
  function clearPriceCache(){ try { localStorage.removeItem(PRICE_KEY); } catch(e){} }

  function clearAllCache(){
    clearPriceCache();
    return clearDataCache();
  }

  /* ================= 解析 ================= */
  function parseSchwabData(rows){
    if (rows.length < 2) return [];
    var header = rows[0].map(function(c){ return (c||'').toString().trim(); });
    var colMap = { date:-1, type:-1, symbol:-1, desc:-1, shares:-1, price:-1, fee:-1, amount:-1 };
    var keywords = {
      date:['日期','date'], type:['交易种类','type'],
      symbol:['代号','symbol','代码'], desc:['说明','description'],
      shares:['数量','shares'], price:['价格','price','单价','成交价','股价','Price'],
      fee:['费用','费用与佣金','fee','commission'], amount:['金额','amount']
    };
    Object.keys(keywords).forEach(function(key){
      var cand = keywords[key], idx = -1;
      for (var i=0;i<header.length && idx===-1;i++){
        var h = header[i].toLowerCase();
        for (var c=0;c<cand.length;c++){
          if (h.indexOf(cand[c].toLowerCase()) !== -1){ idx=i; break; }
        }
      }
      colMap[key] = idx;
    });
    if (colMap.date===-1 || colMap.type===-1 || colMap.amount===-1){
      colMap.date=0; colMap.type=1; colMap.symbol=2; colMap.desc=3;
      colMap.shares=4; colMap.price=5; colMap.fee=6; colMap.amount=7;
    }

    var events = [], skipped = 0;
    for (var r=1; r<rows.length; r++){
      var row = rows[r];
      if (!row || row.length === 0) continue;
      var allEmpty = true;
      for (var z=0; z<row.length; z++){
        if (row[z] !== '' && row[z] !== undefined && row[z] !== null){ allEmpty=false; break; }
      }
      if (allEmpty) continue;

      var maxIdx = Math.max(colMap.amount, colMap.type, colMap.symbol, colMap.desc);
      if (row.length <= maxIdx){ skipped++; continue; }

      var type = (row[colMap.type]||'').toString().trim();
      if (!type){ skipped++; continue; }
      var desc = (row[colMap.desc]||'').toString().trim();
      var sharesStr = (row[colMap.shares]||'').toString().replace(/,/g,'').trim();
      var shares = parseFloat(sharesStr) || 0;
      var priceStr = (row[colMap.price]!==undefined && row[colMap.price]!=='')
        ? row[colMap.price].toString().replace(/,/g,'').trim() : '';
      var price = priceStr ? parseFloat(priceStr) : null;
      var amountStr = (row[colMap.amount]||'').toString().replace(/,/g,'').trim();
      var amount = parseFloat(amountStr) || 0;
      var feeStr = (row[colMap.fee]||'').toString().replace(/,/g,'').trim();
      var fee = parseFloat(feeStr) || 0;
      var rawDate = (row[colMap.date]||'').toString().trim();
      var pd = parseDate(rawDate);

      if (type === 'Cash' || type === '现金' || type === 'CASH'){
        events.push({ displayDate:pd.display, sortKey:pd.sortKey, symbol:'CASH', type:'Cash',
          shares:1, amount:Math.abs(amount), fee:0, price:null, desc:desc||'Cash', isCashAsset:true });
        continue;
      }
      if (type === 'Wire Received' || type === 'WIRE' || type.indexOf('Wire') !== -1 || type === 'Credit Interest'){
        events.push({ displayDate:pd.display, sortKey:pd.sortKey, symbol:'CASH_IN', type:type,
          shares:0, amount:amount, fee:fee, price:null, desc:desc, isCashIn:true, rawType:type });
        continue;
      }

      var relevant = ['Buy','Sell','Reverse Split','Cash In Lieu','ADR Mgmt Fee','Margin Interest'];
      if (relevant.indexOf(type) === -1 && type.indexOf('Reverse') === -1){ skipped++; continue; }

      var symbol = (row[colMap.symbol]||'').toString().trim();
      var okTicker = /^[A-Z]{1,6}$/.test(symbol);
      if (!okTicker){
        var ex = extractSymbolFromDesc(desc);
        if (ex) symbol = ex; else { skipped++; continue; }
      }
      if (!symbol){ skipped++; continue; }

      events.push({ displayDate:pd.display, sortKey:pd.sortKey, symbol:symbol, type:type,
        shares:shares, amount:amount, fee:fee, price:price, desc:desc, isCashAsset:false });
    }
    console.log('✅ Parsed ' + events.length + ', skipped ' + skipped);
    return events;
  }

  /* ================= 核心计算 ================= */
  function processEvents(events){
    var accounts = {}, allTransactions = [];
    var totalFeesAll = 0, totalDeposits = 0, totalInterest = 0;

    events.forEach(function(e){
      if (e.isCashAsset){
        var symC = '💲 现金余额';
        if (!accounts[symC]){
          accounts[symC] = { shares:0, totalCost:0, avgCost:0, totalBuyCost:0,
            totalSellProceeds:0, realizedPL:0, isCash:true };
        }
        var accC = accounts[symC];
        accC.shares = 1;
        accC.totalCost += e.amount;
        accC.avgCost = accC.totalCost;
        accC.totalBuyCost += e.amount;
        allTransactions.push({ displayDate:e.displayDate, sortKey:e.sortKey, symbol:symC,
          type:'Cash Balance', shares:1, amount:e.amount, fee:0, price:null, desc:e.desc, pl:null, isCash:true });
        return;
      }
      if (e.isCashIn){
        var rt = e.type;
        if (rt === 'Wire Received' || rt === 'WIRE' || rt.indexOf('Wire') !== -1){
          totalDeposits += Math.abs(e.amount);
          allTransactions.push({ displayDate:e.displayDate, sortKey:e.sortKey, symbol:'💰 现金入金',
            type:'Wire Received', shares:0, amount:e.amount, fee:e.fee||0, price:null, desc:e.desc, pl:null });
        } else if (rt === 'Credit Interest'){
          totalInterest += Math.abs(e.amount);
          allTransactions.push({ displayDate:e.displayDate, sortKey:e.sortKey, symbol:'💵 现金分红',
            type:'Credit Interest', shares:0, amount:e.amount, fee:e.fee||0, price:null, desc:e.desc, pl:null });
        } else {
          totalDeposits += Math.abs(e.amount);
          allTransactions.push({ displayDate:e.displayDate, sortKey:e.sortKey, symbol:'💰 现金入金',
            type:'Wire Received', shares:0, amount:e.amount, fee:e.fee||0, price:null, desc:e.desc, pl:null });
        }
        return;
      }

      var sym = e.symbol;
      if (!sym) return;
      if (!accounts[sym]){
        accounts[sym] = { shares:0, totalCost:0, avgCost:0, totalBuyCost:0,
          totalSellProceeds:0, realizedPL:0, isCash:false };
      }
      var acc = accounts[sym];
      var type = e.type, shares = e.shares, amount = e.amount;
      var fee = e.fee || 0, price = e.price || null;
      var txnPl = null, costBasis = null, plPercent = null;

      if (fee !== 0) totalFeesAll += Math.abs(fee);

      if (type === 'Buy'){
        var bs = Math.abs(shares), bc = Math.abs(amount);
        if (bs > 0 && bc > 0){
          acc.shares += bs; acc.totalCost += bc; acc.totalBuyCost += bc;
          acc.avgCost = acc.shares > 0 ? acc.totalCost/acc.shares : 0;
        }
      } else if (type === 'Sell'){
        var ss = Math.abs(shares), spv = Math.abs(amount);
        if (ss > 0 && acc.shares > 0){
          var cps = acc.avgCost;
          costBasis = ss * cps;
          var pl = spv - costBasis;
          acc.realizedPL += pl;
          acc.totalSellProceeds += spv;
          acc.shares -= ss;
          acc.totalCost -= costBasis;
          acc.avgCost = acc.shares > 0 ? acc.totalCost/acc.shares : 0;
          txnPl = pl;
          plPercent = costBasis > 0 ? (pl/costBasis)*100 : 0;
        } else { txnPl = 0; costBasis = 0; plPercent = 0; }
      } else if (type === 'Reverse Split' || type.indexOf('Reverse') !== -1){
        if (shares !== 0){
          var ns = acc.shares + shares;
          if (ns > 0) acc.avgCost = acc.totalCost/ns;
          acc.shares = ns;
          if (acc.shares < 0) acc.shares = 0;
          if (acc.shares === 0) acc.avgCost = 0;
        }
      } else if (type === 'Cash In Lieu'){
        var cash = Math.abs(amount);
        if (cash > 0 && acc.shares > 0){
          acc.totalCost -= cash;
          acc.avgCost = acc.shares > 0 ? acc.totalCost/acc.shares : 0;
        }
      } else if (type === 'ADR Mgmt Fee' || type === 'Margin Interest'){
        var fa = Math.abs(amount);
        acc.totalCost += fa; acc.totalBuyCost += fa;
        acc.avgCost = acc.shares > 0 ? acc.totalCost/acc.shares : 0;
      }

      var keep = ['Buy','Sell','Reverse Split','Cash In Lieu','ADR Mgmt Fee','Margin Interest'];
      if (keep.indexOf(type) !== -1 || type.indexOf('Reverse') !== -1){
        var txn = { displayDate:e.displayDate, sortKey:e.sortKey, symbol:sym, type:type,
          shares:shares, amount:amount, fee:fee, price:price, desc:e.desc, pl:txnPl };
        if (type === 'Sell'){
          txn.costBasis = costBasis;
          txn.plPercent = plPercent;
          var absS = Math.abs(shares);
          txn.sellPricePerShare = absS > 0 ? Math.abs(amount)/absS : null;
          txn.costPerShare = (costBasis !== null && absS > 0) ? costBasis/absS : null;
        }
        allTransactions.push(txn);
      }
    });

    var result = [];
    Object.keys(accounts).forEach(function(sym){
      var acc = accounts[sym];
      if (acc.isCash || acc.shares > 0 || acc.totalBuyCost > 0){
        result.push({ symbol:sym, shares:acc.shares, totalCost:acc.totalCost, avgCost:acc.avgCost,
          totalBuyCost:acc.totalBuyCost, totalSellProceeds:acc.totalSellProceeds||0,
          realizedPL:acc.realizedPL||0, isCash:acc.isCash||false });
      }
    });
    return { results:result, allTransactions:allTransactions, totalFeesAll:totalFeesAll,
      totalDeposits:totalDeposits, totalInterest:totalInterest };
  }

  /* ================= 图表实例 & 主题色 ================= */
  var pieChart=null, barChart=null, lineChart=null, histogramChart=null;
  var valuationData = [];
  var lastProcessed = null;

  function themeColors(){
    var cs = getComputedStyle(root);
    function v(n){ return cs.getPropertyValue(n).trim(); }
    return {
      c1: v('--chart-1')||'#6d5dfc',
      c2: v('--chart-2')||'#4ecdc4',
      c3: v('--chart-3')||'#f29c6b',
      up: v('--state-ok')||'#35c7b3',
      down: v('--state-fail')||'#ef6b6b',
      text2: v('--text-2')||'#5b6270',
      text3: v('--text-3')||'#8f97a6',
      track: v('--track')||'rgba(184,188,194,.35)',
      solid: v('--bg')||'#e0e5ec'
    };
  }
  function alpha(hex, a){
    if (/^#[0-9a-fA-F]{6}$/.test(hex)){
      return hex + Math.round(a*255).toString(16).padStart(2,'0');
    }
    return hex;
  }

  /* ================= 渲染 ================= */
  function renderAll(data, silent, skipSave){
    var results = data.results, allTransactions = data.allTransactions;
    var totalFeesAll = data.totalFeesAll, totalDeposits = data.totalDeposits;
    lastProcessed = data;

    var content = document.getElementById('contentArea');
    var noMsg = document.getElementById('noDataMsg');
    if (allTransactions.length === 0){
      content.style.display = 'none';
      noMsg.style.display = 'block';
      if (!silent) showToast(T('toastEmpty'));
      return;
    }
    content.style.display = 'flex';
    noMsg.style.display = 'none';
    document.getElementById('exportBtn').style.display = 'inline-flex';

    if (!skipSave) saveDataCache(data);
    var TC = themeColors();

    /* ---- 统计值 ---- */
    var totalBuy=0, totalSell=0, totalPL=0;
    results.forEach(function(r){
      if (!r.isCash){ totalBuy += r.totalBuyCost; totalSell += r.totalSellProceeds; totalPL += r.realizedPL; }
    });
    document.getElementById('totalBuy').textContent = formatNum(totalBuy);
    document.getElementById('totalSell').textContent = formatNum(totalSell);
    var plEl = document.getElementById('realizedPL');
    plEl.textContent = formatNum(totalPL);
    plEl.className = 'kpi-value ' + (totalPL >= 0 ? 'positive' : 'negative');
    document.getElementById('totalFees').textContent = formatNum(totalFeesAll);
    document.getElementById('totalCashInflow').textContent = formatNum(totalDeposits);

    var cashHolding = results.find(function(r){ return r.isCash; });
    document.getElementById('cashBalance').textContent = formatNum(cashHolding ? cashHolding.totalCost : 0);

    var buyCount = allTransactions.filter(function(t){ return t.type === 'Buy'; }).length;
    var sellCount = allTransactions.filter(function(t){ return t.type === 'Sell'; }).length;
    document.getElementById('buyCountSub').textContent = fmt(T('buyCount'), { n: buyCount });
    document.getElementById('sellCountSub').textContent = fmt(T('sellCount'), { n: sellCount });

    var sellTxns = allTransactions.filter(function(t){ return t.type === 'Sell' && t.pl !== null; });
    var winTxns = sellTxns.filter(function(t){ return t.pl > 0.01; });
    var avgEl = document.getElementById('avgProfitPerWin');
    if (winTxns.length === 0){ avgEl.textContent = '—'; avgEl.className = 'kpi-value'; }
    else {
      var tw = winTxns.reduce(function(s,t){ return s + t.pl; }, 0);
      avgEl.textContent = formatNum(tw / winTxns.length);
      avgEl.className = 'kpi-value positive';
    }

    var pSum = sellTxns.filter(function(t){ return t.pl > 0; }).reduce(function(s,t){ return s + t.pl; }, 0);
    var lSum = sellTxns.filter(function(t){ return t.pl < 0; }).reduce(function(s,t){ return s + Math.abs(t.pl); }, 0);
    var pfEl = document.getElementById('profitFactor');
    if (lSum === 0) pfEl.textContent = pSum > 0 ? '∞' : '—';
    else pfEl.textContent = (pSum / lSum).toFixed(2);

    var wins = sellTxns.filter(function(t){ return t.pl > 0.01; }).length;
    var losses = sellTxns.filter(function(t){ return t.pl < -0.01; }).length;
    var totalSellTxns = wins + losses;
    document.getElementById('winRate').textContent =
      totalSellTxns > 0 ? (wins/totalSellTxns*100).toFixed(1) + '%' : '—';
    document.getElementById('winLossCount').textContent = fmt(T('winLossCount'), { w: wins, l: losses });

    /* ---- 最佳/最差 ---- */
    var withPL = allTransactions.filter(function(t){
      return t.type === 'Sell' && t.pl !== null && t.pl !== undefined && Math.abs(t.pl) > 0.001;
    });
    var bwContainer = document.getElementById('bestWorstCards');
    if (withPL.length === 0){
      bwContainer.innerHTML = '<div class="bw-empty">' + T('bestNone') + '</div>';
    } else {
      var sorted = withPL.slice().sort(function(a,b){ return b.pl - a.pl; });
      var best = sorted[0], worst = sorted[sorted.length-1];

      function cardHTML(t, kind){
        var plv = t.pl;
        var cls = plv >= 0 ? 'positive' : 'negative';
        var pct = (t.plPercent !== null && t.plPercent !== undefined) ? t.plPercent : 0;
        var date = t.displayDate || '—';
        var qty = Math.abs(t.shares).toFixed(0);
        var spv = '—';
        if (t.price !== null && t.price > 0) spv = formatNum(t.price, 4);
        else if (t.sellPricePerShare !== null && t.sellPricePerShare > 0) spv = formatNum(t.sellPricePerShare, 4);
        var fee = (t.fee !== undefined && t.fee !== 0) ? formatNum(Math.abs(t.fee), 2) : '—';
        var hl = kind === 'best' ? 'hl-green' : 'hl-red';
        var icon = kind === 'best' ? '🏆' : '💔';
        var label = kind === 'best' ? T('bestLabel') : T('worstLabel');
        return '<div class="bw-card ' + kind + '">' +
          '<div class="bw-header"><span class="icon">' + icon + '</span> ' + label + '</div>' +
          '<div class="bw-symbol">' + t.symbol + '</div>' +
          '<div class="bw-pl-row">' +
            '<span class="bw-pl ' + cls + '">' + (plv>=0?'+':'') + '$' + formatNum(plv) + '</span>' +
            '<span class="bw-pl-percent ' + cls + '">' + (pct>=0?'+':'') + pct.toFixed(2) + '%</span>' +
          '</div>' +
          '<div class="bw-details">' +
            '<span class="detail-item"><span class="label">' + T('lblDate') + '</span> <span class="value">' + date + '</span></span>' +
            '<span class="detail-item"><span class="label">' + T('lblSellPrice') + '</span> <span class="value ' + hl + '">$' + spv + '</span></span>' +
            '<span class="detail-item"><span class="label">' + T('lblFee') + '</span> <span class="value">$' + fee + '</span></span>' +
            '<span class="detail-item"><span class="label">' + T('lblQty') + '</span> <span class="value">' + qty + '</span></span>' +
          '</div></div>';
      }
      bwContainer.innerHTML = cardHTML(best, 'best') + cardHTML(worst, 'worst');
    }

    /* ---- TOP5 ---- */
    var sellWithPL = allTransactions.filter(function(t){
      return t.type === 'Sell' && t.pl !== null && t.pl !== undefined && Math.abs(t.pl) > 0.001;
    });
    var winners = sellWithPL.filter(function(t){ return t.pl > 0; })
      .sort(function(a,b){ return b.pl - a.pl; });
    var losers = sellWithPL.filter(function(t){ return t.pl < 0; })
      .sort(function(a,b){ return a.pl - b.pl; });

    var wh = winners.slice(0,5).map(function(t){
      return '<tr><td class="symbol">'+t.symbol+'</td><td class="amount positive">+'+formatNum(t.pl)+'</td></tr>';
    }).join('');
    document.getElementById('topWinners').innerHTML =
      '<table class="rank-table"><thead><tr><th>'+T('colSymbol')+'</th><th style="text-align:right;">'+T('colPL')+'</th></tr></thead><tbody>'
      + (wh || '<tr class="empty-row"><td colspan="2">'+T('noProfit')+'</td></tr>') + '</tbody></table>';

    var lh = losers.slice(0,5).map(function(t){
      return '<tr><td class="symbol">'+t.symbol+'</td><td class="amount negative">'+formatNum(t.pl)+'</td></tr>';
    }).join('');
    document.getElementById('topLosers').innerHTML =
      '<table class="rank-table"><thead><tr><th>'+T('colSymbol')+'</th><th style="text-align:right;">'+T('colPL')+'</th></tr></thead><tbody>'
      + (lh || '<tr class="empty-row"><td colspan="2">'+T('noLoss')+'</td></tr>') + '</tbody></table>';

    /* ---- 图表 ---- */
    try {
      if (typeof Chart !== 'undefined'){

        var hasAssets = results.filter(function(r){ return r.shares > 0.01 || r.isCash; });
        var priceCachePie = loadPriceCache();
        var assetsWithValue = hasAssets.map(function(r){
          var mv = r.totalCost;
          if (!r.isCash){
            var p = priceCachePie && priceCachePie[r.symbol] ? priceCachePie[r.symbol] : null;
            if (p !== null && !isNaN(p) && p >= 0) mv = r.shares * p;
          }
          return Object.assign({}, r, { marketValue: mv });
        }).sort(function(a,b){ return b.marketValue - a.marketValue; });
        var top9 = assetsWithValue.slice(0, 9);
        var pieLabels = top9.map(function(r){ return r.isCash ? T('cashBalance') : r.symbol; });
        var pieValues = top9.map(function(r){ return r.marketValue; });
        var pieColors = [
          TC.c1, TC.c2, TC.c3,
          alpha(TC.c1,.72), alpha(TC.c2,.72), alpha(TC.c3,.72),
          alpha(TC.c1,.45), alpha(TC.c2,.45), alpha(TC.c3,.45)
        ];
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(document.getElementById('pieChart').getContext('2d'), {
          type: 'doughnut',
          data: { labels: pieLabels, datasets: [{ data: pieValues, backgroundColor: pieColors, borderColor: TC.solid, borderWidth: 2 }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: TC.text2, boxWidth: 12, padding: 10 } } } }
        });

        var barData = results.filter(function(r){ return !r.isCash && Math.abs(r.realizedPL) > 0.01; })
          .sort(function(a,b){ return b.realizedPL - a.realizedPL; });
        if (barChart) barChart.destroy();
        barChart = new Chart(document.getElementById('barChart').getContext('2d'), {
          type: 'bar',
          data: {
            labels: barData.map(function(d){ return d.symbol; }),
            datasets: [{
              label: T('chartRealized'),
              data: barData.map(function(d){ return d.realizedPL; }),
              backgroundColor: barData.map(function(d){ return d.realizedPL >= 0 ? TC.up : TC.down; }),
              borderRadius: 4, barPercentage: .55, categoryPercentage: .72
            }]
          },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { color: TC.text3 }, grid: { color: TC.track } },
                      x: { ticks: { color: TC.text2 }, grid: { display: false } } } }
        });

        var monthMap = {};
        allTransactions.forEach(function(t){
          if (t.type === 'Sell' && t.pl !== null && t.displayDate){
            var parts = t.displayDate.split('/');
            if (parts.length === 3){
              var key = parts[2] + '-' + parts[0].padStart(2,'0');
              if (!monthMap[key]) monthMap[key] = 0;
              monthMap[key] += t.pl;
            }
          }
        });
        var months = Object.keys(monthMap).sort();
        var lineVals = months.map(function(m){ return monthMap[m]; });
        var canvas = document.getElementById('lineChart');
        var wrap = document.getElementById('lineChartWrap');
        if (lineChart) lineChart.destroy();

        if (months.length > 12){
          var tw2 = months.length * 55;
          canvas.style.width = tw2 + 'px';
          canvas.style.height = '100%';
          canvas.width = tw2;
          wrap.style.overflowX = 'auto';
          wrap.style.overflowY = 'hidden';
          lineChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: months, datasets: [{
              label: T('chartMonthly'), data: lineVals,
              borderColor: TC.c1, backgroundColor: alpha(TC.c1,.15),
              fill: true, tension: .3,
              pointBackgroundColor: lineVals.map(function(v){ return v >= 0 ? TC.up : TC.down; }),
              pointBorderColor: lineVals.map(function(v){ return v >= 0 ? TC.up : TC.down; }),
              pointRadius: 4, borderWidth: 2
            }]},
            options: { responsive: false, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { ticks: { color: TC.text3 }, grid: { color: TC.track } },
                        x: { ticks: { color: TC.text2, maxRotation: 30 }, grid: { display: false } } } }
          });
        } else {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.removeAttribute('width');
          wrap.style.overflowX = 'hidden';
          wrap.style.overflowY = 'hidden';
          if (months.length > 0){
            lineChart = new Chart(canvas.getContext('2d'), {
              type: 'line',
              data: { labels: months, datasets: [{
                label: T('chartMonthly'), data: lineVals,
                borderColor: TC.c1, backgroundColor: alpha(TC.c1,.15),
                fill: true, tension: .3,
                pointBackgroundColor: lineVals.map(function(v){ return v >= 0 ? TC.up : TC.down; }),
                pointBorderColor: lineVals.map(function(v){ return v >= 0 ? TC.up : TC.down; }),
                pointRadius: 4, borderWidth: 2
              }]},
              options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { color: TC.text3 }, grid: { color: TC.track } },
                          x: { ticks: { color: TC.text2, maxRotation: 30 }, grid: { display: false } } } }
            });
          }
        }

        try {
          var ctxH = document.getElementById('histogramChart').getContext('2d');
          if (histogramChart) histogramChart.destroy();
          var plValues = allTransactions.filter(function(t){
            return t.type === 'Sell' && t.pl !== null && t.pl !== undefined && isFinite(t.pl);
          }).map(function(t){ return t.pl; });
          var statsSpan = document.getElementById('histogramStats');

          if (plValues.length === 0){
            histogramChart = new Chart(ctxH, {
              type: 'bar',
              data: { labels: [T('histNoData')], datasets: [{ data: [0], backgroundColor: TC.track }] },
              options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { display: false }, x: { ticks: { color: TC.text3 } } } }
            });
            statsSpan.textContent = T('histNoData');
          } else {
            var maxAbs = Math.max.apply(null, plValues.map(Math.abs));
            var step = 2000;
            while (step * 5 < maxAbs) step += 2000;

            var leftBins = [], rightBins = [];
            for (var i=1;i<=5;i++){
              leftBins.push({ lower:(i-1)*step, upper:i*step });
              rightBins.push({ lower:-(i*step), upper:-((i-1)*step) });
            }
            var leftCounts = leftBins.map(function(b){
              if (b.lower === 0) return plValues.filter(function(v){ return v > 0 && v <= b.upper; }).length;
              return plValues.filter(function(v){ return v > b.lower && v <= b.upper; }).length;
            });
            var zeroCount = plValues.filter(function(v){ return v === 0; }).length;
            var rightCounts = rightBins.map(function(b){
              if (b.upper === 0) return plValues.filter(function(v){ return v >= b.lower && v < 0; }).length;
              return plValues.filter(function(v){ return v >= b.lower && v < b.upper; }).length;
            });
            var leftHeights = leftBins.map(function(b, idx){ return leftCounts[idx] > 0 ? (idx+1)*step : 0; });
            var rightHeights = rightBins.map(function(b, idx){ return rightCounts[idx] > 0 ? (idx+1)*step : 0; });

            var allLabels=[], allAmounts=[], allCounts=[], allColors=[];
            for (var li=leftBins.length-1; li>=0; li--){
              var lb = leftBins[li];
              allLabels.push(lb.lower === 0 ? ('0 ~ '+lb.upper) : (lb.lower+' ~ '+lb.upper));
              allAmounts.push(leftHeights[li]);
              allCounts.push(leftCounts[li]);
              allColors.push(TC.up);
            }
            allLabels.push('0'); allAmounts.push(0); allCounts.push(zeroCount); allColors.push(TC.text3);
            for (var ri=0; ri<=4; ri++){
              var rb = rightBins[ri];
              allLabels.push(rb.upper === 0 ? ('0 ~ '+rb.lower) : (rb.upper+' ~ '+rb.lower));
              allAmounts.push(rightHeights[ri]);
              allCounts.push(rightCounts[ri]);
              allColors.push(TC.down);
            }

            var totalSamples = plValues.length;
            var sumPL = plValues.reduce(function(a,b){ return a+b; }, 0);
            var mean = sumPL / totalSamples;
            var sortedPL = plValues.slice().sort(function(a,b){ return a-b; });
            var median = totalSamples % 2 === 0
              ? (sortedPL[totalSamples/2-1] + sortedPL[totalSamples/2]) / 2
              : sortedPL[Math.floor(totalSamples/2)];
            var posCount = plValues.filter(function(v){ return v > 0; }).length;
            var negCount = plValues.filter(function(v){ return v < 0; }).length;

            statsSpan.innerHTML =
              T('histMean')+': <strong style="color:'+(mean>=0?TC.up:TC.down)+'">$'+mean.toFixed(2)+'</strong> | '+
              T('histMedian')+': <strong style="color:'+(median>=0?TC.up:TC.down)+'">$'+median.toFixed(2)+'</strong> | '+
              T('histSample')+': '+totalSamples+' '+T('histCount')+
              ' ('+T('histProfit')+' '+posCount+' / '+T('histLoss')+' '+negCount+') | '+
              T('histStep')+': $'+step;

            var labelsPlugin = {
              id: 'customDataLabels',
              afterDraw: function(chart){
                var ctx = chart.ctx, bars = chart.getDatasetMeta(0).data;
                bars.forEach(function(bar, index){
                  var val = allCounts[index];
                  if (!val) return;
                  ctx.save();
                  ctx.fillStyle = TC.text2;
                  ctx.font = 'bold 12px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'bottom';
                  ctx.fillText(val, bar.x, bar.y - 4);
                  ctx.restore();
                });
              }
            };

            histogramChart = new Chart(ctxH, {
              type: 'bar',
              data: { labels: allLabels, datasets: [{
                label: T('histogramTitle'), data: allAmounts,
                backgroundColor: allColors, borderColor: allColors, borderWidth: 1,
                borderRadius: 4, barPercentage: .6, categoryPercentage: .6
              }]},
              options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 20 } },
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: function(ctx){
                    var idx = ctx.dataIndex;
                    return ' ' + T('histCount') + ': ' + (allCounts[idx]||0) + ' · ' + (allLabels[idx]||'');
                  }}}
                },
                scales: {
                  y: { beginAtZero: true,
                       ticks: { color: TC.text3, callback: function(v){ return '$'+Number(v).toFixed(0); } },
                       grid: { color: TC.track } },
                  x: { ticks: { color: TC.text2, maxRotation: 45, font: { size: 12 } }, grid: { display: false } }
                }
              },
              plugins: [labelsPlugin]
            });
          }
        } catch (he){ console.warn('Histogram error:', he); }
      }
    } catch (ce){ console.warn('Chart render error:', ce); }

    /* ---- 交易流水 ---- */
    var filterSymbol = document.getElementById('filterSymbol');
    var filterType = document.getElementById('filterType');
    var searchInput = document.getElementById('searchInput');
    var prevSym = filterSymbol.value, prevType = filterType.value;

    var symbols = [];
    results.forEach(function(r){
      var s = r.symbol;
      if (s !== '💲 现金余额' && s.indexOf('现金入金') === -1 && s.indexOf('现金分红') === -1){
        if (symbols.indexOf(s) === -1) symbols.push(s);
      }
    });
    symbols.sort();
    filterSymbol.innerHTML = '<option value="ALL">'+T('filterAllAssets')+'</option>';
    symbols.forEach(function(s){ filterSymbol.innerHTML += '<option value="'+s+'">'+s+'</option>'; });
    if (results.some(function(r){ return r.isCash; })){
      filterSymbol.innerHTML += '<option value="💲 现金余额">'+T('cashBalance')+'</option>';
    }
    if (prevSym && filterSymbol.querySelector('option[value="'+prevSym+'"]')) filterSymbol.value = prevSym;
    if (prevType) filterType.value = prevType;

    function typeLabel(t){
      var m = { 'Buy':T('typeBuy'), 'Sell':T('typeSell'), 'Reverse Split':T('typeSplit'),
        'Cash In Lieu':T('typeCashInLieu'), 'ADR Mgmt Fee':T('typeAdrFee'), 'Margin Interest':T('typeMargin'),
        'Wire Received':T('typeWire'), 'Credit Interest':T('typeInterest'), 'Cash Balance':T('typeCashBalance') };
      return m[t] || t;
    }
    function symLabel(s){
      if (s === '💲 现金余额') return T('cashBalance');
      if (s === '💰 现金入金') return T('cashIn');
      if (s === '💵 现金分红') return T('cashDiv');
      return s;
    }

    function renderTable(){
      var filtered = allTransactions.slice();
      var symF = filterSymbol.value, typeF = filterType.value;
      var q = searchInput.value.trim().toLowerCase();

      if (symF !== 'ALL') filtered = filtered.filter(function(t){ return t.symbol === symF; });
      if (typeF !== 'ALL'){
        if (typeF === 'Cash Balance') filtered = filtered.filter(function(t){ return t.type === 'Cash Balance'; });
        else if (typeF === 'Wire Received') filtered = filtered.filter(function(t){ return t.type === 'Wire Received'; });
        else if (typeF === 'Credit Interest') filtered = filtered.filter(function(t){ return t.type === 'Credit Interest'; });
        else filtered = filtered.filter(function(t){
          return t.type === typeF || (typeF === 'Reverse Split' && t.type.indexOf('Reverse') !== -1);
        });
      }
      if (q) filtered = filtered.filter(function(t){
        return (t.desc||'').toLowerCase().indexOf(q) !== -1 || t.symbol.toLowerCase().indexOf(q) !== -1;
      });
      filtered.sort(function(a,b){
        var ka = (a.sortKey !== null && a.sortKey !== undefined) ? a.sortKey : 0;
        var kb = (b.sortKey !== null && b.sortKey !== undefined) ? b.sortKey : 0;
        return kb - ka;
      });

      var html = '';
      filtered.forEach(function(t){
        var cls = 'tag';
        if (t.type === 'Buy') cls += ' tag-buy';
        else if (t.type === 'Sell') cls += ' tag-sell';
        else if (t.type.indexOf('Reverse') !== -1) cls += ' tag-split';
        else if (t.type === 'Wire Received') cls += ' tag-deposit';
        else if (t.type === 'Credit Interest') cls += ' tag-interest';
        else if (t.type === 'Cash Balance' || t.type === 'Cash') cls += ' tag-cash';
        else if (t.type === 'ADR Mgmt Fee' || t.type === 'Margin Interest') cls += ' tag-fee';
        else cls += ' tag-other';

        var plStr = (t.pl !== null && t.pl !== undefined) ? formatNum(t.pl) : '—';
        var plCls = (t.pl !== null && t.pl !== undefined)
          ? (t.pl >= 0 ? 'amount-positive' : 'amount-negative') : 'text-muted';

        html += '<tr>' +
          '<td>'+ (t.displayDate||'') +'</td>' +
          '<td><span class="'+cls+'">'+typeLabel(t.type)+'</span></td>' +
          '<td><span class="symbol-badge">'+symLabel(t.symbol)+'</span></td>' +
          '<td title="'+((t.desc||'').replace(/"/g,'&quot;'))+'">'+(t.desc||'')+'</td>' +
          '<td style="text-align:right;">'+ (t.shares !== 0 ? t.shares.toFixed(0) : '—') +'</td>' +
          '<td style="text-align:right;">'+ (t.amount !== 0 ? formatNum(t.amount) : '—') +'</td>' +
          '<td style="text-align:right;">'+ (t.fee !== 0 ? formatNum(t.fee) : '—') +'</td>' +
          '<td style="text-align:right;font-weight:650;" class="'+plCls+'">'+plStr+'</td>' +
        '</tr>';
      });
      document.getElementById('detailBody').innerHTML = html ||
        '<tr><td colspan="8" class="text-center text-muted" style="padding:30px 0;">'+T('noMatch')+'</td></tr>';
      document.getElementById('tableCount').textContent = fmt(T('tableCount'), { n: filtered.length });
    }
    filterSymbol.onchange = renderTable;
    filterType.onchange = renderTable;
    searchInput.oninput = renderTable;
    renderTable();

    /* ---- 导出 ---- */
    document.getElementById('exportBtn').onclick = function(){
      var txs = allTransactions;
      if (txs.length === 0){ showToast(T('toastNoData')); return; }
      var headers = ['Date','Type','Symbol','Description','Shares','Price','Fee','Amount'];
      var rows = txs.map(function(t){
        var desc = (t.desc||'').replace(/,/g,';');
        var shares = (t.shares!==undefined && t.shares!==null && t.shares!==0) ? t.shares.toFixed(0) : '';
        var price = (t.price!==null && t.price!==undefined && !isNaN(t.price)) ? t.price.toFixed(4) : '';
        var fee = (t.fee!==undefined && t.fee!==null && t.fee!==0) ? t.fee.toFixed(2) : '';
        var amount = (t.amount!==undefined && t.amount!==null && t.amount!==0) ? t.amount.toFixed(2) : '';
        return [t.displayDate||'', t.type||'', t.symbol||'', desc, shares, price, fee, amount];
      });
      var sumA=0, sumF=0;
      txs.forEach(function(t){ sumA += (t.amount||0); sumF += (t.fee||0); });
      rows.push(['Total','','','','','',formatNum(sumF),formatNum(sumA)]);
      var csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(function(r){ return r.join(','); }).join('\n');
      var blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Schwab_Transactions_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(fmt(T('toastExported'), { n: txs.length }));
    };

    /* ---- 估值表 ---- */
    var valBody = document.getElementById('valuationBody');
    var stockHoldings = results.filter(function(r){ return !r.isCash && r.shares > 0.01; });
    var cashH2 = results.find(function(r){ return r.isCash; });
    var priceCache = loadPriceCache();

    valuationData = [];
    stockHoldings.forEach(function(h){
      var cp = priceCache[h.symbol];
      var ip = (cp !== undefined && cp !== null && !isNaN(cp) && cp >= 0) ? cp : null;
      valuationData.push({
        symbol:h.symbol, shares:h.shares, avgCost:h.avgCost, totalCost:h.totalCost,
        isCash:false, price:ip,
        marketValue:(ip !== null) ? h.shares*ip : h.totalCost,
        unrealizedPL:0, plPercent:0, allocation:0
      });
    });
    if (cashH2){
      valuationData.push({
        symbol:'💲 现金余额', shares:1, avgCost:cashH2.totalCost, totalCost:cashH2.totalCost,
        isCash:true, price:cashH2.totalCost, marketValue:cashH2.totalCost,
        unrealizedPL:0, plPercent:0, allocation:0
      });
    }

    function updateSummary(totalMV){
      var tp=0, tc=0, smv=0, cmv=0;
      valuationData.forEach(function(it){
        tp += it.unrealizedPL; tc += it.totalCost;
        if (it.isCash) cmv += it.marketValue; else smv += it.marketValue;
      });
      document.getElementById('totalMarketValue').textContent = formatNum(totalMV);
      var upEl = document.getElementById('totalUnrealizedPL');
      upEl.textContent = (tp>=0?'+':'') + formatNum(tp);
      upEl.className = 'vs-value ' + (tp>=0 ? 'positive' : 'negative');
      var pct = tc > 0 ? (tp/tc)*100 : 0;
      var pctEl = document.getElementById('totalPLPercent');
      pctEl.textContent = pct.toFixed(2) + '%';
      pctEl.className = 'vs-value ' + (pct>=0 ? 'positive' : 'negative');
      document.getElementById('stockAllocation').textContent = (totalMV>0 ? (smv/totalMV)*100 : 0).toFixed(2) + '%';
      document.getElementById('cashAllocation').textContent = (totalMV>0 ? (cmv/totalMV)*100 : 0).toFixed(2) + '%';
    }

    function updateValues(){
      var totalMV = 0, missing = false;
      valuationData.forEach(function(it){
        if (!it.isCash){
          if (it.price !== null && !isNaN(it.price) && it.price >= 0) it.marketValue = it.shares * it.price;
          else { it.marketValue = it.totalCost; missing = true; }
          it.unrealizedPL = it.marketValue - it.totalCost;
          it.plPercent = it.totalCost > 0 ? (it.unrealizedPL/it.totalCost)*100 : 0;
        } else { it.marketValue = it.totalCost; it.unrealizedPL = 0; it.plPercent = 0; }
        totalMV += it.marketValue;
      });
      valuationData.forEach(function(it){ it.allocation = totalMV>0 ? (it.marketValue/totalMV)*100 : 0; });

      document.getElementById('totalEquity').textContent = formatNum(totalMV);
      var es = document.getElementById('equitySub');
      if (missing){ es.textContent = T('kpiEquitySubWarn'); es.className = 'kpi-sub warning'; }
      else { es.textContent = T('kpiEquitySub'); es.className = 'kpi-sub'; }

      valBody.querySelectorAll('tr').forEach(function(row, idx){
        if (idx >= valuationData.length) return;
        var it = valuationData[idx];
        var cells = row.querySelectorAll('td');
        if (cells.length >= 8){
          cells[4].textContent = formatNum(it.marketValue);
          var pl = it.unrealizedPL;
          cells[5].textContent = (pl>=0?'+':'') + formatNum(pl);
          cells[5].className = (pl>=0 ? 'amount-positive' : 'amount-negative');
          cells[6].textContent = it.plPercent.toFixed(2) + '%';
          cells[6].className = (pl>=0 ? 'amount-positive' : 'amount-negative');
          cells[7].textContent = it.allocation.toFixed(2) + '%';
        }
      });
      updateSummary(totalMV);
    }

    function renderValuation(){
      var totalMV = 0, missing = false;
      valuationData.forEach(function(it){
        if (!it.isCash){
          if (it.price !== null && !isNaN(it.price) && it.price >= 0) it.marketValue = it.shares * it.price;
          else { it.marketValue = it.totalCost; missing = true; }
          it.unrealizedPL = it.marketValue - it.totalCost;
          it.plPercent = it.totalCost > 0 ? (it.unrealizedPL/it.totalCost)*100 : 0;
        } else { it.marketValue = it.totalCost; it.unrealizedPL = 0; it.plPercent = 0; }
        totalMV += it.marketValue;
      });
      valuationData.forEach(function(it){ it.allocation = totalMV>0 ? (it.marketValue/totalMV)*100 : 0; });

      document.getElementById('totalEquity').textContent = formatNum(totalMV);
      var es = document.getElementById('equitySub');
      if (missing){ es.textContent = T('kpiEquitySubWarn'); es.className = 'kpi-sub warning'; }
      else { es.textContent = T('kpiEquitySub'); es.className = 'kpi-sub'; }

      var html = '';
      valuationData.forEach(function(it, idx){
        var isC = it.isCash;
        var dispSym = isC ? T('cashBalance') : it.symbol;
        var sh = isC ? '—' : it.shares.toFixed(0);
        var ac = isC ? '—' : formatNum(it.avgCost);
        var pv = isC ? it.totalCost : (it.price !== null ? it.price : '');
        var pd = isC ? 'disabled' : '';
        var pl = it.unrealizedPL;
        var plc = pl >= 0 ? 'amount-positive' : 'amount-negative';
        html += '<tr data-idx="'+idx+'">' +
          '<td><strong>'+dispSym+'</strong></td>' +
          '<td>'+sh+'</td>' +
          '<td>'+ac+'</td>' +
          '<td><input type="number" step="any" min="0" class="price-input" data-idx="'+idx+'" value="'+pv+'" '+pd+' /></td>' +
          '<td>'+formatNum(it.marketValue)+'</td>' +
          '<td class="'+plc+'">'+ (pl>=0?'+':'') + formatNum(pl) +'</td>' +
          '<td class="'+plc+'">'+ it.plPercent.toFixed(2) +'%</td>' +
          '<td>'+ it.allocation.toFixed(2) +'%</td>' +
        '</tr>';
      });
      valBody.innerHTML = html ||
        '<tr><td colspan="8" class="text-center text-muted" style="padding:26px 0;">'+T('noHoldings')+'</td></tr>';

      valBody.querySelectorAll('.price-input').forEach(function(inp){
        inp.addEventListener('input', function(){
          var idx = parseInt(this.dataset.idx, 10);
          if (isNaN(idx) || idx < 0 || idx >= valuationData.length) return;
          var it = valuationData[idx];
          if (it.isCash) return;
          var v = parseFloat(this.value);
          it.price = (!isNaN(v) && v >= 0) ? v : null;
          var pm = loadPriceCache();
          if (it.price !== null) pm[it.symbol] = it.price; else delete pm[it.symbol];
          savePriceCache(pm);
          updateValues();
        });
      });
      updateSummary(totalMV);
    }
    renderValuation();

    var allAssets = results.filter(function(r){
      return (r.shares > 0.01) || (r.isCash && r.totalCost > 0.01);
    });
    if (!silent) showToast(fmt(T('toastLoaded'), { a: allTransactions.length, b: allAssets.length }));
  }

  /* ================= 文件处理 ================= */
  var fileInput = document.getElementById('fileInput');
  var uploadArea = document.getElementById('uploadArea');
  var fileName = document.getElementById('fileName');

  function handleFile(file){
    var reader = new FileReader();
    reader.onload = function(e){
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type:'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
        if (rows.length < 3){ showToast(T('toastFileEmpty')); return; }
        var events = parseSchwabData(rows);
        if (events.length === 0){ showToast(T('toastEmpty')); return; }
        var processed = processEvents(events);
        clearPriceCache();
        renderAll(processed);
        fileName.textContent = '📎 ' + file.name;
      } catch (err){
        console.error('Parse error:', err);
        showToast(T('toastParseErr') + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', function(e){
    var f = e.target.files[0];
    if (f) handleFile(f);
    this.value = '';
  });
  uploadArea.addEventListener('dragover', function(e){ e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', function(){ uploadArea.classList.remove('dragover'); });
  uploadArea.addEventListener('drop', function(e){
    e.preventDefault(); uploadArea.classList.remove('dragover');
    var f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  uploadArea.addEventListener('click', function(e){
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') fileInput.click();
  });

  document.getElementById('resetBtn').addEventListener('click', function(){
    if (confirm(T('toastReset'))){
      Promise.resolve(clearAllCache())
        .then(function(){ location.reload(); })
        .catch(function(){ location.reload(); });
    }
  });

  /* ================= 语言切换 ================= */
  function refresh(){ if (lastProcessed) renderAll(lastProcessed, true, true); }

  function setLang(next){
    lang = next; prefs.lang = next;
    root.setAttribute('lang', next === 'zh' ? 'zh-CN' : 'en');
    var d = DICT[next] || DICT.zh;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var v = d[el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
      var v = d[el.dataset.i18nPh];
      if (v !== undefined) el.setAttribute('placeholder', v);
    });
    document.querySelectorAll('#langSeg button').forEach(function(b){
      b.setAttribute('aria-pressed', String(b.dataset.lang === next));
    });
    renderModal(); savePrefs(); refresh();
  }

  document.querySelectorAll('#langSeg button').forEach(function(b){
    b.addEventListener('click', function(){ setLang(b.dataset.lang); });
  });

  /* ================= 导航胶囊 + 滚动高亮 ================= */
  function scrollToId(id){
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  document.querySelectorAll('[data-scroll]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var id = btn.dataset.scroll;
      if (!id) return;
      scrollToId(id);
      document.querySelectorAll('.pill').forEach(function(b){ b.classList.remove('active'); });
      var matched = document.querySelector('.pill[data-scroll="' + id + '"]');
      if (matched) matched.classList.add('active');
      closeDrawer();
    });
  });

  var navProgress = document.getElementById('navProgress');
  function updateProgress(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (navProgress) navProgress.style.width = p + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive:true });
  updateProgress();

  var sections = ['secOverview','secHistogram','secMonthly','secValuation'];
  if (typeof IntersectionObserver !== 'undefined'){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var id = en.target.id;
        document.querySelectorAll('.pill').forEach(function(b){
          b.classList.toggle('active', b.dataset.scroll === id);
        });
      });
    }, { rootMargin:'-40% 0px -55% 0px' });
    sections.forEach(function(id){
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ================= 启动 ================= */
  setLang(prefs.lang);

  loadDataCache().then(function(cached){
    if (cached){
      renderAll(cached, true, true);
      fileName.textContent = T('toastFromCache');
      document.getElementById('contentArea').style.display = 'flex';
      document.getElementById('noDataMsg').style.display = 'none';
      document.getElementById('exportBtn').style.display = 'inline-flex';
    } else {
      document.getElementById('noDataMsg').style.display = 'block';
      document.getElementById('contentArea').style.display = 'none';
      document.getElementById('exportBtn').style.display = 'none';
    }
  }).catch(function(err){
    console.warn('启动读取缓存失败：', err);
    document.getElementById('noDataMsg').style.display = 'block';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('exportBtn').style.display = 'none';
  });

  console.log('✅ Schwab dashboard ready');
})();