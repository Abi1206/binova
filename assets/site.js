// BINOVA site behaviour. No third-party code, no network requests, no tracking.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.body.getAttribute('data-root') || '';
  var IMG = window.BINOVA_IMAGES || {};

  /* ── images the owner has supplied (listed in assets/images-manifest.js by the build) ── */
  var imgUrl = function (key) { return IMG[key] ? root + 'assets/images/' + IMG[key] : null; };
  $$('figure.ph').forEach(function (fig) {
    var u = imgUrl(fig.getAttribute('data-img')); if (!u) return;
    var im = new Image(); im.src = u; im.alt = fig.getAttribute('data-alt') || ''; im.loading = 'lazy';
    var box = $('.ph-box', fig); if (box) box.replaceWith(im);
  });
  $$('[data-bg]').forEach(function (el) {
    var u = imgUrl(el.getAttribute('data-bg')); if (!u) return;
    el.style.backgroundImage = 'linear-gradient(180deg,rgba(7,21,43,.35),rgba(7,21,43,.78)),url("' + u + '")';
    el.classList.add('has-img');
  });
  var logo = imgUrl('logo-binova');
  if (logo) { var m = $('[data-logo]'); if (m) { var l = new Image(); l.src = logo; l.alt = ''; l.className = 'logo-img'; m.replaceWith(l); } }

  /* ── mega menu and mobile menu ── */
  var btns = $$('.nav-btn');
  var closeAll = function (except) {
    btns.forEach(function (b) { if (b === except) return; b.setAttribute('aria-expanded', 'false'); var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = true; });
  };
  btns.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = b.getAttribute('aria-expanded') === 'true';
      closeAll(b);
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      document.getElementById(b.getAttribute('aria-controls')).hidden = open;
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav')) closeAll(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var openBtn = btns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0]; closeAll(); if (openBtn) openBtn.focus(); closeSearch(); }
  });
  var mt = $('.menu-toggle'), nav = $('#nav');
  if (mt && nav) mt.addEventListener('click', function () { var o = nav.classList.toggle('open'); mt.setAttribute('aria-expanded', o ? 'true' : 'false'); });

  /* ── search (index loaded on demand from assets/search-index.js; works from disk and from Pages) ── */
  var indexLoaded = null;
  var loadIndex = function (cb) {
    if (window.__INDEX) return cb();
    if (indexLoaded) return indexLoaded.push(cb);
    indexLoaded = [cb];
    var s = document.createElement('script'); s.src = root + 'assets/search-index.js';
    s.onload = function () { indexLoaded.forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var runSearch = function (term, out) {
    term = term.trim().toLowerCase();
    if (term.length < 2) { out.innerHTML = '<p>Type at least two letters.</p>'; return; }
    loadIndex(function () {
      var words = term.split(/\s+/);
      var hits = window.__INDEX.map(function (p) {
        var t = p.t.toLowerCase(), x = p.x.toLowerCase(), s = 0;
        words.forEach(function (w) { if (t.indexOf(w) > -1) s += 6; if (x.indexOf(w) > -1) s += 1; });
        return { p: p, s: s };
      }).filter(function (h) { return h.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
      if (!hits.length) { out.innerHTML = '<p>No page matches. Try another word.</p>'; return; }
      out.innerHTML = '<ul class="sr-list">' + hits.map(function (h) {
        var x = h.p.x, i = Math.max(0, x.toLowerCase().indexOf(words[0]) - 50);
        return '<li><a href="' + root + h.p.u + '"><strong>' + esc(h.p.t) + '</strong>' + (h.p.s ? ' <span class="sr-sec">' + esc(h.p.s) + '</span>' : '') + '</a><p>' + esc(x.slice(i, i + 150)) + '…</p></li>';
      }).join('') + '</ul>';
    });
  };
  var ui = $('#search-ui'), sq = $('#sq'), sres = $('#sresults'), sopen = $('#search-open'), lastFocus = null;
  function closeSearch() { if (!ui || ui.hidden) return; ui.hidden = true; document.body.classList.remove('no-scroll'); if (lastFocus) lastFocus.focus(); }
  if (ui && sopen) {
    sopen.addEventListener('click', function () { lastFocus = sopen; ui.hidden = false; document.body.classList.add('no-scroll'); sq.focus(); loadIndex(function () {}); });
    $('#search-close').addEventListener('click', closeSearch);
    ui.addEventListener('click', function (e) { if (e.target === ui) closeSearch(); });
    sq.addEventListener('input', function () { runSearch(sq.value, sres); });
    ui.addEventListener('keydown', function (e) { // keep focus inside the dialog
      if (e.key !== 'Tab') return;
      var f = $$('input,button,a[href]', ui).filter(function (n) { return n.offsetParent !== null; }); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  var pq = $('#pq'), pres = $('#presults'), pgo = $('#pgo');
  if (pq && pres) {
    pgo.addEventListener('click', function () { runSearch(pq.value, pres); });
    pq.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(pq.value, pres); });
    var pre = new URLSearchParams(location.search).get('q'); if (pre) { pq.value = pre; runSearch(pre, pres); }
  }

  /* ── Research Explorer ── */
  var ex = $('[data-explorer]');
  if (ex) {
    var q = $('#ex-q'), cnt = $('#ex-count'), none = $('#ex-none'), chips = $$('.chipbtn', ex), items = $$('.topic', ex), group = '';
    var apply = function () {
      var term = q.value.trim().toLowerCase(), n = 0;
      items.forEach(function (li) { var ok = (!group || li.getAttribute('data-g') === group) && (!term || li.getAttribute('data-t').indexOf(term) > -1 || li.getAttribute('data-g').toLowerCase().indexOf(term) > -1); li.hidden = !ok; if (ok) n++; });
      cnt.textContent = n + ' of ' + items.length + ' topics'; none.hidden = n > 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-g') === group ? 'true' : 'false'); });
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { group = c.getAttribute('data-g'); history.replaceState(null, '', group ? '#g=' + encodeURIComponent(group) : location.pathname); apply(); }); });
    q.addEventListener('input', apply);
    var m = /^#g=(.+)$/.exec(location.hash); if (m) { try { group = decodeURIComponent(m[1]); } catch (e) { group = ''; } }
    apply();
  }

  /* ── Programme Finder ── */
  var fin = $('#finder');
  if (fin) {
    var fchips = $$('[data-p]');
    fchips.forEach(function (c) { c.addEventListener('click', function () {
      var p = c.getAttribute('data-p');
      $$('.card', fin).forEach(function (card) { card.hidden = !!p && card.getAttribute('data-paths').split('|').indexOf(p) < 0; });
      fchips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
    }); });
  }
})();
