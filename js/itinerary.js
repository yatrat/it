async function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const list = document.getElementById("cityList");

  if (!input || !list) {
    console.error("Autocomplete elements missing");
    return;
  }

  let cities = [];

  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/yatrat/it@v4/data/citylist.json"
    );
    const json = await res.json();
    cities = json.cities || [];
  } catch (e) {
    console.error("City list load failed", e);
    return;
  }

  input.addEventListener("input", () => {
    const value = input.value.trim().toLowerCase();

    list.innerHTML = "";
    list.style.display = "none";
    input.dataset.cityId = ""; // reset selection

    // 🔑 MIN LENGTH = 2 (FIX)
    if (value.length < 2) return;

    const matches = cities.filter(city =>
      city.name.toLowerCase().includes(value)
    );

    if (!matches.length) return;

    matches.slice(0, 10).forEach(city => {
      const item = document.createElement("div");
      item.className = "yt-suggestion";
      item.textContent = city.name;

      item.addEventListener("click", () => {
        input.value = city.name;
        input.dataset.cityId = city.id;
        list.innerHTML = "";
        list.style.display = "none";
      });

      list.appendChild(item);
    });

    list.style.display = "block"; // THIS WAS MISSING
  });

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.innerHTML = "";
      list.style.display = "none";
    }
  });
}

/* -------- ITINERARY DATA -------- */
let itineraryCache = null;

async function loadItineraryData() {
  if (itineraryCache) return itineraryCache;

  const res = await fetch(
    "https://cdn.jsdelivr.net/gh/yatrat/it@v4/data/itinerary-data.json"
  );

  if (!res.ok) {
    throw new Error("Failed to load itinerary data");
  }

  itineraryCache = await res.json();
  return itineraryCache;
}

/* ===============================
   GENERATE ITINERARY
================================ */

async function generateItinerary() {
  const cityInput = document.getElementById("cityInput");
  const daysSelect = document.getElementById("daysSelect");
  const results = document.getElementById("itineraryResults");

  const cityId = cityInput.dataset.cityId;
  const days = parseInt(daysSelect.value, 10);

  if (!cityId || !days) {
    results.innerHTML = `
      <div class="message error">
        Please select a city from suggestions and number of days.
      </div>`;
    return;
  }

  try {
    const data = await loadItineraryData();
    const city = data.cities[cityId];

    if (!city || !city.plans) {
      results.innerHTML = `
        <div class="message error">
          Itinerary not available for selected city.
        </div>`;
      return;
    }

    results.innerHTML = "";

    const availableDays = Object.keys(city.plans).length;
    const daysToShow = Math.min(days, availableDays);

    /* ---- SHOW DAY 1 → N ---- */
    for (let d = 1; d <= daysToShow; d++) {
      const activities = city.plans[d];
      if (!activities) continue;

      const day = document.createElement("div");
      day.className = "itinerary-day";

      // Header
      const header = document.createElement("div");
      header.className = "day-header";

      const dayNum = document.createElement("span");
      dayNum.className = "day-number";
      dayNum.textContent = `Day ${d}`;

      const duration = document.createElement("span");
      duration.className = "day-duration";
      duration.textContent = `${days} Day Trip`;

      header.appendChild(dayNum);
      header.appendChild(duration);

      // Activities
      const ul = document.createElement("ul");
      ul.className = "day-activities";

      activities.forEach(activity => {
        const li = document.createElement("li");
        li.textContent = activity;
        ul.appendChild(li);
      });

      day.appendChild(header);
      day.appendChild(ul);
      results.appendChild(day);
    }

    /* ---- EXTRA DAYS FOOTER ---- */
    const missingDays = days - availableDays;
    if (missingDays > 0) {
      addTipsFooter(missingDays);
    }

  } catch (err) {
    console.error(err);
    results.innerHTML = `
      <div class="message error">
        Error loading itinerary. Please try again.
      </div>`;
  }
}

/* ===============================
   EXTRA DAYS FOOTER
================================ */

function addTipsFooter(missingDays) {
  const results = document.getElementById("itineraryResults");

  const footer = document.createElement("div");
  footer.className = "itinerary-footer";

  footer.innerHTML = `
    <p><strong>Travel Tips:</strong> Use the remaining ${missingDays} day(s) for:</p>
    <ul>
      <li>Free exploration of local markets</li>
      <li>Relaxation and rest</li>
      <li>Spontaneous discoveries</li>
      <li>Travel buffer time</li>
    </ul>
  `;

  results.appendChild(footer);
}

/* ===============================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => {
  setupAutocomplete();

  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.addEventListener("click", generateItinerary);
  }
});
