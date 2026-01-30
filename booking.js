// ================================
// booking.js (FULL)
// Keeps your Google Apps Script booking flow,
// and FIXES WhatsApp links for iPhone using https://wa.me/
// ================================

// Google Apps Script Web App URL (yours)
const API_URL = "https://script.google.com/macros/s/AKfycbzpJ7Hl7pm1MlD4LJVwSfpmfNJ9vkjip0xI4puy8s_3eerVkeK1nI5JBj-p4rbv2eI/exec";

// Your WhatsApp Business number (UK -> international)
const BUSINESS_WA_NUMBER = "447825250141";

function $(id){ return document.getElementById(id); }

function showStatus(msg){
  const el = $("status");
  el.style.display = "block";
  el.textContent = msg;
}

function hideStatus(){
  const el = $("status");
  el.style.display = "none";
  el.textContent = "";
}

function buildWhatsAppLink(message){
  // wa.me is the most reliable on iPhone + Android
  const text = encodeURIComponent(message);
  return `https://wa.me/${BUSINESS_WA_NUMBER}?text=${text}`;
}

function populateTimes(){
  const date = $("date").value;
  const timeSel = $("time");
  timeSel.innerHTML = "";

  if(!date){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Pick a date first";
    timeSel.appendChild(opt);
    return;
  }

  // Simple starter slots (adjust later)
  const times = ["09:00","11:00","13:00","15:00"];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a time";
  timeSel.appendChild(placeholder);

  times.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSel.appendChild(opt);
  });
}

async function submitBooking(){
  $("success").hidden = true;
  hideStatus();

  const payload = {
    date: $("date").value,
    time: $("time").value,
    name: $("name").value.trim(),
    mobile: $("mobile").value.trim(),
    postcode: $("postcode").value.trim(),
    jobType: $("jobType").value,
    estimate: $("estimate") ? $("estimate").value : "",
    notes: $("notes").value.trim(),
    source: "Website"
  };

  if(!payload.date || !payload.time){
    showStatus("Pick a date and time first.");
    return;
  }
  if(!payload.name || !payload.mobile || !payload.postcode){
    showStatus("Please add name, mobile and postcode.");
    return;
  }

  showStatus("Saving booking…");

  try{
    const res = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data;
    try{ data = JSON.parse(text); }catch(e){ data = { ok:false, raw:text }; }

    if(!data.ok){
      showStatus("Couldn't send booking. If this keeps happening, tell me what you see in the Apps Script logs.");
      return;
    }

    // Success UI
    const bookingId = data.bookingId || "EG-XXXX";
    const waMsg =
`Evergreen booking confirmation ✅
Booking ID: ${bookingId}
Date: ${payload.date}
Time: ${payload.time}
Name: ${payload.name}
Postcode: ${payload.postcode}
Job: ${payload.jobType}
Notes: ${payload.notes || "—"}

Please confirm this booking.`;

    $("waLink").href = buildWhatsAppLink(waMsg);

    hideStatus();
    $("success").hidden = false;

    // Reset form (keep date for convenience)
    $("time").value = "";
    $("name").value = "";
    $("mobile").value = "";
    $("postcode").value = "";
    $("notes").value = "";
    if($("estimate")) $("estimate").value = "";

  }catch(err){
    showStatus("Couldn't send booking. If this keeps happening, tell me what you see in the Apps Script logs.");
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  if($("date")) $("date").addEventListener("change", populateTimes);
  if($("bookBtn")) $("bookBtn").addEventListener("click", submitBooking);
  populateTimes();
});
