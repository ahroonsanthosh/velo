(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================================================================
     PHASE A — runs immediately, zero external dependencies. This is
     the entire experience for anyone who never gets to Phase B (slow
     network, script blocked, etc): preloader, hero reveal, nav, menu
     accordion, hours, reveal-on-scroll all work without GSAP/Lenis.
     ================================================================ */

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  /* ---- 1. Preloader: vanilla rAF counter + CSS wipe ---- */
  var preloader = document.querySelector("[data-preloader]");
  var preloaderCount = document.querySelector("[data-preloader-count]");

  function staggerIn(el, selector, baseDelay, step) {
    var items = el.querySelectorAll(selector);
    items.forEach(function (item, i) {
      item.style.transitionDelay = baseDelay + i * step + "ms";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("is-in");
      });
    });
  }

  function runHeroIntro() {
    var heroMedia = document.querySelector(".hero__media");
    var heroTitle = document.querySelector(".hero__title");
    if (heroMedia) heroMedia.classList.add("is-in");
    if (heroTitle) staggerIn(heroTitle, ".word", 100, 45);
  }

  function hidePreloader() {
    if (!preloader) {
      runHeroIntro();
      return;
    }
    preloader.classList.add("is-hidden");
    setTimeout(function () {
      preloader.style.display = "none";
    }, 420);
    runHeroIntro();
  }

  if (preloader && !reduceMotion) {
    var pStart = performance.now();
    var pDuration = 650;
    function tickCounter(now) {
      var pct = Math.min(1, (now - pStart) / pDuration);
      if (preloaderCount) preloaderCount.textContent = Math.round(pct * 100);
      if (pct < 1) {
        requestAnimationFrame(tickCounter);
      } else {
        setTimeout(hidePreloader, 120);
      }
    }
    requestAnimationFrame(tickCounter);
    // never let a stalled rAF trap the page
    setTimeout(hidePreloader, 1800);
  } else if (preloader) {
    preloader.style.display = "none";
    runHeroIntro();
  } else {
    runHeroIntro();
  }

  /* ---- 2. Header: solidify past hero + hide on scroll down ---- */
  var header = document.querySelector(".site-header");
  var lastY = 0;
  if (header) {
    window.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY;
        header.setAttribute("data-scrolled", y > 40 ? "true" : "false");
        header.setAttribute("data-hidden", y > lastY && y > 200 ? "true" : "false");
        lastY = y;
      },
      { passive: true }
    );
  }

  /* ---- 3. Mobile fullscreen overlay menu (CSS-driven) ---- */
  var mobileMenu = document.querySelector("[data-mobile-menu]");
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var menuClose = document.querySelector("[data-menu-close]");
  var menuOpen = false;

  function openMobileMenu() {
    if (!mobileMenu || menuOpen) return;
    menuOpen = true;
    mobileMenu.setAttribute("data-open", "true");
    mobileMenu.setAttribute("aria-hidden", "false");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
    staggerIn(mobileMenu, ".mobile-menu__link", 200, 70);
    var firstLink = mobileMenu.querySelector(".mobile-menu__link");
    if (firstLink) firstLink.focus();
  }

  function closeMobileMenu() {
    if (!mobileMenu || !menuOpen) return;
    menuOpen = false;
    mobileMenu.classList.remove("is-in");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (window.__lenis) window.__lenis.start();
    setTimeout(function () {
      mobileMenu.setAttribute("data-open", "false");
    }, 500);
  }

  if (menuToggle) menuToggle.addEventListener("click", openMobileMenu);
  if (menuClose) menuClose.addEventListener("click", closeMobileMenu);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuOpen) closeMobileMenu();
  });
  document.querySelectorAll(".mobile-menu__link").forEach(function (a) {
    a.addEventListener("click", closeMobileMenu);
  });

  /* ---- 4. Smooth-scroll helper — upgraded to Lenis once Phase B loads ---- */
  function scrollToTarget(target, opts) {
    if (window.__lenis) {
      window.__lenis.scrollTo(target, opts || { duration: 1.1 });
      return;
    }
    if (typeof target === "string" || (target && target.nodeType)) {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href || href === "#") return;
    a.addEventListener("click", function (e) {
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      scrollToTarget(target);
      history.pushState(null, "", href);
    });
  });

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
      scrollToTarget(0, { duration: 1.3 });
    });
  }

  /* ---- 5. Generic scroll-triggered reveal (fade-up) ---- */
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

  /* ---- 6. Story media blur-to-sharp on view ---- */
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

  /* ---- 7. Draw-on stroke reveal for hand-drawn ornament icons ---- */
  var drawIcons = document.querySelectorAll(".draw-icon, .draw-path");
  function drawOn(root) {
    var shapes = root.matches("path, line, circle, ellipse")
      ? [root]
      : Array.prototype.slice.call(root.querySelectorAll("path, line, circle, ellipse"));
    shapes.forEach(function (shape, i) {
      var len;
      try {
        len = shape.getTotalLength();
      } catch (e) {
        return;
      }
      shape.style.strokeDasharray = len;
      shape.style.strokeDashoffset = len;
      shape.style.transition = "stroke-dashoffset 1.1s ease " + i * 0.05 + "s";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          shape.style.strokeDashoffset = 0;
        });
      });
    });
  }
  if (drawIcons.length && "IntersectionObserver" in window && !reduceMotion) {
    var drawIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          drawOn(entry.target);
          drawIo.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    drawIcons.forEach(function (el) {
      drawIo.observe(el);
    });
  }

  /* ---- 8. Menu accordion (single-open) + Ken Burns active-state ---- */
  var cats = document.querySelectorAll(".menu-cat");
  cats.forEach(function (cat) {
    var trigger = cat.querySelector(".menu-cat__trigger");
    var panel = cat.querySelector(".menu-cat__panel");
    var kb = cat.querySelector(".kb-hover");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", function () {
      var isOpen = cat.getAttribute("data-open") === "true";
      cats.forEach(function (other) {
        other.setAttribute("data-open", "false");
        var t = other.querySelector(".menu-cat__trigger");
        if (t) t.setAttribute("aria-expanded", "false");
        var okb = other.querySelector(".kb-hover");
        if (okb) okb.classList.remove("is-active");
      });
      if (!isOpen) {
        cat.setAttribute("data-open", "true");
        trigger.setAttribute("aria-expanded", "true");
        if (kb) kb.classList.add("is-active");
      }
    });
  });
  if ("IntersectionObserver" in window && "ontouchstart" in window) {
    var kbIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll(".kb-hover").forEach(function (el) {
      kbIo.observe(el);
    });
  }

  /* ---- 9. Bicycle-wheel physics drop (Matter.js, lazy on demand) ---- */
  var dropTrigger = document.querySelector("[data-drop-wheels]");
  var matterLoaded = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function loadMatter() {
    if (matterLoaded) return matterLoaded;
    matterLoaded = window.Matter ? Promise.resolve(window.Matter) : loadScript("assets/js/vendor/matter.min.js").then(function () {
      return window.Matter;
    });
    return matterLoaded;
  }

  var wheelWorld = null;

  function initWheelWorld(Matter) {
    if (wheelWorld) return wheelWorld;
    var canvas = document.createElement("canvas");
    canvas.id = "wheel-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var engine = Matter.Engine.create();
    var render = Matter.Render.create({
      canvas: canvas,
      engine: engine,
      options: { width: window.innerWidth, height: window.innerHeight, wireframes: false, background: "transparent" },
    });

    var opts = { isStatic: true, render: { visible: false } };
    var W = window.innerWidth,
      H = window.innerHeight;
    var walls = [
      Matter.Bodies.rectangle(W / 2, H + 30, W * 2, 60, opts),
      Matter.Bodies.rectangle(-30, H / 2, 60, H * 2, opts),
      Matter.Bodies.rectangle(W + 30, H / 2, 60, H * 2, opts),
    ];
    Matter.World.add(engine.world, walls);

    var mouse = Matter.Mouse.create(canvas);
    var mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.15, render: { visible: false } },
    });
    Matter.World.add(engine.world, mouseConstraint);
    mouse.element.removeEventListener("wheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

    Matter.Render.run(render);
    var runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    window.addEventListener(
      "resize",
      debounce(function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
        Matter.Body.setPosition(walls[0], { x: window.innerWidth / 2, y: window.innerHeight + 30 });
        Matter.Body.setPosition(walls[2], { x: window.innerWidth + 30, y: window.innerHeight / 2 });
      }, 200)
    );

    wheelWorld = { Matter: Matter, engine: engine, canvas: canvas };
    return wheelWorld;
  }

  function dropWheel(world) {
    var Matter = world.Matter;
    var r = 38;
    var x = r + Math.random() * (window.innerWidth - r * 2);
    var body = Matter.Bodies.circle(x, -80, r, {
      restitution: 0.5,
      friction: 0.3,
      frictionAir: 0.006,
      density: 0.0015,
      render: {
        sprite: {
          texture: "assets/img/processed/wheel-sprite.png",
          xScale: (r * 2) / 256,
          yScale: (r * 2) / 256,
        },
      },
    });
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
    Matter.World.add(world.engine.world, body);

    var bodies = Matter.Composite.allBodies(world.engine.world).filter(function (b) {
      return !b.isStatic;
    });
    if (bodies.length > 40) Matter.World.remove(world.engine.world, bodies[0]);
  }

  if (dropTrigger) {
    var wheelSvg = dropTrigger.querySelector("svg");
    dropTrigger.addEventListener("click", function () {
      if (wheelSvg && !reduceMotion) {
        wheelSvg.classList.remove("is-spinning");
        void wheelSvg.offsetWidth;
        wheelSvg.classList.add("is-spinning");
      }
      if (reduceMotion) return;
      loadMatter().then(function (Matter) {
        var world = initWheelWorld(Matter);
        world.canvas.style.pointerEvents = "auto";
        for (var i = 0; i < 3; i++) {
          setTimeout(function () {
            dropWheel(world);
          }, i * 90);
        }
      });
    });
    if (wheelSvg) {
      wheelSvg.addEventListener("animationend", function () {
        wheelSvg.classList.remove("is-spinning");
      });
    }
  }

  /* ---- 10. Live hours: open/closed state + today row ---- */
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

      var pills = document.querySelectorAll("[data-open-pill]");
      var dots = document.querySelectorAll("[data-status-dot]");
      var row = document.querySelector('[data-day-row="' + todayKey + '"]');
      if (row) row.setAttribute("data-today", "true");

      if (todayEntry) {
        var openMin = toMinutes(todayEntry.open);
        var closeMin = toMinutes(todayEntry.close);
        var isOpen = nowMinutes >= openMin && nowMinutes < closeMin;

        var msg;
        if (isOpen) {
          var minsLeft = closeMin - nowMinutes;
          msg = minsLeft <= 45 ? "Open now — last orders soon, closes " + formatLabel(todayEntry.close) : "Open now — closes " + formatLabel(todayEntry.close);
        } else if (nowMinutes < openMin) {
          msg = "Closed — opens today " + formatLabel(todayEntry.open);
        } else {
          msg = "Closed for today — back " + formatLabel(todayEntry.open) + " tomorrow";
        }
        pills.forEach(function (p) {
          p.textContent = msg;
        });
        dots.forEach(function (d) {
          d.setAttribute("data-open", String(isOpen));
        });
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

  /* ================================================================
     PHASE B — GSAP + ScrollTrigger + Lenis, lazy-loaded well after
     the page has painted and gone interactive. Everything here is a
     progressive enhancement: the page is already fully functional
     without it. Loaded on window 'load' (or sooner if the browser is
     idle) so it never competes with the critical rendering path.
     ================================================================ */
  function boostrapEnhancedMotion() {
    if (reduceMotion) return; // pure delight layer — skip entirely
    loadScript("assets/js/vendor/gsap.min.js")
      .then(function () {
        return loadScript("assets/js/vendor/ScrollTrigger.min.js");
      })
      .then(function () {
        return loadScript("assets/js/vendor/lenis.min.js");
      })
      .then(initEnhancedMotion)
      .catch(function () {
        /* offline or blocked — Phase A already covers the full experience */
      });
  }

  function initEnhancedMotion() {
    if (!window.gsap || !window.ScrollTrigger || !window.Lenis) return;
    gsap.registerPlugin(ScrollTrigger);

    /* Lenis smooth scroll, wired to the GSAP ticker */
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true, smoothTouch: false });
    window.__lenis = lenis;
    document.documentElement.style.scrollBehavior = "auto";
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    var mm = gsap.matchMedia();

    /* Ambient float + scroll parallax on hero ornaments */
    mm.add("(min-width: 641px)", function () {
      gsap.to(".hero__ornament--wheel", { y: -10, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".hero__ornament--olive", { y: 8, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".hero__ornament--wheel", {
        yPercent: 30,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero__ornament--olive", {
        yPercent: -20,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    });

    /* Marquee direction inversion (both bands) */
    [".marquee__track", ".announce__track"].forEach(function (sel) {
      var track = document.querySelector(sel);
      if (!track) return;
      track.style.animation = "none";
      var loop = gsap.to(track, { xPercent: -50, duration: sel.indexOf("announce") > -1 ? 26 : 30, ease: "none", repeat: -1 });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: function (self) {
          loop.timeScale(self.direction === 1 ? 1 : -1.4);
        },
      });
    });

    /* Four-panel pinned scroll-scrubbed cycler */
    var panels = gsap.utils.toArray(".cycler__panel");
    var dots = gsap.utils.toArray(".cycler__dot");
    if (panels.length) {
      panels.forEach(function (p, i) {
        p.setAttribute("data-active", i === 0 ? "true" : "false");
      });
      if (dots[0]) dots[0].setAttribute("data-active", "true");
      ScrollTrigger.create({
        trigger: ".cycler__pin",
        start: "top top",
        end: "+=" + window.innerHeight * (panels.length - 1) * 1.15,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var i = Math.min(panels.length - 1, Math.floor(self.progress * panels.length));
          panels.forEach(function (p, idx) {
            p.setAttribute("data-active", idx === i ? "true" : "false");
          });
          dots.forEach(function (d, idx) {
            d.setAttribute("data-active", idx === i ? "true" : "false");
          });
        },
      });
    }

    /* Pinned horizontal-scroll gallery (desktop only) */
    mm.add("(min-width: 900px)", function () {
      var track = document.querySelector(".gallery__collage");
      var pin = document.querySelector(".gallery__pin");
      if (!track || !pin) return;
      var distance = Math.max(0, track.scrollWidth - pin.clientWidth + 80);
      gsap.to(track, {
        x: function () {
          return -distance;
        },
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: function () {
            return "+=" + distance;
          },
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      return function () {
        gsap.set(track, { clearProps: "transform" });
      };
    });

    /* Scroll-linked badge rotation (footer seal) */
    var badge = document.querySelector(".badge-rotate");
    if (badge) {
      gsap.to(badge, {
        rotation: 360,
        ease: "none",
        scrollTrigger: { trigger: badge, start: "top bottom", end: "bottom top", scrub: 1 },
      });
    }

    window.addEventListener("resize", debounce(function () {
      ScrollTrigger.refresh();
    }, 200));
  }

  if ("requestIdleCallback" in window) {
    window.addEventListener("load", function () {
      requestIdleCallback(boostrapEnhancedMotion, { timeout: 2500 });
    });
  } else {
    window.addEventListener("load", function () {
      setTimeout(boostrapEnhancedMotion, 800);
    });
  }
})();
