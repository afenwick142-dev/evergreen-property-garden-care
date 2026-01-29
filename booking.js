// ==============================
// Evergreen Booking (JSONP)
// ==============================

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";

const els = {
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  name: document.getElementById("name"),
  mobile: document.getElementById("mobile"),
  postcode: document.getElementById("postcode"),
  notes: document.getElementById("notes"),
  jobType: document.getElementById("jobType"),
  estimate: document.getElementById("estimate"),
  bookBtn: document.getElementById("bookBtn"),
  status: document.getElementById("status"),
  success: document.getElementById("success"),
  waLink: document.getElementById("waLink"),
  bookingIdText: document.getElementById("bookingIdText"),
  ownerBox: document.getElementById("ownerBox"),
  ownerLink: document.getElementById("ownerLink"),
};

// --- JSONP helper (bypasses CORS) ---
function jsonp(url, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const query = new URLSearchParams({ ...params, callback: cb }).toString();
    script.src = `${url}?${query}`;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out"));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Network error"));
    };

    document.body.appendChild(script);
  });
}

function setStatus(msg, ok = false) {
  els.status.textContent = msg;
  els.status.style.color = ok ? "#0a7a2f" : "#b00020";
}

function clearTimes() {
  els.time.innerHTML = `<option value="">Pick a date first</option>`;
}

async function loadTimesForDate(dateStr) {
  clearTimes();
  if (!dateStr) return;

  setStatus("Loading available times…", true);

  try {
    const data = await jsonp(WEB_APP_URL, { action: "available", date: dateStr });

    if (!data || !data.ok) {
      setStatus(data && data.error ? data.error : "Could not load times.");
      return;
    }

    if (!data.available || data.available.length === 0) {
      els.time.innerHTML = `<option value="">No slots left for this day</option>`;
      setStatus("No slots left for that date. Try another.", false);
      return;
    }

    els.time.innerHTML = `<option value="">Select a time</option>` + data.available
      .map(t => `<option value="${t}">${t}</option>`)
      .join("");

    setStatus("Pick a time and book.", true);
  } catch (err) {
    setStatus("Couldn’t load times. Check your Apps Script deployment is set to Anyone.");
  }
}

els.date.addEventListener("change", () => {
  els.success.hidden = true;
  loadTimesForDate(els.date.value);
});

els.bookBtn.addEventListener("click", async () => {
  els.success.hidden = true;

  const payload = {
    action: "book",
    date: els.date.value,
    time: els.time.value,
    name: els.name.value.trim(),
    mobile: els.mobile.value.trim(),
    postcode: els.postcode.value.trim(),
    notes: els.notes.value.trim(),
    jobType: els.jobType.value,
    estimate: els.estimate.value,
    source: "Website",
  };

  // Basic validation
  if (!payload.date || !payload.time || !payload.name || !payload.mobile || !payload.postcode) {
    setStatus("Please fill: date, time, name, mobile, postcode.");
    return;
  }

  setStatus("Saving booking…", true);

  try {
    const data = await jsonp(WEB_APP_URL, payload);

    if (!data || !data.ok) {
      setStatus(data && data.error ? data.error : "Booking failed.");
      return;
    }

    // Show success
    els.bookingIdText.textContent = data.bookingId || "";
    els.waLink.href = data.whatsappCustomer || "#";
    els.success.hidden = false;

    if (data.whatsappOwner) {
      els.ownerBox.style.display = "block";
      els.ownerLink.href = data.whatsappOwner;
    } else {
      els.ownerBox.style.display = "none";
      els.ownerLink.href = "#";
    }

    setStatus("Booked (Pending). Tap WhatsApp to confirm.", true);

    // Optional: reset form fields except date/time
    // els.name.value = ""; els.mobile.value = ""; els.postcode.value = ""; els.notes.value = "";

    // Refresh times so the slot disappears immediately
    await loadTimesForDate(payload.date);
  } catch (err) {
    setStatus("Couldn’t send booking. Check Apps Script is deployed as Web App (Anyone).");
  }
});
