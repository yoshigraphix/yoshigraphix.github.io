/* Yoshi Sakaguchi — site behavior. No dependencies. */
(function () {
    "use strict";

    /* --- Mobile nav ------------------------------------------------------- */

    var navToggle = document.querySelector("[data-nav-toggle]");
    var nav = document.querySelector("[data-nav]");

    if (navToggle && nav) {
        navToggle.addEventListener("click", function () {
            var open = nav.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(open));
            document.body.style.overflow = open ? "hidden" : "";
        });

        nav.addEventListener("click", function (e) {
            if (e.target.tagName === "A") {
                nav.classList.remove("is-open");
                navToggle.setAttribute("aria-expanded", "false");
                document.body.style.overflow = "";
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && nav.classList.contains("is-open")) {
                navToggle.click();
            }
        });
    }

    /* --- Sticky header hairline ------------------------------------------- */

    var header = document.querySelector(".site-header");

    if (header) {
        var onScroll = function () {
            header.classList.toggle("is-stuck", window.scrollY > 8);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    var reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* --- Marquee ----------------------------------------------------------- */

    /* Collect the artwork list BEFORE cloning, so the lightbox sequence is the
       47 real cards in order rather than every duplicate. */

    var gallery = [];

    document.querySelectorAll(".marquee--media .marquee__track").forEach(function (track) {
        track.querySelectorAll("[data-full]").forEach(function (btn) {
            gallery.push({
                full: btn.dataset.full,
                alt: (btn.querySelector("img") || {}).alt || "",
            });
        });
    });

    /* Each .marquee holds one authored .marquee__track. Clone it until the row
       overflows the viewport twice over, so the loop never shows a seam. */

    document.querySelectorAll(".marquee").forEach(function (marquee) {
        var track = marquee.querySelector(".marquee__track");
        if (!track) return;

        var needed = Math.ceil((window.innerWidth * 2) / track.offsetWidth) || 1;

        for (var i = 0; i < needed; i++) {
            var clone = track.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            /* Duplicates must not be reachable by keyboard or read aloud */
            clone.querySelectorAll("button").forEach(function (b) {
                b.tabIndex = -1;
            });
            marquee.appendChild(clone);
        }
    });

    /* --- Lightbox ----------------------------------------------------------- */

    var lb = document.querySelector("[data-lightbox]");

    if (lb && gallery.length) {
        var lbImg = lb.querySelector("[data-lb-img]");
        var lbMeta = lb.querySelector("[data-lb-meta]");
        var index = 0;
        var lastFocus = null;

        var show = function (i) {
            index = (i + gallery.length) % gallery.length;
            var item = gallery[index];
            lbImg.src = item.full;
            lbImg.alt = item.alt;
            lbMeta.textContent = index + 1 + " / " + gallery.length;
        };

        var open = function (i) {
            lastFocus = document.activeElement;
            show(i);
            lb.hidden = false;
            document.body.classList.add("is-locked");
            lb.querySelector("[data-lb-close]").focus();
        };

        var close = function () {
            lb.hidden = true;
            lbImg.src = "";
            document.body.classList.remove("is-locked");
            if (lastFocus) lastFocus.focus();
        };

        /* Delegated, so cloned rows work without extra listeners */
        document.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-full]");
            if (!btn) return;
            var full = btn.dataset.full;
            for (var i = 0; i < gallery.length; i++) {
                if (gallery[i].full === full) return open(i);
            }
        });

        lb.querySelector("[data-lb-close]").addEventListener("click", close);
        lb.querySelector("[data-lb-prev]").addEventListener("click", function () {
            show(index - 1);
        });
        lb.querySelector("[data-lb-next]").addEventListener("click", function () {
            show(index + 1);
        });

        /* Click the backdrop (but not the image or controls) to dismiss */
        lb.addEventListener("click", function (e) {
            if (e.target === lb) close();
        });

        document.addEventListener("keydown", function (e) {
            if (lb.hidden) return;
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") show(index - 1);
            else if (e.key === "ArrowRight") show(index + 1);
        });
    }

    /* --- Parallax ---------------------------------------------------------- */

    /* Transform-only, rAF-throttled, and skipped entirely under reduced motion. */

    var layers = document.querySelectorAll("[data-parallax]");

    if (layers.length && !reduced) {
        var ticking = false;

        var place = function () {
            var y = window.scrollY;
            layers.forEach(function (el) {
                var rate = parseFloat(el.dataset.parallax) || 0;
                var host = el.parentElement.parentElement; /* the .hero section */
                /* Clamp to the host's height: past that it has scrolled out of
                   view, and an unbounded transform just grows forever. */
                var travel = Math.min(y, host.offsetHeight) * rate;
                el.style.transform = "translate3d(0," + travel.toFixed(2) + "px,0)";
            });
            ticking = false;
        };

        window.addEventListener(
            "scroll",
            function () {
                if (!ticking) {
                    requestAnimationFrame(place);
                    ticking = true;
                }
            },
            { passive: true }
        );

        place();
    }

    /* --- Cursor badge ------------------------------------------------------ */

    document.querySelectorAll("[data-badge]").forEach(function (media) {
        var badge = media.querySelector(".cursor-badge");
        if (!badge) return;

        media.addEventListener("pointermove", function (e) {
            var r = media.getBoundingClientRect();
            badge.style.transform =
                "translate(" + (e.clientX - r.left) + "px," + (e.clientY - r.top) + "px)";
        });
    });

    /* --- Count-up stats ----------------------------------------------------- */

    var stats = document.querySelectorAll("[data-count]");

    if (stats.length && !reduced && "IntersectionObserver" in window) {
        var countIO = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;

                    var el = entry.target;
                    var target = parseFloat(el.dataset.count);
                    var suffix = el.dataset.countSuffix || "";
                    var start = performance.now();
                    var duration = 1500;

                    var tick = function (now) {
                        var p = Math.min((now - start) / duration, 1);
                        /* easeOutExpo — fast start, gentle settle */
                        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                        el.textContent = Math.round(target * eased) + suffix;
                        if (p < 1) requestAnimationFrame(tick);
                    };

                    requestAnimationFrame(tick);
                    countIO.unobserve(el);
                });
            },
            { threshold: 0.4 }
        );

        stats.forEach(function (el) {
            countIO.observe(el);
        });
    }

    /* --- Reveal on scroll -------------------------------------------------- */

    var reveals = document.querySelectorAll("[data-reveal]");

    if (!reveals.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
        reveals.forEach(function (el) {
            el.classList.add("is-visible");
        });
        return;
    }

    var io = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                /* Stagger siblings so a row of cards cascades rather than popping */
                var delay = Number(entry.target.dataset.revealDelay || 0);
                setTimeout(function () {
                    entry.target.classList.add("is-visible");
                }, delay);
                io.unobserve(entry.target);
            });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    reveals.forEach(function (el) {
        io.observe(el);
    });
})();
