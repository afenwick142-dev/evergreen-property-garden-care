// =====================================
// Evergreen Booking – FULL booking.js
// =====================================

// 🔗 Google Apps Script Web App (LIVE)
const API_URL =
  "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";

// 📱 WhatsApp Business number (UK → international)
const BUSINESS_WA_NUMBER = "447825250141";

// -------------------------------------
// Helpers
// -------------------------------------
const $ = (id) => document.getElementById(id);

function toInternationalUK(mobile) {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.startsWith("44")) return digits;
  if (digits.startsWith("0")) return "44" + digits.slice(1);
  return digits;
}

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
// Available times (simple v1)
// -------------------------------------
function populateTimes() {
  const timeSelect = $("time");
  if (!timeSelect) return;

  const times = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
  ];

  timeSelect.innerHTML = `<option value="">Select a time</option>`;
  times.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  });
}

// -------------------------------------
// Submit booking
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

  const payload = {
    date,
    time,
    name,
    mobile,
    postcode,
    notes,
    source: "Website",
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
      showStatus("Booking failed. Try again.");
      return;
    }

    // -------------------------------
    // Success UI
    // -------------------------------
    showStatus("Booked ✓", true);

    const bookingId = data.bookingId;

    const msg =
      `Hi Evergreen 👋%0A%0A` +
      `I’ve just booked a job via your website:%0A` +
      `• Name: ${name}%0A` +
      `• Date: ${date}%0A` +
      `• Time: ${time}%0A` +
      `• Postcode: ${postcode}%0A` +
      (notes ? `• Notes: ${notes}%0A` : "") +
      `%0ABooking ID: ${bookingId}`;

    const waLink = buildWhatsAppLink(msg);

    const successBox = $("success");
    const waBtn = $("waLink");

    if (successBox) successBox.hidden = false;
    if (waBtn) waBtn.href = waLink;

  } catch (err) {
    console.error(err);
    showStatus("Could not connect to booking service.");
  }
}

// -------------------------------------
// Init
// -------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  populateTimes();
  $("bookBtn")?.addEventListener("click", submitBooking);
});
