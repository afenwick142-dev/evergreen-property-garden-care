// ================================
// Evergreen Booking – FULL SCRIPT
// ================================

// 🔗 Google Apps Script Web App URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";

// 📱 YOUR WhatsApp Business number (UK → international format)
const BUSINESS_WA_NUMBER = "447825250141";

// ================================
// Helpers
// ================================

function $(id) {
  return document.getElementById(id);
}

function toInternationalUK(mobile) {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.startsWith("44")) return digits;
  if (digits.startsWith("0")) return "44" + digits.slice(1);
  return digits;
}

function buildWhatsAppLink(phoneDigits, message) {
  const clean = String(phoneDigits).replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${text}`;
}

function showStatus(msg, isError = false) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "#b00020" : "#0a7a2f";
}

// ================================
// Available times (simple MVP)
// ================================

const TIMES = [
  "09:00",
  "11:00",
  "13:00",
  "15:00"
];

function populateTimes() {
  const select = $("time");
  if (!select) return;

  select.innerHTML = `<option value="">Select a time</option>`;
  TIMES.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

// ================================
// Booking submit
// ================================

async function submitBooking() {
  showStatus("");

  const payload = {
    date: $("date")?.value || "",
    time: $("time")?.value || "",
    name: $("name")?.value || "",
    mobile: $("mobile")?.value || "",
    postcode: $("postcode")?.value || "",
    notes: $("notes")?.value || "",
    source: "Website"
  };

  // Basic validation
  if (!payload.date || !payload.time || !payload.name || !payload.mobile || !payload.postcode) {
    showStatus("Please complete all required fields.", true);
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data || !data.success) {
      throw new Error("Booking failed");
    }

    // ================================
    // SUCCESS UI
    // ================================

    const bookingId = data.bookingId;

    $("success").hidden = false;
    $("status").textContent = "";

    $("success").querySelector("p").innerHTML =
      `Your booking is saved as <strong>Pending</strong>.<br>Booking ID: <strong>${bookingId}</strong>`;

    // ================================
    // WhatsApp message
    // ================================

    const msg =
      `Hi Evergreen 👋\n\n` +
      `I’ve just booked a job:\n\n` +
      `Booking ID: ${bookingId}\n` +
      `Date: ${payload.date}\n` +
      `Time: ${payload.time}\n` +
      `Name: ${payload.name}\n` +
      `Mobile: ${payload.mobile}\n` +
      `Postcode: ${payload.postcode}\n` +
      (payload.notes ? `Notes: ${payload.notes}\n` : "") +
      `\nThanks`;

    const waLink = $("waLink");
    waLink.href = buildWhatsAppLink(BUSINESS_WA_NUMBER, msg);
    waLink.target = "_blank";
    waLink.rel = "noopener";

  } catch (err) {
    console.error(err);
    showStatus(
      "Couldn’t send booking. If this keeps happening, check the Apps Script logs.",
      true
    );
  }
}

// ================================
// Init
// ================================

document.addEventListener("DOMContentLoaded", () => {
  populateTimes();

  $("bookBtn")?.addEventListener("click", submitBooking);
});
