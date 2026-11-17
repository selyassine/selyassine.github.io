/* Portfolio de Yassine Selmi
   Simulation d'ouverture, laboratoire de calcul, filtre des projets, assistant, navigation, formulaire.
   Aucune dépendance : tout est calculé ici, dans le navigateur. */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const EN = document.documentElement.lang.startsWith("en");
  const BASE = EN ? "../" : "";
  const nf = (min, max = min) => new Intl.NumberFormat(EN ? "en-GB" : "fr-FR", { minimumFractionDigits: min, maximumFractionDigits: max });
  const pct = s => s + (EN ? "%" : " %");
  const keur = s => EN ? "€" + s + "k" : s + " k€";
  const meur = s => EN ? "€" + s + "m" : s + " M€";
  const eur = s => EN ? "€" + s : s + " €";
  // Textes de l'interface générés par le script, en français et en anglais.
  const TXT = EN ? {
    today: "today", years: t => "+" + t + " yrs",
    sim: (m, a, b) => `In 25 years: median index of <strong>${m}</strong>, with 90% of scenarios between ${a} and ${b}.`,
    origin: "Accident year", dev: j => "Dev. " + j, ultimate: "Ultimate", factor: "Factor",
    cell: (y, j) => `Accident year ${y}, development ${j}`,
    layer: "layer",
    xlTitle: "Probability that a claim above the threshold exceeds a given amount, with the reinsured layer highlighted.",
    age: a => "age " + a, yrs: n => n + (n > 1 ? " yrs" : " yr"),
    alive: "Share of annuitants still alive", aliveKey: "solid line: reduced mortality, dashed: base",
    renteTitle: "Share of annuitants still alive over the years, under base mortality and reduced mortality.",
    yr: t => "yr " + t, eclHead: "Expected loss per year, in €k", eclKey: "light bar: stage 1, all bars: stage 2",
    eclTitle: "Expected loss for each year of the loan’s life. Stage 1 counts only the first year, stage 2 all years.",
    projects: n => n + (n > 1 ? " projects" : " project"),
    toLight: "Switch to light theme", toDark: "Switch to dark theme", light: "Light", dark: "Dark",
    prev: "Previous", next: "Next", close: "Close", of: (i, n) => i + " of " + n,
  } : {
    today: "aujourd’hui", years: t => "+" + t + " ans",
    sim: (m, a, b) => `Dans 25 ans : indice médian de <strong>${m}</strong>, et 90 % des scénarios entre ${a} et ${b}.`,
    origin: "Survenance", dev: j => "Dév. " + j, ultimate: "Ultime", factor: "Facteur",
    cell: (y, j) => `Survenance ${y}, développement ${j}`,
    layer: "tranche",
    xlTitle: "Probabilité qu’un sinistre au-delà du seuil dépasse un montant donné, avec la tranche réassurée en surbrillance.",
    age: a => a + " ans", yrs: n => n + (n > 1 ? " ans" : " an"),
    alive: "Part des rentiers encore en vie", aliveKey: "trait plein : mortalité abaissée, pointillé : base",
    renteTitle: "Part des rentiers encore en vie au fil des années, avec la mortalité de base et la mortalité abaissée.",
    yr: t => "an " + t, eclHead: "Perte attendue par année, en k€", eclKey: "barre claire : stade 1, toutes les barres : stade 2",
    eclTitle: "Perte attendue par année de vie du prêt. Le stade 1 ne compte que la première année, le stade 2 toutes les années.",
    projects: n => n + (n > 1 ? " projets" : " projet"),
    toLight: "Passer au thème clair", toDark: "Passer au thème sombre", light: "Clair", dark: "Sombre",
    prev: "Précédente", next: "Suivante", close: "Fermer", of: (i, n) => i + " sur " + n,
  };
  const f0 = nf(0), f1 = nf(1), f2 = nf(2), f3 = nf(3);
  const sg = v => f1.format(v).replace("-", "−");
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // "#F2B544" et 0.2 donnent "rgba(242, 181, 68, 0.2)" : le canvas ne lit pas les variables CSS.
  const alpha = (hex, a) => {
    const h = hex.replace("#", "");
    const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    return `rgba(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)}, ${a})`;
  };

  /* ================= Simulation d'ouverture =================
     Marche aléatoire avec dérive : k(t+1) = k(t) + d + s·e, e ~ N(0,1).
     5 000 trajectoires sur 25 ans ; paramètres illustratifs. */
  const sim = (() => {
    const canvas = $("sim-canvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const N = 5000, T = 25, DRIFT = -1.2, SIGMA = 1.6, DRAWN = 160;
    let paths, q05, q50, q95, lo, hi, raf;

    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    function simulate() {
      paths = new Array(N);
      for (let i = 0; i < N; i++) {
        const p = new Float32Array(T + 1);
        for (let t = 1; t <= T; t++) p[t] = p[t - 1] + DRIFT + SIGMA * gauss();
        paths[i] = p;
      }
      q05 = []; q50 = []; q95 = [];
      const col = new Float32Array(N);
      for (let t = 0; t <= T; t++) {
        for (let i = 0; i < N; i++) col[i] = paths[i][t];
        const s = Array.from(col).sort((a, b) => a - b);
        q05.push(s[Math.floor(0.05 * N)]);
        q50.push(s[Math.floor(0.5 * N)]);
        q95.push(s[Math.floor(0.95 * N)]);
      }
      lo = Infinity; hi = -Infinity;
      for (let i = 0; i < DRAWN; i++) for (let t = 0; t <= T; t++) {
        lo = Math.min(lo, paths[i][t]); hi = Math.max(hi, paths[i][t]);
      }
      hi = Math.max(hi, 2);
    }

    function draw(progress) {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const padL = 8, padR = 8, padT = 10, padB = 28;
      const X = t => padL + (t / T) * (w - padL - padR);
      const Y = v => padT + ((hi - v) / (hi - lo)) * (h - padT - padB);
      const brass = css("--proj"), mist = css("--faint"), line = css("--line"), paper = css("--text");

      // repères temporels
      ctx.font = "13px " + css("--sans");
      ctx.fillStyle = mist; ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let t = 0; t <= T; t += 5) {
        ctx.beginPath(); ctx.moveTo(X(t), padT); ctx.lineTo(X(t), h - padB); ctx.stroke();
        // Sur un écran étroit, une date sur deux pour qu'elles ne se chevauchent pas
        if (w < 560 && t % 10 !== 0) continue;
        ctx.textAlign = t === 0 ? "left" : t === T ? "right" : "center";
        ctx.fillText(t === 0 ? TXT.today : TXT.years(t), X(t), h - 8);
      }

      const tMax = progress * T;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, X(tMax), h); ctx.clip();

      // bande 5 % - 95 %
      ctx.beginPath();
      for (let t = 0; t <= T; t++) ctx.lineTo(X(t), Y(q95[t]));
      for (let t = T; t >= 0; t--) ctx.lineTo(X(t), Y(q05[t]));
      ctx.closePath(); ctx.fillStyle = alpha(brass, .14); ctx.fill();

      // trajectoires
      ctx.strokeStyle = alpha(brass, .17); ctx.lineWidth = 1;
      for (let i = 0; i < DRAWN; i++) {
        ctx.beginPath();
        for (let t = 0; t <= T; t++) ctx.lineTo(X(t), Y(paths[i][t]));
        ctx.stroke();
      }
      // médiane
      ctx.strokeStyle = paper; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t <= T; t++) ctx.lineTo(X(t), Y(q50[t]));
      ctx.stroke();
      // bornes
      ctx.strokeStyle = brass; ctx.lineWidth = 1.5;
      for (const q of [q05, q95]) {
        ctx.beginPath();
        for (let t = 0; t <= T; t++) ctx.lineTo(X(t), Y(q[t]));
        ctx.stroke();
      }
      ctx.restore();
    }

    function result() {
      $("sim-result").innerHTML =
        TXT.sim(sg(q50[T]), sg(q05[T]), sg(q95[T]));
    }

    function play() {
      cancelAnimationFrame(raf);
      simulate();
      $("sim-result").textContent = "";
      if (reduceMotion) { draw(1); result(); return; }
      const start = performance.now(), dur = 1800;
      const step = now => {
        const p = Math.min(1, (now - start) / dur);
        draw(1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(step); else result();
      };
      raf = requestAnimationFrame(step);
    }

    $("sim-replay").addEventListener("click", play);
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => paths && draw(1), 120); });
    play();
    return { play, redraw: () => paths && draw(1) };
  })();

  /* ================= Graphiques du laboratoire (SVG) ================= */
  const W = 620, H = 300, M = { l: 52, r: 18, t: 18, b: 38 };
  const sx = (v, a, b) => M.l + ((v - a) / (b - a)) * (W - M.l - M.r);
  const sy = (v, a, b) => H - M.b - ((v - a) / (b - a)) * (H - M.t - M.b);
  const svg = (title, inner) =>
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${inner}</svg>`;
  const pathFrom = pts => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");

  /* ================= 1. Chain Ladder, triangle modifiable ================= */
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const initial = [
    [1200, 2050, 2380, 2520, 2580, 2600],
    [1300, 2240, 2590, 2750, 2810],
    [1250, 2130, 2480, 2620],
    [1400, 2410, 2800],
    [1450, 2500],
    [1520],
  ];
  let observed = initial.map(r => r.slice());
  const n = years.length;
  const table = $("tri");

  function chainLadder() {
    const ldf = [];
    for (let j = 0; j < n - 1; j++) {
      let num = 0, den = 0;
      for (const row of observed) if (row.length > j + 1) { num += row[j + 1]; den += row[j]; }
      ldf.push(den > 0 ? num / den : 1);
    }
    const full = observed.map(row => {
      const r = row.slice();
      for (let j = r.length; j < n; j++) r.push(r[j - 1] * ldf[j - 1]);
      return r;
    });
    const ultimate = full.map(r => r[n - 1]);
    const paid = observed.map(r => r[r.length - 1]);
    return { ldf, full, ultimate, paid };
  }

  function buildTriangle() {
    const head = `<thead><tr><th scope="col">${TXT.origin}</th>${
      years.map((_, j) => `<th scope="col">${TXT.dev(j + 1)}</th>`).join("")
    }<th scope="col">${TXT.ultimate}</th></tr></thead>`;
    const body = observed.map((row, i) => `<tr><th scope="row">${years[i]}</th>${
      years.map((_, j) => j < row.length
        ? `<td class="obs"><input type="number" inputmode="numeric" min="0" step="10" value="${row[j]}" data-i="${i}" data-j="${j}" aria-label="${TXT.cell(years[i], j + 1)}"></td>`
        : `<td class="proj" data-i="${i}" data-j="${j}"></td>`).join("")
    }<td class="ult" data-u="${i}"></td></tr>`).join("");
    const factors = `<tr class="ldf"><th scope="row">${TXT.factor}</th>${
      years.slice(1).map((_, j) => `<td data-f="${j}"></td>`).join("")
    }<td></td><td></td></tr>`;
    table.innerHTML = head + `<tbody>${body}${factors}</tbody>`;
  }

  function refreshTriangle() {
    const { ldf, full, ultimate, paid } = chainLadder();
    table.querySelectorAll("td.proj").forEach(td => { td.textContent = f0.format(full[td.dataset.i][td.dataset.j]); });
    table.querySelectorAll("td.ult").forEach(td => { td.textContent = f0.format(ultimate[td.dataset.u]); });
    table.querySelectorAll("td[data-f]").forEach(td => { td.textContent = f3.format(ldf[td.dataset.f]); });
    const sum = a => a.reduce((s, v) => s + v, 0);
    $("cl-ibnr").textContent = keur(f0.format(sum(ultimate) - sum(paid)));
    $("cl-ult").textContent = keur(f0.format(sum(ultimate)));
    $("cl-paid").textContent = keur(f0.format(sum(paid)));
  }

  if (table) {
    buildTriangle(); refreshTriangle();
    table.addEventListener("input", e => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      const v = parseFloat(t.value);
      observed[t.dataset.i][t.dataset.j] = Number.isFinite(v) && v >= 0 ? v : 0;
      refreshTriangle();
    });
    $("cl-reset").addEventListener("click", () => { observed = initial.map(r => r.slice()); buildTriangle(); refreshTriangle(); });
  }

  /* ================= 2. Tranche XL sous loi de Pareto généralisée =================
     Au-delà du seuil u, l'excès Y suit une GPD(xi, sigma) : S(y) = (1 + xi·y/sigma)^(-1/xi).
     Coût moyen laissé à la tranche [P, P+L] par sinistre dépassant u :
       intégrale de S entre a = P-u et b = a+L
       = sigma/(1-xi) · [ (1+xi·a/sigma)^(1-1/xi) - (1+xi·b/sigma)^(1-1/xi) ]. */
  const U = 10;
  function xl() {
    const xi = +$("xl-xi").value, sigma = +$("xl-sigma").value, lambda = +$("xl-lambda").value;
    const prio = +$("xl-prio").value, portee = +$("xl-portee").value;
    const S = x => Math.pow(1 + xi * (x - U) / sigma, -1 / xi);
    const G = y => Math.pow(1 + xi * y / sigma, 1 - 1 / xi);
    const a = prio - U, b = a + portee;
    const layer = sigma / (1 - xi) * (G(a) - G(b));
    const prime = lambda * layer;

    $("xl-xi-o").textContent = f2.format(xi);
    $("xl-sigma-o").textContent = f1.format(sigma);
    $("xl-lambda-o").textContent = f1.format(lambda);
    $("xl-prio-o").textContent = f0.format(prio);
    $("xl-portee-o").textContent = f0.format(portee);
    $("xl-prime").textContent = meur(f2.format(prime));
    $("xl-rol").textContent = pct(f1.format(100 * prime / portee));
    $("xl-touch").textContent = pct(f1.format(100 * S(prio)));

    // courbe de survie, ordonnée logarithmique
    const xMax = 210, yMin = -3;
    const X = v => sx(v, U, xMax), Y = p => sy(Math.max(Math.log10(p), yMin), yMin, 0);
    const pts = [];
    for (let x = U; x <= xMax; x += 2) pts.push([X(x), Y(S(x))]);
    let g = "";
    for (const e of [0, -1, -2, -3]) {
      g += `<line class="c-grid" x1="${M.l}" x2="${W - M.r}" y1="${Y(10 ** e)}" y2="${Y(10 ** e)}"/>`;
      g += `<text class="c-text c-text--end" x="${M.l - 8}" y="${Y(10 ** e) + 4}">${pct((e < -2 ? f1 : f0).format(100 * 10 ** e))}</text>`;
    }
    for (const x of [10, 50, 100, 150, 200]) g += `<text class="c-text c-text--mid" x="${X(x)}" y="${H - 12}">${meur(x)}</text>`;
    const x0 = X(prio), x1 = X(Math.min(prio + portee, xMax));
    g += `<rect class="c-layer" x="${x0}" y="${M.t}" width="${Math.max(0, x1 - x0)}" height="${H - M.t - M.b}"/>`;
    g += `<text class="c-text c-text--strong" x="${x0 + 6}" y="${M.t + 16}">${TXT.layer}</text>`;
    g += `<path class="c-line" d="${pathFrom(pts)}"/>`;
    $("xl-chart").innerHTML = svg(TXT.xlTitle, g);
  }

  /* ================= 3. Rente et longévité =================
     Force de mortalité de Makeham : mu(x) = A + B·c^x (paramètres du modèle standard d'AMLCR).
     tpx = exp( -(1-choc) · [ A·t + B·c^x·(c^t - 1)/ln c ] ). */
  const MK = { A: 0.00022, B: 2.7e-6, c: 1.124 };
  function rente() {
    const age = +$("rente-age").value, duree = +$("rente-duree").value;
    const taux = +$("rente-taux").value / 100, choc = +$("rente-choc").value / 100;
    const tpx = (t, s) => Math.exp(-(1 - s) * (MK.A * t + MK.B * Math.pow(MK.c, age) * (Math.pow(MK.c, t) - 1) / Math.log(MK.c)));
    const vap = s => { let a = 0; for (let k = 1; k <= duree; k++) a += Math.pow(1 + taux, -k) * tpx(k, s); return a; };
    const base = 10000 * vap(0), choque = 10000 * vap(choc);

    $("rente-age-o").textContent = TXT.age(age);
    $("rente-duree-o").textContent = TXT.yrs(duree);
    $("rente-taux-o").textContent = pct(f2.format(100 * taux));
    $("rente-choc-o").textContent = pct(f0.format(100 * choc));
    $("rente-base").textContent = eur(f0.format(base));
    $("rente-choque").textContent = eur(f0.format(choque));
    $("rente-ecart").textContent = "+" + pct(f2.format(100 * (choque / base - 1)));

    const X = t => sx(t, 0, duree), Y = p => sy(p, 0, 1);
    const curve = s => { const p = []; for (let t = 0; t <= duree; t += 0.5) p.push([X(t), Y(tpx(t, s))]); return p; };
    let g = "";
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      g += `<line class="c-grid" x1="${M.l}" x2="${W - M.r}" y1="${Y(p)}" y2="${Y(p)}"/>`;
      g += `<text class="c-text c-text--end" x="${M.l - 8}" y="${Y(p) + 4}">${pct(f0.format(100 * p))}</text>`;
    }
    const stepX = duree <= 10 ? 1 : duree <= 20 ? 5 : 10;
    for (let t = 0; t <= duree; t += stepX) g += `<text class="c-text c-text--mid" x="${X(t)}" y="${H - 12}">${TXT.age(age + t)}</text>`;
    const shocked = curve(choc), basePts = curve(0);
    g += `<path class="c-area" d="${pathFrom(shocked)} L${X(duree)} ${Y(0)} L${X(0)} ${Y(0)} Z"/>`;
    g += `<path class="c-line c-line--base" d="${pathFrom(basePts)}"/>`;
    g += `<path class="c-line" d="${pathFrom(shocked)}"/>`;
    g += `<text class="c-text c-text--strong" x="${M.l + 10}" y="${H - M.b - 30}">${TXT.alive}</text>`;
    g += `<text class="c-text" x="${M.l + 10}" y="${H - M.b - 12}">${TXT.aliveKey}</text>`;
    $("rente-chart").innerHTML = svg(TXT.renteTitle, g);
  }

  /* ================= 4. Provision IFRS 9 =================
     Perte attendue de l'année t : S(t-1)·PD·LGD·EAD(t)·v^t,
     avec S(t) = (1-PD)^t et EAD(t) = EAD·(1 - (t-1)/T).
     Stade 1 : l'année 1. Stade 2 : la somme sur toute la durée restante. */
  function ecl() {
    const ead = +$("ecl-ead").value, pd = +$("ecl-pd").value / 100, lgd = +$("ecl-lgd").value / 100;
    const T = +$("ecl-mat").value, tie = +$("ecl-tie").value / 100;
    const marg = [];
    let surv = 1;
    for (let t = 1; t <= T; t++) {
      marg.push(surv * pd * lgd * ead * (1 - (t - 1) / T) * Math.pow(1 + tie, -t));
      surv *= 1 - pd;
    }
    const s1 = marg[0], s2 = marg.reduce((a, b) => a + b, 0);

    $("ecl-ead-o").textContent = keur(f0.format(ead));
    $("ecl-pd-o").textContent = pct(f1.format(100 * pd));
    $("ecl-lgd-o").textContent = pct(f0.format(100 * lgd));
    $("ecl-mat-o").textContent = TXT.yrs(T);
    $("ecl-tie-o").textContent = pct(f2.format(100 * tie));
    $("ecl-s1").textContent = keur(f2.format(s1));
    $("ecl-s2").textContent = keur(f2.format(s2));
    $("ecl-ratio").textContent = "× " + f1.format(s2 / s1);

    const yMax = Math.max(...marg) * 1.15;
    const bw = (W - M.l - M.r) / T;
    let g = "";
    for (const k of [0, 0.5, 1]) {
      const v = yMax * k / 1.15;
      g += `<line class="c-grid" x1="${M.l}" x2="${W - M.r}" y1="${sy(v, 0, yMax)}" y2="${sy(v, 0, yMax)}"/>`;
      g += `<text class="c-text c-text--end" x="${M.l - 8}" y="${sy(v, 0, yMax) + 4}">${f2.format(v)}</text>`;
    }
    marg.forEach((v, i) => {
      const y = sy(v, 0, yMax);
      g += `<rect class="c-bar${i === 0 ? " c-bar--first" : ""}" x="${M.l + i * bw + bw * 0.14}" y="${y}" width="${bw * 0.72}" height="${H - M.b - y}" rx="2"/>`;
    });
    const stepX = T <= 10 ? 1 : T <= 20 ? 2 : 5;
    for (let t = 1; t <= T; t += stepX) g += `<text class="c-text c-text--mid" x="${M.l + (t - 0.5) * bw}" y="${H - 12}">${TXT.yr(t)}</text>`;
    g += `<text class="c-text c-text--strong c-text--end" x="${W - M.r - 6}" y="${M.t + 14}">${TXT.eclHead}</text>`;
    g += `<text class="c-text c-text--end" x="${W - M.r - 6}" y="${M.t + 32}">${TXT.eclKey}</text>`;
    $("ecl-chart").innerHTML = svg(TXT.eclTitle, g);
  }

  [["xl-form", xl], ["rente-form", rente], ["ecl-form", ecl]].forEach(([id, fn]) => {
    const form = $(id);
    if (!form) return;
    form.addEventListener("input", fn);
    form.addEventListener("submit", e => e.preventDefault());
    fn();
  });

  /* ---------- Onglets du laboratoire ---------- */
  const tabs = Array.from(document.querySelectorAll(".lab__tab"));
  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ================= Projets : filtre par domaine ================= */
  const chips = Array.from(document.querySelectorAll(".chip"));
  const items = Array.from(document.querySelectorAll("#projets [data-dom]"));
  const grid = document.querySelector("#projets .projects");
  const subhead = $("t-plateformes");
  function filter(key) {
    let shown = 0;
    items.forEach(el => {
      const ok = key === "tous" || el.dataset.dom.split(" ").includes(key);
      el.hidden = !ok;
      if (ok) shown++;
    });
    grid.hidden = subhead.hidden = grid.querySelectorAll(".project:not([hidden])").length === 0;
    chips.forEach(c => c.setAttribute("aria-pressed", String(c.dataset.filter === key)));
    $("filtre-compte").textContent = TXT.projects(shown);
  }
  chips.forEach(c => c.addEventListener("click", () => filter(c.dataset.filter)));
  if (chips.length) filter("tous");

  /* ================= Projets : galeries de trois images =================
     Une miniature remplace la grande image ; la grande image ouvre la visionneuse.
     Sans script, les liens ouvrent simplement les images. */
  const box = document.createElement("dialog");
  box.className = "lightbox";
  box.innerHTML = `<figure class="lightbox__fig"><img class="lightbox__img" alt="">
    <figcaption class="lightbox__bar"><span class="lightbox__cap"></span><span class="lightbox__count"></span>
    <button type="button" data-step="-1">${TXT.prev}</button><button type="button" data-step="1">${TXT.next}</button>
    <button type="button" data-close>${TXT.close}</button></figcaption></figure>`;
  document.body.appendChild(box);
  const boxImg = box.querySelector("img"), boxCap = box.querySelector(".lightbox__cap"), boxCount = box.querySelector(".lightbox__count");
  let boxItems = [], boxIndex = 0;
  function showInBox(i) {
    boxIndex = (i + boxItems.length) % boxItems.length;
    const t = boxItems[boxIndex];
    boxImg.src = t.href; boxImg.alt = t.dataset.caption;
    boxCap.textContent = t.dataset.caption;
    boxCount.textContent = TXT.of(boxIndex + 1, boxItems.length);
  }
  box.addEventListener("click", e => {
    const step = e.target.closest("[data-step]");
    if (step) showInBox(boxIndex + Number(step.dataset.step));
    else if (e.target.closest("[data-close]") || e.target === box) box.close();
  });
  box.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") showInBox(boxIndex + 1);
    if (e.key === "ArrowLeft") showInBox(boxIndex - 1);
  });

  document.querySelectorAll(".gallery").forEach(g => {
    const main = g.querySelector(".gallery__main");
    const img = main.querySelector("img");
    const cap = g.querySelector(".gallery__caption");
    const thumbs = Array.from(g.querySelectorAll(".gallery__thumb"));
    thumbs.forEach(t => t.addEventListener("click", e => {
      e.preventDefault();
      thumbs.forEach(o => o.removeAttribute("aria-current"));
      t.setAttribute("aria-current", "true");
      main.href = img.src = t.href;
      img.alt = cap.textContent = t.dataset.caption;
    }));
    main.addEventListener("click", e => {
      if (typeof box.showModal !== "function") return;
      e.preventDefault();
      boxItems = thumbs;
      showInBox(thumbs.findIndex(t => t.getAttribute("aria-current") === "true"));
      box.showModal();
    });
  });

  /* ================= Thème clair ou sombre =================
     Suit le réglage de l'appareil, sauf si le visiteur a choisi ; le choix est retenu.
     Le libellé du bouton annonce le thème vers lequel il bascule. */
  const themeBtn = $("theme-toggle");
  const themeLabel = themeBtn && themeBtn.querySelector(".nav__theme-label");
  const systemLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : { matches: false };
  const currentTheme = () => document.documentElement.dataset.theme || (systemLight.matches ? "light" : "dark");
  function syncTheme() {
    const light = currentTheme() === "light";
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", light ? TXT.toDark : TXT.toLight);
      themeBtn.title = themeBtn.getAttribute("aria-label");
      if (themeLabel) themeLabel.textContent = light ? TXT.dark : TXT.light;
    }
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(m => m.setAttribute("content", light ? "#F5F7FA" : "#0B1420"));
    if (sim) sim.redraw();
  }
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) { /* stockage indisponible : le choix vaut pour la visite */ }
    syncTheme();
  });
  const onSystemChange = () => { if (!document.documentElement.dataset.theme) syncTheme(); };
  if (systemLight.addEventListener) systemLight.addEventListener("change", onSystemChange);
  else if (systemLight.addListener) systemLight.addListener(onSystemChange);
  syncTheme();

  /* ================= Assistant =================
     Recherche par mots-clés dans des réponses préparées. Aucun modèle de langage, aucun appel réseau. */
  const KB_FR = [
    { k: "disponible disponibilite quand stage debut date commencer pfe fin etudes duree recherche cherche poste",
      a: "<p>Je cherche un <strong>stage de fin d’études de 6 mois, à partir de janvier 2027</strong>, en actuariat, en modélisation des risques ou en data science.</p><p>Le plus simple est de m’écrire : <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
    { k: "qui es tu presente presentation profil yassine resume bref",
      a: "<p>Je suis Yassine Selmi, élève ingénieur en data science à ESPRIT (Tunis) et étudiant en Master Actuariat à Le Mans Université. Les deux diplômes sont attendus en 2027.</p><p>Je construis des outils d’IFRS 17, de provisionnement et de tarification où le code calcule, où le modèle de langage explique, et où chaque chiffre est vérifié.</p>" },
    { k: "formation etudes diplome ecole universite master esprit mans ingenieur bac cursus",
      a: "<p><strong>Master Actuariat</strong>, Le Mans Université, en double diplôme avec ESPRIT (2025 à 2027) : tarification, provisionnement, valeurs extrêmes, Solvabilité II, IFRS 17.</p><p><strong>Cycle ingénieur en data science</strong>, ESPRIT, Tunis (2022 à 2027). Baccalauréat mathématiques, mention bien (2021).</p>" },
    { k: "competence competences technique outils langage python r sql stack sais savoir maitrise",
      a: "<p><strong>Actuariat</strong> : tarification GLM, provisionnement (Chain Ladder, Mack, Bornhuetter-Ferguson, bootstrap), valeurs extrêmes, réassurance XL, Solvabilité II, IFRS 17 et IFRS 9.</p><p><strong>Data et outils</strong> : R, Python, SQL, machine learning, LLM et RAG, Shiny, Quarto, FastAPI, Docker, Git.</p><p>Le détail est dans la section <a href='#competences'>Compétences</a>.</p>" },
    { k: "ifrs 17 copilot csm marge note agent rag langgraph multi llm",
      a: "<p><strong>IFRS 17 Copilot</strong> est un copilote multi-agent : il lit un dossier d’assurance, calcule la marge sur services contractuels et le passif pour sinistres survenus, puis rédige une note citée et vérifiée, soumise à validation humaine.</p><p>Résultat clé : 50 dossiers sur 50 identiques au centime à un script R indépendant. <a href='https://github.com/selyassine/ifrs17-copilot'>Voir le code</a>.</p>" },
    { k: "ecl9 ifrs 9 credit risque pd lgd ead provision freddie lightgbm logistique banque ecl",
      a: "<p><strong>ecl9</strong> répond à une question : le machine learning change-t-il la provision IFRS 9 ? Sur les prêts Freddie Mac, entraînés avant 2006 et testés sur la crise, LightGBM provisionne 49 % de plus que la régression logistique au 31/12/2007. Mais les deux modèles ne couvrent que 9 à 13 % des pertes constatées ensuite.</p><p><a href='https://selyassine.github.io/ecl9/'>Lire la note</a> ou <a href='https://github.com/selyassine/ecl9'>voir le code</a>. J’ai aussi fait un stage en risque de crédit IFRS 9 à ESPRIT (pôle RDI) à l’été 2026.</p>" },
    { k: "climatxl climat reassurance catastrophe gpd valeurs extremes noaa tranche xl shiny evt",
      a: "<p><strong>climatXL</strong> demande si le climat rend la réassurance catastrophe plus chère. Sur les dommages NOAA 1996-2024, la prime d’une tranche 5 Md$ xs 10 Md$ augmenterait de 27 % d’ici 2035, mais l’intervalle va de −59 % à +142 % : l’effet n’est pas démontré, et c’est la conclusion du rapport.</p><p><a href='https://selyassine.github.io/climatXL/'>Lire le rapport</a>, <a href='https://climatxl.shinyapps.io/climatXL/'>ouvrir l’application</a> ou essayer la tranche XL dans le <a href='#laboratoire'>laboratoire</a>.</p>" },
    { k: "siap non vie auto tarification glm fraude ibnr yolo vision dommages plateforme excel",
      a: "<p><strong>SIAP</strong> est une plateforme d’assurance non-vie : tarification GLM et LightGBM sur 678 000 polices, détection de fraude (AUC 0,82), IBNR par Chain Ladder, Mack et bootstrap, expertise de dommages par vision. <a href='https://github.com/selyassine/SIAP'>Voir le code</a>.</p>" },
    { k: "vita vitaai vie mortalite lee carter scr solvabilite longevite rente alm orsa",
      a: "<p><strong>VitaAI</strong> simule une compagnie d’assurance-vie en 15 modules : mortalité Lee-Carter, provisions, SCR sur courbes EIOPA, VaR de longévité à 99,5 %, ALM et ORSA. <a href='https://github.com/selyassine/VITA'>Voir le code</a>.</p><p>Sur le même thème, un projet de groupe du master mesure le coût de la longévité sur une rente : la génération 1950 coûte 5,25 % de plus que celle de 1935.</p>" },
    { k: "claude actuaire skill moteur calcul banc essai mack",
      a: "<p><strong>claude_actuaire</strong> est un moteur de calcul actuariel livré comme skill pour Claude. Les calculs sont faits par des scripts Python testés contre des résultats publiés : 59 valeurs justes sur 59 au banc d’essai, contre 47 sans code. <a href='https://github.com/selyassine/claude_actuaire'>Voir le code</a>.</p>" },
    { k: "quant quantai trading finance portefeuille markowitz bourse mlops titanic pipeline jenkins docker",
      a: "<p><strong>QuantAI</strong> est une plateforme de paper trading : ensemble LightGBM, LSTM et Transformer, optimisation Markowitz et Black-Litterman, agent soumis à validation humaine. <strong>Titanic MLOps</strong> est un pipeline CI/CD complet (GitHub Actions, GHCR, Jenkins, Prefect).</p><p>Les deux sont dans la section <a href='#projets'>Projets</a>, filtre « Data et IA ».</p>" },
    { k: "projet projets realisation travaux meilleur principal github portfolio",
      a: "<p>Trois études répondent chacune à une question : <strong>IFRS 17 Copilot</strong>, <strong>ecl9</strong> (IFRS 9) et <strong>climatXL</strong> (réassurance et climat). Viennent ensuite SIAP, VitaAI, claude_actuaire, un projet longévité, QuantAI et un pipeline MLOps.</p><p>Tout est dans la section <a href='#projets'>Projets</a>, avec un filtre par domaine. Demandez-moi un projet par son nom pour le détail.</p>" },
    { k: "certification certifications certificat nvidia hedera sas aig forage datacamp 365",
      a: "<p>Onze certifications et attestations : cinq NVIDIA Deep Learning Institute (RAG, NLP, détection d’anomalies, LLM), trois Hedera, Credit Risk Modeling in Python (365 Financial Analyst), AIG Actuarial Analyst Job Simulation (Forage) et Foundations of Insurance and the IFRS 17 Standard (SAS).</p><p>La liste datée est dans la section <a href='#certifications'>Certifications</a>.</p>" },
    { k: "langue langues anglais francais arabe english parle niveau",
      a: "<p>Arabe : langue maternelle. Français : B2, mes études sont en français. Anglais : B2.</p>" },
    { k: "contact contacter email mail telephone numero linkedin joindre ecrire appeler",
      a: "<p>E-mail : <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a><br>Téléphone : <a href='tel:+21696919365'>+216 96 919 365</a><br><a href='https://www.linkedin.com/in/selmi-yassine-437503311/'>LinkedIn</a> et <a href='https://github.com/selyassine'>GitHub</a>.</p>" },
    { k: "cv curriculum telecharger pdf resume",
      a: "<p>Mon CV est ici : <a href='" + BASE + "assets/CV_Yassine_Selmi.pdf' download>télécharger le PDF</a>.</p>" },
    { k: "experience stage stages entreprise travail professionnel nour telecom poste rdi",
      a: "<p><strong>Été 2026</strong> : stage en risque de crédit IFRS 9 à ESPRIT (pôle RDI), estimation de la PD, de la LGD et de l’EAD et calcul de l’ECL par stade.</p><p><strong>Été 2025</strong> : stage data science et IA chez Nour Expert Telecom, modèle NLP CamemBERT mis en production (FastAPI, Docker, CI/CD).</p><p><strong>Juin 2024</strong> : stage d’observation à La Poste Tunisienne.</p>" },
    { k: "methode verifier verification validation rigueur fiable confiance test tests qualite erreur",
      a: "<p>Trois habitudes : je reproduis d’abord un résultat publié (Mack 1993, McNeil 1997) et je fais recalculer par un second code indépendant ; je publie aussi les résultats négatifs ; et dans mes outils d’IA, le modèle de langage ne calcule jamais, chaque chiffre sort d’un code testé.</p><p>Voir la section <a href='#methode'>Méthode</a>.</p>" },
    { k: "laboratoire calcul calculer simulateur simulation interactif essayer chain ladder triangle demo",
      a: "<p>Le <a href='#laboratoire'>laboratoire</a> fait tourner quatre calculs dans cette page : un triangle Chain Ladder modifiable, la prime d’une tranche XL sous loi GPD, le coût de la longévité sur une rente, et l’effet de falaise IFRS 9 entre stade 1 et stade 2.</p>" },
    { k: "ou habite ville pays tunis tunisie localisation mobilite europe france deplacer",
      a: "<p>Je suis basé à Tunis, en Tunisie. Pour toute question de lieu ou de modalités de stage, écrivez-moi : <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
    { k: "bonjour salut hello bonsoir hey coucou",
      a: "<p>Bonjour. Posez-moi une question sur mon parcours, mes projets, mes compétences ou ma disponibilité.</p>" },
    { k: "merci thanks super parfait",
      a: "<p>Avec plaisir. Si vous voulez aller plus loin, écrivez-moi : <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
  ];
  const KB_EN = [
    { k: "available availability when start starting internship date begin final year duration looking position role join hire",
      a: "<p>I am looking for a <strong>6-month final-year internship, starting January 2027</strong>, in actuarial science, risk modelling or data science.</p><p>The simplest is to write to me: <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
    { k: "who are you introduce introduction profile yourself yassine summary",
      a: "<p>I am Yassine Selmi, a data science engineering student at ESPRIT (Tunis) and an MSc Actuarial Science student at Le Mans Université. Both degrees are expected in 2027.</p><p>I build IFRS 17, reserving and pricing tools where code calculates, the language model explains, and every number is checked.</p>" },
    { k: "education studies study studied studying degree school university master msc esprit mans engineer engineering baccalaureate",
      a: "<p><strong>MSc Actuarial Science</strong>, Le Mans Université, double degree with ESPRIT (2025 to 2027): pricing, reserving, extreme values, Solvency II, IFRS 17.</p><p><strong>Engineering degree in data science</strong>, ESPRIT, Tunis (2022 to 2027). Baccalaureate in mathematics, with honours (2021).</p>" },
    { k: "skill skills technical tools language python sql stack know technologies programming",
      a: "<p><strong>Actuarial</strong>: GLM pricing, reserving (Chain Ladder, Mack, Bornhuetter-Ferguson, bootstrap), extreme values, XL reinsurance, Solvency II, IFRS 17 and IFRS 9.</p><p><strong>Data and tools</strong>: R, Python, SQL, machine learning, LLMs and RAG, Shiny, Quarto, FastAPI, Docker, Git.</p><p>Details are in the <a href='#competences'>Skills</a> section.</p>" },
    { k: "ifrs 17 copilot csm margin memo agent rag langgraph multi llm",
      a: "<p><strong>IFRS 17 Copilot</strong> is a multi-agent copilot: it reads an insurance file, computes the contractual service margin and the liability for incurred claims, then writes a cited, checked memo submitted for human approval.</p><p>Key result: 50 files out of 50 identical to the cent to an independent R script. <a href='https://github.com/selyassine/ifrs17-copilot'>See the code</a>.</p>" },
    { k: "ecl9 ifrs 9 credit risk pd lgd ead allowance provision freddie lightgbm logistic bank ecl",
      a: "<p><strong>ecl9</strong> answers one question: does machine learning change the IFRS 9 allowance? On Freddie Mac loans, trained before 2006 and tested on the crisis, LightGBM sets aside 49% more than logistic regression at 31 December 2007. But both models cover only 9 to 13% of the losses realised afterwards.</p><p><a href='https://selyassine.github.io/ecl9/'>Read the note</a> (in French) or <a href='https://github.com/selyassine/ecl9'>see the code</a>. I also did an IFRS 9 credit risk internship at ESPRIT (RDI department) in summer 2026.</p>" },
    { k: "climatxl climate reinsurance catastrophe gpd extreme values noaa layer xl shiny evt",
      a: "<p><strong>climatXL</strong> asks whether climate makes catastrophe reinsurance more expensive. On NOAA damages for 1996-2024, the premium of a $5bn xs $10bn layer would rise by 27% by 2035, but the interval runs from −59% to +142%: the effect is not demonstrated, and that is the conclusion of the report.</p><p><a href='https://selyassine.github.io/climatXL/'>Read the report</a> (in French), <a href='https://climatxl.shinyapps.io/climatXL/'>open the app</a>, or try the XL layer in the <a href='#laboratoire'>lab</a>.</p>" },
    { k: "siap non life motor pricing glm fraud ibnr yolo vision damage platform excel",
      a: "<p><strong>SIAP</strong> is a non-life insurance platform: GLM and LightGBM pricing on 678,000 policies, fraud detection (AUC 0.82), IBNR by Chain Ladder, Mack and bootstrap, and damage assessment by computer vision. <a href='https://github.com/selyassine/SIAP'>See the code</a>.</p>" },
    { k: "vita vitaai life mortality lee carter scr solvency longevity annuity alm orsa",
      a: "<p><strong>VitaAI</strong> simulates a life insurer in 15 modules: Lee-Carter mortality, reserves, SCR on EIOPA curves, 99.5% longevity VaR, ALM and ORSA. <a href='https://github.com/selyassine/VITA'>See the code</a>.</p><p>On the same theme, a group project of the master’s measures the cost of longevity on an annuity: the 1950 generation costs 5.25% more than the 1935 one.</p>" },
    { k: "claude actuaire skill engine calculation benchmark mack",
      a: "<p><strong>claude_actuaire</strong> is an actuarial calculation engine shipped as a skill for Claude. Calculations are done by Python scripts tested against published results: 59 correct values out of 59 on the benchmark, against 47 without code. <a href='https://github.com/selyassine/claude_actuaire'>See the code</a>.</p>" },
    { k: "quant quantai trading finance portfolio markowitz stock mlops titanic pipeline jenkins docker",
      a: "<p><strong>QuantAI</strong> is a paper-trading platform: a LightGBM, LSTM and Transformer ensemble, Markowitz and Black-Litterman optimisation, and an agent that needs human approval. <strong>Titanic MLOps</strong> is a complete CI/CD pipeline (GitHub Actions, GHCR, Jenkins, Prefect).</p><p>Both are in the <a href='#projets'>Projects</a> section, under the “Data and AI” filter.</p>" },
    { k: "project projects work best main github portfolio built",
      a: "<p>Three studies each answer one question: <strong>IFRS 17 Copilot</strong>, <strong>ecl9</strong> (IFRS 9) and <strong>climatXL</strong> (reinsurance and climate). Then come SIAP, VitaAI, claude_actuaire, a longevity project, QuantAI and an MLOps pipeline.</p><p>Everything is in the <a href='#projets'>Projects</a> section, with a filter by field. Ask me about a project by name for details.</p>" },
    { k: "certification certifications certificate certificates nvidia hedera sas aig forage datacamp 365",
      a: "<p>Eleven certifications and certificates: five from the NVIDIA Deep Learning Institute (RAG, NLP, anomaly detection, LLMs), three from Hedera, Credit Risk Modeling in Python (365 Financial Analyst), AIG Actuarial Analyst Job Simulation (Forage) and Foundations of Insurance and the IFRS 17 Standard (SAS).</p><p>The dated list is in the <a href='#certifications'>Certifications</a> section.</p>" },
    { k: "language languages english french arabic speak level fluent",
      a: "<p>Arabic: native. French: B2, my studies are in French. English: B2.</p>" },
    { k: "contact email mail phone number linkedin reach write call touch",
      a: "<p>Email: <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a><br>Phone: <a href='tel:+21696919365'>+216 96 919 365</a><br><a href='https://www.linkedin.com/in/selmi-yassine-437503311/'>LinkedIn</a> and <a href='https://github.com/selyassine'>GitHub</a>.</p>" },
    { k: "cv resume curriculum download pdf",
      a: "<p>My CV is here, in French: <a href='" + BASE + "assets/CV_Yassine_Selmi.pdf' download>download the PDF</a>.</p>" },
    { k: "experience internship internships company job professional nour telecom worked rdi",
      a: "<p><strong>Summer 2026</strong>: IFRS 9 credit risk internship at ESPRIT (RDI department), estimating PD, LGD and EAD and computing ECL by stage.</p><p><strong>Summer 2025</strong>: mobile and AI developer internship at Nour Expert Telecom, with a CamemBERT fault classifier served by FastAPI, Docker and CI/CD.</p><p><strong>June 2024</strong>: observation internship at La Poste Tunisienne.</p>" },
    { k: "method check checking verify verification validation rigour rigor reliable trust test tests quality error",
      a: "<p>Three habits: I first reproduce a published result (Mack 1993, McNeil 1997) and have a second, independent code recompute the output; I also publish negative results; and in my AI tools the language model never calculates, every number comes out of tested code.</p><p>See the <a href='#methode'>Method</a> section.</p>" },
    { k: "lab laboratory calculate calculator simulator simulation interactive try chain ladder triangle demo",
      a: "<p>The <a href='#laboratoire'>lab</a> runs four calculations inside this page: an editable Chain Ladder triangle, the premium of an XL layer under a GPD, the cost of longevity on an annuity, and the IFRS 9 cliff effect between stage 1 and stage 2.</p>" },
    { k: "where live city country tunis tunisia location based relocate europe france remote",
      a: "<p>I am based in Tunis, Tunisia. For any question about location or internship arrangements, write to me: <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
    { k: "hello hi hey greetings morning evening",
      a: "<p>Hello. Ask me about my background, my projects, my skills or my availability.</p>" },
    { k: "thanks thank great perfect cheers",
      a: "<p>You’re welcome. To take it further, write to me: <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>" },
  ];
  const KB = EN ? KB_EN : KB_FR;
  const SUGGESTIONS = EN
    ? ["When are you available?", "What is your best project?", "How do you check your calculations?", "Tell me about ecl9", "How can I contact you?"]
    : ["Quand es-tu disponible ?", "Quel est ton meilleur projet ?", "Comment vérifies-tu tes calculs ?", "Parle-moi d’ecl9", "Comment te contacter ?"];
  const BOT = EN ? {
    hello: "<p>Hello, I am this portfolio’s assistant. Ask about Yassine’s background, projects or availability. I answer on his behalf, from the content of this site.</p>",
    none: "<p>I have no prepared answer to that question, and I would rather not make one up.</p><p>Try one of the suggested questions, or write to me directly: <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>",
  } : {
    hello: "<p>Bonjour, je suis l’assistant de ce portfolio. Posez une question sur le parcours, les projets ou la disponibilité de Yassine. Je réponds à sa place, à partir du contenu de ce site.</p>",
    none: "<p>Je n’ai pas de réponse préparée à cette question, et je préfère ne rien inventer.</p><p>Essayez une des questions proposées, ou écrivez-moi directement : <a href='mailto:selmi.yassine@esprit.tn'>selmi.yassine@esprit.tn</a>.</p>",
  };
  const STOP = new Set((EN
    ? "the a an of to in on for with and or is are am was be do does did you your yours me my i we us it its this that what which who how can could would will have has had at by from as not no so if tell about please s t m re d ll ve"
    : "le la les un une des de du d l et ou a au aux en dans sur pour par avec que qui quoi quel quelle quels quelles est es suis sont tu te ton ta tes moi me mon ma mes je il elle on nous vous ce cet cette ces se sa son ses y ne pas plus comment peux peut as avez ai fais fait dis dire c s t m n j qu"
  ).split(" "));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const KBN = KB.map(e => ({ words: norm(e.k).split(" "), a: e.a }));

  function answer(question) {
    const words = norm(question).split(" ").filter(w => w && !STOP.has(w));
    let best = null, bestScore = 0;
    for (const e of KBN) {
      let score = 0;
      for (const w of words) {
        if (e.words.includes(w)) score += w.length > 3 ? 2 : 1.5;
        else if (w.length > 4 && e.words.some(k => k.length > 4 && (k.startsWith(w.slice(0, 5)) || w.startsWith(k.slice(0, 5))))) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (best && bestScore >= 1.5) return best.a;
    return BOT.none;
  }

  const bot = $("bot"), botToggle = $("bot-toggle"), botLog = $("bot-log"), botInput = $("bot-input");
  if (bot) {
    const say = (html, who) => {
      const div = document.createElement("div");
      div.className = "bot__msg bot__msg--" + who;
      if (who === "me") div.textContent = html; else div.innerHTML = html;
      botLog.appendChild(div);
      botLog.scrollTop = botLog.scrollHeight;
    };
    const ask = q => { say(q, "me"); say(answer(q), "bot"); };
    const open = on => {
      bot.hidden = !on;
      botToggle.setAttribute("aria-expanded", String(on));
      if (on) {
        if (!botLog.childElementCount) say(BOT.hello, "bot");
        botInput.focus();
      } else botToggle.focus();
    };
    SUGGESTIONS.forEach(s => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = s;
      b.addEventListener("click", () => ask(s));
      $("bot-chips").appendChild(b);
    });
    botToggle.addEventListener("click", () => open(true));
    $("bot-close").addEventListener("click", () => open(false));
    bot.addEventListener("keydown", e => { if (e.key === "Escape") open(false); });
    bot.addEventListener("click", e => { if (e.target.closest("a[href^='#']")) open(false); });
    $("bot-form").addEventListener("submit", e => {
      e.preventDefault();
      const q = botInput.value.trim();
      if (!q) return;
      botInput.value = "";
      ask(q);
    });
  }

  /* ================= Navigation ================= */
  const nav = document.querySelector(".nav");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
    if (botToggle) botToggle.classList.toggle("is-visible", window.scrollY > window.innerHeight * .6);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $("nav-links"), navToggle = $("nav-toggle");
  const setMenu = on => { navLinks.classList.toggle("is-open", on); navToggle.setAttribute("aria-expanded", String(on)); };
  navToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("is-open")));
  navLinks.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });

  // section en cours de lecture
  const links = Array.from(navLinks.querySelectorAll("a[href^='#']"));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.toggleAttribute("aria-current", false));
      const l = links.find(a => a.getAttribute("href") === "#" + en.target.id);
      if (l) l.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach(l => { const s = document.querySelector(l.getAttribute("href")); if (s) spy.observe(s); });

  /* ================= Formulaire : prépare un vrai e-mail ================= */
  const form = $("form"), error = $("form-error");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(form);
    const nom = String(data.get("nom") || "").trim();
    const sujet = String(data.get("sujet") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!nom || !sujet || !message) {
      error.hidden = false;
      (!nom ? form.nom : !sujet ? form.sujet : form.message).focus();
      return;
    }
    error.hidden = true;
    window.location.href =
      `mailto:selmi.yassine@esprit.tn?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(message + "\n\n" + nom)}`;
  });

  $("annee").textContent = new Date().getFullYear();
})();
