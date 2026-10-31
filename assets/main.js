/* Portfolio de Yassine Selmi : triangle Chain Ladder, navigation, formulaire. */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const fmt3 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  /* ---------- Triangle de développement ----------
     Paiements cumulés illustratifs (milliers d'euros), années de survenance 2019 à 2024.
     Les facteurs et projections sont calculés ici, par la méthode Chain Ladder. */
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const observed = [
    [1200, 2050, 2380, 2520, 2580, 2600],
    [1300, 2240, 2590, 2750, 2810],
    [1250, 2130, 2480, 2620],
    [1400, 2410, 2800],
    [1450, 2500],
    [1520],
  ];
  const n = years.length;

  // Facteurs de développement pondérés : somme(colonne j+1) / somme(colonne j)
  const ldf = [];
  for (let j = 0; j < n - 1; j++) {
    let num = 0, den = 0;
    for (const row of observed) {
      if (row.length > j + 1) { num += row[j + 1]; den += row[j]; }
    }
    ldf.push(num / den);
  }

  // Triangle complété
  const full = observed.map(row => {
    const r = row.slice();
    for (let j = r.length; j < n; j++) r.push(r[j - 1] * ldf[j - 1]);
    return r;
  });
  const ultimate = full.map(r => r[n - 1]);
  const latest = observed.map(r => r[r.length - 1]);
  const reserve = ultimate.reduce((s, u, i) => s + u - latest[i], 0);

  const table = document.getElementById("tri");
  const result = document.getElementById("tri-result");
  const replay = document.getElementById("tri-replay");

  function build() {
    const head = `<thead><tr><th scope="col">Survenance</th>${
      years.map((_, j) => `<th scope="col">Dév. ${j + 1}</th>`).join("")
    }<th scope="col">Ultime</th></tr></thead>`;
    const body = full.map((row, i) => `<tr><th scope="row">${years[i]}</th>${
      row.map((v, j) => {
        const kind = j < observed[i].length ? "obs" : "proj";
        return `<td class="${kind} is-hidden" data-col="${j}">${fmt.format(v)}</td>`;
      }).join("")
    }<td class="ult is-hidden">${fmt.format(ultimate[i])}</td></tr>`).join("");
    const factors = `<tr class="ldf"><th scope="row">Facteur</th>${
      ldf.map(f => `<td class="is-hidden">${fmt3.format(f)}</td>`).join("")
    }<td></td><td></td></tr>`;
    table.innerHTML = head + `<tbody>${body}${factors}</tbody>`;
    table.setAttribute("aria-label",
      `Triangle de paiements cumulés de ${years[0]} à ${years[n - 1]}, complété par Chain Ladder. Provision estimée : ${fmt.format(reserve)} milliers d'euros.`);
  }

  function show(cells, delay, step) {
    cells.forEach((c, k) => setTimeout(() => {
      c.classList.remove("is-hidden");
      c.classList.add("is-in");
    }, delay + k * step));
    return delay + cells.length * step;
  }

  function play() {
    build();
    result.textContent = "";
    const q = s => Array.from(table.querySelectorAll(s));
    const finish = () => {
      result.innerHTML = `Provision pour sinistres survenus non payés : <strong>${fmt.format(reserve)} k€</strong>, pour une charge ultime de ${fmt.format(ultimate.reduce((a, b) => a + b, 0))} k€.`;
    };
    if (reduceMotion) {
      q(".is-hidden").forEach(c => c.classList.remove("is-hidden"));
      finish();
      return;
    }
    // 1. observé, ligne par ligne ; 2. facteurs ; 3. projections, colonne par colonne ; 4. ultimes
    let t = show(q("td.obs"), 200, 45);
    t = show(q(".ldf td.is-hidden"), t + 250, 140);
    const proj = q("td.proj").sort((a, b) => a.dataset.col - b.dataset.col);
    t = show(proj, t + 250, 110);
    t = show(q("td.ult"), t + 200, 70);
    setTimeout(finish, t + 150);
  }

  if (table) {
    // Le calcul démarre quand le triangle entre à l'écran
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { play(); io.disconnect(); }
    }, { threshold: 0.35 });
    build();
    io.observe(table);
    replay.addEventListener("click", play);
  }

  /* ---------- Navigation : filet sous la barre au défilement ---------- */
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Formulaire : prépare un vrai e-mail ---------- */
  const form = document.getElementById("form");
  const error = document.getElementById("form-error");
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
    const body = `${message}\n\n${nom}`;
    window.location.href =
      `mailto:selmi.yassine@esprit.tn?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById("annee").textContent = new Date().getFullYear();
})();
