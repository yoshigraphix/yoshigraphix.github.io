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

    /* Anything with [data-full] joins the lightbox — the artwork strip on the
       home page and the album art on Hum Tunes both use it. Clones are added
       later with aria-hidden, so they're excluded automatically. */

    var gallery = [];

    document.querySelectorAll("[data-full]").forEach(function (btn) {
        if (btn.closest('[aria-hidden="true"]')) return;
        gallery.push({
            full: btn.dataset.full,
            alt: (btn.querySelector("img") || {}).alt || "",
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

    /* --- Hero name: the bouncing tittle -------------------------------------

       One green dot travels between the "i" of yoshi and the "i" of sakaguchi.
       Positions come from measuring .nm__peg (sized in em) rather than any
       fixed pixels, so it survives the fluid type scale, font loading and
       resizes. Movement is a quadratic Bezier with eased time — slow off the
       mark, quick through the middle, settling at the far end. A short trail
       of fading ghosts follows, and the word it lands on squashes briefly. */

    var nameEl = document.querySelector("[data-bounce]");

    if (nameEl) {
        var pegs = Array.prototype.slice.call(nameEl.querySelectorAll(".nm__peg"));
        var words = Array.prototype.slice.call(nameEl.querySelectorAll(".nm"));
        var dot = nameEl.querySelector(".hero__dot");
        var tracePath = nameEl.querySelector(".hero__trace path");

        var GHOSTS = 6;
        var ghosts = [];

        for (var g = 0; g < GHOSTS; g++) {
            var el = document.createElement("span");
            el.className = "hero__ghost";
            el.setAttribute("aria-hidden", "true");
            el.style.opacity = "0";
            nameEl.insertBefore(el, dot);
            ghosts.push(el);
        }

        var pts = [];
        var apexY = 0;

        var measure = function () {
            var host = nameEl.getBoundingClientRect();
            pts = pegs.map(function (p) {
                var r = p.getBoundingClientRect();
                return {
                    x: r.left - host.left + r.width / 2,
                    y: r.top - host.top + r.height / 2,
                    d: r.width,
                };
            });
            if (pts.length < 2 || !pts[0].d) return false;

            var size = pts[0].d;
            [dot].concat(ghosts).forEach(function (el) {
                el.style.width = size + "px";
                el.style.height = size + "px";
                el.style.marginLeft = -size / 2 + "px";
                el.style.marginTop = -size / 2 + "px";
            });

            /* Arc rises above whichever tittle sits higher, scaled to the gap */
            apexY = Math.min(pts[0].y, pts[1].y) - Math.max(36, Math.abs(pts[1].x - pts[0].x) * 0.3);

            if (tracePath) {
                tracePath.setAttribute(
                    "d",
                    "M" + pts[0].x + " " + pts[0].y +
                    " Q" + (pts[0].x + pts[1].x) / 2 + " " + apexY +
                    " " + pts[1].x + " " + pts[1].y
                );
            }
            return true;
        };

        var at = function (t, a, b) {
            var mt = 1 - t;
            return {
                x: mt * mt * a.x + 2 * mt * t * ((a.x + b.x) / 2) + t * t * b.x,
                y: mt * mt * a.y + 2 * mt * t * apexY + t * t * b.y,
            };
        };

        var place = function (el, p) {
            el.style.transform = "translate3d(" + p.x + "px," + p.y + "px,0)";
        };

        /* Linear in time. The arc itself supplies the easing: with a constant
           horizontal rate the quadratic curve slows through the apex and picks
           up toward each landing, which is how a thrown ball actually moves.
           Easing the time on top of that made it hang at both ends. */
        var ease = function (t) {
            return t;
        };

        /* Two landings a second: 500ms per traverse, no dwell at either end. */
        var TRAVEL = 500;
        var HOLD = 0;
        var from = 0;
        var startedAt = null;
        var holdingUntil = 0;

        var land = function (i) {
            var w = words[i];
            if (!w) return;
            w.classList.remove("nm--land");
            void w.offsetWidth; /* restart the animation */
            w.classList.add("nm--land");
        };

        var frame = function (now) {
            if (!pts.length) {
                requestAnimationFrame(frame);
                return;
            }

            if (now < holdingUntil) {
                requestAnimationFrame(frame);
                return;
            }

            if (startedAt === null) startedAt = now;

            var raw = Math.min(1, (now - startedAt) / TRAVEL);
            var t = ease(raw);
            var a = pts[from];
            var b = pts[1 - from];

            place(dot, at(t, a, b));

            for (var i = 0; i < ghosts.length; i++) {
                var lag = (i + 1) * 0.045;
                var gt = Math.max(0, t - lag);
                place(ghosts[i], at(gt, a, b));
                ghosts[i].style.opacity = String(0.26 * (1 - i / ghosts.length));
            }

            if (raw >= 1) {
                land(1 - from);
                from = 1 - from;
                /* Carry the overshoot into the next traverse so the cadence
                   doesn't drift on a dropped frame. */
                startedAt = now - (now - startedAt - TRAVEL);
                holdingUntil = now + HOLD;
            }

            requestAnimationFrame(frame);
        };

        var start = function () {
            if (!measure()) return;
            place(dot, pts[0]);
            if (reduced) {
                /* No travel: give each i its own dot and leave it alone */
                var still = document.createElement("span");
                still.className = "hero__ghost";
                still.style.width = still.style.height = pts[1].d + "px";
                still.style.marginLeft = still.style.marginTop = -pts[1].d / 2 + "px";
                still.style.opacity = "1";
                nameEl.appendChild(still);
                place(still, pts[1]);
                return;
            }
            requestAnimationFrame(frame);
        };

        /* Wait for the display face — measuring against a fallback puts the
           dot in the wrong place until the swap lands. */
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(start);
        } else {
            window.addEventListener("load", start);
        }

        var resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(measure, 150);
        });

        /* Any change to the heading's own box re-measures: the display face
           swapping in, the fluid type scale stepping, a container shift. Without
           this the dot keeps whatever coordinates it had when it first measured
           and only corrects on a window resize. */
        if ("ResizeObserver" in window) {
            var ro = new ResizeObserver(function () {
                measure();
            });
            ro.observe(nameEl);
        }
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
