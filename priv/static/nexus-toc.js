// nexus-toc.js — Nexus extension bundle
(function () {
  "use strict";

  const NE   = window.NexusExtensions;
  const SLUG = "nexus-toc";
  const { useState, useEffect } = window.React;
  const { toast } = window.NexusComponents;

  // ── Heading parser ─────────────────────────────────────────────────────────
  // Parses raw Markdown text and extracts H1 and H2 headings in order.
  // Returns an array of { level: 1|2, text: string } objects.
  // Ignores headings inside fenced code blocks.
  function parseHeadings(body) {
    if (!body) return [];
    var headings = [];
    var inFence = false;
    var lines = body.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Toggle fenced code block tracking
      if (/^```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      var h1 = line.match(/^# (.+)/);
      if (h1) { headings.push({ level: 1, text: h1[1].trim() }); continue; }
      var h2 = line.match(/^## (.+)/);
      if (h2) { headings.push({ level: 2, text: h2[1].trim() }); continue; }
    }
    return headings;
  }

  // ── DOM heading finder ─────────────────────────────────────────────────────
  // Finds a rendered heading element inside .post-content-wrap .md-body
  // by matching its text content to the parsed heading text.
  function findHeadingEl(text) {
    var mdBody = document.querySelector(".post-content-wrap .md-body");
    if (!mdBody) return null;
    var candidates = mdBody.querySelectorAll("h1, h2");
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].textContent.trim() === text) {
        return candidates[i];
      }
    }
    return null;
  }

  // ── Scroll to heading ──────────────────────────────────────────────────────
  function scrollToHeading(text) {
    var el = findHeadingEl(text);
    if (!el) return;
    var container = document.querySelector(".post-content-wrap");
    if (!container) return;
    // offsetTop is relative to post-content-wrap's scroll container.
    // Subtract 64px so the heading lands with clear breathing room at the top.
    container.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
  }

  // ── Active heading tracker ─────────────────────────────────────────────────
  // Watches the scroll position of .post-content-wrap and returns the index
  // of the heading currently at or above the top of the viewport (with a
  // small offset so it activates slightly before the heading hits the top).
  function useActiveHeading(headings, enabled) {
    var [activeIdx, setActiveIdx] = useState(0);
    useEffect(function () {
      if (!enabled || headings.length === 0) return;
      var container = document.querySelector(".post-content-wrap");
      if (!container) return;

      function onScroll() {
        var OFFSET = 64; // px — matches the scroll-to offset in scrollToHeading
        var els = headings.map(function (h) { return findHeadingEl(h.text); });
        var active = 0;
        for (var i = 0; i < els.length; i++) {
          if (!els[i]) continue;
          if (els[i].offsetTop - OFFSET <= container.scrollTop) {
            active = i;
          }
        }
        setActiveIdx(active);
      }

      container.addEventListener("scroll", onScroll, { passive: true });
      // Run once on mount to set initial active heading
      onScroll();
      return function () {
        container.removeEventListener("scroll", onScroll);
      };
    }, [headings, enabled]);

    return activeIdx;
  }

  // ── ToC Widget component ───────────────────────────────────────────────────
  function TocWidget({ pageProps }) {
    var postId = pageProps && pageProps.id;
    var [status, setStatus]     = useState(null);   // null=loading, true=enabled, false=disabled
    var [headings, setHeadings] = useState([]);
    var [loading, setLoading]   = useState(true);
    var activeIdx = useActiveHeading(headings, status === true);

    // Fetch ToC enabled status for this post
    useEffect(function () {
      if (!postId) return;
      setStatus(null);
      setHeadings([]);
      setLoading(true);
      fetch("/ext/" + SLUG + "/api/status/" + postId)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          setStatus(!!d.enabled);
          setLoading(false);
        })
        .catch(function () {
          setStatus(false);
          setLoading(false);
        });
    }, [postId]);

    // If enabled, fetch post body and parse headings
    useEffect(function () {
      if (status !== true || !postId) return;
      var token = localStorage.getItem("nexus_token");
      fetch("/api/v1/posts/" + postId, {
        headers: token ? { authorization: "Bearer " + token } : {}
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.post && d.post.body) {
            setHeadings(parseHeadings(d.post.body));
          }
        })
        .catch(function () {});
    }, [status, postId]);

    // Don't render until we know the status
    if (loading || status !== true) return null;

    // Don't render if no headings were found
    if (headings.length === 0) return null;

    return window.React.createElement(
      "div",
      { className: "rw" },
      window.React.createElement(
        "div",
        { className: "rw-label" },
        "table of contents"
      ),
      window.React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 2 } },
        headings.map(function (h, i) {
          var isActive = i === activeIdx;
          return window.React.createElement(
            "div",
            {
              key: i,
              onClick: function () { scrollToHeading(h.text); },
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingTop: h.level === 1 ? 5 : 4,
                paddingBottom: h.level === 1 ? 5 : 4,
                paddingLeft: h.level === 2 ? 10 : 0,
                paddingRight: 0,
                cursor: "pointer",
                borderRadius: 6,
                color: isActive ? "var(--ac-text)" : "var(--t3)",
                fontSize: h.level === 1 ? 13 : 12,
                fontWeight: h.level === 1 ? 500 : 400,
                lineHeight: 1.4,
                transition: "color 0.15s",
                borderLeft: h.level === 2
                  ? "1.5px solid " + (isActive ? "var(--ac)" : "var(--b2)")
                  : "none",
              }
            },
            h.level === 1 && window.React.createElement(
              "i",
              {
                className: "fa-solid fa-minus",
                style: {
                  fontSize: 8,
                  color: isActive ? "var(--ac)" : "var(--b3)",
                  flexShrink: 0,
                  marginRight: 2
                }
              }
            ),
            window.React.createElement("span", null, h.text)
          );
        })
      )
    );
  }

  // ── Post action — toggle ToC ───────────────────────────────────────────────
  // Appears in the … post overflow menu for users with can_enable_toc permission.
  // The visible() filter keeps it hidden for users who lack the permission —
  // but we also enforce the permission server-side in the toggle endpoint.
  //
  // We cannot check the permission gate client-side (we don't know what the
  // admin configured), so the visible filter uses role as a reasonable
  // heuristic: admins and mods always see the option. The server enforces the
  // real gate regardless.
  NE.registerPostAction({
    id: "toc-toggle",
    label: "Table of Contents",
    icon: "fa-list-ul",
    priority: 60,
    visible: function (_ref) {
      var currentUser = _ref.currentUser;
      if (!currentUser) return false;
      return currentUser.role === "admin" || currentUser.role === "moderator";
    },
    onClick: function (_ref) {
      var post = _ref.post;
      var closeMenu = _ref.closeMenu;
      closeMenu();

      // Check the post body has headings before hitting the API
      var headings = parseHeadings(post.body || "");
      if (headings.length === 0) {
        toast("This post has no H1 or H2 headings to build a Table of Contents from.", "warn");
        return;
      }

      var token = localStorage.getItem("nexus_token");
      fetch("/ext/" + SLUG + "/api/toggle", {
        method: "POST",
        headers: Object.assign(
          { "content-type": "application/json" },
          token ? { authorization: "Bearer " + token } : {}
        ),
        body: JSON.stringify({ post_id: post.id })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            toast(
              d.enabled
                ? "Table of Contents enabled for this post."
                : "Table of Contents removed from this post."
            );
          } else {
            toast(d.error || "Failed to update Table of Contents.", "err");
          }
        })
        .catch(function () {
          toast("Failed to update Table of Contents.", "err");
        });
    }
  });

  // ── Right widget registration ──────────────────────────────────────────────
  NE.registerRightWidget({
    slug: SLUG,
    id: "toc-widget",
    label: "Table of Contents",
    component: TocWidget,
    priority: 1,
    scope: { corePages: ["post"] }
  });

})();
