(function () {
  'use strict';

  /* ---------- Constantes ---------- */
  var KEY = 'budget.v1';
  var CATS_EXP = ['Courses', 'Sorties', 'Transport', 'Santé', 'Animaux', 'Maison', 'Autre'];
  var CATS_INC = ['Extra', 'Remboursement', 'Autre'];
  var PROV_CATS = ['Impôts', 'Assurances', 'Animaux', 'Véhicule', 'Redevances', 'Prévoyance', 'Autre'];
  var MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var P3_CAP_DEFAULT = 7258; // à vérifier chaque année (petit 3a, salarié affilié à une caisse de pension)

  var TEMPLATE = [
    { name: 'Impôts cantonaux et communaux', cat: 'Impôts', kind: 'annual' },
    { name: 'Impôt fédéral direct', cat: 'Impôts', kind: 'annual' },
    { name: 'Assurance auto', cat: 'Assurances', kind: 'annual' },
    { name: 'Assurance ménage et RC', cat: 'Assurances', kind: 'annual' },
    { name: 'Franchise LAMal (réserve)', cat: 'Assurances', kind: 'annual' },
    { name: 'Assurance animal', cat: 'Animaux', kind: 'annual' },
    { name: 'Frais vétérinaires', cat: 'Animaux', kind: 'annual' },
    { name: 'Taxe véhicule', cat: 'Véhicule', kind: 'annual' },
    { name: 'Redevance radio-TV', cat: 'Redevances', kind: 'annual' },
    { name: '3e pilier (3a)', cat: 'Prévoyance', kind: 'annual' },
    { name: 'Loyer ou hypothèque', cat: 'Autre', kind: 'monthly' },
    { name: 'Prime LAMal', cat: 'Assurances', kind: 'monthly' },
    { name: 'Téléphone et internet', cat: 'Autre', kind: 'monthly' }
  ];

  /* ---------- Utilitaires ---------- */
  var root = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var fileInput = document.getElementById('file-import');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function mkOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function parseDate(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function shortDate(d) { return d.getDate() + ' ' + MS[d.getMonth()]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function thousands(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }
  function f0(n) { return (n < 0 ? '−' : '') + thousands(String(Math.round(Math.abs(n)))); }
  function f2(n) {
    var p = Math.abs(n).toFixed(2).split('.');
    return (n < 0 ? '−' : '') + thousands(p[0]) + '.' + p[1];
  }
  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(/[’'\s]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  function sum(arr, fn) { return arr.reduce(function (a, x) { return a + fn(x); }, 0); }
  function relDate(s) {
    var t = ymd(new Date());
    if (s === t) return 'aujourd’hui';
    var y = new Date(); y.setDate(y.getDate() - 1);
    if (s === ymd(y)) return 'hier';
    return shortDate(parseDate(s));
  }
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  var ICONS = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>'
  };
  function icon(n, size) {
    var s = size || 22;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';
  }

  /* ---------- Données ---------- */
  function emptyState() { return { v: 1, income: 0, items: [], tx: [], p3: null, lastExport: null }; }
  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY));
      if (r && r.v === 1 && Array.isArray(r.items) && Array.isArray(r.tx)) return r;
    } catch (e) { /* ignore */ }
    return emptyState();
  }
  var S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Sauvegarde impossible sur cet appareil'); }
  }

  var ui = { route: 'home', month: mkOf(new Date()), sheet: null };

  /* ---------- Calculs ---------- */
  function totals() {
    var ann = S.items.filter(function (i) { return i.kind === 'annual'; });
    var mon = S.items.filter(function (i) { return i.kind === 'monthly'; });
    return {
      annualTotal: sum(ann, function (i) { return i.amount; }),
      prov: sum(ann, function (i) { return i.amount; }) / 12,
      fixed: sum(mon, function (i) { return i.amount; })
    };
  }
  function monthStats(mk) {
    var tx = S.tx.filter(function (t) { return t.date.indexOf(mk) === 0; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.ts < b.ts ? 1 : -1); });
    var spent = sum(tx.filter(function (t) { return t.kind === 'expense'; }), function (t) { return t.amount; });
    var extra = sum(tx.filter(function (t) { return t.kind === 'income'; }), function (t) { return t.amount; });
    var T = totals();
    var available = S.income - T.fixed - T.prov + extra;
    return { tx: tx, spent: spent, extra: extra, fixed: T.fixed, prov: T.prov, available: available, rest: available - spent };
  }
  function nextDue(it) {
    if (!it.due) return null;
    var d = parseDate(it.due);
    var t = parseDate(ymd(new Date()));
    var guard = 0;
    while (d < t && guard++ < 200) {
      if (it.kind === 'annual') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  /* ---------- Vues ---------- */
  function tabsHTML() {
    return '<nav class="tabs">' +
      '<button class="tab' + (ui.route === 'home' ? ' on' : '') + '" data-a="go" data-r="home" aria-label="Accueil">' + icon('home') + '<span>Accueil</span></button>' +
      '<button class="fab" data-a="new-tx" aria-label="Saisir une dépense ou un revenu">' + icon('plus', 24) + '</button>' +
      '<button class="tab' + (ui.route === 'plan' ? ' on' : '') + '" data-a="go" data-r="plan" aria-label="Prévisionnel annuel">' + icon('cal') + '<span>Prévisionnel</span></button>' +
      '</nav>';
  }

  function txRowHTML(t) {
    var inc = t.kind === 'income';
    return '<button class="row" data-a="edit-tx" data-id="' + esc(t.id) + '">' +
      '<div class="l"><span class="n">' + esc(t.note || t.cat) + '</span><span class="s">' + esc(t.cat) + ' · ' + esc(relDate(t.date)) + '</span></div>' +
      '<span class="r' + (inc ? ' pos' : '') + '">' + (inc ? '+' : '−') + f2(t.amount) + '</span></button>';
  }

  function homeHTML() {
    var now = new Date();
    var isCur = ui.month === mkOf(now);
    var p = ui.month.split('-').map(Number);
    var label = cap(new Date(p[0], p[1] - 1, 1).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }));
    var st = monthStats(ui.month);
    var daysLeft = isCur ? new Date(p[0], p[1], 0).getDate() - now.getDate() : null;
    var pct = st.available > 0 ? Math.max(0, Math.min(1, st.rest / st.available)) : 0;
    var setup = S.income === 0 && S.items.length === 0;
    var h = '';

    h += '<div class="top"><div class="month-nav">' +
      '<button class="icon-btn" data-a="month" data-d="-1" aria-label="Mois précédent">' + icon('left') + '</button>' +
      '<span class="title">' + esc(label) + '</span>' +
      '<button class="icon-btn" data-a="month" data-d="1" aria-label="Mois suivant"' + (isCur ? ' disabled' : '') + '>' + icon('right') + '</button>' +
      '</div><button class="icon-btn" data-a="go" data-r="settings" aria-label="Réglages">' + icon('gear') + '</button></div>';

    if (setup) {
      h += '<div class="card"><h3>Pour commencer</h3>' +
        '<p class="md muted" style="line-height:1.5">Renseigne tes revenus et tes charges dans le prévisionnel : l’app calcule ce qu’il reste pour vivre chaque mois.</p>' +
        '<button class="cta" data-a="go" data-r="plan">Ouvrir le prévisionnel</button></div>';
    }

    h += '<div class="hero"><span class="md muted">Reste à vivre ce mois</span>' +
      '<div class="amount"><span class="num' + (st.rest < 0 ? ' neg' : '') + '">' + f0(st.rest) + '</span><span class="cur">CHF</span></div>' +
      '<span class="md muted">sur ' + f0(st.available) + ' disponibles' + (daysLeft != null ? ' · ' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + ' restant' + (daysLeft > 1 ? 's' : '') : '') + '</span>' +
      '<div class="bar"><div style="width:' + Math.round(pct * 100) + '%"></div></div></div>';

    h += '<div class="stats">' +
      '<div class="stat"><span class="sm muted">Revenus</span><span class="v">' + f0(S.income + st.extra) + '</span></div>' +
      '<div class="stat"><span class="sm muted">Fixes &amp; provisions</span><span class="v">' + f0(st.fixed + st.prov) + '</span></div>' +
      '<div class="stat"><span class="sm muted">Dépensé</span><span class="v">' + f0(st.spent) + '</span></div></div>';

    if (isCur) {
      var t0 = parseDate(ymd(now));
      var up = S.items.map(function (it) { return { it: it, d: nextDue(it) }; })
        .filter(function (x) { return x.d; })
        .map(function (x) { return { it: x.it, d: x.d, days: Math.round((x.d - t0) / 864e5) }; })
        .filter(function (x) { return x.days <= 60; })
        .sort(function (a, b) { return a.days - b.days; })
        .slice(0, 3);
      var rows = up.map(function (x) {
        var when = x.days === 0 ? 'aujourd’hui' : x.days === 1 ? 'demain' : shortDate(x.d);
        return '<div class="row" style="min-height:0"><div class="l"><span class="n">' + esc(x.it.name) + '</span><span class="s">' + esc(when) + '</span></div><span class="r">' + f0(x.it.amount) + '</span></div>';
      });
      if (S.p3 && S.p3.cap - S.p3.paid > 0) {
        var end = new Date(now.getFullYear(), 11, 31);
        var dd = Math.round((end - t0) / 864e5);
        rows.push('<div class="row" style="min-height:0"><div class="l"><span class="n">3e pilier (3a)</span><span class="s warn">Avant le 31 déc. · ' + f0(S.p3.cap - S.p3.paid) + ' restants' + (dd <= 60 ? ' · ' + dd + ' j' : '') + '</span></div><span class="r">' + f0(S.p3.paid) + ' / ' + f0(S.p3.cap) + '</span></div>');
      }
      if (rows.length) {
        h += '<div class="card"><h3>À venir</h3>' + rows.join('<div class="divider"></div>') + '</div>';
      }
    }

    h += '<div class="group"><span class="section-title">' + (isCur ? 'Récent' : 'Mouvements') + '</span>';
    if (st.tx.length) {
      h += '<div class="list">' + st.tx.slice(0, 12).map(txRowHTML).join('') + '</div>';
    } else {
      h += '<p class="empty">Aucun mouvement ce mois-ci.<br>Touche + pour en ajouter.</p>';
    }
    h += '</div>';
    return h;
  }

  function itemRowHTML(it) {
    var nd = nextDue(it);
    var sub;
    if (it.amount === 0) sub = 'À renseigner';
    else if (it.kind === 'annual') sub = f0(it.amount) + ' / an' + (nd ? ' · ' + shortDate(nd) : '');
    else sub = 'mensuel' + (nd ? ' · le ' + nd.getDate() : '');
    var right = it.amount === 0 ? '—' : (it.kind === 'annual' ? f0(it.amount / 12) + '<small>/ mois</small>' : f0(it.amount) + '<small>/ mois</small>');
    return '<button class="row" data-a="edit-item" data-id="' + esc(it.id) + '">' +
      '<div class="l"><span class="n">' + esc(it.name) + '</span><span class="s' + (it.amount === 0 ? ' warn' : '') + '">' + esc(sub) + '</span></div>' +
      '<span class="r">' + right + '</span></button>';
  }

  function planHTML() {
    var T = totals();
    var free = S.income - T.fixed - T.prov;
    var ann = S.items.filter(function (i) { return i.kind === 'annual'; });
    var mon = S.items.filter(function (i) { return i.kind === 'monthly'; });
    var h = '<div class="top"><span style="font-size:15px;font-weight:600;letter-spacing:-0.01em">Prévisionnel</span>' +
      '<button class="icon-btn" data-a="go" data-r="settings" aria-label="Réglages">' + icon('gear') + '</button></div>';

    h += '<div class="hero"><span class="md muted">À mettre de côté chaque mois</span>' +
      '<div class="amount"><span class="num mid">' + f0(T.prov) + '</span><span class="cur">CHF / mois</span></div>' +
      '<span class="md muted">pour ' + f0(T.annualTotal) + ' de charges irrégulières par an</span></div>';

    if (S.income > 0) {
      var tot = Math.max(S.income, T.fixed + T.prov);
      h += '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="stack"><div style="flex:' + T.fixed + ' 1 0;background:var(--track-a)"></div>' +
        '<div style="flex:' + T.prov + ' 1 0;background:var(--accent)"></div>' +
        '<div style="flex:' + Math.max(free, 0) + ' 1 0;background:var(--track-c)"></div></div>' +
        '<div class="stats">' +
        '<div class="stat"><span class="sm muted">Charges fixes</span><span class="v" style="font-size:14px">' + f0(T.fixed) + '</span></div>' +
        '<div class="stat"><span class="sm muted">Provisions</span><span class="v" style="font-size:14px">' + f0(T.prov) + '</span></div>' +
        '<div class="stat"><span class="sm muted">Quotidien</span><span class="v' + (free < 0 ? ' neg' : '') + '" style="font-size:14px">' + f0(free) + '</span></div></div>' +
        '<button class="link" style="text-align:left;min-height:32px" data-a="edit-income">Sur ' + f0(S.income) + ' de revenus mensuels · modifier</button></div>';
      void tot;
    } else {
      h += '<button class="ghost" data-a="edit-income">Renseigner mes revenus mensuels</button>';
    }

    // Charges annuelles par catégorie
    var cats = PROV_CATS.slice();
    ann.forEach(function (i) { if (cats.indexOf(i.cat) === -1) cats.push(i.cat); });
    var any = false;
    cats.forEach(function (c) {
      var list = ann.filter(function (i) { return i.cat === c; });
      if (!list.length) return;
      any = true;
      h += '<div class="group"><span class="section-title">' + esc(c) + '</span><div class="list">' + list.map(itemRowHTML).join('') + '</div></div>';
    });
    if (mon.length) {
      any = true;
      h += '<div class="group"><span class="section-title">Charges fixes mensuelles</span><div class="list">' + mon.map(itemRowHTML).join('') + '</div></div>';
    }
    if (!any) {
      h += '<p class="empty">Aucune charge pour l’instant.<br>Ajoute-les une à une ou charge le modèle Valais.</p>';
    }

    // 3e pilier
    if (S.p3) {
      var pc = Math.max(0, Math.min(1, S.p3.cap > 0 ? S.p3.paid / S.p3.cap : 0));
      h += '<div class="card"><h3>3e pilier (3a) cette année</h3>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:22px;font-weight:600;letter-spacing:-0.02em">' + f0(S.p3.paid) + '</span><span class="md muted">sur ' + f0(S.p3.cap) + ' CHF</span></div>' +
        '<div class="bar" style="margin-top:0"><div style="width:' + Math.round(pc * 100) + '%"></div></div>' +
        '<span class="sm muted">Versement possible jusqu’au 31 décembre. Vérifie ton plafond selon ta situation.</span>' +
        '<button class="ghost" data-a="edit-p3">Mettre à jour</button></div>';
    } else {
      h += '<button class="ghost" data-a="edit-p3">Suivre mon 3e pilier (3a)</button>';
    }

    h += '<div class="actions"><button class="cta" data-a="new-item">Ajouter une charge</button>' +
      '<button class="ghost" data-a="template">Charger le modèle Valais</button></div>';
    return h;
  }

  function settingsHTML() {
    var le = S.lastExport ? 'le ' + shortDate(parseDate(S.lastExport)) : 'jamais';
    var h = '<div class="top"><button class="icon-btn" style="margin-left:-12px" data-a="go" data-r="home" aria-label="Retour">' + icon('left') + '</button>' +
      '<span style="font-size:15px;font-weight:600">Réglages</span><span class="spacer"></span></div>';
    h += '<div class="card"><h3>Revenus mensuels nets</h3><div class="row" style="min-height:0"><span style="font-size:22px;font-weight:600;letter-spacing:-0.02em">' + f0(S.income) + ' <span class="md muted" style="font-weight:400">CHF</span></span><button class="link" data-a="edit-income">Modifier</button></div></div>';
    h += '<div class="card"><h3>Sauvegarde</h3>' +
      '<p class="md muted" style="line-height:1.5">Tes données restent uniquement sur cet appareil, dans le navigateur. Exporte-les régulièrement : vider le cache ou changer de téléphone les efface.</p>' +
      '<span class="sm muted">Dernière sauvegarde : ' + esc(le) + '</span>' +
      '<div class="actions" style="margin-top:0"><button class="cta" data-a="export">Exporter mes données</button>' +
      '<button class="ghost" data-a="import">Importer une sauvegarde</button></div></div>';
    h += '<button class="ghost danger" data-a="reset">Tout effacer</button>';
    h += '<p class="sm muted" style="text-align:center">Budget · V1</p>';
    return h;
  }

  /* ---------- Feuilles ---------- */
  function txSheetHTML() {
    var d = ui.sheet.data;
    var cats = d.kind === 'expense' ? CATS_EXP : CATS_INC;
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];
    var h = '<div class="overlay" role="dialog" aria-modal="true" aria-label="Saisie">' +
      '<div class="sheet-top"><button class="icon-btn close" data-a="close" aria-label="Fermer">' + icon('close') + '</button>' +
      '<div class="seg"><button class="' + (d.kind === 'expense' ? 'on' : '') + '" data-a="tx-kind" data-k="expense">Dépense</button>' +
      '<button class="' + (d.kind === 'income' ? 'on' : '') + '" data-a="tx-kind" data-k="income">Revenu</button></div><span class="spacer"></span></div>' +
      '<div class="amount-block"><span class="md muted">Montant</span>' +
      '<div class="hero"><div class="amount" style="justify-content:center"><span class="num">' + fmtInput(d.amount) + '</span><span class="cur">CHF</span></div></div></div>' +
      '<div class="chips">' + cats.map(function (c) {
        return '<button class="chip' + (c === d.cat ? ' on' : '') + '" data-a="tx-cat" data-c="' + esc(c) + '" aria-pressed="' + (c === d.cat) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      '<div class="meta"><input type="date" id="tx-date" value="' + esc(d.date) + '" aria-label="Date"><input type="text" id="tx-note" value="' + esc(d.note) + '" placeholder="Note (facultatif)" maxlength="60" aria-label="Note"></div>' +
      '<div class="keypad">' + keys.map(function (k) {
        return '<button data-a="key" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Effacer' : k === ',' ? 'Virgule' : k) + '">' + (k === 'del' ? '⌫' : k) + '</button>';
      }).join('') + '</div>' +
      '<div class="actions"><button class="cta" data-a="tx-save">Enregistrer</button>' +
      (d.id ? '<button class="ghost danger" data-a="tx-del">Supprimer</button>' : '') + '</div></div>';
    return h;
  }
  function fmtInput(a) {
    var p = a.split('.');
    return thousands(p[0]) + (p.length > 1 ? ',' + p[1] : '');
  }

  function itemSheetHTML() {
    var d = ui.sheet.data;
    var catOpts = PROV_CATS.concat(PROV_CATS.indexOf(d.cat) === -1 ? [d.cat] : []).map(function (c) {
      return '<option' + (c === d.cat ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    return '<form class="overlay form" data-form="item" role="dialog" aria-modal="true" aria-label="Charge">' +
      '<div class="sheet-top"><button type="button" class="icon-btn close" data-a="close" aria-label="Fermer">' + icon('close') + '</button><h2>' + (d.id ? 'Modifier la charge' : 'Nouvelle charge') + '</h2><span class="spacer"></span></div>' +
      '<label>Nom<input class="field" name="name" required maxlength="60" value="' + esc(d.name) + '"></label>' +
      '<label>Catégorie<select class="field" name="cat">' + catOpts + '</select></label>' +
      '<label>Périodicité<select class="field" name="kind"><option value="annual"' + (d.kind === 'annual' ? ' selected' : '') + '>Annuelle (lissée sur 12 mois)</option><option value="monthly"' + (d.kind === 'monthly' ? ' selected' : '') + '>Mensuelle fixe</option></select></label>' +
      '<label>Montant (CHF)<input class="field" name="amount" inputmode="decimal" value="' + esc(d.amount ? String(d.amount) : '') + '" placeholder="0"></label>' +
      '<label>Prochaine échéance (facultatif)<input class="field" type="date" name="due" value="' + esc(d.due || '') + '"></label>' +
      '<p class="hint">Une charge annuelle est divisée par 12 : tu mets ce montant de côté chaque mois, et la facture ne te surprend plus.</p>' +
      '<div class="actions"><button class="cta" type="submit">Enregistrer</button>' +
      (d.id ? '<button class="ghost danger" type="button" data-a="item-del">Supprimer</button>' : '') + '</div></form>';
  }

  function incomeSheetHTML() {
    return '<form class="overlay form" data-form="income" role="dialog" aria-modal="true" aria-label="Revenus">' +
      '<div class="sheet-top"><button type="button" class="icon-btn close" data-a="close" aria-label="Fermer">' + icon('close') + '</button><h2>Revenus mensuels</h2><span class="spacer"></span></div>' +
      '<label>Revenu net mensuel (CHF)<input class="field" name="income" inputmode="decimal" value="' + esc(S.income ? String(S.income) : '') + '" placeholder="0"></label>' +
      '<p class="hint">Montant net régulier (salaire après déductions). Les revenus ponctuels se saisissent avec le bouton + .</p>' +
      '<div class="actions"><button class="cta" type="submit">Enregistrer</button></div></form>';
  }

  function p3SheetHTML() {
    var p = S.p3 || { cap: P3_CAP_DEFAULT, paid: 0 };
    return '<form class="overlay form" data-form="p3" role="dialog" aria-modal="true" aria-label="3e pilier">' +
      '<div class="sheet-top"><button type="button" class="icon-btn close" data-a="close" aria-label="Fermer">' + icon('close') + '</button><h2>3e pilier (3a)</h2><span class="spacer"></span></div>' +
      '<label>Déjà versé cette année (CHF)<input class="field" name="paid" inputmode="decimal" value="' + esc(p.paid ? String(p.paid) : '') + '" placeholder="0"></label>' +
      '<label>Plafond annuel (CHF)<input class="field" name="cap" inputmode="decimal" value="' + esc(String(p.cap)) + '"></label>' +
      '<p class="hint">Le plafond dépend de ta situation (affiliation à une caisse de pension ou non) et change selon les années. Vérifie la valeur officielle avant de t’y fier.</p>' +
      '<div class="actions"><button class="cta" type="submit">Enregistrer</button>' +
      (S.p3 ? '<button class="ghost danger" type="button" data-a="p3-del">Ne plus suivre</button>' : '') + '</div></form>';
  }

  /* ---------- Rendu ---------- */
  function render() {
    var body;
    if (ui.route === 'plan') body = planHTML();
    else if (ui.route === 'settings') body = settingsHTML();
    else body = homeHTML();
    var overlay = '';
    if (ui.sheet) {
      if (ui.sheet.type === 'tx') overlay = txSheetHTML();
      else if (ui.sheet.type === 'item') overlay = itemSheetHTML();
      else if (ui.sheet.type === 'income') overlay = incomeSheetHTML();
      else if (ui.sheet.type === 'p3') overlay = p3SheetHTML();
    }
    var keepScroll = root.querySelector('main') ? root.querySelector('main').scrollTop : 0;
    root.innerHTML = '<main>' + body + '</main>' + (ui.route === 'settings' ? '' : tabsHTML()) + overlay;
    var m = root.querySelector('main');
    if (m) m.scrollTop = keepScroll;
  }

  /* ---------- Actions ---------- */
  function openTx(id) {
    var t = id && S.tx.filter(function (x) { return x.id === id; })[0];
    ui.sheet = {
      type: 'tx',
      data: t
        ? { id: t.id, kind: t.kind, amount: String(t.amount), cat: t.cat, date: t.date, note: t.note || '' }
        : { id: null, kind: 'expense', amount: '0', cat: CATS_EXP[0], date: ymd(new Date()), note: '' }
    };
    render();
  }
  function pressKey(k) {
    var d = ui.sheet.data;
    var a = d.amount;
    if (k === 'del') {
      a = a.length > 1 ? a.slice(0, -1) : '0';
    } else if (k === ',' || k === '.') {
      if (a.indexOf('.') === -1) a += '.';
    } else if (/^\d$/.test(k)) {
      var dot = a.indexOf('.');
      if (dot !== -1 && a.length - dot > 2) return;
      if (a.replace('.', '').length >= 8) return;
      a = a === '0' ? k : a + k;
    } else return;
    d.amount = a;
    render();
  }
  function saveTx() {
    var d = ui.sheet.data;
    var amount = Math.round(num(d.amount) * 100) / 100;
    if (!(amount > 0)) { toast('Saisis un montant'); return; }
    if (!d.date) { toast('Choisis une date'); return; }
    var rec = { id: d.id || uid(), kind: d.kind, amount: amount, cat: d.cat, date: d.date, note: (d.note || '').trim(), ts: Date.now() };
    if (d.id) {
      S.tx = S.tx.map(function (t) { return t.id === d.id ? rec : t; });
    } else {
      S.tx.push(rec);
    }
    save();
    ui.month = d.date.slice(0, 7);
    ui.route = ui.route === 'settings' ? 'home' : ui.route;
    ui.sheet = null;
    render();
    toast(d.id ? 'Modifié' : 'Enregistré');
  }
  function openItem(id) {
    var it = id && S.items.filter(function (x) { return x.id === id; })[0];
    ui.sheet = {
      type: 'item',
      data: it ? { id: it.id, name: it.name, cat: it.cat, kind: it.kind, amount: it.amount, due: it.due || '' }
        : { id: null, name: '', cat: PROV_CATS[0], kind: 'annual', amount: 0, due: '' }
    };
    render();
  }
  function loadTemplate() {
    var have = {};
    S.items.forEach(function (i) { have[i.name.toLowerCase()] = 1; });
    var added = 0;
    TEMPLATE.forEach(function (t) {
      if (have[t.name.toLowerCase()]) return;
      S.items.push({ id: uid(), name: t.name, cat: t.cat, kind: t.kind, amount: 0, due: '' });
      added++;
    });
    save();
    render();
    toast(added ? added + ' charges ajoutées : renseigne les montants' : 'Le modèle est déjà chargé');
  }
  function exportData() {
    S.lastExport = ymd(new Date());
    save();
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'budget-' + S.lastExport + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    render();
    toast('Sauvegarde exportée');
  }
  function importData(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result);
        if (!o || o.v !== 1 || !Array.isArray(o.items) || !Array.isArray(o.tx)) throw new Error('format');
        if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
        S = o;
        if (typeof S.income !== 'number') S.income = 0;
        save();
        ui.route = 'home';
        ui.month = mkOf(new Date());
        render();
        toast('Sauvegarde importée');
      } catch (e) {
        toast('Fichier invalide');
      }
    };
    r.readAsText(file);
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!el) return;
    var a = el.getAttribute('data-a');
    var id = el.getAttribute('data-id');
    switch (a) {
      case 'go': ui.route = el.getAttribute('data-r'); ui.sheet = null; render(); break;
      case 'month':
        var p = ui.month.split('-').map(Number);
        var d = new Date(p[0], p[1] - 1 + Number(el.getAttribute('data-d')), 1);
        if (mkOf(d) > mkOf(new Date())) break;
        ui.month = mkOf(d); render(); break;
      case 'new-tx': openTx(null); break;
      case 'edit-tx': openTx(id); break;
      case 'close': ui.sheet = null; render(); break;
      case 'key': pressKey(el.getAttribute('data-k')); break;
      case 'tx-kind':
        ui.sheet.data.kind = el.getAttribute('data-k');
        ui.sheet.data.cat = (ui.sheet.data.kind === 'expense' ? CATS_EXP : CATS_INC)[0];
        render(); break;
      case 'tx-cat': ui.sheet.data.cat = el.getAttribute('data-c'); render(); break;
      case 'tx-save': saveTx(); break;
      case 'tx-del':
        if (confirm('Supprimer ce mouvement ?')) {
          S.tx = S.tx.filter(function (t) { return t.id !== ui.sheet.data.id; });
          save(); ui.sheet = null; render(); toast('Supprimé');
        } break;
      case 'new-item': openItem(null); break;
      case 'edit-item': openItem(id); break;
      case 'item-del':
        if (confirm('Supprimer cette charge ?')) {
          S.items = S.items.filter(function (t) { return t.id !== ui.sheet.data.id; });
          save(); ui.sheet = null; render(); toast('Supprimée');
        } break;
      case 'template': loadTemplate(); break;
      case 'edit-income': ui.sheet = { type: 'income' }; render(); break;
      case 'edit-p3': ui.sheet = { type: 'p3' }; render(); break;
      case 'p3-del':
        if (confirm('Arrêter le suivi du 3e pilier ?')) { S.p3 = null; save(); ui.sheet = null; render(); }
        break;
      case 'export': exportData(); break;
      case 'import': fileInput.value = ''; fileInput.click(); break;
      case 'reset':
        if (confirm('Effacer toutes les données de cet appareil ? Cette action est définitive.')) {
          S = emptyState(); save(); ui.route = 'home'; ui.sheet = null; render(); toast('Données effacées');
        } break;
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    var kind = f.getAttribute && f.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    var fd = new FormData(f);
    if (kind === 'item') {
      var d = ui.sheet.data;
      var rec = {
        id: d.id || uid(),
        name: String(fd.get('name') || '').trim(),
        cat: String(fd.get('cat') || 'Autre'),
        kind: fd.get('kind') === 'monthly' ? 'monthly' : 'annual',
        amount: Math.max(0, Math.round(num(fd.get('amount')) * 100) / 100),
        due: String(fd.get('due') || '')
      };
      if (!rec.name) { toast('Donne un nom à la charge'); return; }
      if (d.id) S.items = S.items.map(function (x) { return x.id === d.id ? rec : x; });
      else S.items.push(rec);
      toast('Enregistré');
    } else if (kind === 'income') {
      S.income = Math.max(0, Math.round(num(fd.get('income')) * 100) / 100);
      toast('Revenus mis à jour');
    } else if (kind === 'p3') {
      S.p3 = {
        cap: Math.max(0, num(fd.get('cap')) || P3_CAP_DEFAULT),
        paid: Math.max(0, Math.round(num(fd.get('paid')) * 100) / 100)
      };
      toast('3e pilier mis à jour');
    }
    save();
    ui.sheet = null;
    render();
  });

  document.addEventListener('input', function (e) {
    if (!ui.sheet || ui.sheet.type !== 'tx') return;
    if (e.target.id === 'tx-date') ui.sheet.data.date = e.target.value;
    if (e.target.id === 'tx-note') ui.sheet.data.note = e.target.value;
  });

  document.addEventListener('keydown', function (e) {
    if (!ui.sheet) return;
    if (e.key === 'Escape') { ui.sheet = null; render(); return; }
    if (ui.sheet.type !== 'tx') return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (/^\d$/.test(e.key) || e.key === ',' || e.key === '.') { e.preventDefault(); pressKey(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); pressKey('del'); }
    else if (e.key === 'Enter') { e.preventDefault(); saveTx(); }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) importData(fileInput.files[0]);
  });

  /* ---------- Démarrage ---------- */
  render();
  if (navigator.storage && navigator.storage.persist) {
    try { navigator.storage.persist(); } catch (e) { /* ignore */ }
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne non disponible */ });
    });
  }
})();
