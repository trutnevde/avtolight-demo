/* Поведение сайта «Авто Лайт» без фреймворков: шапка и меню, карусели, окно заявки,
   формы, фильтры каталога, ползунок цены, cookies. Разметка — как у оригинала. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
  var digits = function (s) { return String(s || "").replace(/\D/g, ""); };
  /* SITE задаёт base.html: base — префикс адреса (демо на GitHub Pages), static — сборка без сервера */
  var SITE = window.SITE || { base: "", static: false, phone: "" };
  var STATIC = !!SITE.static;

  /* ---------- шапка и меню ---------- */
  var header = $("#header");
  function onScroll() {
    var down = window.scrollY > 10 || document.body.classList.contains("menu-is-open");
    header.classList.toggle("scroll--header-on", down);
    header.classList.toggle("header--opacity", !down);
    header.classList.toggle("header--opacity-index", !down);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  var burger = $(".js-burger");
  function toggleMenu(open) {
    open = open === undefined ? !header.classList.contains("header--menu-open") : open;
    header.classList.toggle("header--menu-open", open);
    burger.classList.toggle("burger--open", open);
    document.body.classList.toggle("menu-is-open", open);
    onScroll();
  }
  if (burger) {
    burger.addEventListener("click", function () { toggleMenu(); });
    burger.addEventListener("keydown", function (e) { if (e.key === "Enter") toggleMenu(); });
  }

  /* ---------- карусели ---------- */
  function initCarousel(root) {
    var vp = $(".f-carousel__viewport", root);
    var slides = $$(".f-carousel__slide", root);
    if (!vp || slides.length < 2) return;
    root.classList.add("is-horizontal", "has-dots");
    var nav = document.createElement("div");
    nav.className = "f-carousel__nav";
    nav.innerHTML = '<button class="f-button is-prev" type="button" aria-label="Назад"></button>' +
      '<button class="f-button is-next" type="button" aria-label="Вперёд"></button>';
    root.appendChild(nav);
    var dots = document.createElement("ul");
    dots.className = "f-carousel__dots";
    root.appendChild(dots);
    var prev = $(".is-prev", nav), next = $(".is-next", nav);
    function step() { return slides[0].getBoundingClientRect().width || vp.clientWidth; }
    function pages() { return Math.max(1, Math.round((vp.scrollWidth - vp.clientWidth) / step()) + 1); }
    function current() { return Math.round(vp.scrollLeft / step()); }
    function renderDots() {
      var n = pages();
      dots.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var li = document.createElement("li");
        li.innerHTML = '<button type="button" aria-label="Слайд ' + (i + 1) + '"><span class="f-carousel__dot"></span></button>';
        (function (k) { li.firstChild.addEventListener("click", function () { vp.scrollTo({ left: k * step() }); }); })(i);
        dots.appendChild(li);
      }
      update();
    }
    function update() {
      var c = current(), n = pages();
      prev.disabled = vp.scrollLeft <= 2;
      next.disabled = vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 2;
      $$("li", dots).forEach(function (li, i) { li.classList.toggle("is-current", i === Math.min(c, n - 1)); });
      nav.hidden = n < 2;
      dots.hidden = n < 2 || n > 8;   /* у длинных лент (банки) точек нет, как у оригинала */
    }
    prev.addEventListener("click", function () { vp.scrollBy({ left: -step() }); });
    next.addEventListener("click", function () { vp.scrollBy({ left: step() }); });
    vp.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", renderDots);
    renderDots();
  }
  $$(".js-carousel").forEach(initCarousel);

  /* главный слайдер: по одному слайду, стрелки, точки, автопрокрутка */
  $$(".js-hero").forEach(function (root) {
    var slides = $$(".f-carousel__slide", root);
    if (slides.length < 2) return;
    root.classList.add("is-horizontal", "has-dots");
    var i = 0, timer;
    var nav = document.createElement("div");
    nav.className = "f-carousel__nav f-carousel__nav--slider-index";
    nav.innerHTML = '<button class="f-button is-prev" type="button" aria-label="Назад"></button>' +
      '<button class="f-button is-next" type="button" aria-label="Вперёд"></button>';
    var dots = document.createElement("ul");
    dots.className = "f-carousel__dots f-carousel__dots--slider-index";
    slides.forEach(function (_, k) {
      var li = document.createElement("li");
      li.innerHTML = '<button type="button" aria-label="Слайд ' + (k + 1) + '"><span class="f-carousel__dot"></span></button>';
      li.firstChild.addEventListener("click", function () { show(k); });
      dots.appendChild(li);
    });
    root.appendChild(nav);
    root.appendChild(dots);
    function show(k) {
      i = (k + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.hidden = n !== i; s.classList.toggle("is-selected", n === i); });
      $$("li", dots).forEach(function (li, n) { li.classList.toggle("is-current", n === i); });
      clearInterval(timer);
      timer = setInterval(function () { show(i + 1); }, 7000);
    }
    $(".is-prev", nav).addEventListener("click", function () { show(i - 1); });
    $(".is-next", nav).addEventListener("click", function () { show(i + 1); });
    show(0);
  });

  /* фото в карточке меняются при наведении на полоски, как у оригинала */
  $$(".js-brazzers").forEach(function (a) {
    var imgs = [];
    try { imgs = JSON.parse(a.getAttribute("data-images") || "[]"); } catch (e) { imgs = []; }
    var img = $("img", a);
    $$(".brazzers__button", a).forEach(function (b) {
      b.addEventListener("mouseenter", function () { var u = imgs[+b.getAttribute("data-i")]; if (u) img.src = u; });
    });
    a.addEventListener("mouseleave", function () { if (imgs[0]) img.src = imgs[0]; });
  });

  /* ---------- окно заявки ---------- */
  var MODALS = {
    callback: ["Заказать <span>обратный звонок</span>", "Оставьте телефон, менеджер перезвонит в течение 15 минут."],
    credit: ["Заявка <span>на кредит</span>", "Подберём программу с минимальным платежом в банках-партнёрах."],
    installment: ["Заявка <span>на рассрочку</span>", "Расскажем об условиях беспроцентной рассрочки."],
    exchange: ["Заявка <span>на Trade-In</span>", "Оценим ваш автомобиль и рассчитаем доплату."],
    offer: ["Забронировать <span>автомобиль</span>", "Менеджер свяжется с вами и подтвердит наличие."],
    promo: ["Узнать <span>подробнее</span>", "Расскажем об условиях акции."],
    question: ["Задать <span>вопрос</span>", ""]
  };
  var modal = $("#lead-modal");
  function openModal(kind, btn) {
    if (!modal) return;
    var m = MODALS[kind] || MODALS.callback;
    $(".js-modal-title", modal).innerHTML = m[0];
    var offer = btn && btn.getAttribute("data-offer");
    $(".js-modal-text", modal).textContent = offer ? offer.trim() : m[1];
    var form = $("form", modal);
    form.elements.kind.value = MODALS[kind] ? kind : "callback";
    form.elements.offer.value = offer ? offer.trim() : "";
    form.elements.page.value = (btn && btn.getAttribute("data-offer-url")) || location.pathname + location.search;
    $$(".js-form-error", form).forEach(function (e) { e.hidden = true; });
    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
    $(".js-modal-overflow").hidden = false;
    document.body.classList.add("menu-is-open");
    setTimeout(function () { var f = form.elements.name; if (f) f.focus(); }, 50);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("modal--open");
    modal.setAttribute("aria-hidden", "true");
    $(".js-modal-overflow").hidden = true;
    if (!header.classList.contains("header--menu-open")) document.body.classList.remove("menu-is-open");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-modal]");
    if (b) { e.preventDefault(); openModal(b.getAttribute("data-modal"), b); return; }
    if (e.target.closest(".js-modal-close")) closeModal();
    /* щелчок мимо окна: окно и его обёртка занимают весь экран поверх подложки */
    else if (modal && (e.target === modal || e.target.classList.contains("modal__window"))) closeModal();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(); toggleMenu(false); } });

  /* ---------- телефон и отправка заявок ---------- */
  function maskPhone(input) {
    var d = digits(input.value);
    if (!d) { input.value = ""; return; }
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    input.value = out;
  }
  document.addEventListener("input", function (e) { if (e.target.classList.contains("js-phone")) maskPhone(e.target); });
  document.addEventListener("submit", function (e) {
    var form = e.target.closest(".js-lead-form");
    if (!form) return;
    e.preventDefault();
    var err = $(".js-form-error", form);
    function fail(msg) { if (err) { err.textContent = msg; err.hidden = false; } }
    if (digits(form.elements.phone.value).length !== 11) return fail("Укажите телефон полностью");
    if (!form.elements.consent.checked) return fail("Нужно согласие на обработку персональных данных");
    if (STATIC) return fail("Это демо-копия сайта: заявки отсюда не отправляются. Телефон автоцентра: " + SITE.phone);
    if (!form.elements.page || !form.elements.page.value) {
      var p = form.elements.page || document.createElement("input");
      p.type = "hidden"; p.name = "page"; p.value = location.pathname + location.search;
      if (!form.elements.page) form.appendChild(p);
    }
    var data = new FormData(form);
    var q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "yclid"].forEach(function (k) {
      var v = q.get(k) || sessionStorage.getItem(k);
      if (v) data.append(k, v);
    });
    form.classList.add("is-sending");
    fetch(form.action, { method: "POST", body: data, headers: { "X-Requested-With": "fetch" } })
      .then(function (r) { return r.json().then(function (j) { return [r.ok, j]; }); })
      .then(function (res) {
        form.classList.remove("is-sending");
        if (res[0] && res[1].ok) {
          location.href = SITE.base + "/thanks";   /* цель «lead» в Метрике отправляет страница «Спасибо» */
        } else fail(res[1].error || "Не удалось отправить, попробуйте ещё раз");
      })
      .catch(function () { form.classList.remove("is-sending"); fail("Нет связи, попробуйте ещё раз"); });
  });
  /* метки рекламы запоминаем на время визита, чтобы заявка с любой страницы их несла */
  (function () {
    var q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "yclid"].forEach(function (k) {
      if (q.get(k)) try { sessionStorage.setItem(k, q.get(k)); } catch (e) { /* приватный режим */ }
    });
  })();

  /* ---------- каталог ---------- */
  var more = $(".js-more-marks");
  if (more) more.addEventListener("click", function () {
    var hidden = $$(".js-more-mark");
    var show = hidden.some(function (li) { return li.hidden; });
    hidden.forEach(function (li) { li.hidden = !show; });
    $("span", more).textContent = show ? "Скрыть марки" : "Больше марок";
  });
  var ft = $(".js-filter-toggle");
  if (ft) ft.addEventListener("click", function () {
    var w = $(".js-filter-wrap");
    var on = w.classList.toggle("filter__wrapper--active");
    $("span", ft).textContent = on ? "− Скрыть фильтры" : "+ Показать фильтры";
  });
  if (STATIC) staticCatalog();
  if (!STATIC) $$(".js-autosubmit").forEach(function (s) {
    s.addEventListener("change", function () {
      var f = s.form;
      if (f.elements.model) f.elements.model.value = "";
      if (f.requestSubmit) f.requestSubmit(); else f.submit();   /* requestSubmit чистит пустые поля */
    });
  });
  if (!STATIC) $$(".js-sort").forEach(function (s) {
    s.addEventListener("change", function () {
      var q = new URLSearchParams(location.search);
      q.set("sort", s.value);
      q.delete("page");
      location.search = q.toString();
    });
  });
  if (!STATIC) $$(".js-filter").forEach(function (f) {
    f.addEventListener("submit", function () {
      /* пустые поля и цены по краям диапазона в адрес не кладём */
      var r = $(".js-range", f);
      $$("select, input", f).forEach(function (el) {
        if (!el.name) return;
        var v = el.value;
        if (el.name === "price_from" && r && +digits(v) <= +r.getAttribute("data-min")) v = "";
        if (el.name === "price_to" && r && +digits(v) >= +r.getAttribute("data-max")) v = "";
        if (el.name.indexOf("price_") === 0) el.value = digits(v);
        if (!v) el.disabled = true;
      });
    });
  });

  /* ползунок цены с двумя ручками */
  $$(".js-range").forEach(function (r) {
    var min = +r.getAttribute("data-min"), max = +r.getAttribute("data-max");
    var from = $(".js-range-from", r), to = $(".js-range-to", r);
    var slider = $(".js-range-slider", r);
    if (!slider || !(max > min)) { if (slider) slider.hidden = true; return; }
    var origins = $$(".slider-origin", slider), connect = $(".slider-connect", slider);
    var vals = [Math.max(min, +digits(from.value) || min), Math.min(max, +digits(to.value) || max)];
    function pct(v) { return (v - min) / (max - min) * 100; }
    function render() {
      origins.forEach(function (o, k) {
        o.style.transform = "translate(" + (pct(vals[k]) - 100) + "%, 0)";
        $(".slider-tooltip", o).textContent = fmt(vals[k]) + " ₽";
      });
      connect.style.transform = "translate(" + pct(vals[0]) + "%, 0) scale(" + (pct(vals[1]) - pct(vals[0])) / 100 + ", 1)";
      connect.style.transformOrigin = "0 0";
      from.value = fmt(vals[0]) + " ₽";
      to.value = fmt(vals[1]) + " ₽";
    }
    function drag(k, e) {
      var rect = $(".slider-base", slider).getBoundingClientRect();
      function move(ev) {
        var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
        var v = min + Math.max(0, Math.min(1, x / rect.width)) * (max - min);
        v = Math.round(v / 10000) * 10000;
        vals[k] = k === 0 ? Math.min(v, vals[1]) : Math.max(v, vals[0]);
        render();
      }
      function up() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      e.preventDefault();
    }
    origins.forEach(function (o, k) {
      $(".slider-handle", o).addEventListener("pointerdown", function (e) { drag(k, e); });
    });
    [from, to].forEach(function (inp, k) {
      inp.addEventListener("focus", function () { inp.value = digits(inp.value); });
      inp.addEventListener("blur", function () {
        var v = +digits(inp.value) || (k ? max : min);
        v = Math.max(min, Math.min(max, v));
        vals[k] = k === 0 ? Math.min(v, vals[1]) : Math.max(v, vals[0]);
        render();
      });
    });
    render();
  });

  /* ---------- демо без сервера: фильтры и сортировка каталога в браузере ---------- */
  function staticCatalog() {
    var form = $(".js-filter");
    var grid = $(".section--catalog .catalog__grid");
    if (!form || !grid) return;
    var cards = $$(".mini-card", grid);
    var empty = $(".js-static-empty");
    var sortSel = $(".js-sort");
    var marks = window.CATALOG_MARKS || {};
    var el = form.elements;
    var range = $(".js-range", form);
    var min = range ? +range.getAttribute("data-min") : 0, max = range ? +range.getAttribute("data-max") : 0;
    function val(name) { return el[name] ? el[name].value : ""; }
    function fillModels(mark, value) {
      var m = el.model;
      if (!m) return;
      m.innerHTML = '<option value="">Модель</option>';
      (marks[mark] || []).forEach(function (f) { m.add(new Option(f[1], f[0])); });
      m.disabled = !mark;
      m.parentNode.classList.toggle("select-wrapper--no-data", !mark);
      if (value) m.value = value;
    }
    function apply(push) {
      var mark = val("mark"), model = val("model"), gearbox = val("gearbox"), engine = val("engine"), drive = val("drive");
      /* у карточек кузов подписан названием, а в списке у варианта имя: сравниваем по тексту */
      var body = el.body && el.body.value ? el.body.options[el.body.selectedIndex].text.trim() : "";
      var from = +digits(val("price_from")) || 0, to = +digits(val("price_to")) || 0;
      if (from <= min) from = 0;
      if (to >= max) to = 0;
      var shown = 0;
      cards.forEach(function (c) {
        var d = c.dataset, p = +d.price;
        var ok = (!mark || d.mark === mark) && (!model || d.folder === model) && (!body || d.body === body) &&
          (!gearbox || d.gearbox === gearbox) && (!engine || d.engine === engine) && (!drive || d.drive === drive) &&
          (!from || p >= from) && (!to || p <= to);
        c.hidden = !ok;
        if (ok) shown++;
      });
      var key = sortSel ? sortSel.value : "new";
      cards.slice().sort(function (a, b) {
        if (key === "cheap") return a.dataset.price - b.dataset.price;
        if (key === "expensive") return b.dataset.price - a.dataset.price;
        return b.dataset.id - a.dataset.id;
      }).forEach(function (c) { grid.appendChild(c); });
      if (empty) empty.hidden = shown > 0;
      if (push) {
        var q = new URLSearchParams();
        [["mark", mark], ["model", model], ["body", val("body")], ["gearbox", gearbox], ["engine", engine],
         ["drive", drive], ["price_from", from || ""], ["price_to", to || ""], ["sort", key !== "new" ? key : ""]]
          .forEach(function (kv) { if (kv[1]) q.set(kv[0], kv[1]); });
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      }
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(true); });
    if (el.mark) el.mark.addEventListener("change", function () { fillModels(el.mark.value); apply(true); });
    if (sortSel) sortSel.addEventListener("change", function () { apply(true); });
    /* фильтры из адреса: ссылки вида ?mark=haval работают и в демо */
    var q = new URLSearchParams(location.search);
    if (el.mark && q.get("mark")) { el.mark.value = q.get("mark"); fillModels(q.get("mark"), q.get("model")); }
    ["body", "gearbox", "engine", "drive"].forEach(function (k) { if (el[k] && q.get(k)) el[k].value = q.get(k); });
    if (sortSel && q.get("sort")) sortSel.value = q.get("sort");
    apply(false);
  }

  /* ---------- cookies ---------- */
  var cookie = $(".js-cookie");
  var ok = false;
  try { ok = localStorage.getItem("cookie-ok") === "1"; } catch (e) { ok = false; }
  if (cookie && !ok) {
    cookie.hidden = false;
    $(".js-cookie-ok", cookie).addEventListener("click", function () {
      cookie.hidden = true;
      try { localStorage.setItem("cookie-ok", "1"); } catch (e) { /* приватный режим */ }
    });
  }
})();
