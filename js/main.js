(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasObserver = "IntersectionObserver" in window;

  /* ==========================================================
     ШАПКА: тень при прокрутке, мобильное меню, подсветка раздела
     ========================================================== */
  var header = document.querySelector(".header");
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    header.classList.toggle("is-open", open);
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }

  burger.addEventListener("click", function () {
    setMenu(!header.classList.contains("is-open"));
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) setMenu(false);
  });

  if (hasObserver) {
    var navLinks = {};
    menu.querySelectorAll('a[href^="#"]').forEach(function (a) {
      navLinks[a.getAttribute("href").slice(1)] = a;
    });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(navLinks).forEach(function (id) {
          navLinks[id].removeAttribute("aria-current");
        });
        if (navLinks[entry.target.id]) {
          navLinks[entry.target.id].setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    document.querySelectorAll("main section[id]").forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ==========================================================
     ПЛАВНОЕ ПОЯВЛЕНИЕ БЛОКОВ ПРИ СКРОЛЛЕ
     Классы добавляются отсюда, поэтому в HTML их нет.
     ========================================================== */
  if (hasObserver && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    var expand = function (el) {
      var isGroup = /^(UL|OL|DL)$/.test(el.tagName) ||
        el.matches(".split") ||
        el.matches(".hero .container > div");
      return isGroup ? Array.prototype.slice.call(el.children) : [el];
    };

    document.querySelectorAll("main section").forEach(function (section) {
      var box = section.querySelector(".container");
      if (!box) return;
      var isHero = section.classList.contains("hero");

      Array.prototype.forEach.call(box.children, function (child) {
        expand(child).forEach(function (el, i) {
          var delay = Math.min(i, 6) * (isHero ? 110 : 90);
          if (isHero && el.tagName === "IMG") delay = 300;
          el.classList.add("reveal");
          el.style.animationDelay = delay + "ms";
          revealObserver.observe(el);
        });
      });
    });
  }

  /* ==========================================================
     FAQ: плавное открытие и закрытие
     ========================================================== */
  document.querySelectorAll(".faq details").forEach(function (details) {
    var summary = details.querySelector("summary");
    var animation = null;

    details.classList.toggle("is-open", details.open);

    function run(from, to, onDone) {
      details.style.overflow = "hidden";
      animation = details.animate(
        { height: [from + "px", to + "px"] },
        { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
      );
      animation.onfinish = function () {
        onDone();
        animation = null;
        details.style.overflow = "";
      };
    }

    summary.addEventListener("click", function (e) {
      e.preventDefault();

      var opening = !details.classList.contains("is-open");
      details.classList.toggle("is-open", opening);

      if (reduceMotion || !details.animate) {
        details.open = opening;
        return;
      }

      var startHeight = details.offsetHeight;
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = null;
        details.style.overflow = "";
      }

      if (opening) {
        details.open = true;
        run(startHeight, details.offsetHeight, function () {});
      } else {
        var borders = details.offsetHeight - details.clientHeight;
        var closedHeight = summary.offsetHeight + borders;
        run(startHeight, closedHeight, function () {
          details.open = false;
        });
      }
    });
  });

  /* ==========================================================
     Выбор услуги на карточке подставляется в форму
     ========================================================== */
  var form = document.querySelector(".booking form");
  var serviceSelect = form.elements.service;

  document.querySelectorAll("[data-service]").forEach(function (link) {
    link.addEventListener("click", function () {
      serviceSelect.value = link.getAttribute("data-service");
    });
  });

  /* ==========================================================
     Мобильная панель «Позвонить / Записаться»:
     прячется на первом экране, у формы и в подвале
     ========================================================== */
  var bar = document.querySelector(".mobile-bar");
  if (bar && hasObserver) {
    var covered = {};
    var barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        covered[entry.target.id] = entry.isIntersecting;
      });
      var hide = Object.keys(covered).some(function (id) { return covered[id]; });
      bar.classList.toggle("is-hidden", hide);
    });
    ["hero", "booking", "footer"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) barObserver.observe(el);
    });
  }

  /* ==========================================================
     ФОРМА ЗАЯВКИ
     ========================================================== */
  var nameInput = form.elements.name;
  var phoneInput = form.elements.phone;
  var consentInput = form.elements.consent;
  var submitButton = form.querySelector('button[type="submit"]');
  var statusBox = form.querySelector("p[role='status']");

  /* --- Телефон: только цифры, маска +7 (XXX) XXX-XX-XX --- */
  function phoneDigits(value) {
    var digits = value.replace(/\D/g, "");
    if (digits.charAt(0) === "7" || digits.charAt(0) === "8") {
      digits = digits.slice(1);
    }
    return digits.slice(0, 10);
  }

  function formatPhone(digits, touched) {
    if (!digits) return touched ? "+7" : "";
    var result = "+7 (" + digits.slice(0, 3);
    if (digits.length >= 3) result += ")";
    if (digits.length > 3) result += " " + digits.slice(3, 6);
    if (digits.length > 6) result += "-" + digits.slice(6, 8);
    if (digits.length > 8) result += "-" + digits.slice(8, 10);
    return result;
  }

  var previousDigits = "";

  phoneInput.addEventListener("beforeinput", function (e) {
    if (e.inputType === "insertText" && e.data && /\D/.test(e.data)) {
      e.preventDefault();
    }
  });

  phoneInput.addEventListener("input", function (e) {
    var raw = phoneInput.value;
    var caret = phoneInput.selectionStart;
    var atEnd = caret === null || caret >= raw.length;
    var digitsLeftOfCaret = raw.slice(0, caret || 0).replace(/\D/g, "").length;

    var digits = phoneDigits(raw);

    // Удалили только скобку, пробел или дефис — убираем и последнюю цифру,
    // иначе маска вернёт символ на место и стереть его будет нельзя
    if (e.inputType === "deleteContentBackward" && digits === previousDigits && digits.length) {
      digits = digits.slice(0, -1);
      atEnd = true;
    }

    var formatted = formatPhone(digits, /\d/.test(raw));
    phoneInput.value = formatted;
    previousDigits = digits;

    if (!atEnd) {
      var counted = 0;
      var position = 0;
      while (position < formatted.length && counted < digitsLeftOfCaret) {
        if (/\d/.test(formatted.charAt(position))) counted++;
        position++;
      }
      try { phoneInput.setSelectionRange(position, position); } catch (err) {}
    }

    if (phoneInput.getAttribute("aria-invalid") && digits.length === 10) {
      setError(phoneInput, "");
    }
  });

  phoneInput.addEventListener("blur", function () {
    if (phoneInput.value === "+7") {
      phoneInput.value = "";
      previousDigits = "";
    }
  });

  /* --- Имя: только буквы, пробел, дефис, апостроф --- */
  nameInput.addEventListener("input", function () {
    var clean = nameInput.value
      .replace(/[^A-Za-zА-Яа-яЁё\s'’-]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s'’-]+/, "");
    if (clean !== nameInput.value) nameInput.value = clean;
    if (nameInput.getAttribute("aria-invalid") && isNameValid()) setError(nameInput, "");
  });

  consentInput.addEventListener("change", function () {
    if (consentInput.checked) setError(consentInput, "");
  });

  /* --- Проверка --- */
  function setError(input, message) {
    var small = input.closest("label").querySelector("small");
    small.textContent = message;
    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function isNameValid() {
    return nameInput.value.replace(/[^A-Za-zА-Яа-яЁё]/g, "").length >= 2;
  }

  function isPhoneValid() {
    var digits = phoneDigits(phoneInput.value);
    return digits.length === 10 && !/^[012]/.test(digits);
  }

  function validate() {
    var firstInvalid = null;

    if (!isNameValid()) {
      setError(nameInput, "Укажите имя — минимум 2 буквы");
      firstInvalid = firstInvalid || nameInput;
    } else {
      setError(nameInput, "");
    }

    if (!isPhoneValid()) {
      setError(phoneInput, "Введите номер полностью: +7 (XXX) XXX-XX-XX");
      firstInvalid = firstInvalid || phoneInput;
    } else {
      setError(phoneInput, "");
    }

    if (!consentInput.checked) {
      setError(consentInput, "Нужно согласие на обработку данных");
      firstInvalid = firstInvalid || consentInput;
    } else {
      setError(consentInput, "");
    }

    return firstInvalid;
  }

  nameInput.addEventListener("blur", function () {
    if (nameInput.value && !isNameValid()) setError(nameInput, "Укажите имя — минимум 2 буквы");
  });

  phoneInput.addEventListener("blur", function () {
    if (phoneInput.value && !isPhoneValid()) {
      setError(phoneInput, "Введите номер полностью: +7 (XXX) XXX-XX-XX");
    }
  });

  function setStatus(text, state) {
    statusBox.textContent = text;
    if (state) {
      statusBox.setAttribute("data-state", state);
    } else {
      statusBox.removeAttribute("data-state");
    }
  }

  /* --- Отправка ---
     Сейчас это заглушка. Для боевого сайта замените тело функции на запрос
     к вашему серверу, Telegram-боту, amoCRM, Битрикс24 и т. п.:

     return fetch("/api/lead", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(data)
     }).then(function (response) {
       if (!response.ok) throw new Error("Ошибка отправки");
     });
  */
  function sendLead(data) {
    return new Promise(function (resolve) {
      console.log("Новая заявка:", data);
      setTimeout(resolve, 700);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("", "");

    var firstInvalid = validate();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var data = {
      name: nameInput.value.trim(),
      phone: "+7" + phoneDigits(phoneInput.value),
      service: serviceSelect.value,
      page: window.location.href
    };

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";

    sendLead(data)
      .then(function () {
        form.reset();
        previousDigits = "";
        setStatus("Спасибо, " + data.name + "! Мы перезвоним вам в течение 15 минут.", "ok");
      })
      .catch(function () {
        setStatus("Не получилось отправить заявку. Позвоните нам: +7 (900) 000-00-00", "error");
      })
      .then(function () {
        submitButton.disabled = false;
        submitButton.textContent = "Записаться";
      });
  });
})();
