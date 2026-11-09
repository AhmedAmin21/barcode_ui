/**
 * Custom Navbar Notification Button
 * App: barcode_ui
 * Drop in: /apps/barcode_ui/barcode_ui/public/js/custom_navbar_notifications.js
 * Register in hooks.py: app_include_js = ["/assets/barcode_ui/js/custom_navbar_notifications.js"]
 */

(function () {
  "use strict";

  /* ─── inject styles once ─────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("cn-styles")) return;
    var style = document.createElement("style");
    style.id = "cn-styles";
    style.textContent = [
      /* hide the original Frappe bell +AwesomeBar search icon */
      '.navbar .nav-item.notifications-icon { display: none !important; }',

      /* ── wrapper button ── */
      '#cn-btn {',
      '  position: relative;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 38px; height: 38px;',
      '  border-radius: 12px;',
      '  background: transparent;',
      '  border: none;',
      '  cursor: pointer;',
      '  transition: background 0.18s, transform 0.15s;',
      '  outline: none;',
      '  margin: 0 4px;',
      '}',
      '#cn-btn:hover { background: rgba(99,102,241,0.12); transform: scale(1.08); }',
      '#cn-btn:active { transform: scale(0.96); }',

      /* ── SVG bell icon ── */
      '#cn-btn svg { width: 21px; height: 21px; fill: none; }',

      /* ── badge ── */
      '#cn-badge {',
      '  position: absolute;',
      '  top: 4px; right: 4px;',
      '  min-width: 17px; height: 17px;',
      '  padding: 0 4px;',
      '  border-radius: 9px;',
      '  background: #ef4444;',
      '  color: #fff;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  line-height: 17px;',
      '  text-align: center;',
      '  display: none;',
      '  box-shadow: 0 1px 4px rgba(239,68,68,0.45);',
      '  animation: cn-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;',
      '}',
      '@keyframes cn-pop {',
      '  from { transform: scale(0); opacity: 0; }',
      '  to   { transform: scale(1); opacity: 1; }',
      '}',

      /* ── ping ring when new notif arrives ── */
      '#cn-btn.has-new::after {',
      '  content: "";',
      '  position: absolute;',
      '  top: 5px; right: 5px;',
      '  width: 13px; height: 13px;',
      '  border-radius: 50%;',
      '  background: rgba(239,68,68,0.35);',
      '  animation: cn-ping 1s ease-out infinite;',
      '}',
      '@keyframes cn-ping {',
      '  0%   { transform: scale(1); opacity: 0.8; }',
      '  100% { transform: scale(2.2); opacity: 0; }',
      '}',

      /* ── dropdown panel ── */
      '#cn-panel {',
      '  display: none;',
      '  position: absolute;',
      '  top: calc(100% + 10px);',
      '  right: 0;',
      '  width: 340px;',
      '  max-height: 460px;',
      '  border-radius: 16px;',
      '  background: var(--card-bg, #fff);',
      '  box-shadow: 0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08);',
      '  overflow: hidden;',
      '  z-index: 9999;',
      '  flex-direction: column;',
      '  animation: cn-slide 0.2s cubic-bezier(0.22,1,0.36,1) both;',
      '}',
      '#cn-panel.open { display: flex; }',
      '@keyframes cn-slide {',
      '  from { opacity: 0; transform: translateY(-8px) scale(0.97); }',
      '  to   { opacity: 1; transform: translateY(0)    scale(1);    }',
      '}',

      /* header row */
      '#cn-header {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  padding: 16px 18px 12px;',
      '  border-bottom: 1px solid var(--border-color, #eee);',
      '}',
      '#cn-header h6 {',
      '  margin: 0;',
      '  font-size: 14px;',
      '  font-weight: 700;',
      '  color: var(--text-color, #111);',
      '  letter-spacing: -0.2px;',
      '}',
      '#cn-mark-all {',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: #6366f1;',
      '  background: none;',
      '  border: none;',
      '  cursor: pointer;',
      '  padding: 2px 8px;',
      '  border-radius: 6px;',
      '  transition: background 0.15s;',
      '}',
      '#cn-mark-all:hover { background: rgba(99,102,241,0.1); }',

      /* scrollable list */
      '#cn-list {',
      '  overflow-y: auto;',
      '  flex: 1;',
      '  padding: 6px 0;',
      '}',
      '#cn-list::-webkit-scrollbar { width: 4px; }',
      '#cn-list::-webkit-scrollbar-track { background: transparent; }',
      '#cn-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }',

      /* individual item */
      '.cn-item {',
      '  display: flex;',
      '  align-items: flex-start;',
      '  gap: 12px;',
      '  padding: 12px 18px;',
      '  cursor: pointer;',
      '  transition: background 0.13s;',
      '  position: relative;',
      '}',
      '.cn-item:hover { background: var(--control-bg, #f9fafb); }',
      '.cn-item.unread { background: rgba(99,102,241,0.05); }',
      '.cn-item.unread:hover { background: rgba(99,102,241,0.09); }',

      /* unread dot */
      '.cn-item.unread::after {',
      '  content: "";',
      '  position: absolute;',
      '  left: 6px; top: 50%;',
      '  transform: translateY(-50%);',
      '  width: 5px; height: 5px;',
      '  border-radius: 50%;',
      '  background: #6366f1;',
      '}',

      /* avatar */
      '.cn-avatar {',
      '  width: 36px; height: 36px;',
      '  border-radius: 10px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  flex-shrink: 0;',
      '  font-size: 16px;',
      '}',

      /* text */
      '.cn-body { flex: 1; min-width: 0; }',
      '.cn-title {',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: var(--text-color, #111);',
      '  margin: 0 0 2px;',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '}',
      '.cn-sub {',
      '  font-size: 12px;',
      '  color: var(--text-muted, #6b7280);',
      '  margin: 0;',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '}',
      '.cn-time {',
      '  font-size: 10px;',
      '  color: var(--text-muted, #9ca3af);',
      '  margin-top: 3px;',
      '}',

      /* empty state */
      '#cn-empty {',
      '  display: flex; flex-direction: column;',
      '  align-items: center; justify-content: center;',
      '  padding: 40px 20px; gap: 8px;',
      '  color: var(--text-muted, #9ca3af);',
      '  font-size: 13px;',
      '}',
      '#cn-empty svg { opacity: 0.35; }',

      /* footer */
      '#cn-footer {',
      '  border-top: 1px solid var(--border-color, #eee);',
      '  padding: 10px 18px;',
      '  text-align: center;',
      '}',
      '#cn-footer a {',
      '  font-size: 12px; font-weight: 600;',
      '  color: #6366f1; text-decoration: none;',
      '}',
      '#cn-footer a:hover { text-decoration: underline; }',
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ─── build the button + panel DOM ───────────────────────────────── */
  function buildWidget() {
    /* wrapper li  */
    var li = document.createElement("li");
    li.className = "nav-item";
    li.style.cssText = "position:relative;list-style:none;";

    /* bell button */
    li.innerHTML = [
      '<button id="cn-btn" title="Notifications" aria-label="Notifications">',
      '  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">',
      '    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"',
      '     stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
      '  </svg>',
      '  <span id="cn-badge"></span>',
      '</button>',
      '<div id="cn-panel">',
      '  <div id="cn-header">',
      '    <h6>Notifications</h6>',
      '    <button id="cn-mark-all">Mark all read</button>',
      '  </div>',
      '  <div id="cn-list"></div>',
      '  <div id="cn-footer"><a href="/notifications">View all</a></div>',
      '</div>',
    ].join("");

    return li;
  }

  /* ─── notification type → icon + color ───────────────────────────── */
  var TYPE_MAP = {
    "Alert":   { icon: "⚠️", bg: "#fef3c7" },
    "Mention": { icon: "💬", bg: "#ede9fe" },
    "Assignment": { icon: "📋", bg: "#dcfce7" },
    "Share":   { icon: "🔗", bg: "#dbeafe" },
    "Energy":  { icon: "⚡", bg: "#fce7f3" },
  };

  function iconFor(type) {
    var t = TYPE_MAP[type] || { icon: "🔔", bg: "#f3f4f6" };
    return '<div class="cn-avatar" style="background:' + t.bg + '">' + t.icon + '</div>';
  }

  /* ─── relative time ──────────────────────────────────────────────── */
  function relTime(dateStr) {
    var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  /* ─── render list ────────────────────────────────────────────────── */
  function renderList(notifications) {
    var list = document.getElementById("cn-list");
    if (!list) return;

    if (!notifications || notifications.length === 0) {
      list.innerHTML = [
        '<div id="cn-empty">',
        '  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
        '    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round"/>',
        '  </svg>',
        '  <span>You\'re all caught up!</span>',
        '</div>',
      ].join("");
      return;
    }

    var html = "";
    notifications.forEach(function (n) {
      var read = n.read ? "" : " unread";
      var docLink = n.document_type && n.document_name
        ? "/" + n.document_type.replace(/ /g, "-").toLowerCase() + "/" + encodeURIComponent(n.document_name)
        : "#";
      html += [
        '<div class="cn-item' + read + '" data-name="' + n.name + '" data-link="' + docLink + '">',
        iconFor(n.type),
        '  <div class="cn-body">',
        '    <p class="cn-title">' + (n.subject || n.document_name || "Notification") + '</p>',
        '    <p class="cn-sub">' + (n.document_type || n.type || "") + '</p>',
        '    <p class="cn-time">' + relTime(n.creation) + '</p>',
        '  </div>',
        '</div>',
      ].join("");
    });
    list.innerHTML = html;

    /* click → navigate & mark read */
    list.querySelectorAll(".cn-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var name = this.getAttribute("data-name");
        var link = this.getAttribute("data-link");
        if (name) {
          frappe.call({ method: "frappe.client.set_value",
            args: { doctype: "Notification Log", name: name, fieldname: "read", value: 1 },
            callback: function () { fetchAndRender(); }
          });
        }
        if (link && link !== "#") window.location.href = link;
        closePanel();
      });
    });
  }

  /* ─── update badge count ──────────────────────────────────────────── */
  function updateBadge(count) {
    var badge = document.getElementById("cn-badge");
    var btn   = document.getElementById("cn-btn");
    if (!badge || !btn) return;

    if (count > 0) {
      badge.style.display = "block";
      badge.textContent   = count > 99 ? "99+" : String(count);
      btn.classList.add("has-new");
    } else {
      badge.style.display = "none";
      btn.classList.remove("has-new");
    }
  }

  /* ─── fetch notifications from Frappe ────────────────────────────── */
  function fetchAndRender() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Notification Log",
        fields: ["name", "subject", "type", "document_type", "document_name", "read", "creation"],
        filters: [["for_user", "=", frappe.session.user]],
        order_by: "creation desc",
        limit: 20,
      },
      callback: function (r) {
        var notifications = (r && r.message) ? r.message : [];
        var unread = notifications.filter(function (n) { return !n.read; }).length;
        updateBadge(unread);
        renderList(notifications);
      },
    });
  }

  /* ─── panel open / close ─────────────────────────────────────────── */
  function openPanel() {
    var panel = document.getElementById("cn-panel");
    if (panel) {
      panel.classList.add("open");
      fetchAndRender();
    }
  }

  function closePanel() {
    var panel = document.getElementById("cn-panel");
    if (panel) panel.classList.remove("open");
  }

  function togglePanel() {
    var panel = document.getElementById("cn-panel");
    if (!panel) return;
    if (panel.classList.contains("open")) {
      closePanel();
    } else {
      openPanel();
    }
  }

  /* ─── mount everything ───────────────────────────────────────────── */
  function mount() {
    if (document.getElementById("cn-btn")) return; /* already mounted */

    /* find the right navbar ul */
    var target = document.querySelector(".navbar-nav.d-none.d-sm-flex")
               || document.querySelector(".navbar-collapse .navbar-nav");
    if (!target) return;

    var li = buildWidget();

    /* insert before the first existing nav-item (i.e. at the start) */
    var first = target.querySelector("li.nav-item");
    if (first) {
      target.insertBefore(li, first);
    } else {
      target.appendChild(li);
    }

    /* wire events */
    var btn = document.getElementById("cn-btn");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      togglePanel();
    });

    document.getElementById("cn-mark-all").addEventListener("click", function (e) {
      e.stopPropagation();
      frappe.call({
        method: "frappe.client.set_value",
        args: { doctype: "Notification Log", name: "__all__", fieldname: "read", value: 1 },
        callback: function () { fetchAndRender(); },
      });
      /* fallback: mark each individually */
      frappe.db.get_list("Notification Log", {
        filters: [["for_user","=",frappe.session.user],["read","=",0]],
        fields: ["name"], limit: 50,
      }).then(function (rows) {
        var promises = rows.map(function (r) {
          return frappe.db.set_value("Notification Log", r.name, "read", 1);
        });
        Promise.all(promises).then(fetchAndRender);
      });
    });

    /* close on outside click */
    document.addEventListener("click", function (e) {
      var panel = document.getElementById("cn-panel");
      var btn2  = document.getElementById("cn-btn");
      if (panel && !panel.contains(e.target) && e.target !== btn2) {
        closePanel();
      }
    });

    /* initial fetch */
    fetchAndRender();

    /* poll every 60 s */
    setInterval(fetchAndRender, 60000);
  }

  /* ─── wait for toolbar_setup (Frappe fires this when navbar is ready) */
  $(document).on("toolbar_setup", function () {
    injectStyles();
    mount();
  });

  /* safety fallback if toolbar_setup already fired */
  $(document).ready(function () {
    setTimeout(function () {
      injectStyles();
      mount();
    }, 800);
  });

})();
