/* Страницы «Автокредит», «Рассрочка», «Trade-In» и «О компании»: то, что у оригинала делает Vue.
   Списки марки, модели и комплектации, блок выбранной машины (фото, цвета, платёж, цена),
   ползунки калькулятора, проверка формы перед отправкой (отправляет app.js), автопрокрутка фото
   автоцентра. Разметка — как у компонентов оригинала, данные модели — с нашего /api/folder. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function div(cls, text) {
    var d = document.createElement("div");
    d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }
  function fire(el) { el.dispatchEvent(new Event("change", { bubbles: true })); }
  /* суммы как у оригинала: Intl ru-RU, разряды через неразрывный пробел */
  var nf = window.Intl && Intl.NumberFormat ? new Intl.NumberFormat("ru-RU") : null;
  function money(n) {
    n = Math.round(Number(n) || 0);
    return nf ? nf.format(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  function plain(s) { return String(s).replace(/[  ]/g, " "); }
  /* платёж в месяц как у оригинала: аннуитет от цены за вычетом первого взноса (процент) на n месяцев */
  function payment(price, fee, n, rate) {
    var t = rate / 12 / 100, body = price - price * fee / 100;
    return money(body * (t ? t * Math.pow(1 + t, n) / (Math.pow(1 + t, n) - 1) : 1 / n));
  }

  /* ---------- списки: на телефоне обычный select, на компьютере меню компонента Select оригинала ---------- */
  var opened = null;
  function closeMenu() {
    if (!opened) return;
    var m = $(".select__modal", opened);
    if (m) m.parentNode.removeChild(m);
    opened = null;
  }
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  function initSelect(w) {
    var native = $(".js-select-native", w), trigger = $(".js-select-open", w), label = $(".js-select-label", w);
    var title = native.getAttribute("aria-label");
    var onlyArrow = w.hasAttribute("data-only-arrow"), alphabet = w.hasAttribute("data-alphabet");
    function options() { return $$("option", native).filter(function (o) { return o.value; }); }
    function sync() {
      var has = !!native.value, empty = !options().length;
      label.textContent = has ? native.options[native.selectedIndex].textContent : title;
      w.classList.toggle("select-wrapper--no-data", empty);
      native.disabled = empty;
      trigger.setAttribute("aria-disabled", empty ? "true" : "false");
      var clear = has && !onlyArrow;
      $$(".js-select-arrow", w).forEach(function (a) { a.hidden = clear; });
      $$(".js-select-clear", w).forEach(function (a) { a.hidden = !clear; });
    }
    /* выбираем сам пункт, а не значение: у марки бывают две модели с одним названием (разные поколения) */
    function choose(o) {
      if (o) o.selected = true;
      else native.value = "";
      fire(native);
    }
    function open(byKey) {
      var opts = options(), current = native.options[native.selectedIndex];
      var modal = div("select__modal select__modal--open");
      var content = div("select__modal-content card-border");
      content.appendChild(div("card-border-helper"));
      function item(o) {
        var d = div("select__modal-option" + (o === current ? " select__modal-option--active" : ""), o.textContent);
        d.tabIndex = 0;
        d.setAttribute("role", "option");
        d.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); choose(o); closeMenu(); trigger.focus(); });
        d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); d.click(); } });
        return d;
      }
      var list;
      if (alphabet) {
        /* как у оригинала: блоки по первой букве названия */
        list = div("alphabet alphabet--select");
        var letters = [];
        opts.forEach(function (o) { var l = o.textContent.trim().charAt(0); if (letters.indexOf(l) < 0) letters.push(l); });
        letters.sort().forEach(function (l) {
          var block = div("alphabet__block");
          block.appendChild(div("alphabet__block-title", l));
          opts.forEach(function (o) {
            if (o.textContent.trim().charAt(0) !== l) return;
            var wrap = div("select__modal-options-wrapper");
            wrap.appendChild(item(o));
            block.appendChild(wrap);
          });
          list.appendChild(block);
        });
      } else {
        list = div("select__modal-options");
        opts.forEach(function (o) { list.appendChild(item(o)); });
      }
      content.appendChild(list);
      modal.appendChild(content);
      modal.setAttribute("role", "listbox");
      modal.addEventListener("click", function (e) { e.stopPropagation(); });
      w.appendChild(modal);
      opened = w;
      var act = $(".select__modal-option--active", modal) || (byKey && $(".select__modal-option", modal));
      if (act) {
        if (byKey) act.focus({ preventScroll: true });
        list.scrollTop = Math.max(0, act.offsetTop - list.clientHeight / 2);
      }
    }
    function toggle(e, byKey) {
      e.preventDefault();
      e.stopPropagation();
      if (opened === w) return closeMenu();
      closeMenu();
      if (options().length) open(byKey);
    }
    trigger.addEventListener("click", function (e) { if (!e.target.closest(".js-select-clear")) toggle(e, false); });
    trigger.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") toggle(e, true); });
    $$(".js-select-clear", w).forEach(function (c) {
      c.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); closeMenu(); choose(null); });
    });
    native.addEventListener("change", sync);
    w.refresh = sync;
    sync();
  }
  $$(".js-select").forEach(initSelect);

  /* ---------- ползунки калькулятора: разметка vueform/slider, значения — фиксированные шаги ---------- */
  function initSlider(root, onChange) {
    var values = root.getAttribute("data-values").split(",").map(Number);
    var last = values.length - 1;
    var i = Math.max(0, values.indexOf(+root.getAttribute("data-value")));
    var base = $(".slider-base", root), origin = $(".slider-origin", root), connect = $(".slider-connect", root);
    var handle = $(".slider-handle", root), tip = $(".slider-tooltip", root);
    var area = root.closest(".calculator__slider") || root;
    function render() {
      var p = last ? i / last * 100 : 0;
      origin.style.transform = "translate(" + (p - 100) + "%, 0px)";
      connect.style.transform = "translate(0%, 0px) scale(" + p / 100 + ", 1)";
      tip.textContent = values[i];
      handle.setAttribute("aria-valuenow", values[i]);
      handle.setAttribute("aria-valuetext", values[i]);
      onChange(values[i]);
    }
    function set(k) {
      k = Math.max(0, Math.min(last, k));
      if (k !== i) { i = k; render(); }
    }
    /* ручка ходит внутри .slider-origin (у оригинала он уже дорожки на 8px с каждой стороны) */
    function stepAt(x) {
      var r = base.getBoundingClientRect(), w = origin.offsetWidth || r.width;
      var left = r.left + base.clientWidth - (parseFloat(getComputedStyle(origin).right) || 0) - w;
      return Math.round(Math.max(0, Math.min(1, (x - left) / w)) * last);
    }
    root.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault();
      root.classList.add("slider-state-drag");
      handle.classList.add("slider-active");
      handle.focus({ preventScroll: true });
      set(stepAt(e.clientX));
      function move(ev) { set(stepAt(ev.clientX)); }
      function up() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        root.classList.remove("slider-state-drag");
        handle.classList.remove("slider-active");
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
    /* нажатие рядом с дорожкой (на шкале) переставляет ручку с анимацией, как tap у noUiSlider */
    area.addEventListener("click", function (e) {
      if (root.contains(e.target)) return;
      root.classList.add("slider-state-tap");
      set(stepAt(e.clientX));
      setTimeout(function () { root.classList.remove("slider-state-tap"); }, 300);
    });
    handle.addEventListener("keydown", function (e) {
      var d = { ArrowLeft: -1, ArrowDown: -1, PageDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: 1 }[e.key];
      if (e.key === "Home") d = -last;
      if (e.key === "End") d = last;
      if (!d) return;
      e.preventDefault();
      set(i + d);
    });
    render();
  }
  function months(n) {
    var a = n % 10, b = n % 100;
    return n + " " + (a === 1 && b !== 11 ? "месяц" : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? "месяца" : "месяцев");
  }
  /* ---------- данные модели (комплектации, цвета, фото) с /api/folder, один запрос на модель ---------- */
  var folders = {};
  function loadFolder(mark, slug) {
    var url = ((window.SITE && window.SITE.base) || "") + "/api/folder/" + encodeURIComponent(mark) + "/" + encodeURIComponent(slug);
    if (!folders[url]) {
      folders[url] = fetch(url, { headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      folders[url].catch(function () { delete folders[url]; }); /* при ошибке попробуем ещё раз */
    }
    return folders[url];
  }

  /* ---------- форма: марка → модель → комплектация, калькулятор, блок машины ---------- */
  function initCarForm(form) {
    function box(type) { return $('.js-select[data-type="' + type + '"]', form); }
    function sel(w) { return w ? $(".js-select-native", w) : null; }
    var mark = box("mark"), folder = box("folder"), compl = box("complectation");
    var markSel = sel(mark), folderSel = sel(folder), complSel = sel(compl);
    var block = $(".js-car-block", form), calc = $(".js-calculator", form);
    var feeText = calc && $(".js-calc-fee-text", calc);
    if (!markSel || !folderSel) return;
    var st = {
      price: 0, fee: 0, color: 0, folder: null, req: 0,
      n: +(block && block.getAttribute("data-months")) || 96,
      rate: parseFloat(String(block && block.getAttribute("data-rate") || "4.9").replace(",", ".")) || 4.9
    };

    /* первый взнос в рублях, когда известна цена комплектации; платёж и цена в блоке машины */
    function update() {
      if (feeText) feeText.textContent = st.price ? money(st.price / 100 * st.fee) + " ₽" : st.fee + "%";
      if (!block) return;
      $(".js-car-monthly", block).textContent = st.price ? "от " + payment(st.price, st.fee, st.n, st.rate) + " ₽/мес." : " --- ";
      $(".js-car-price", block).textContent = st.price ? money(st.price) + " ₽" : " --- ";
    }
    if (calc) {
      var feeInput = $(".js-calc-fee", calc), periodInput = $(".js-calc-period", calc);
      var periodText = $(".js-calc-period-text", calc);
      $$(".js-calc-slider", calc).forEach(function (s) {
        initSlider(s, function (v) {
          if (s.getAttribute("data-kind") === "fee") {
            st.fee = v;
            feeInput.value = v + " %";
          } else {
            st.n = v;
            periodInput.value = v + " мес.";
            periodText.textContent = months(v);
          }
          update();
        });
      });
    }

    function reset(w) {
      var s = sel(w);
      if (!s) return;
      s.length = 1;
      s.value = "";
      w.refresh();
    }
    function complPrice() {
      var o = complSel && complSel.options[complSel.selectedIndex];
      return o && o.value ? +o.getAttribute("data-price") || 0 : 0;
    }
    /* как у оригинала: «модификация комплектация цена», сразу выбрана самая дешёвая */
    function fillComplectations(f) {
      if (!complSel) return;
      complSel.length = 1;
      var best = null;
      (f.modifications || []).forEach(function (m) {
        (m.complectations || []).forEach(function (c) {
          var text = ((m.title || "") + " " + (c.title || "")).replace(/\s+/g, " ").trim() + " " + money(c.price) + " ₽";
          var o = new Option(text, plain(text));
          o.setAttribute("data-price", c.price || 0);
          complSel.add(o);
          if (!best || +c.price < +best.getAttribute("data-price")) best = o;
        });
      });
      if (best) best.selected = true;
      compl.refresh();
    }

    function paintColor() {
      var f = st.folder, c = (f.colors || [])[st.color], im = (c && c.image) || {}, fi = f.image || {};
      var src = im.medium_webp || im.medium || fi.image_medium_webp || fi.image_medium || "";
      $$(".offer__color", block).forEach(function (li, k) {
        li.classList.toggle("offer__color--active", k === st.color);
        li.setAttribute("aria-pressed", k === st.color ? "true" : "false");
      });
      $$(".js-car-img", block).forEach(function (img) {
        if (src) img.src = src;
        img.alt = [f.mark && f.mark.title, f.title, c && c.title].filter(Boolean).join(" ");
      });
      $(".js-car-color", block).value = c && c.title ? c.title : "";
    }
    function tech(name, value, unit) {
      var el = $(".js-car-" + name, block);
      el.hidden = value === null || value === undefined || value === "";
      $(".js-car-value", el).textContent = el.hidden ? "" : value + unit;
    }
    function showFolder(f) {
      if (!block) return;
      st.folder = f;
      st.color = 0;
      $(".js-car-mark", block).textContent = (f.mark && f.mark.title) || "";
      $(".js-car-folder", block).textContent = f.title || "";
      var ul = $(".js-car-colors", block);
      ul.innerHTML = "";
      (f.colors || []).forEach(function (c, k) {
        var li = document.createElement("li");
        li.className = "offer__color";
        li.tabIndex = 0;
        li.title = c.title || "";
        li.setAttribute("role", "button");
        li.setAttribute("aria-label", c.title || "Цвет " + (k + 1));
        /* двухцветный кузов — диагональю, как у оригинала (без их текстуры color.png) */
        if (c.roof_hex_code) li.style.background = "linear-gradient(50deg, " + c.hex_code + " 50%, " + c.roof_hex_code + " 50%)";
        else li.style.backgroundColor = c.hex_code;
        function pick() { st.color = k; paintColor(); }
        li.addEventListener("click", pick);
        li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
        ul.appendChild(li);
      });
      tech("fuel", f.fuel, " л");
      tech("time", f.time, " сек.");
      tech("speed", f.max_speed, " км/ч");
      paintColor();
      block.hidden = false;
    }
    function hideFolder() {
      st.folder = null;
      st.price = 0;
      if (!block) return;
      block.hidden = true;
      $(".js-car-color", block).value = "";
    }

    /* модели марки лежат в data-folders её пункта */
    markSel.addEventListener("change", function () {
      st.req++;
      var opt = markSel.options[markSel.selectedIndex], titles = [], slugs = [];
      try {
        titles = JSON.parse(opt.getAttribute("data-folders") || "[]");
        slugs = JSON.parse(opt.getAttribute("data-slugs") || "[]");
      } catch (e) { titles = []; }
      folderSel.length = 1;
      titles.forEach(function (t, i) {
        var o = new Option(t, t);
        o.setAttribute("data-slug", slugs[i] || "");
        folderSel.add(o);
      });
      folderSel.value = "";
      folder.refresh();
      reset(compl);
      hideFolder();
      update();
    });
    folderSel.addEventListener("change", function () {
      var token = ++st.req, f = folderSel.options[folderSel.selectedIndex], m = markSel.options[markSel.selectedIndex];
      reset(compl);
      hideFolder();
      update();
      if (!folderSel.value || !m.value) return;
      loadFolder(m.getAttribute("data-slug"), f.getAttribute("data-slug")).then(function (data) {
        if (token !== st.req || !data) return; /* пока грузилось, выбрали другую модель */
        fillComplectations(data);
        st.price = complPrice();
        showFolder(data);
        update();
      }, function () { /* данных модели нет — комплектация остаётся пустой, заявку можно отправить */ });
    });
    if (complSel) complSel.addEventListener("change", function () { st.price = complPrice(); update(); });
    update();
  }

  /* ---------- проверка формы, как у оригинала; отправку и проверку телефона делает app.js ---------- */
  function problem(form) {
    var el = form.elements;
    function val(n) { return el[n] ? String(el[n].value || "").trim() : null; }
    if (val("client_vehicle_mark") === "") return "Заполните поле Марка";
    if (val("client_vehicle_model") === "") return "Заполните поле Модель";
    if (val("client_vehicle_year") !== null && !/^(19|20)\d\d$/.test(val("client_vehicle_year"))) return "Укажите год выпуска";
    if (val("car_mark") === "") return "Выберите марку";
    if (val("car_model") === "") return "Выберите модель";
    if (val("name") === "") return "Заполните поле ФИО";
    return "";
  }
  $$(".js-car-form").forEach(function (form) {
    initCarForm(form);
    var err = $(".js-form-error", form);
    form.addEventListener("submit", function (e) {
      var msg = problem(form);
      if (!msg) return;
      e.preventDefault();
      e.stopPropagation(); /* до app.js заявка не доходит */
      if (err) { err.textContent = msg; err.hidden = false; }
    });
    function hideError() { if (err) err.hidden = true; }
    form.addEventListener("change", hideError);
    form.addEventListener("input", function (e) {
      if (e.target.classList.contains("js-digits")) e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      hideError();
    });
  });

  /* ---------- фото «О компании»: автопрокрутка раз в 5 секунд, пауза под курсором, как у оригинала ---------- */
  var about = $("#slider-about");
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (about && !still) {
    var vp = $(".f-carousel__viewport", about), hover = false;
    about.addEventListener("mouseenter", function () { hover = true; });
    about.addEventListener("mouseleave", function () { hover = false; });
    setInterval(function () {
      if (hover || document.hidden || !vp) return;
      var slide = $(".f-carousel__slide", about), step = slide ? slide.getBoundingClientRect().width : vp.clientWidth;
      if (vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 2) vp.scrollTo({ left: 0 });
      else vp.scrollBy({ left: step });
    }, 5000);
  }
})();
