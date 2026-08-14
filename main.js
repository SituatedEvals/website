/* Progressive enhancement only. The page is complete and readable without
   this file: the pre-launch CTA is the server-rendered default, every
   disclosure is a native <details>, and the timeline ships with its state
   already correct in the markup.

   Handles: the countdown state check, the mobile nav, scroll reveals, and
   the photo duotone hover. Nothing else. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var now = new Date();

  /* ---------------------------------------------------------- mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ------------------------------------------------------- scroll reveals */
  var targets = document.querySelectorAll(".reveal, .wc");
  if (reduced.matches || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ------------------------------------------------ photo duotone on focus */
  /* Hover is handled in CSS. Making each band focusable gives keyboard users
     the same reveal; the alt text carries the content either way. */
  Array.prototype.forEach.call(document.querySelectorAll(".band-frame"), function (el) {
    el.setAttribute("tabindex", "0");
  });

  /* ------------------------------------------------ data table: read a column */
  var table = document.getElementById("instrument-table");
  if (table) {
    var hot = function (e) {
      var cell = e.target.closest("[data-c]");
      if (cell) { table.setAttribute("data-hot", cell.getAttribute("data-c")); }
    };
    var cool = function () { table.removeAttribute("data-hot"); };
    table.addEventListener("mouseover", hot);
    table.addEventListener("mouseleave", cool);
    table.addEventListener("focusin", hot);
    table.addEventListener("focusout", cool);
  }

  /* --------------------------------------------------- binary texture fill */
  /* Decorative, aria-hidden, and low contrast: the response alphabet of the
     task rather than generic ones and zeroes. */
  var tex = document.querySelector(".binary-texture");
  if (tex) {
    var tokens = ["0", "1", "0", "1", "NA_GATED", "1", "0", "Ω", "0", "1", "p̂", "1", "0", "0", "1"];
    var out = "";
    for (var i = 0; i < 320; i++) {
      out += tokens[(i * 7 + (i % 13)) % tokens.length] + " ";
    }
    tex.textContent = out;
  }

  /* ============================================================ countdown */
  /* Two states live in the DOM, and the page moves through them in order:
     before August 17, 2026 the pre-launch state counts down to the launch;
     from then until October 30 the development-phase state counts down to the
     deadline; after that the static line stands alone. The pre-launch state is
     the no-JS default, so the page is correct without this file.

     The handover happens in place. If the launch passes with a tab open, the
     seconds counter runs out, the pre-launch state is hidden, and the deadline
     counter starts — no reload, and no page left a day behind.

     Neither counter can render a zero or a negative: when a target is reached
     its element is put back to the static line it shipped with. */
  var LAUNCH = new Date("2026-08-17T00:00:00Z");
  var pre = document.getElementById("cta-pre");
  var post = document.getElementById("cta-post");

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function unit(value, label) {
    return '<span class="cd-unit"><span class="cd-num">' + value +
           '</span><span class="cd-lab">' + label + "</span></span>";
  }

  function tick(el, target) {
    var ms = target - new Date();
    if (ms <= 0) { return false; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    /* Leading units that have run out are dropped rather than shown as zero:
       on the final day the counter reads hrs/min/sec, in the final hour
       min/sec. No unit on the page ever displays a 0 or a negative. */
    var out = "";
    if (d > 0) { out += unit(d, d === 1 ? "day" : "days"); }
    if (d > 0 || h > 0) { out += unit(d > 0 ? pad(h) : h, h === 1 && d === 0 ? "hr" : "hrs"); }
    if (d > 0 || h > 0 || m > 0) { out += unit(d > 0 || h > 0 ? pad(m) : m, "min"); }
    out += unit(d > 0 || h > 0 || m > 0 ? pad(sec) : sec, "sec");
    el.innerHTML = '<span class="cd-grid">' + out + "</span>";
    return true;
  }

  function days(el, target) {
    var ms = target - new Date();
    if (ms <= 0) { return false; }
    var d = Math.ceil(ms / 86400000);
    el.innerHTML = '<span class="cd-grid">' + unit(d, d === 1 ? "day left" : "days left") + "</span>";
    return true;
  }

  /* Drives one counter to its target. `render` returns false once the target
     has passed, at which point the element is restored to the static line it
     shipped with, the interval stops, and `onEnd` hands over to whatever comes
     next. Returns false if the target was already in the past. */
  function countTo(el, render, everyMs, onEnd) {
    var target = new Date(el.getAttribute("data-target"));
    var fallback = el.innerHTML;
    var id = null;

    /* Runs at most one handover: a timer id of 0 is a valid id, and onEnd is
       dropped once spent, so a late tick cannot start a second counter. */
    function paint() {
      if (render(el, target)) { return true; }
      el.innerHTML = fallback;
      if (id !== null) { clearInterval(id); id = null; }
      if (onEnd) {
        var handover = onEnd;
        onEnd = null;
        handover();
      }
      return false;
    }

    if (!paint()) { return false; }
    id = setInterval(paint, everyMs);
    return true;
  }

  function showDevPhase() {
    pre.hidden = true;
    post.hidden = false;
    var section = post.closest("section");
    if (section) { section.setAttribute("aria-labelledby", "cta-h-post"); }
    /* A number that changes once a day is not motion, so this one runs whatever
       the motion preference — rechecked each minute so a tab left open
       overnight rolls to the lower number rather than sitting on yesterday's. */
    countTo(document.getElementById("deadline"), days, 60000);
  }

  if (pre && post) {
    if (now >= LAUNCH) {
      showDevPhase();
    } else if (reduced.matches) {
      /* A seconds counter is motion, so it is left off and the static line
         carries the module. The handover still has to happen, though, so the
         launch instant is watched at a rate nobody perceives as animation. */
      var watch = setInterval(function () {
        if (new Date() >= LAUNCH) { clearInterval(watch); showDevPhase(); }
      }, 60000);
    } else {
      countTo(document.getElementById("countdown"), tick, 1000, showDevPhase);
    }
  }
})();
