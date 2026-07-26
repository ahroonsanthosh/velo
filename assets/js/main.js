(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header scrim on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var setScrolled = function () {
      header.setAttribute("data-scrolled", window.scrollY > 40 ? "true" : "false");
    };
    setScrolled();
    window.addEventListener("scroll", setScrolled, { passive: true });
  }

  /* ---------- generic scroll-triggered reveal ---------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* ---------- hero blur-to-sharp entrance (fires once, shortly after paint) ---------- */
  var heroMedia = document.querySelector(".hero__media");
  var heroTitle = document.querySelector(".hero__title");
  requestAnimationFrame(function () {
    setTimeout(function () {
      if (heroMedia) heroMedia.classList.add("is-in");
      if (heroTitle) heroTitle.classList.add("is-in");
    }, 120);
  });

  /* ---------- story media blur-to-sharp on view ---------- */
  var storyMedia = document.querySelector(".story__media");
  if (storyMedia) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      var sio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              sio.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px" }
      );
      sio.observe(storyMedia);
    } else {
      storyMedia.classList.add("is-in");
    }
  }

  /* ---------- menu accordion (single-open) ---------- */
  var cats = document.querySelectorAll(".menu-cat");
  cats.forEach(function (cat) {
    var trigger = cat.querySelector(".menu-cat__trigger");
    var panel = cat.querySelector(".menu-cat__panel");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", function () {
      var isOpen = cat.getAttribute("data-open") === "true";
      cats.forEach(function (other) {
        other.setAttribute("data-open", "false");
        var t = other.querySelector(".menu-cat__trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        cat.setAttribute("data-open", "true");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- bicycle wheel spin easter egg ---------- */
  var wheelToy = document.querySelector(".wheel-toy");
  if (wheelToy) {
    var wheelSvg = wheelToy.querySelector("svg");
    wheelToy.addEventListener("click", function () {
      if (reduceMotion) return;
      wheelSvg.classList.remove("is-spinning");
      // restart animation
      void wheelSvg.offsetWidth;
      wheelSvg.classList.add("is-spinning");
    });
    wheelSvg.addEventListener("animationend", function () {
      wheelSvg.classList.remove("is-spinning");
    });
  }

  /* ---------- back to top ---------- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    window.addEventListener(
      "scroll",
      function () {
        toTop.classList.toggle("is-visible", window.scrollY > 900);
      },
      { passive: true }
    );
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- live hours: open/closed state + today row ---------- */
  var dataEl = document.getElementById("velo-hours-data");
  if (dataEl) {
    try {
      var schedule = JSON.parse(dataEl.textContent);
      var now = new Date();
      var dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      var todayKey = dayKeys[now.getDay()];
      var todayEntry = schedule.filter(function (d) {
        return d.key === todayKey;
      })[0];

      var toMinutes = function (hhmm) {
        var parts = hhmm.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };
      var nowMinutes = now.getHours() * 60 + now.getMinutes();

      var pill = document.querySelector("[data-open-pill]");
      var dot = document.querySelector("[data-status-dot]");
      var row = document.querySelector('[data-day-row="' + todayKey + '"]');
      if (row) row.setAttribute("data-today", "true");

      if (todayEntry) {
        var openMin = toMinutes(todayEntry.open);
        var closeMin = toMinutes(todayEntry.close);
        var isOpen = nowMinutes >= openMin && nowMinutes < closeMin;

        if (pill) {
          if (isOpen) {
            var minsLeft = closeMin - nowMinutes;
            var msg =
              minsLeft <= 45
                ? "Open now — last orders soon, closes " + formatLabel(todayEntry.close)
                : "Open now — closes " + formatLabel(todayEntry.close);
            pill.textContent = msg;
          } else if (nowMinutes < openMin) {
            pill.textContent = "Closed — opens today " + formatLabel(todayEntry.open);
          } else {
            pill.textContent = "Closed for today — back " + formatLabel(todayEntry.open) + " tomorrow";
          }
        }
        if (dot) dot.setAttribute("data-open", String(isOpen));
      }
    } catch (e) {
      /* JSON parse failure leaves the static fallback text in place */
    }
  }

  function formatLabel(hhmm) {
    var parts = hhmm.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var suffix = h >= 12 ? "pm" : "am";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return m === "00" ? h12 + suffix : h12 + ":" + m + suffix;
  }
})();
