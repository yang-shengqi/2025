(function () {
    'use strict';

    var root = document.documentElement;
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    function isEn() { return root.getAttribute('lang') === 'en'; }
    function t(zh, en) { return isEn() ? en : zh; }

    /* ============================================================
     * 读取代码容器内容
     * 去掉开头和结尾的空行，中间内容原样保留
     * ============================================================ */
    function readCode(id) {
        var el = document.getElementById(id);
        if (!el) return '';
        return el.textContent.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    }

    /* ========== 语言 ========== */
    var langBtn = document.getElementById('langBtn');
    var TITLES = {
        zh: '杨氏家族全天候永久投资组合 · A股量化工作台',
        en: 'Yang Family All-Weather Permanent Portfolio · A-Share Quant Workbench'
    };
    function applyLang(lang) {
        var en = (lang === 'en');
        root.setAttribute('lang', en ? 'en' : 'zh-CN');
        document.title = en ? TITLES.en : TITLES.zh;
    }
    applyLang(store.get('cn-qw-lang') || 'zh-CN');
    if (langBtn) langBtn.addEventListener('click', function () {
        var next = (root.getAttribute('lang') === 'zh-CN') ? 'en' : 'zh-CN';
        applyLang(next); store.set('cn-qw-lang', next);
    });

    /* ========== Toast ========== */
    var toastEl = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    var toastTimer = null;
    function showToast(msg) {
        if (toastTimer) clearTimeout(toastTimer);
        toastMsg.textContent = msg || t('已复制到剪贴板', 'Copied to clipboard');
        toastEl.classList.add('cn-qw-show');
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('cn-qw-show');
            toastTimer = null;
        }, 2000);
    }

    /* ========== 复制 ========== */
    function copyText(text, btn) {
        function done() {
            if (btn) {
                document.querySelectorAll('.cn-qw-btn-copy').forEach(function (b) {
                    b.classList.remove('cn-qw-copied');
                });
                btn.classList.add('cn-qw-copied');
                var html = btn.innerHTML;
                btn.innerHTML = '✅ <span>' + t('已复制', 'Copied') + '</span>';
                setTimeout(function () {
                    btn.classList.remove('cn-qw-copied');
                    btn.innerHTML = html;
                }, 1800);
            }
            showToast(t('✅ 代码已复制到剪贴板', '✅ Code copied to clipboard'));
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
        } else {
            legacyCopy(text, done);
        }
    }
    function legacyCopy(text, done) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done();
        } catch (e) {
            console.error(e);
            showToast(t('❌ 复制失败，请手动选中复制', '❌ Copy failed'));
        }
    }
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.cn-qw-btn-copy');
        if (!btn) return;
        var id = btn.getAttribute('data-target');
        var ta = document.getElementById(id);
        if (!ta) { showToast(t('⚠️ 找不到文本域', '⚠️ Textarea not found')); return; }
        copyText(ta.value, btn);
    });

    /* ============================================================
     * 手风琴数据
     * codeId 对应页面底部 <script type="text/plain" id="..."> 的 id
     * ============================================================ */
    var groupsData = [
        {
            titleZh: '📄 量化全局因子库', titleEn: '📄 Global Factor Library',
            collapsible: false,
            panels: [{
                titleZh: '因子.tn6（ 禁止改名 ）',
                titleEn: 'Factor.tn6 (do not rename)',
                codeId: 'code-factor'
            }]
        },
        {
            titleZh: '⚙️ 量化分时系统', titleEn: '⚙️ Intraday Quant System',
            collapsible: true,
            panels: [
                { titleZh: '分时系统：分时主图.tn6', titleEn: 'Intraday: Main Chart.tn6',
                  codeId: 'code-intraday-main' },
                { titleZh: '分时系统：资金副图.tn6', titleEn: 'Intraday: Capital Sub Chart.tn6',
                  codeId: 'code-intraday-capital' },
                { titleZh: '分时系统：趋势副图.tn6', titleEn: 'Intraday: Trend Sub Chart.tn6',
                  codeId: 'code-intraday-trend' }
            ]
        },
        {
            titleZh: '🚀 量化选股器', titleEn: '🚀 Quant Stock Screener',
            collapsible: true,
            panels: [
                { titleZh: '选股器：基础选股器1.tn6',       titleEn: 'Base Screener 1.tn6',
                  codeId: 'code-scr-1' },
                { titleZh: '选股器：小多选股器2.tn6',       titleEn: 'Minor-Long Screener 2.tn6',
                  codeId: 'code-scr-2' },
                { titleZh: '选股器：中多选股器3.tn6',       titleEn: 'Mid-Long Screener 3.tn6',
                  codeId: 'code-scr-3' },
                { titleZh: '选股器：大多选股器4.tn6',       titleEn: 'Major-Long Screener 4.tn6',
                  codeId: 'code-scr-4' },
                { titleZh: '选股器：超多选股器5.tn6',       titleEn: 'Super-Long Screener 5.tn6',
                  codeId: 'code-scr-5' },
                { titleZh: '选股器：全多选股器6.tn6',       titleEn: 'Full-Long Screener 6.tn6',
                  codeId: 'code-scr-6' },
                { titleZh: '选股器：今全多选股器7.tn6',     titleEn: 'Today Full-Long 7.tn6',
                  codeId: 'code-scr-7' },
                { titleZh: '选股器：股息率>5%选股器8.tn6',  titleEn: 'Dividend > 5% Screener 8.tn6',
                  codeId: 'code-scr-8' },
                { titleZh: '选股器：占位无内容9.tn6',       titleEn: 'Placeholder 9.tn6',
                  codeId: 'code-scr-9' }
            ]
        }
    ];

    var accRoot = document.getElementById('acc-root');

    function buildAccordion() {
        if (!accRoot) return;
        var frag = document.createDocumentFragment();

        groupsData.forEach(function (group, gi) {
            var card = document.createElement('section');
            card.className = 'cn-qw-card';

            /* 分组小标题 */
            var h3 = document.createElement('div');
            h3.className = 'cn-qw-h3';
            h3.innerHTML =
                '<span class="cn-qw-zh">' + group.titleZh + '</span>' +
                '<span class="cn-qw-en">' + group.titleEn + '</span>';
            card.appendChild(h3);

            /* 组内条目 */
            group.panels.forEach(function (panel, pi) {
                var item = document.createElement('div');
                item.className = 'cn-qw-acc-item';
                if (!group.collapsible) item.classList.add('cn-qw-nofold', 'cn-qw-open');
                else if (pi === 0) item.classList.add('cn-qw-open');

                /* 头部 */
                var head = document.createElement('div');
                head.className = 'cn-qw-acc-head';
                head.innerHTML =
                    '<span class="cn-qw-acc-num">' + (pi + 1) + '</span>' +
                    '<span class="cn-qw-acc-name">' +
                        '<span class="cn-qw-zh">' + panel.titleZh + '</span>' +
                        '<span class="cn-qw-en">' + panel.titleEn + '</span>' +
                    '</span>' +
                    '<i class="cn-qw-acc-caret" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>' +
                    '</i>';
                item.appendChild(head);

                /* 内容 */
                var body = document.createElement('div');
                body.className = 'cn-qw-acc-body';

                var taId = 'ta-' + gi + '-' + pi;
                var ta = document.createElement('textarea');
                ta.className = 'cn-qw-ta';
                ta.id = taId;
                ta.spellcheck = false;
                ta.value = readCode(panel.codeId);   /* ← 从 HTML 容器读取 */
                body.appendChild(ta);

                var act = document.createElement('div');
                act.className = 'cn-qw-actions';
                act.innerHTML =
                    '<span class="cn-qw-tip">' +
                        '<span class="cn-qw-zh">💡 打开通达信，CTRL+F 新建，选择【副图】，复制粘贴保存。</span>' +
                        '<span class="cn-qw-en">💡 Open TongDaXin, CTRL+F, "Sub Chart", paste and save.</span>' +
                    '</span>' +
                    '<button type="button" class="cn-qw-btn-copy" data-target="' + taId + '">' +
                        '📋 <span class="cn-qw-zh">复制代码</span><span class="cn-qw-en">Copy</span>' +
                    '</button>';
                body.appendChild(act);

                item.appendChild(body);
                card.appendChild(item);

                /* 展开/收起（同组互斥） */
                if (group.collapsible) {
                    head.addEventListener('click', function () {
                        var isOpen = item.classList.contains('cn-qw-open');
                        var siblings = card.querySelectorAll('.cn-qw-acc-item');
                        if (isOpen) {
                            item.classList.remove('cn-qw-open');
                        } else {
                            for (var i = 0; i < siblings.length; i++) {
                                siblings[i].classList.remove('cn-qw-open');
                            }
                            item.classList.add('cn-qw-open');
                        }
                    });
                }
            });

            frag.appendChild(card);
        });

        accRoot.appendChild(frag);
    }

    /* ============================================================
     * 主系统两个 textarea：从 HTML 容器读取，填入
     * ============================================================ */
    function fillMainTextareas() {
        var map = [
            ['code-left',  'code-main-chart'],
            ['code-right', 'code-main-sub']
        ];
        map.forEach(function (pair) {
            var ta = document.getElementById(pair[0]);
            if (ta) ta.value = readCode(pair[1]);
        });
    }

    /* ========== 进度条 / 返回顶部 / 导航高亮 ========== */
    var toTop = document.getElementById('toTop');
    var ringFill = document.getElementById('ringFill');
    var progress = document.getElementById('progress');
    var R = 21, CIRC = 2 * Math.PI * R;

    if (ringFill) {
        ringFill.setAttribute('stroke-dasharray', CIRC.toFixed(2));
        ringFill.setAttribute('stroke-dashoffset', CIRC.toFixed(2));
    }

    var sections = ['top', 'region', 'install', 'selector', 'code'];
    var navLinks = document.querySelectorAll('.cn-qw-pill[data-sec]');
    var ticking = false;

    function update() {
        ticking = false;
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var top = window.pageYOffset || doc.scrollTop || 0;
        var p = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;

        if (ringFill) ringFill.setAttribute('stroke-dashoffset', (CIRC * (1 - p)).toFixed(2));
        if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
        if (toTop) toTop.classList.toggle('cn-qw-on', top > 300);

        var probe = top + 140;
        var cur = 'top';
        sections.forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.offsetTop <= probe) cur = id;
        });
        navLinks.forEach(function (a) {
            a.classList.toggle('cn-qw-on', a.getAttribute('data-sec') === cur);
        });
    }
    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    /* 返回顶部动画 */
    var animId = null;
    ['wheel', 'touchstart', 'touchmove'].forEach(function (evt) {
        window.addEventListener(evt, function () {
            if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
        }, { passive: true });
    });
    if (toTop) toTop.addEventListener('click', function () {
        if (animId !== null) cancelAnimationFrame(animId);
        var startY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var dur = 600, t0 = null;
        var html = document.documentElement;
        var prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        function step(ts) {
            if (t0 === null) t0 = ts;
            var prog = Math.min(1, (ts - t0) / dur);
            var ease = 1 - Math.pow(1 - prog, 3);
            window.scrollTo(0, Math.round(startY * (1 - ease)));
            if (prog < 1) animId = requestAnimationFrame(step);
            else { animId = null; html.style.scrollBehavior = prev; }
        }
        animId = requestAnimationFrame(step);
    });

    /* ========== 初始化 ========== */
    function init() {
        buildAccordion();
        fillMainTextareas();
        update();
        console.log('✅ A股量化工作台已加载（代码容器化 · cn-qw- 前缀）');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
