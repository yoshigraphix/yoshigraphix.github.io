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
        var bases = Array.prototype.slice.call(nameEl.querySelectorAll(".nm__base"));
        var letters = Array.prototype.slice.call(nameEl.querySelectorAll(".nm__i"));

        /* Measured off the rendered face at 200px: the tittle of a dotted "i"
           is 0.155em across and centred 0.64em above the baseline, and the
           stem is 0.165em wide. The ball is sized to the stem rather than the
           original tittle so it reads as deliberate at display size. */
        var DOT_EM = 0.185;
        var RISE_EM = 0.642;
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
            var fs = parseFloat(getComputedStyle(nameEl).fontSize) || 0;
            if (!fs) return false;

            pts = letters.map(function (el, i) {
                var r = el.getBoundingClientRect();
                var b = bases[i].getBoundingClientRect();
                return {
                    /* horizontal centre of the stem — sidebearings are even here */
                    x: r.left - host.left + r.width / 2,
                    /* the strut's top edge is the baseline */
                    y: b.top - host.top - RISE_EM * fs,
                    d: DOT_EM * fs,
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

            /* A quadratic curve only climbs HALF way to its control point, so
               setting the control point to the wanted height drew an arc half
               as tall as intended. Solve for the control instead: the curve's
               midpoint is (p0 + 2c + p1) / 4, so for a peak that clears the
               higher tittle by PEAK, c = (4(min - PEAK) - y0 - y1) / 2. */
            var span = Math.abs(pts[1].x - pts[0].x);
            var wanted = Math.max(120, span * 0.85); /* rise above the higher i */

            /* Don't let the arc climb past the top of the hero, or it disappears
               behind the sticky header on short viewports. */
            var hero = nameEl.closest(".hero");
            var headroom = 1e4;
            if (hero) {
                var offset = nameEl.getBoundingClientRect().top - hero.getBoundingClientRect().top;
                headroom = Math.max(40, offset + Math.min(pts[0].y, pts[1].y) - 8);
            }

            var PEAK = Math.min(wanted, headroom);
            var top = Math.min(pts[0].y, pts[1].y) - PEAK;
            apexY = (4 * top - pts[0].y - pts[1].y) / 2;

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

        /* Stretch along the direction of travel, proportional to speed: taut on
           the way out and in, round at the apex. This is what stops it reading
           as a bead sliding along a wire. */
        var placeStretched = function (el, p, prev, size) {
            if (!prev) return place(el, p);
            var vx = p.x - prev.x;
            var vy = p.y - prev.y;
            var speed = Math.sqrt(vx * vx + vy * vy);
            var k = Math.min(0.42, speed / (size * 3.2));
            var ang = (Math.atan2(vy, vx) * 180) / Math.PI;
            el.style.transform =
                "translate3d(" + p.x + "px," + p.y + "px,0) rotate(" + ang + "deg) scale(" +
                (1 + k) + "," + (1 - k * 0.72) + ")";
        };

        /* Linear in time. The arc itself supplies the easing: with a constant
           horizontal rate the quadratic curve slows through the apex and picks
           up toward each landing, which is how a thrown ball actually moves.
           Easing the time on top of that made it hang at both ends. */
        var ease = function (t) {
            return t;
        };

        /* 500ms per traverse — a ~1s round trip, i to i and back.
           Lower TRAVEL = faster. HOLD stays 0 so it never rests. */
        var TRAVEL = 500;
        var HOLD = 0;
        var from = 0;
        var lastP = null;
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

            var p = at(t, a, b);
            placeStretched(dot, p, lastP, pts[0].d);
            lastP = p;

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

        /* The reveal animation holds the heading 22px low until it finishes, so
           the first measurement sees more headroom above it than really exists.
           Re-measure once that transition ends. */
        nameEl.addEventListener("transitionend", function (e) {
            if (e.target === nameEl) measure();
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

    /* --- Journey timeline ---------------------------------------------------

       The path is generated from where the stops actually land, so the curve
       always matches the content instead of being drawn to fixed coordinates.
       The dot eases toward the reader's scroll position rather than tracking it
       exactly — that lag is the whole difference between an object with
       momentum and a value wired to a scrollbar. */

    var jt = document.querySelector("[data-journey]");

    if (jt) {
        var stops = Array.prototype.slice.call(jt.querySelectorAll(".jt__stop"));
        var svg = jt.querySelector(".jt__path");
        var track = svg.querySelector(".track");
        var trail = svg.querySelector(".trail");
        var jtDot = jt.querySelector(".jt__dot");

        var pts = [];
        var len = 0;

        var buildPath = function () {
            var host = jt.getBoundingClientRect();
            svg.setAttribute("viewBox", "0 0 " + host.width + " " + host.height);

            pts = stops.map(function (el) {
                var r = el.getBoundingClientRect();
                return {
                    /* anchor on the side the stop sits on */
                    x: r.left - host.left + (el.matches(":nth-child(even)") ? r.width - 24 : 24),
                    y: r.top - host.top + r.height / 2,
                };
            });
            if (pts.length < 2) return;

            /* Catmull-Rom through the anchors, emitted as cubic Beziers — a
               polyline would kink at every stop. */
            var d = "M" + pts[0].x + " " + pts[0].y;
            for (var i = 0; i < pts.length - 1; i++) {
                var p0 = pts[i - 1] || pts[i];
                var p1 = pts[i];
                var p2 = pts[i + 1];
                var p3 = pts[i + 2] || p2;
                d +=
                    " C" + (p1.x + (p2.x - p0.x) / 6) + " " + (p1.y + (p2.y - p0.y) / 6) +
                    " " + (p2.x - (p3.x - p1.x) / 6) + " " + (p2.y - (p3.y - p1.y) / 6) +
                    " " + p2.x + " " + p2.y;
            }
            track.setAttribute("d", d);
            trail.setAttribute("d", d);
            len = track.getTotalLength();
            trail.style.strokeDasharray = len + " " + len;
        };

        var target = 0;
        var eased = 0;

        var readScroll = function () {
            var host = jt.getBoundingClientRect();
            /* 0 when the timeline's top reaches mid-viewport, 1 at its bottom */
            var start = window.innerHeight * 0.5;
            var p = (start - host.top) / (host.height - window.innerHeight * 0.4);
            target = Math.max(0, Math.min(1, p));
        };

        var tick = function () {
            /* the lag that makes it feel thrown rather than dragged */
            eased += (target - eased) * 0.09;

            if (len) {
                var pt = track.getPointAtLength(eased * len);

                /* Swell on arrival: distance to the nearest stop drives a scale
                   from 1 up to ~9, with opacity falling as it grows so it reads
                   as light behind the card rather than a disc on top of it. */
                var near = 1e9;
                for (var s2 = 0; s2 < pts.length; s2++) {
                    var dx = pts[s2].x - pt.x;
                    var dy = pts[s2].y - pt.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < near) near = dist;
                }
                var closeness = Math.max(0, 1 - near / 170);
                var scale = 1 + closeness * closeness * 8;
                var alpha = 1 - closeness * 0.74;

                jtDot.style.transform =
                    "translate3d(" + pt.x + "px," + pt.y + "px,0) scale(" + scale.toFixed(3) + ")";
                jtDot.style.opacity = alpha.toFixed(3);
                trail.style.strokeDashoffset = len - eased * len;
            }
            requestAnimationFrame(tick);
        };

        var reveal = function () {
            stops.forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.82) el.classList.add("is-on");
            });
        };

        var refresh = function () {
            buildPath();
            readScroll();
            reveal();
        };

        window.addEventListener("scroll", function () {
            readScroll();
            reveal();
        }, { passive: true });

        var jtTimer;
        window.addEventListener("resize", function () {
            clearTimeout(jtTimer);
            jtTimer = setTimeout(refresh, 150);
        });

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(refresh);
        } else {
            window.addEventListener("load", refresh);
        }
        refresh();

        if (!reduced) requestAnimationFrame(tick);
        else stops.forEach(function (el) { el.classList.add("is-on"); });

        /* Images landing changes every stop's position underneath the path */
        jt.querySelectorAll("img").forEach(function (im) {
            if (!im.complete) im.addEventListener("load", refresh);
        });
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

                    /* Keep whatever precision the author wrote: "9.4" counts
                       to 9.4, "200" counts to 200. Rounding everything killed
                       the decimal. */
                    var decimals = (el.dataset.count.split(".")[1] || "").length;

                    var tick = function (now) {
                        var p = Math.min((now - start) / duration, 1);
                        /* easeOutExpo — fast start, gentle settle */
                        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                        el.textContent = (target * eased).toFixed(decimals) + suffix;
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
