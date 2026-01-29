/* booking.js — mobile-first estimate + booking */

/** ✅ CONFIG: replace these */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";
const BUSINESS_WHATSAPP = "447000000000"; // no +, e.g. 447123456789

/** Business slot rules (you can change later) */
const SLOT_START_HOUR = 9;   // 09:00
const SLOT_END_HOUR = 17;    // 17:00 (last slot begins at 16:00 if 1-hr slots)
const SLOT_MINUTES = 60;     // 60 mins per slot
const LOOKAHEAD_DAYS = 21;   // show next 3 weeks

// ---------- Helpers ----------
const £ = (n) => "£" + n.toFixed(0);
const el = (id) => document.getElementById(id);

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function buildSlotsForDay() {
  const slots = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    const hh = String(h).padStart(2, "0");
    slots.push(`${hh}:00`);
  }
  return slots;
}

function sanitizeMobile(m) {
  if (!m) return "";
  return m.replace(/\s+/g, "").replace(/^0/, "+44").replace(/^\+/, "");
}

// ---------- Estimator ----------
function calcEstimate() {
  const job = el("jobType").value;
  const size = el("size").value;
  const access = el("access").value;
  const waste = el("waste").value;

  // Base price bands
  const base = {
    lawn: { small: [30, 40], medium: [40, 55], large: [55, 80] },
    hedge: { small: [45, 70], medium: [70, 110], large: [110, 160] },
    tidy: { small: [90, 130], medium: [130, 200], large: [200, 320] },
    clear: { small: [110, 160], medium: [160, 260], large: [260, 420] },
    general: { small: [60, 100], medium: [100, 170], large: [170, 280] },
  };

  let [lo, hi] = base[job][size];

  // Access modifiers
  if (access === "average") { lo += 10; hi += 20; }
  if (access === "difficult") { lo += 25; hi += 45; }

  // Waste modifiers
  if (waste === "some") { lo += 20; hi += 40; }
  if (waste === "lots") { lo += 50; hi += 90; }

  el("estimate").textContent = `${£(lo)} – ${£(hi)}`;
  el("estimateNote").textContent = "Tip: If you have photos, you can confirm the exact price via WhatsApp after booking.";
}

el("calcBtn").addEventListener("click", calcEstimate);

// ---------- Booking availability ----------
async function loadAvailability(dateISO) {
  const timeSelect = el("time");
  timeSelect.innerHTML = `<option value="">Loading...</option>`;

  // Default slots (frontend fallback)
  const allSlots = buildSlotsForDay();

  try {
    const url = `${APPS_SCRIPT_URL}?action=availability&date=${encodeURIComponent(dateISO)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    const available = data?.availableTimes?.length ? data.availableTimes : allSlots;

    timeSelect.innerHTML = available.length
      ? `<option value="">Select a time</option>` + available.map(t => `<option value="${t}">${t}</option>`).join("")
      : `<option value="">No times available</option>`;
  } catch (e) {
    // If script not set up yet, still show basic slots
    timeSelect.innerHTML = `<option value="">Select a time</option>` + allSlots.map(t => `<option value="${t}">${t}</option>`).join("");
  }
}

function initDatePicker() {
  const dateInput = el("date");
  const min = todayISO();
  const max = addDaysISO(min, LOOKAHEAD_DAYS);

  dateInput.min = min;
  dateInput.max = max;
  dateInput.value = min;

  loadAvailability(min);

  dateInput.addEventListener("change", () => {
    if (dateInput.value) loadAvailability(dateInput.value);
  });
}

initDatePicker();

// ---------- Booking submit ----------
async function submitBooking() {
  const status = el("status");
  const success = el("success");
  status.textContent = "";
  success.hidden = true;

  const payload = {
    action: "book",
    date: el("date").value,
    time: el("time").value,
    name: el("name").value.trim(),
    mobile: el("mobile").value.trim(),
    postcode: el("postcode").value.trim(),
    notes: el("notes").value.trim(),
    jobType: el("jobType").value,
    estimate: el("estimate").textContent || "",
  };

  if (!payload.date || !payload.time) {
    status.textContent = "Please select a date and time.";
    status.className = "status error";
    return;
  }
  if (!payload.name || !payload.mobile || !payload.postcode) {
    status.textContent = "Please enter name, mobile and postcode.";
    status.className = "status error";
    return;
  }

  status.textContent = "Booking...";
  status.className = "status";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.ok) {
      status.textContent = data.message || "That slot is no longer available. Please pick another.";
      status.className = "status error";
      await loadAvailability(payload.date);
      return;
    }

    // WhatsApp link (free method): customer taps to send details
    const safeMobile = sanitizeMobile(payload.mobile);
    const msg = encodeURIComponent(
      `Booking request ✅\n\nName: ${payload.name}\nMobile: ${payload.mobile}\nPostcode: ${payload.postcode}\nDate/Time: ${payload.date} ${payload.time}\nJob: ${payload.jobType}\nEstimate: ${payload.estimate}\nNotes: ${payload.notes || "-"}\n\nBooking ID: ${data.bookingId}`
    );
    el("waLink").href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${msg}`;

    status.textContent = "";
    success.hidden = false;
  } catch (e) {
    status.textContent = "Booking failed (setup not finished yet). Please try again later.";
    status.className = "status error";
  }
}

el("bookBtn").addEventListener("click", submitBooking);
