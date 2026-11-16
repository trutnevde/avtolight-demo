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
  /* «Каталог» на компьютере и бургер на телефоне открывают одно меню */
  var burgers = $$(".js-burger");
  function toggleMenu(open) {
    open = open === undefined ? !header.classList.contains("header--menu-open") : open;
    header.classList.toggle("header--menu-open", open);
    burgers.forEach(function (b) {
      b.classList.toggle("burger--open", open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.body.classList.toggle("menu-is-open", open);
    onScroll();
    /* карусель моделей в меню считала стрелки, пока меню было скрыто: пересчитать сейчас */
    if (open) document.dispatchEvent(new CustomEvent("lh-menu-open"));
  }
  burgers.forEach(function (b) {
    b.addEventListener("click", function () { toggleMenu(); });
  });
  /* клик мимо меню и шапки закрывает меню; сам клик странице под ним не достаётся (не откроет ссылку) */
  document.addEventListener("click", function (e) {
    if (!header.classList.contains("header--menu-open") || header.contains(e.target)) return;
    if (e.target.closest && e.target.closest(".modal")) return;
    e.preventDefault();
    e.stopPropagation();
    toggleMenu(false);
  }, true);

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
    function pages() { return step() ? Math.max(1, Math.round((vp.scrollWidth - vp.clientWidth) / step()) + 1) : 1; }
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
    /* пересчёт и при показе: карусель в закрытом меню получает размеры, только когда меню откроют */
    if (window.ResizeObserver) new ResizeObserver(function () { renderDots(); }).observe(vp);
    else window.addEventListener("resize", renderDots);
    if (root.closest(".lh-menu")) document.addEventListener("lh-menu-open", renderDots);
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

  /* Кружки марок (главная и меню) — лента всех марок: сначала популярные из разметки, следом остальные
     из /api/marks, когда лента на экране. Колесо мыши листает её влево-вправо, у краёв — снова страницу.
     На узком экране (меньше 900 px) лента не нужна: там сетка из популярных, как у оригинала. */
  var allMarks = null;
  function loadMarks() {
    if (!allMarks) allMarks = fetch(SITE.base + "/api/marks").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).catch(function (e) { allMarks = null; throw e; });
    return allMarks;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  /* та же разметка, что mark_tile в templates/_macros.html */
  function markTile(m) {
    return '<a href="' + SITE.base + "/new/" + esc(m.slug) + '" class="lh-mark js-mark-extra" data-slug="' + esc(m.slug) +
      '"><span class="lh-mark__logo">' + m.svg + '</span><span class="lh-mark__name">' + esc(m.title) + "</span></a>";
  }
  var wideScreen = window.matchMedia ? window.matchMedia("(min-width: 900px)") : { matches: true };
  function wheelStrip(list) {
    var target = null, last = 0;
    list.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   /* масштаб и тачпад вбок — как обычно */
      var max = list.scrollWidth - list.clientWidth;
      if (max < 2) return;
      var now = Date.now();
      var from = target !== null && now - last < 400 ? target : list.scrollLeft;
      var tiles = list.children, step = tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : 200;
      /* колесо мыши — щелчок на кружок, тачпад — плавно на сколько провели */
      var notch = e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50;
      var to = Math.max(0, Math.min(max, from + (notch ? (e.deltaY > 0 ? step : -step) : e.deltaY)));
      if (Math.abs(to - from) < 1) return;   /* уже у края ленты — колесо крутит страницу */
      e.preventDefault();
      target = to;
      last = now;
      list.scrollTo({ left: to, behavior: notch ? "smooth" : "auto" });
    }, { passive: false });
  }
  $$(".js-marks-strip").forEach(function (list) {
    var filled = false;
    function fill() {
      if (filled || !wideScreen.matches) return;
      filled = true;
      loadMarks().then(function (marks) {
        var have = {};
        $$("[data-slug]", list).forEach(function (a) { have[a.getAttribute("data-slug")] = true; });
        list.insertAdjacentHTML("beforeend", marks.filter(function (m) { return !have[m.slug]; }).map(markTile).join(""));
      }, function () { filled = false; });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries.some(function (x) { return x.isIntersecting; })) fill();
      }).observe(list);
    }
    list.addEventListener("pointerenter", fill);
    list.addEventListener("focusin", fill);
    wheelStrip(list);
  });

  /* первый экран: машины слайдов оригинала сменяются каждые 6 с, точки переключают, наведение — пауза */
  $$(".js-hero-cars").forEach(function (root) {
    var cars = $$(".lh-hero__car", root), dots = $$(".lh-hero__dot", root);
    if (cars.length < 2) return;
    var i = 0, timer = 0;
    function show(k) {
      i = (k + cars.length) % cars.length;
      cars.forEach(function (c, n) {
        c.classList.toggle("is-on", n === i);
        c.setAttribute("aria-hidden", n === i ? "false" : "true");
        c.tabIndex = n === i ? 0 : -1;
      });
      dots.forEach(function (d, n) { d.classList.toggle("is-on", n === i); });
    }
    function play() { clearInterval(timer); timer = setInterval(function () { show(i + 1); }, 6000); }
    dots.forEach(function (d, n) { d.addEventListener("click", function () { show(n); play(); }); });
    root.addEventListener("mouseenter", function () { clearInterval(timer); });
    root.addEventListener("mouseleave", play);
    if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) play();
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
  var modal = $("#lead-modal"), promoModal = $("#promo-modal");
  function showModal(m) {
    m.classList.add("modal--open");
    m.setAttribute("aria-hidden", "false");
    $(".js-modal-overflow").hidden = false;
    document.body.classList.add("menu-is-open");
  }
  /* opts (необязательно): title, text, button, offer, comment — для акций со своими заголовками */
  function openModal(kind, btn, opts) {
    if (!modal) return;
    opts = opts || {};
    var m = MODALS[kind] || MODALS.callback;
    $(".js-modal-title", modal).innerHTML = opts.title || m[0];
    var offer = opts.offer || (btn && btn.getAttribute("data-offer"));
    $(".js-modal-text", modal).textContent = opts.text !== undefined ? opts.text : offer ? offer.trim() : m[1];
    var form = $("form", modal);
    form.elements.kind.value = MODALS[kind] ? kind : "callback";
    form.elements.offer.value = offer ? offer.trim() : "";
    form.elements.page.value = (btn && btn.getAttribute("data-offer-url")) || location.pathname + location.search;
    var submit = $("button[type=submit]", form);
    if (!submit.hasAttribute("data-default")) submit.setAttribute("data-default", submit.textContent.trim());
    submit.textContent = opts.button || submit.getAttribute("data-default");
    var comment = form.elements.comment;
    if (!comment) {
      comment = document.createElement("input");
      comment.type = "hidden";
      comment.name = "comment";
      form.appendChild(comment);
    }
    comment.value = opts.comment || "";
    $$(".js-form-error", form).forEach(function (e) { e.hidden = true; });
    showModal(modal);
    setTimeout(function () { var f = form.elements.name; if (f) f.focus(); }, 50);
  }
  function closeModal() {
    $$(".modal.modal--open").forEach(function (m) {
      m.classList.remove("modal--open");
      m.setAttribute("aria-hidden", "true");
    });
    var ov = $(".js-modal-overflow");
    if (ov) ov.hidden = true;
    if (!header.classList.contains("header--menu-open")) document.body.classList.remove("menu-is-open");
  }

  /* ---------- акции автоцентра: тексты и поведение как у оригинала ---------- */
  var SALE = SITE.sale || {};
  var PROMOS = {
    "оплатим дорогу": { text: "Сохраните чеки, квитанции и билеты, и мы возместим затраты на дорогу. Ваша комфортная покупка - наша забота!" },
    "подарок на выбор": { text: "При покупке любого нового автомобиля из наличия мы предлагаем покупателям подарок на выбор — КАСКО или комплект резины, чтобы вы чувствовали себя уверенно на дороге!" },
    "автокредит": { express: true, text: "Оставьте заявку, и наш менеджер составит для вас индивидуальное предложение с максимальной выгодой!" },
    "первый автомобиль": { express: true, title: "Узнать <span>условия</span>", button: "Узнать условия",
      text: "Больше не нужно копить на свой первый автомобиль. Можно оформить его прямо сейчас со скидкой " + SALE.first_car + "! Подробности у менеджера салона." },
    "госпрограмма": { express: true, title: "Узнать <span>условия</span>", button: "Узнать условия",
      text: "Скидка " + SALE.gos + " на семейный автомобиль. Звоните, наши менеджеры расскажут вам условия участия в программе." },
    "trade-in": { express: true, title: "Оставить <span>заявку</span>", button: "Оставить заявку",
      text: "Предлагаем выгоду до " + SALE.exchange + ". Оценка автомобиля, выкуп и сопровождение по сделке абсолютно бесплатны." }
  };
  /* «Оплатим дорогу» и «Подарок на выбор» — окно с текстом; остальные — форма заявки со своим заголовком и кнопкой */
  function openPromo(tile) {
    var h = $(".js-promo-title, .services__title", tile);
    var name = h ? h.textContent.trim() : "";
    var p = PROMOS[name.toLowerCase()];
    if (!p) return false;
    if (p.express) {
      openModal("promo", null, { title: p.title || "Получить <span>предложение</span>", text: "",
        button: p.button || "Получить предложение", offer: "Акция: " + name, comment: p.text });
    } else if (promoModal) {
      $(".js-promo-title", promoModal).textContent = name;
      $(".js-promo-text", promoModal).textContent = p.text;
      showModal(promoModal);
    }
    return true;
  }

  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".js-promo, .services__item");
    if (tile && openPromo(tile)) { e.preventDefault(); return; }
    var b = e.target.closest("[data-modal]");
    if (b) { e.preventDefault(); openModal(b.getAttribute("data-modal"), b); return; }
    if (e.target.closest(".js-modal-close")) closeModal();
    /* щелчок мимо окна: окно и его обёртка занимают весь экран поверх подложки */
    else if (e.target.classList.contains("modal") || e.target.classList.contains("modal__window")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); toggleMenu(false); }
    /* плитки акций — div с role=button: открываются и с клавиатуры */
    if (e.key === "Enter" && e.target.classList && e.target.classList.contains("js-promo")) { e.preventDefault(); e.target.click(); }
  });
  /* формы поиска по GET (подбор на главной): пустые поля в адрес не кладём */
  $$(".js-clean-get").forEach(function (f) {
    f.addEventListener("submit", function () {
      $$("select, input", f).forEach(function (el) { if (el.name && !el.value) el.disabled = true; });
      setTimeout(function () { $$("select, input", f).forEach(function (el) { el.disabled = false; }); }, 0);
    });
  });

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
  /* Фильтр: в списках только варианты, при которых найдётся машина с остальными выбранными фильтрами
     и ценой (у JAECOO нет пикапов — пикап не выбрать). Машины — window.CATALOG_POOL из app.py:
     items [марка, модель, кузов, КПП, двигатель, привод, цена], t — подписи. Модель не сужает список
     марок, а при смене марки чужая модель сбрасывается. Тот же расчёт на сервере — facet_options. */
  var DIMS = ["mark", "model", "body", "gearbox", "engine", "drive"];
  var DIM_LABELS = ["Марка", "Модель", "Кузов", "КПП", "Двигатель", "Привод"];
  function priceBounds(form) {
    var r = $(".js-range", form), el = form.elements;
    var min = r ? +r.getAttribute("data-min") : 0, max = r ? +r.getAttribute("data-max") : 0;
    var from = el.price_from ? +digits(el.price_from.value) : 0, to = el.price_to ? +digits(el.price_to.value) : 0;
    return [from > min ? from : 0, to && to < max ? to : 0];   /* цена по краю диапазона — не фильтр */
  }
  function refreshFacets(form, init) {
    var pool = window.CATALOG_POOL, el = form.elements;
    if (!pool || !pool.items) return;
    var sel = DIMS.map(function (d) { return init ? init[d] || "" : el[d] ? el[d].value : ""; });
    var price = priceBounds(form);
    if (sel[1] && !pool.items.some(function (r) { return r[0] === sel[0] && r[1] === sel[1]; })) sel[1] = "";
    DIMS.forEach(function (d, i) {
      var box = el[d];
      if (!box) return;
      var vals = {};
      if (i !== 1 || sel[0]) pool.items.forEach(function (r) {
        if ((price[0] && r[6] < price[0]) || (price[1] && r[6] > price[1])) return;
        for (var j = 0; j < 6; j++) if (j !== i && !(i === 0 && j === 1) && sel[j] && r[j] !== sel[j]) return;
        if (r[i]) vals[r[i]] = true;
      });
      if (sel[i]) vals[sel[i]] = true;   /* выбранное не прячем, даже если по цене машин не осталось */
      var titles = pool.t[d] || {};
      var opts = Object.keys(vals).map(function (v) {
        return [v, (i === 1 ? titles[sel[0] + "/" + v] : titles[v]) || v];
      }).sort(function (a, b) {
        var x = a[1].toLowerCase(), y = b[1].toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
      });
      box.length = 0;
      box.add(new Option(DIM_LABELS[i], ""));
      opts.forEach(function (o) { box.add(new Option(o[1], o[0])); });
      box.value = sel[i];
      if (i === 1) {
        box.disabled = !sel[0];
        box.parentNode.classList.toggle("select-wrapper--no-data", !sel[0]);
      }
    });
  }
  $$(".js-filter").forEach(function (form) {
    form.addEventListener("change", function (e) {
      /* другая марка — модель с начала, даже если у новой марки есть модель с тем же адресом (J7 у JAECOO и JAC) */
      if (e.target.name === "mark" && form.elements.model) form.elements.model.value = "";
      if (e.target.classList.contains("js-facet")) refreshFacets(form);
    });
    form.addEventListener("range-change", function () { refreshFacets(form); });
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
    /* новая цена — фильтр пересчитывает списки (refreshFacets) */
    function changed() { r.dispatchEvent(new CustomEvent("range-change", { bubbles: true })); }
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
        changed();
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
        changed();
      });
    });
    render();
  });

  /* ---------- демо без сервера: фильтры и сортировка каталога в браузере ---------- */
  function staticCatalog() {
    var form = $(".js-filter");
    var grid = $("#catalog .catalog__grid");
    if (!form || !grid) return;
    var cards = $$(".js-car", grid);
    var empty = $(".js-static-empty");
    var sorts = $$(".js-sort");
    var sortKey = "new";
    var el = form.elements;
    function val(name) { return el[name] ? el[name].value : ""; }
    function apply(push) {
      var mark = val("mark"), model = val("model"), gearbox = val("gearbox"), engine = val("engine"), drive = val("drive");
      /* у карточек кузов подписан названием, а в списке у варианта имя: сравниваем по тексту */
      var body = el.body && el.body.value ? el.body.options[el.body.selectedIndex].text.trim() : "";
      var price = priceBounds(form), from = price[0], to = price[1];
      var shown = 0;
      cards.forEach(function (c) {
        var d = c.dataset, p = +d.price;
        var ok = (!mark || d.mark === mark) && (!model || d.folder === model) && (!body || d.body === body) &&
          (!gearbox || d.gearbox === gearbox) && (!engine || d.engine === engine) && (!drive || d.drive === drive) &&
          (!from || p >= from) && (!to || p <= to);
        c.hidden = !ok;
        if (ok) shown++;
      });
      cards.slice().sort(function (a, b) {
        if (sortKey === "cheap") return a.dataset.price - b.dataset.price;
        if (sortKey === "expensive") return b.dataset.price - a.dataset.price;
        return b.dataset.id - a.dataset.id;
      }).forEach(function (c) { grid.appendChild(c); });
      if (empty) empty.hidden = shown > 0;
      if (push) {
        var q = new URLSearchParams();
        [["mark", mark], ["model", model], ["body", val("body")], ["gearbox", gearbox], ["engine", engine],
         ["drive", drive], ["price_from", from || ""], ["price_to", to || ""], ["sort", sortKey !== "new" ? sortKey : ""]]
          .forEach(function (kv) { if (kv[1]) q.set(kv[0], kv[1]); });
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      }
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(true); });
    /* марка применяется сразу, как на сайте с сервером; списки к этому времени уже пересчитаны */
    form.addEventListener("change", function (e) { if (e.target.name === "mark") apply(true); });
    sorts.forEach(function (s) {
      s.addEventListener("change", function () {
        sortKey = s.value;
        sorts.forEach(function (o) { if (o !== s) o.value = sortKey; });
        apply(true);
      });
    });
    /* фильтры из адреса: ссылки вида ?mark=haval&body=crossover работают и в демо */
    var q = new URLSearchParams(location.search);
    ["price_from", "price_to"].forEach(function (k) { if (el[k] && q.get(k)) el[k].value = q.get(k); });
    var init = {};
    DIMS.forEach(function (d) { init[d] = q.get(d) || ""; });
    refreshFacets(form, init);
    if (q.get("sort")) { sortKey = q.get("sort"); sorts.forEach(function (s) { s.value = sortKey; }); }
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
