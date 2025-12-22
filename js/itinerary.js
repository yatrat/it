
async function setupAutocomplete() {
  const input = document.getElementById("cityInput");
  const list = document.getElementById("cityList");

  if (!input || !list) return;

  let cities = [];

  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Yatrat/it@v3.9/data/citylist.json"
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

    if (!value) return;

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
        input.dataset.cityId = city.id; // 🔑 source of truth
        list.innerHTML = "";
        list.style.display = "none";
      });

      list.appendChild(item);
    });

    list.style.display = "block";
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
    "https://cdn.jsdelivr.net/gh/Yatrat/it@v3.9/data/itinerary.json"
  );

  if (!res.ok) {
    throw new Error("Failed to load itinerary data");
  }

  itineraryCache = await res.json();
  return itineraryCache;
}

/* -------- GENERATE ITINERARY -------- */

async function generateItinerary() {
  const cityInput = document.getElementById("cityInput");
  const daysSelect = document.getElementById("daysSelect");
  const results = document.getElementById("itineraryResults");

  const cityId = cityInput.dataset.cityId;
  const days = daysSelect.value;

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

    if (!city || !city.plans || !city.plans[days]) {
      results.innerHTML = `
        <div class="message error">
          Itinerary not available for selected city/days.
        </div>`;
      return;
    }

    results.innerHTML = "";

    city.plans[days].forEach((activity, index) => {
      const day = document.createElement("div");
      day.className = "itinerary-day";

      day.innerHTML = `
        <div class="day-header">
          <span class="day-number">Day ${index + 1}</span>
          <span class="day-duration">${days} Day Trip</span>
        </div>
        <ul class="day-activities">
          <li>${activity}</li>
        </ul>
      `;

      results.appendChild(day);
    });

  } catch (err) {
    results.innerHTML = `
      <div class="message error">
        Error loading itinerary. Please try again.
      </div>`;
  }
}

/* -------- INIT -------- */

document.addEventListener("DOMContentLoaded", () => {
  setupAutocomplete();

  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.addEventListener("click", generateItinerary);
  }
});
