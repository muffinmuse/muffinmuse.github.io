/* Muffin Muse — simple 2-page cake booking
   Page 1: occasion, name on cake, flavour, weight, date & time, address
   Page 2: customer name & mobile
   Sends every booking to the configured inbox via FormSubmit.co.
   Success is shown ONLY after the service confirms delivery. */
(function () {
  "use strict";
  var C = window.MM_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var form = $("#bookingForm");
  if (!form) return;

  /* ─────────── Options ─────────── */
  var OCCASIONS = [
    ["Birthday", "🎂"], ["Wedding", "💍"], ["Wedding Anniversary", "🥂"], ["Engagement", "💞"], ["Baby Shower", "🍼"],
    ["Baby Welcome", "👣"], ["Naming Ceremony", "🌼"], ["Graduation", "🎓"], ["Housewarming", "🏡"], ["Farewell", "👋"],
    ["Valentine's Day", "❤️"], ["Mother's Day", "🌷"], ["Father's Day", "👔"], ["Raksha Bandhan", "🧿"], ["Diwali", "🪔"],
    ["Christmas", "🎄"], ["New Year", "✨"], ["Holi", "🎨"], ["Eid", "🌙"], ["Onam", "🌸"], ["Pongal", "🍚"],
    ["Karwa Chauth", "🌕"], ["Other", "💫"]
  ];
  var FLAVOURS = [["Chocolate", "🍫"], ["Vanilla", "🤍"], ["Butterscotch", "🍯"], ["Strawberry", "🍓"]];
  var WEIGHTS = ["500 g", "1 kg", "1.5 kg", "2 kg", "3 kg"];
  var STEP_NAMES = ["Your cake", "Your details"];

  /* email field labels — this order is the order of the email */
  var LABELS = {
    name: "Customer name", phone: "Mobile number",
    occasion: "Occasion", milestone: "Which birthday / anniversary", cake_name: "Name on cake", flavour: "Flavour", weight: "Weight",
    date: "Date needed", time: "Time needed", address: "Delivery address", collection: "Inspired by"
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function chip(name, value, label) {
    return '<label class="chip"><input type="radio" name="' + name + '" value="' + esc(value) + '"><span>' + (label || esc(value)) + "</span></label>";
  }
  $("#occasionChips").innerHTML = OCCASIONS.map(function (o) { return chip("occasion", o[0], "<em>" + o[1] + "</em>" + esc(o[0])); }).join("");
  $("#flavourChips").innerHTML = FLAVOURS.map(function (f) { return chip("flavour", f[0], f[1] + " " + esc(f[0])); }).join("");
  $("#weightChips").innerHTML = WEIGHTS.map(function (w) { return chip("weight", w); }).join("");

  /* ─────────── Helpers ─────────── */
  function controls(name) { return $$('[name="' + name + '"]', form); }
  function val(name) {
    var els = controls(name); if (!els.length) return "";
    if (els[0].type === "radio") { var c = els.filter(function (e) { return e.checked; })[0]; return c ? c.value : ""; }
    return (els[0].value || "").trim();
  }
  function ordinal(n) { n = parseInt(n, 10); var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var MILESTONE_FOR = { "Birthday": "birthday", "Wedding Anniversary": "anniversary" };
  var MILESTONES = {
    birthday: [
      ["Baby (months)", ["1 month", "3 months", "6 months", "9 months"]],
      ["Little ones", ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]],
      ["Grown-ups", ["13th", "16th", "18th", "21st", "25th", "30th", "40th", "50th", "60th", "75th", "Other age"]]
    ],
    anniversary: [
      ["Anniversary", ["1st", "2nd", "3rd", "5th", "10th", "15th", "20th", "25th · Silver", "30th", "40th", "50th · Golden", "Other year"]]
    ]
  };
  var msKind = null, msDraft = "";
  function renderMilestones(kind) {
    var keep = val("milestone") || msDraft; msDraft = "";
    $("#milestoneGroups").innerHTML = MILESTONES[kind].map(function (g) {
      return '<div class="ms-group"><p class="ms-group__label">' + esc(g[0]) + '</p><div class="chips chips--sm">' +
        g[1].map(function (o) { return chip("milestone", o); }).join("") + "</div></div>";
    }).join("");
    if (keep) setRadio("milestone", keep);
  }
  function msIsOther(v) { return /^Other/.test(v || ""); }
  function updateMilestone() {
    var kind = MILESTONE_FOR[val("occasion")], fld = $("#milestoneField");
    fld.hidden = !kind;
    if (!kind) { msKind = null; showErr("milestone", ""); return; }
    if (kind !== msKind) { if (msKind) $("#milestoneGroups").innerHTML = ""; renderMilestones(kind); msKind = kind; }
    $("#milestoneLabel").innerHTML = "Which " + kind + " is this? <b>*</b>";
    var other = msIsOther(val("milestone"));
    $("#milestoneOtherWrap").hidden = !other;
    var n = parseInt(val("milestone_other"), 10);
    $("#milestoneSuffix").textContent = (n > 0 ? ordinal(n).replace(/^\d+/, "") + " " : "") + kind;
  }
  function milestoneText() {
    var kind = MILESTONE_FOR[val("occasion")], v = val("milestone");
    if (!kind || !v) return "";
    if (msIsOther(v)) { var n = parseInt(val("milestone_other"), 10); return n > 0 ? ordinal(n) + " " + kind : ""; }
    if (/month/.test(v)) return v + (v === "6 months" ? " (half birthday)" : " (baby milestone)");
    return v.replace(/ · .*/, "") + " " + kind + (/ · /.test(v) ? " (" + v.split(" · ")[1] + ")" : "");
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function prettyDate(s) {
    if (!s) return ""; var p = s.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }
  function prettyTime(t) {
    if (!t) return ""; var p = t.split(":"), h = +p[0];
    return (h % 12 || 12) + ":" + p[1] + (h < 12 ? " am" : " pm");
  }
  function normPhone(v) { var d = String(v).replace(/\D/g, ""); if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2); if (d.length === 11 && d[0] === "0") d = d.slice(1); return d; }

  /* ─────────── Dates (no past dates) ─────────── */
  var dateInp = $("#f_date");
  var lead = Math.max(0, Number(C.minLeadDays || 0));
  var minD = new Date(); minD.setHours(0, 0, 0, 0); minD.setDate(minD.getDate() + lead);
  var maxD = new Date(minD); maxD.setFullYear(maxD.getFullYear() + 1);
  dateInp.min = ymd(minD); dateInp.max = ymd(maxD);
  function updateHints() {
    var d = dateInp.value;
    $("#dateHint").textContent = d && d >= dateInp.min ? "📅 " + prettyDate(d) : "Earliest: " + prettyDate(dateInp.min);
  }

  /* ─────────── Validation ─────────── */
  var RULES = [
    [0, "occasion", function (v) { return !!v; }, "Please choose the occasion."],
    [0, "milestone", function (v) {
      if (!MILESTONE_FOR[val("occasion")]) return true;
      if (!v) return false;
      if (!msIsOther(v)) return true;
      var n = +val("milestone_other"); return n >= 1 && n <= 120 && Math.floor(n) === n;
    }, function (v) { var k = MILESTONE_FOR[val("occasion")]; return !v ? "Please choose which " + k + " it is." : "Please enter the number (e.g. 35)."; }],
    [0, "flavour", function (v) { return !!v; }, "Please choose a flavour."],
    [0, "weight", function (v) { return !!v; }, "Please choose the weight."],
    [0, "date", function (v) { return !!v && v >= dateInp.min && v <= dateInp.max; }, function (v) { return !v ? "Please choose the date you need the cake." : v < dateInp.min ? "Please choose " + prettyDate(dateInp.min) + " or later — we bake every cake fresh." : "Please choose a date within the next year."; }],
    [0, "time", function (v) { return !!v; }, "Please choose the time you need it."],
    [0, "address", function (v) { return v.length >= 10; }, "Please enter the full delivery address."],
    [1, "name", function (v) { return v.length >= 2 && /[a-zA-Zऀ-ॿ]/.test(v); }, "Please enter your name."],
    [1, "phone", function (v) { return /^[6-9]\d{9}$/.test(normPhone(v)); }, "Please enter a valid 10-digit mobile number."]
  ];
  function showErr(name, msg) {
    var p = $('[data-err="' + name + '"]', form); if (p) p.textContent = msg || "";
    controls(name).forEach(function (el) {
      var f = el.closest(".field"); if (f) f.classList.toggle("is-invalid", !!msg);
      if (el.type !== "radio") el.setAttribute("aria-invalid", msg ? "true" : "false");
    });
  }
  function validateStep(step) {
    var first = null;
    RULES.forEach(function (r) {
      if (r[0] !== step) return;
      var v = val(r[1]), ok = r[2](v);
      showErr(r[1], ok ? "" : (typeof r[3] === "function" ? r[3](v) : r[3]));
      if (!ok && !first) first = r[1];
    });
    if (first) {
      var el = controls(first)[0];
      if (el) { (el.closest(".field") || el).scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { el.focus({ preventScroll: true }); }, 350); }
    }
    return !first;
  }
  form.addEventListener("input", function (e) { if (e.target.name) showErr(e.target.name, ""); });
  form.addEventListener("change", function (e) { if (e.target.name) showErr(e.target.name, ""); updateHints(); updateMilestone(); save(); });
  form.addEventListener("input", function (e) { if (e.target.name === "milestone_other") { updateMilestone(); showErr("milestone", ""); } });

  /* ─────────── Pages ─────────── */
  var steps = $$(".step", form), cur = 0;
  var prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn"), submitBtn = $("#submitBtn");
  function goTo(n, focus) {
    cur = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === cur); });
    $$("#stepNav li").forEach(function (li, i) {
      li.classList.toggle("is-active", i === cur); li.classList.toggle("is-done", i < cur);
      if (i === cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    $("#progressBar").style.width = ((cur + 1) / steps.length * 100) + "%";
    $("#stepCount").textContent = "Page " + (cur + 1) + " of " + steps.length + " · " + STEP_NAMES[cur];
    prevBtn.hidden = cur === 0;
    nextBtn.hidden = cur === steps.length - 1;
    submitBtn.hidden = cur !== steps.length - 1;
    if (cur === steps.length - 1) renderSummary();
    hideStatus();
    if (focus) {
      var box = $("#booking"), navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 70;
      if (box.getBoundingClientRect().top < navH) window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: "smooth" });
      var t = $(".step__title", steps[cur]); t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true });
    }
  }
  nextBtn.addEventListener("click", function () { if (validateStep(cur)) { goTo(cur + 1, true); save(); } });
  prevBtn.addEventListener("click", function () { goTo(cur - 1, true); });
  $("#stepNav").addEventListener("click", function (e) {
    var li = e.target.closest("li[data-step]"); if (!li) return;
    var n = +li.dataset.step;
    if (n < cur || validateStep(cur)) goTo(n, true);
  });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); if (cur < steps.length - 1) nextBtn.click(); else submit(); }
  });

  /* ─────────── Collect & summary ─────────── */
  function collect() {
    var d = {};
    Object.keys(LABELS).forEach(function (k) {
      var v = val(k); if (!v) return;
      if (k === "milestone") { v = milestoneText(); if (!v) return; }
      if (k === "date") v = prettyDate(v);
      if (k === "time") v = prettyTime(v);
      if (k === "phone") v = "+91 " + normPhone(v);
      d[k] = v;
    });
    return d;
  }
  function renderSummary() {
    var d = collect(), keys = ["occasion", "milestone", "cake_name", "flavour", "weight", "date", "time", "address"];
    $("#summary").innerHTML = '<section class="sum-block"><header><h4>Your cake</h4><button type="button" class="link-btn" data-edit="0">Edit</button></header><dl>' +
      keys.filter(function (k) { return d[k]; }).map(function (k) { return "<dt>" + esc(LABELS[k]) + "</dt><dd>" + esc(d[k]) + "</dd>"; }).join("") + "</dl></section>";
  }
  $("#summary").addEventListener("click", function (e) { if (e.target.closest("[data-edit]")) goTo(0, true); });
  function summaryText(d, ref) {
    var lines = ["🎂 Muffin Muse booking request" + (ref ? " · " + ref : ""), ""];
    Object.keys(LABELS).forEach(function (k) { if (d[k]) lines.push(LABELS[k] + ": " + d[k]); });
    return lines.join("\n");
  }

  /* ─────────── Draft autosave (per-browser convenience) ─────────── */
  var KEY = "mm_booking_draft_v2";
  function save() {
    try {
      var o = {};
      $$("input[name], textarea[name]", form).forEach(function (el) {
        if (el.name.charAt(0) === "_") return;
        if (el.type === "radio") { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value;
      });
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* storage unavailable — fine */ }
  }
  function restore() {
    var o; try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
    if (!o) return;
    msDraft = o.milestone || "";
    Object.keys(o).forEach(function (n) {
      controls(n).forEach(function (el) {
        if (el.type === "radio") el.checked = el.value === o[n];
        else if (!(n === "date" && o[n] && o[n] < dateInp.min)) el.value = o[n];
      });
    });
    if (o.collection) showInspired(o.collection);
  }
  function clearDraft() { try { localStorage.removeItem(KEY); } catch (e) {} }
  var saveT; form.addEventListener("input", function () { clearTimeout(saveT); saveT = setTimeout(save, 400); });

  /* ─────────── Prefill from collection cards ─────────── */
  function showInspired(name) {
    $("#f_collection").value = name || "";
    $("#inspired").hidden = !name; $("#inspiredName").textContent = name || "";
  }
  $("#inspiredClear").addEventListener("click", function () { showInspired(""); save(); });
  function setRadio(name, v) { controls(name).forEach(function (el) { el.checked = el.value === v; }); }
  document.addEventListener("mm:prefill", function (e) {
    var c = e.detail || {};
    if (!$("#success").hidden) resetAll();
    showInspired(c.name);
    if (c.occasion) setRadio("occasion", c.occasion);
    if (c.flavour) setRadio("flavour", c.flavour);
    updateMilestone(); save(); goTo(0, false);
  });

  /* ─────────── Submission (FormSubmit AJAX — JSON confirms delivery) ─────────── */
  var statusBox = $("#formStatus"), sending = false, lastRef = null;
  function hideStatus() { statusBox.hidden = true; statusBox.className = "form-status"; statusBox.innerHTML = ""; }
  function makeRef() {
    var d = new Date(), a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = "";
    for (var i = 0; i < 4; i++) r += a[Math.floor(Math.random() * a.length)];
    return "MM-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + r;
  }
  function endpointId() { return String(C.formEndpointId || "").trim(); }

  function send(fields) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    return fetch("https://formsubmit.co/ajax/" + encodeURIComponent(endpointId()), {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(fields), signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(to);
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!(res.ok && (j.success === true || j.success === "true"))) throw new Error(j.message || ("The booking service responded with status " + res.status + "."));
        return j;
      });
    }, function (err) {
      clearTimeout(to);
      throw new Error(err && err.name === "AbortError" ? "The booking service took too long to respond." : "We couldn't reach the booking service. Please check your internet connection.");
    });
  }

  function setLoading(on) {
    sending = on; submitBtn.disabled = on; prevBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    $(".btn__label", submitBtn).textContent = on ? "Sending…" : "Send booking request";
  }

  function showError(message, data, ref) {
    var wa = String(C.whatsappNumber || "").replace(/\D/g, ""), text = summaryText(data, ref);
    statusBox.hidden = false; statusBox.className = "form-status is-error";
    statusBox.innerHTML = "<strong>Your booking was not sent.</strong>" + esc(message) + " Please try again." +
      '<div class="actions">' +
      '<button type="button" class="btn btn--dark btn--sm" data-act="retry">Try again</button>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="copy">Copy booking details</button>' +
      (wa.length >= 10 ? '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + wa + "?text=" + encodeURIComponent(text) + '">Send on WhatsApp</a>' : "") +
      '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' + esc(C.instagramUrl || "#") + '">DM on Instagram</a></div>';
    statusBox.querySelector('[data-act="retry"]').onclick = function () { submit(); };
    statusBox.querySelector('[data-act="copy"]').onclick = function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = "Copied ✓"; }, function () {
        var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); b.textContent = "Copied ✓"; } catch (x) { b.textContent = "Copy failed"; } t.remove();
      });
    };
    statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function showSuccess(data, ref) {
    $("#successName").textContent = (data.name || "").split(" ")[0] || "lovely";
    $("#successPhone").textContent = data.phone || "your number";
    $("#successRef").textContent = ref;
    form.hidden = true; $("#stepNav").hidden = true; $("#inspired").hidden = true; $(".booking__progress").hidden = true;
    var s = $("#success"); s.hidden = false; s.focus();
    s.scrollIntoView({ behavior: "smooth", block: "center" });
    clearDraft();
  }

  function submit() {
    if (sending) return;
    for (var s = 0; s < steps.length; s++) { if (!validateStep(s)) { goTo(s, false); validateStep(s); return; } }
    if (val("_honey")) return; // bot
    var d = collect();
    if (!endpointId()) { showError("Online booking isn't configured yet.", d, ""); return; }
    if (navigator.onLine === false) { showError("You appear to be offline.", d, ""); return; }
    hideStatus();
    var ref = lastRef || (lastRef = makeRef());
    var fields = { "Booking reference": ref };
    Object.keys(LABELS).forEach(function (k) { if (d[k]) fields[LABELS[k]] = d[k]; });
    fields._subject = "🎂 New cake booking · " + (d.name || "") + " · " + (d.occasion || "") + " · " + (d.date || "") + " · " + ref;
    fields._template = "table";
    fields._captcha = "false";
    setLoading(true);
    send(fields)
      .then(function () { setLoading(false); showSuccess(d, ref); lastRef = null; })
      .catch(function (err) { setLoading(false); showError(" " + (err && err.message ? err.message : "Something went wrong."), d, ref); });
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); if (cur === steps.length - 1) submit(); else nextBtn.click(); });

  function resetAll() {
    form.reset(); showInspired(""); clearDraft();
    form.hidden = false; $("#stepNav").hidden = false; $(".booking__progress").hidden = false; $("#success").hidden = true;
    $$(".is-invalid", form).forEach(function (el) { el.classList.remove("is-invalid"); });
    $$(".err", form).forEach(function (el) { el.textContent = ""; });
    updateHints(); updateMilestone(); goTo(0, false);
  }
  $("#newBooking").addEventListener("click", function () { resetAll(); goTo(0, true); });

  /* ─────────── Init ─────────── */
  restore();
  updateHints();
  updateMilestone();
  goTo(0, false);
})();
