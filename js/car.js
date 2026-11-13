/* Страницы марки, модели и автомобиля без фреймворков: сортировка моделей, цвета, вкладки
   модификаций, выбор комплектации, бонусы и цена, кредитный калькулятор, галерея с превью,
   просмотр фото на весь экран, оборудование и сравнение комплектаций, раскрытие оборудования.
   Окно заявки по кнопкам с data-modal открывает app.js. Разметка — как у оригинала. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
  var rub = function (n) { return fmt(n) + " ₽"; };
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    return a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  }
  /* Enter и пробел на элементах-кнопках (div и li с role) */
  function onPress(el, fn) {
    el.addEventListener("click", fn);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn.call(el, e); }
    });
  }
  /* прокрутить карусель так, чтобы элемент встал к её левому краю */
  function scrollToSlide(vp, el) {
    vp.scrollTo({ left: vp.scrollLeft + el.getBoundingClientRect().left - vp.getBoundingClientRect().left });
  }
  /* номер слайда у левого края карусели */
  function currentSlide(vp, slides) {
    var left = vp.getBoundingClientRect().left, best = 0, bestD = Infinity;
    slides.forEach(function (s, i) {
      if (s.hidden) return;
      var d = Math.abs(s.getBoundingClientRect().left - left);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  /* прокрутку страницы держим заблокированной, пока открыто любое окно */
  var lightbox = null;
  function unlock() {
    if (document.querySelector(".modal--open") || document.querySelector(".header--menu-open")) return;
    if (lightbox && !lightbox.hidden) return;
    document.body.classList.remove("menu-is-open");
  }

  /* ---------- страница марки: сортировка моделей по цене (у оригинала выбор скрыт стилями) ---------- */
  var folderSort = $(".js-folder-sort"), folderGrid = $(".js-folder-grid");
  if (folderSort && folderGrid) folderSort.addEventListener("change", function () {
    var dir = folderSort.value === "desc" ? -1 : 1;
    $$(".mini-card", folderGrid)
      .sort(function (a, b) { return dir * ((+a.getAttribute("data-price") || 0) - (+b.getAttribute("data-price") || 0)); })
      .forEach(function (card) { folderGrid.appendChild(card); });
  });

  /* ---------- модель и автомобиль: цена, бонусы, кнопки заявок ---------- */
  var car = $(".js-car");
  var calcApi = null;
  var state = null;
  if (car) {
    state = {
      price: +car.getAttribute("data-price") || 0,
      old: +car.getAttribute("data-price-old") || 0,
      rate: parseFloat(String(car.getAttribute("data-rate") || "").replace(",", ".")) || 0,
      months: +car.getAttribute("data-months") || 96,
      name: car.getAttribute("data-name") || "",
      title: ""
    };
  }
  /* «N ₽/мес.» как фильтр monthly в app.py: аннуитет на срок из настроек, без взноса */
  function annuity(price) {
    var r = state.rate / 1200, n = state.months;
    return r ? price * r / (1 - Math.pow(1 + r, -n)) : price / n;
  }
  function offerName() { return state.title ? state.name + " " + state.title : state.name; }

  /* Выгода = старая цена минус цена, делится между переключателями по data-share.
     Показанная цена = цена со всеми скидками плюс выключенные скидки, как у оригинала. */
  function updateCar() {
    var benefit = Math.max(0, state.old - state.price), on = 0, off = 0;
    $$(".js-bonus", car).forEach(function (sw) {
      var amount = Math.round(benefit * parseFloat(sw.getAttribute("data-share")));
      $(".switch__text", sw).textContent = "- " + rub(amount);
      if (sw.classList.contains("switch--active")) on += amount; else off += amount;
    });
    $$(".js-bonuses, .js-bonuses-info", car).forEach(function (el) { el.hidden = !benefit; });
    var actual = state.price + off;
    var el = $(".js-benefit", car);
    if (el) el.textContent = rub(on);
    el = $(".js-price-actual", car);
    if (el) el.textContent = rub(actual);
    el = $(".js-price-credit", car);
    if (el) el.textContent = rub(annuity(actual)) + "/мес.";
    $$(".js-car-offer", car).forEach(function (btn) {
      btn.setAttribute("data-offer", (btn.getAttribute("data-prefix") || "") + offerName());
      if (btn.hasAttribute("data-offer-price")) btn.setAttribute("data-offer-price", actual);
    });
    if (calcApi) calcApi.setPrice(actual, offerName());
  }

  /* переключатель — скрытый checkbox внутри label, щелчок по плашке переключает его сам */
  if (car) {
    $$(".js-bonus", car).forEach(function (sw) {
      var box = $(".switch__checkbox", sw);
      if (box) box.addEventListener("change", function () {
        sw.classList.toggle("switch--active", box.checked);
        updateCar();
      });
    });
  }

  /* вкладки модификаций: комплектации и характеристики выбранной */
  function showMod(id) {
    id = String(id);
    $$(".js-mod-tab").forEach(function (t) {
      var on = t.getAttribute("data-mod") === id;
      t.classList.toggle("folders__item-modification-title--selected", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".js-mod-panel").forEach(function (p) { p.hidden = p.getAttribute("data-mod") !== id; });
  }
  $$(".js-mod-tab").forEach(function (t) { onPress(t, function () { showMod(t.getAttribute("data-mod")); }); });

  /* выбор комплектации над ценой: меняет цену, бонусы, калькулятор и открывает её модификацию */
  var complSelect = $(".js-compl-select");
  function readCompl() {
    var o = complSelect.options[complSelect.selectedIndex];
    if (!o) return;
    state.price = +o.getAttribute("data-price") || 0;
    state.old = +o.getAttribute("data-price-old") || 0;
    state.title = o.getAttribute("data-title") || "";
    return o;
  }
  if (complSelect && state) {
    readCompl();
    complSelect.addEventListener("change", function () {
      var o = readCompl();
      if (o) showMod(o.getAttribute("data-mod"));
      updateCar();
    });
  }

  /* цвета модели: меняем картинку в обоих экземплярах (для компьютера и телефона) */
  var colors = $(".js-colors");
  if (colors) $$(".offer__color", colors).forEach(function (li) {
    onPress(li, function () {
      if (!li.getAttribute("data-src")) return;
      $$(".offer__color", colors).forEach(function (x) {
        x.classList.toggle("offer__color--active", x === li);
        x.setAttribute("aria-checked", x === li ? "true" : "false");
      });
      $$(".js-color-picture").forEach(function (pic) {
        var src = $$("source", pic), img = $("img", pic);
        var webp = li.getAttribute("data-webp"), plain = li.getAttribute("data-img");
        src.forEach(function (s) { s.srcset = s.type === "image/webp" ? webp : plain; });
        if (!img) return;
        img.srcset = plain;
        img.src = li.getAttribute("data-src");
        img.alt = li.getAttribute("data-alt") || img.alt;
      });
    });
  });

  /* ---------- кредитный калькулятор: первый взнос и срок, платёж = остаток / срок, как у оригинала ---------- */
  function initSlider(el, onChange) {
    var min = +el.getAttribute("data-min"), max = +el.getAttribute("data-max"), val = +el.getAttribute("data-value");
    var base = $(".slider-base", el), origin = $(".slider-origin", el), connect = $(".slider-connect", el);
    var handle = $(".slider-handle", el), tip = $(".slider-tooltip", el);
    function set(v, silent) {
      v = Math.max(min, Math.min(max, Math.round(v)));
      var changed = v !== val;
      val = v;
      var pct = max > min ? (v - min) / (max - min) * 100 : 0;
      origin.style.transform = "translate(" + (pct - 100) + "%, 0)";
      connect.style.transform = "translate(0%, 0) scale(" + pct / 100 + ", 1)";
      connect.style.transformOrigin = "0 0";
      tip.textContent = v;
      handle.setAttribute("aria-valuenow", v);
      if (!silent && changed) onChange(v);
    }
    /* ручка стоит на краю .slider-origin, а он у оригинала уже полосы на 8px с каждой стороны */
    function fromX(x) {
      var r = base.getBoundingClientRect(), w = r.width - 16;
      var p = w > 0 ? (x - r.left - 8) / w : 0;
      return min + Math.max(0, Math.min(1, p)) * (max - min);
    }
    var area = el.closest(".calculator__slider") || el;
    area.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault();
      handle.focus();
      set(fromX(e.clientX));
      el.classList.add("slider-state-drag");
      function move(ev) { set(fromX(ev.clientX)); }
      function up() {
        el.classList.remove("slider-state-drag");
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
    handle.addEventListener("keydown", function (e) {
      var step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
      if (e.key === "Home") set(min);
      else if (e.key === "End") set(max);
      else if (step) set(val + step);
      else return;
      e.preventDefault();
    });
    set(val, true);
    return function () { return val; };
  }

  function initCalc(form) {
    var price = +form.getAttribute("data-price") || 0;
    var vals = {};
    $$(".js-calc-slider", form).forEach(function (el) {
      var key = el.getAttribute("data-name");
      var get = initSlider(el, function (v) { vals[key] = v; render(); });
      vals[key] = get();
    });
    function field(name, v) {
      var f = $('.js-calc-field[data-field="' + name + '"]', form);
      if (f) f.value = v;
    }
    function text(sel, v) { var el = $(sel, form); if (el) el.textContent = v; }
    function render() {
      var first = vals.first || 0, months = vals.months || state && state.months || 96;
      var total = (price - price * first / 100) / months;
      text(".js-calc-first", first + "%");
      text(".js-calc-months", months + " " + plural(months, "месяц", "месяца", "месяцев"));
      text(".js-calc-price", price ? rub(price) : "по запросу");
      text(".js-calc-total", price ? rub(total) + "/мес." : "по запросу");
      field("price", price || "");
      field("first", first + "%");
      field("months", months);
      field("monthly", price ? Math.round(total) : "");
    }
    render();
    return {
      setPrice: function (p, name) {
        price = p;
        var o = $(".js-calc-offer", form);
        if (o && name) o.value = name;
        render();
      }
    };
  }
  var calcForm = $(".js-calc");
  if (calcForm) calcApi = initCalc(calcForm);
  if (car) updateCar();

  /* ---------- галерея автомобиля: превью сбоку, как Fancybox Thumbs у оригинала ---------- */
  $$(".js-offer-gallery").forEach(function (root) {
    var vp = $(".f-carousel__viewport", root);
    var slides = $$(".f-carousel__slide", root);
    if (!vp || slides.length < 2) return;
    var thumbs = document.createElement("div");
    thumbs.className = "f-thumbs is-classic is-vertical";
    thumbs.innerHTML = '<div class="f-thumbs__viewport"><div class="f-thumbs__track">' + slides.map(function (s, i) {
      return '<div class="f-thumbs__slide' + (i ? "" : " is-nav-selected") + '" data-index="' + i + '">' +
        '<button class="f-thumbs__slide__button" type="button" aria-label="Фото ' + (i + 1) + '">' +
        '<img class="f-thumbs__slide__img" src="' + esc(s.getAttribute("data-thumb-src")) + '" alt=""></button></div>';
    }).join("") + "</div></div>";
    root.parentNode.appendChild(thumbs);
    var items = $$(".f-thumbs__slide", thumbs), tvp = $(".f-thumbs__viewport", thumbs);
    function select(i) {
      items.forEach(function (t, k) { t.classList.toggle("is-nav-selected", k === i); });
      var t = items[i].getBoundingClientRect(), v = tvp.getBoundingClientRect();
      if (t.top < v.top || t.bottom > v.bottom) tvp.scrollTop += t.top - v.top;
    }
    items.forEach(function (t, i) {
      t.addEventListener("click", function () { scrollToSlide(vp, slides[i]); select(i); });
    });
    vp.addEventListener("scroll", function () {
      window.requestAnimationFrame(function () { select(currentSlide(vp, slides)); });
    }, { passive: true });
  });

  /* фото модели: вкладки «Экстерьер» и «Интерьер» прокручивают общую карусель к своим кадрам */
  var mediaTabs = $$(".js-media-tab");
  var media = $("#slider_interior_exterior");
  if (mediaTabs.length && media) {
    var mvp = $(".f-carousel__viewport", media);
    var mslides = $$(".offer__media-slide", media);
    var setTab = function (kind) {
      mediaTabs.forEach(function (t) { t.classList.toggle("offer__equipment-tab--active", t.getAttribute("data-media") === kind); });
    };
    var lock = 0;
    mediaTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var kind = tab.getAttribute("data-media");
        var first = mslides.filter(function (s) { return s.getAttribute("data-media") === kind; })[0];
        setTab(kind);
        lock = Date.now() + 800;  /* пока карусель едет, вкладку по прокрутке не меняем */
        if (first) scrollToSlide(mvp, first);
      });
    });
    mvp.addEventListener("scroll", function () {
      if (Date.now() < lock) return;
      window.requestAnimationFrame(function () {
        var s = mslides[currentSlide(mvp, mslides)];
        if (s) setTab(s.getAttribute("data-media"));
      });
    }, { passive: true });
  }

  /* ---------- просмотр фото на весь экран ---------- */
  var lbItems = [], lbIndex = 0;
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var src = lbItems[lbIndex];
    var img = $(".car-lightbox__img", lightbox);
    img.src = src.getAttribute("data-full") || src.currentSrc || src.src;
    img.alt = src.alt || "";
    $(".car-lightbox__count", lightbox).textContent = (lbIndex + 1) + " / " + lbItems.length;
    $$(".car-lightbox__nav", lightbox).forEach(function (b) { b.hidden = lbItems.length < 2; });
  }
  function lbClose() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    $(".car-lightbox__img", lightbox).removeAttribute("src");
    unlock();
  }
  function lbOpen(items, i) {
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "car-lightbox";
      lightbox.hidden = true;
      lightbox.setAttribute("role", "dialog");
      lightbox.setAttribute("aria-modal", "true");
      lightbox.setAttribute("aria-label", "Фотографии");
      lightbox.innerHTML = '<button type="button" class="car-lightbox__close" aria-label="Закрыть"></button>' +
        '<button type="button" class="car-lightbox__nav car-lightbox__nav--prev" aria-label="Предыдущее фото"></button>' +
        '<img class="car-lightbox__img" alt="">' +
        '<button type="button" class="car-lightbox__nav car-lightbox__nav--next" aria-label="Следующее фото"></button>' +
        '<div class="car-lightbox__count"></div>';
      document.body.appendChild(lightbox);
      lightbox.addEventListener("click", function (e) {
        if (e.target.closest(".car-lightbox__nav--prev")) lbShow(lbIndex - 1);
        else if (e.target.closest(".car-lightbox__nav--next")) lbShow(lbIndex + 1);
        else if (e.target === lightbox || e.target.closest(".car-lightbox__close")) lbClose();
      });
      var x0 = null;
      lightbox.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      lightbox.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40 && lbItems.length > 1) lbShow(lbIndex + (dx < 0 ? 1 : -1));
      });
    }
    lbItems = items;
    lightbox.hidden = false;
    document.body.classList.add("menu-is-open");
    lbShow(i);
    $(".car-lightbox__close", lightbox).focus();
  }
  document.addEventListener("click", function (e) {
    var img = e.target.closest(".js-lightbox");
    if (!img) return;
    var group = img.closest(".js-lightbox-group");
    var items = group ? $$(".js-lightbox", group) : [img];
    lbOpen(items, Math.max(0, items.indexOf(img)));
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
    else if (e.key === "ArrowRight") lbShow(lbIndex + 1);
  });

  /* ---------- оборудование и сравнение комплектаций (страница модели) ---------- */
  var carData = null;
  var dataEl = $(".js-car-data");
  try { carData = dataEl ? JSON.parse(dataEl.textContent) : null; } catch (err) { carData = null; }
  var compls = {};  /* "модификация-комплектация" → {c, m}: id комплектаций у оригинала повторяются */
  if (carData) (carData.mods || []).forEach(function (m) {
    (m.complectations || []).forEach(function (c) { compls[m.id + "-" + c.id] = { c: c, m: m }; });
  });

  var overflow = $(".js-car-overflow");
  function openCarModal(modal) {
    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
    if (overflow) overflow.hidden = false;
    document.body.classList.add("menu-is-open");
    var close = $(".js-car-modal-close[role=button]", modal);
    if (close) { close.setAttribute("tabindex", "0"); close.focus(); }
  }
  /* keepLock — окно меняется на окно заявки app.js, прокрутку не разблокируем */
  function closeCarModals(keepLock) {
    $$(".js-car-modal.modal--open").forEach(function (m) {
      m.classList.remove("modal--open");
      m.setAttribute("aria-hidden", "true");
    });
    if (overflow) overflow.hidden = true;
    if (!keepLock) unlock();
  }
  function leadButtons(name) {
    var a = ' data-offer="' + esc(name) + '" data-offer-url="' + esc(carData.url) + '"';
    return '<div class="folders__item-complectation-buttons">' +
      '<div class="button button--short button--primary" role="button" tabindex="0" data-modal="credit"' + a + '>в кредит</div>' +
      '<div class="button button--short button--primary-white" role="button" tabindex="0" data-modal="offer"' + a + '>оставить заявку</div></div>';
  }

  function showEquipment(key) {
    var x = compls[key], modal = $("#equipment-modal");
    if (!x || !modal) return;
    var eq = x.c.equipment || [];
    $(".js-car-modal-title", modal).innerHTML = "Комплектация <span>" + esc(x.c.title) + "</span>";
    var html = '<div class="modal__description">' + esc(carData.name) + ", " + esc(x.m.title) +
      (x.c.price ? " — " + rub(x.c.price) : "") + "</div>";
    eq.forEach(function (g) {
      html += '<div class="folders__item-modal-blocks"><div class="offer__equipment-title"><span>' + esc(g.title) + "</span></div>" +
        '<div class="folders__item-modal-values">' + (g.values || []).map(function (v) {
          return '<div class="folders__item-modal-value">' + esc(v) + "</div>";
        }).join("") + "</div></div>";
    });
    if (!eq.length) html += '<p class="text__p">Состав комплектации уточните у менеджера.</p>';
    $(".js-car-modal-body", modal).innerHTML = html + leadButtons(carData.name + " " + x.c.title);
    openCarModal(modal);
  }

  var chosen = [];
  function toggleCompare(icon) {
    var key = icon.getAttribute("data-key"), i = chosen.indexOf(key);
    if (i >= 0) chosen.splice(i, 1); else chosen.push(key);
    icon.classList.toggle("folders__item-complectation-compare--chosen", i < 0);
    icon.setAttribute("aria-pressed", i < 0 ? "true" : "false");
    var btn = $(".js-compare-open");
    if (btn) {
      btn.hidden = chosen.length < 2;
      $(".js-compare-count", btn).textContent = chosen.length;
    }
  }

  /* таблица: разделы и пункты всех выбранных комплектаций, у каждой — есть / нет */
  function showCompare() {
    var modal = $("#compare-modal");
    var list = chosen.map(function (k) { return compls[k]; }).filter(Boolean);
    if (!modal || list.length < 2) return;
    var groups = [], index = {};
    list.forEach(function (x) {
      (x.c.equipment || []).forEach(function (g) {
        if (!(g.title in index)) { index[g.title] = groups.length; groups.push({ title: g.title, values: [] }); }
        var gg = groups[index[g.title]];
        (g.values || []).forEach(function (v) { if (gg.values.indexOf(v) < 0) gg.values.push(v); });
      });
    });
    function has(x, title, v) {
      return (x.c.equipment || []).some(function (g) { return g.title === title && (g.values || []).indexOf(v) >= 0; });
    }
    var col = "modal__comparison-table-col", narrow = col + " " + col + "--short " + col + "--center";
    var row = function (cells) { return '<div class="modal__comparison-table-row">' + cells + "</div>"; };
    var html = '<div class="modal__comparison-table"><div class="modal__comparison-table-row modal__comparison-table-row-sticky-top">' +
      '<div class="' + col + " " + col + '--title">Комплектация</div>' + list.map(function (x) {
        return '<div class="' + narrow + " " + col + '--title">' + esc(x.c.title) + "<br>" + esc(x.m.title) +
          (x.c.price ? "<br>" + rub(x.c.price) : "") + "</div>";
      }).join("") + "</div>";
    groups.forEach(function (g) {
      html += row('<div class="' + col + " " + col + '--title">' + esc(g.title) + "</div>" +
        list.map(function () { return '<div class="' + narrow + '"></div>'; }).join(""));
      g.values.forEach(function (v) {
        html += row('<div class="' + col + '">' + esc(v) + "</div>" + list.map(function (x) {
          return has(x, g.title, v) ? '<div class="' + narrow + " " + col + '--value" aria-label="есть">✓</div>'
            : '<div class="' + narrow + '" aria-label="нет">—</div>';
        }).join(""));
      });
    });
    $(".js-compare-body", modal).innerHTML = html + "</div>";
    openCarModal(modal);
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    /* кнопка заявки внутри нашего окна: окно заявки открывает app.js, наше закрываем */
    if (t.closest(".js-car-modal [data-modal]")) return closeCarModals(true);
    /* закрытие: крестик, подложка или щелчок мимо содержимого (окно накрывает подложку) */
    if (t.closest(".js-car-modal-close") || t.classList.contains("js-car-modal") ||
        (t.classList.contains("modal__window") && t.closest(".js-car-modal"))) return closeCarModals();
    var el = t.closest(".js-compl-more");
    if (el) return showEquipment(el.getAttribute("data-key"));
    el = t.closest(".js-compare");
    if (el) return toggleCompare(el);
    if (t.closest(".js-compare-open")) showCompare();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeCarModals(); return; }
    if (e.key !== "Enter" && e.key !== " ") return;
    /* div-кнопки оригинала (в том числе с data-modal для app.js) нажимаются и с клавиатуры */
    var el = e.target.closest && e.target.closest(".js-compl-more, .js-compare, .js-compare-open, .js-car-modal-close, [role=button][data-modal][tabindex]");
    if (!el) return;
    e.preventDefault();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  /* ---------- оборудование автомобиля: раскрыть остальные разделы ---------- */
  $$(".js-equipment-toggle").forEach(function (btn) {
    onPress(btn, function () {
      var box = btn.closest(".js-equipment");
      var more = $$(".js-equipment-more", box);
      var show = more.some(function (g) { return g.hidden; });
      more.forEach(function (g) { g.hidden = !show; });
      btn.textContent = show ? btn.getAttribute("data-less") : btn.getAttribute("data-more");
    });
  });

  /* ---------- «в наличии» из карточки модели (?offers): сразу к машинам ---------- */
  if (/[?&]offers(=|&|$)/.test(location.search)) {
    var target = $(".offer__similar-cars");
    if (target) window.addEventListener("load", function () {
      var header = $("#header");
      var top = target.getBoundingClientRect().top + window.pageYOffset - (header ? header.offsetHeight : 0) - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }
})();
