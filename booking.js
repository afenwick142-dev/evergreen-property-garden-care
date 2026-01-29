// =====================================
// booking.js  (Website)
// REAL AVAILABILITY + OWNER ALERT (Option 3)
// =====================================

// 🔗 Google Apps Script Web App (LIVE)
const API_URL =
  "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";

// 📱 WhatsApp Business number (UK → international format)
const BUSINESS_WA_NUMBER = "447825250141";

// -------------------------------------
// Helpers
// -------------------------------------
const $ = (id) => document.getElementById(id);

function buildWhatsAppLink(text) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${BUSINESS_WA_NUMBER}?text=${encoded}`;
}

function showStatus(msg, ok = false) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? "#1b7f3a" : "#b00020";
}

// -------------------------------------
// REAL availability: load slots from API
// -------------------------------------
async function loadAvailableTimes(date) {
  const timeSelect = $("time");
  if (!timeSelect) return;

  timeSelect.innerHTML = `<option value="">Loading…</option>`;

  try {
    const res = await fetch(`${API_URL}?action=slots&date=${encodeURIComponent(date)}`);
    const data = await res.json();

    if (!data.success) {
      timeSelect.innerHTML = `<option value="">No times available</option>`;
      showStatus("Couldn’t load times. Try again.");
      return;
    }

    const available = data.available || [];
    if (available.length === 0) {
      timeSelect.innerHTML = `<option value="">No times available</option>`;
      showStatus("No slots left for that date. Pick another day.");
      return;
    }

    timeSelect.innerHTML = `<option value="">Select a time</option>`;
    available.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeSelect.appendChild(opt);
    });

    showStatus("");
  } catch (err) {
    console.error(err);
    timeSelect.innerHTML = `<option value="">No times available</option>`;
    showStatus("Could not connect to booking service.");
  }
}

// -------------------------------------
// Instant Estimator (optional on your page)
// -------------------------------------
const PRICING = {
  lawn: { small: [25, 35], medium: [35, 55], large: [55, 80] },
  hedge: { small: [30, 50], medium: [50, 85], large: [85, 140] },
  tidy: { small: [45, 70], medium: [70, 120], large: [120, 200] },
  clear: { small: [60, 100], medium: [100, 180], large: [180, 300] },
  general: { small: [35, 60], medium: [60, 110], large: [110, 180] },
};

const ACCESS_MULT = { easy: 1.0, average: 1.15, difficult: 1.35 };
const WASTE_ADD = { no: 0, some: 20, lots: 45 };

let lastEstimateText = "";

function formatRange(min, max) {
  return `£${min}–£${max}`;
}

function calculateEstimate() {
  const jobType = $("jobType")?.value || "tidy";
  const size = $("size")?.value || "medium";
  const access = $("access")?.value || "easy";
  const waste = $("waste")?.value || "no";

  const base = PRICING[jobType]?.[size] || [70, 120];
  const mult = ACCESS_MULT[access] ?? 1.0;
  const add = WASTE_ADD[waste] ?? 0;

  const min = Math.round(base[0] * mult + add);
  const max = Math.round(base[1] * mult + add);

  lastEstimateText = `${formatRange(min, max)} (type: ${jobType}, size: ${size}, access: ${access}, waste: ${waste})`;

  const estimateEl = $("estimate");
  const noteEl = $("estimateNote");
  if (estimateEl) estimateEl.textContent = formatRange(min, max);
  if (noteEl) noteEl.textContent = "Online estimate — final price may change if access/condition differs significantly.";
}

// -------------------------------------
// Submit booking (server re-checks slot)
// -------------------------------------
async function submitBooking() {
  const date = $("date")?.value;
  const time = $("time")?.value;
  const name = $("name")?.value.trim();
  const mobile = $("mobile")?.value.trim();
  const postcode = $("postcode")?.value.trim();
  const notes = $("notes")?.value.trim();

  if (!date || !time || !name || !mobile || !postcode) {
    showStatus("Please complete all required fields.");
    return;
  }

  if ($("jobType") && !lastEstimateText) {
    calculateEstimate();
  }

  const payload = {
    date,
    time,
    name,
    mobile,
    postcode,
    notes,
    estimate: lastEstimateText || "",
    source: "Website",
    jobType: $("jobType")?.value || ""
  };

  showStatus("Saving booking…");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.success) {
      showStatus(data.message || "Booking failed. Pick another time.");
      await loadAvailableTimes(date);
      return;
    }

    showStatus("Booked ✓ (Pending)", true);

    const bookingId = data.bookingId;

    const msgLines = [
      `Hi Evergreen 👋`,
      ``,
      `I’ve just booked a job via your website:`,
      `• Name: ${name}`,
      `• Date: ${date}`,
      `• Time: ${time}`,
      `• Postcode: ${postcode}`,
    ];

    if (lastEstimateText) msgLines.push(`• Estimate: ${lastEstimateText.split(" (")[0]}`);
    if (notes) msgLines.push(`• Notes: ${notes}`);

    msgLines.push(``, `Booking ID: ${bookingId}`);

    const waLink = buildWhatsAppLink(msgLines.join("\n"));

    const successBox = $("success");
    const waBtn = $("waLink");

    if (successBox) successBox.hidden = false;
    if (waBtn) waBtn.href = waLink;

    // Optional owner links (if these elements exist in your HTML)
    const ownerBox = $("ownerBox");
    const ownerLink = $("ownerLink");
    if (ownerBox && ownerLink && data.whatsappOwner) {
      ownerBox.style.display = "block";
      ownerLink.href = data.whatsappOwner;
      ownerLink.textContent = "Send owner alert on WhatsApp";
    }

    // Optional message-customer link (if mobile is usable)
    const msgCustomerLink = $("msgCustomerLink");
    if (msgCustomerLink && data.whatsappToCustomer) {
      msgCustomerLink.href = data.whatsappToCustomer;
      msgCustomerLink.style.display = "inline-block";
    }

    await loadAvailableTimes(date);

  } catch (err) {
    console.error(err);
    showStatus("Could not connect to booking service.");
  }
}

// -------------------------------------
// Init
// -------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  $("date")?.addEventListener("change", (e) => {
    const date = e.target.value;
    if (date) loadAvailableTimes(date);
  });

  $("calcBtn")?.addEventListener("click", calculateEstimate);
  $("jobType")?.addEventListener("change", () => (lastEstimateText = ""));
  $("size")?.addEventListener("change", () => (lastEstimateText = ""));
  $("access")?.addEventListener("change", () => (lastEstimateText = ""));
  $("waste")?.addEventListener("change", () => (lastEstimateText = ""));

  $("bookBtn")?.addEventListener("click", submitBooking);

  const pre = $("date")?.value;
  if (pre) loadAvailableTimes(pre);
});
