let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/it@v4.1/data/itinerary-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
  })
  .catch(err => {
    console.error("Failed to load JSON", err);
    alert("Data failed to load");
  });

const startCity = document.getElementById("startCity");
const destInput = document.getElementById("destInput");
const destSug = document.getElementById("destSug");
const daysInput = document.getElementById("daysInput");
const peopleInput = document.getElementById("peopleInput");
const result = document.getElementById("result");
const calcBtn = document.getElementById("calcBtn");

calcBtn.onclick = calculate;

function initAutocomplete(list) {
  destInput.addEventListener("input", () => {
    const q = destInput.value.toLowerCase();
    destSug.innerHTML = "";
    if (!q) return destSug.style.display = "none";

    const matches = list.filter(c => c.startsWith(q)).slice(0, 10);

    matches.forEach(c => {
      const d = document.createElement("div");
      d.textContent = c.replace(/_/g, " ");
      d.onclick = () => {
        destInput.value = d.textContent;
        destSug.style.display = "none";
      };
      destSug.appendChild(d);
    });

    destSug.style.display = matches.length ? "block" : "none";
  });

  document.addEventListener("click", e => {
    if (!destSug.contains(e.target) && e.target !== destInput) {
      destSug.style.display = "none";
    }
  });
}

function calculate() {
  if (!data) return alert("Data still loading...");

  const start = startCity.value;
  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "_");
  const days = Number(daysInput.value);
  const people = Number(peopleInput.value);

  if (!start) return alert("Select start city");
  if (!data.cities[destKey]) return alert("Select valid destination");
  if (!Number.isInteger(days) || days < 1 || days > 30) return alert("Days must be 1–30");
  if (!Number.isInteger(people) || people < 1 || people > 10) return alert("People must be 1–10");

  renderResult(start, destKey, days, people);
}

function renderResult(start, dest, days, people) {
  const c = data.cities[dest];
  let html = `<h3>${dest.replace(/_/g," ")}</h3>`;

  const hotelCost = c.hotel * days;
  const foodCost = c.food * days * people;

  let minTotal = hotelCost + foodCost;
  let maxTotal = hotelCost + foodCost;

  html += `<p>🏨 Hotel: ₹${hotelCost}</p>`;
  html += `<p>🍽 Food: ₹${foodCost}</p>`;

  html += `<h4>Transport</h4>`;

  c.direct_transport.forEach(t => {
    if (t === "own_vehicle") {
      html += `<div>🚗 Own Vehicle — <a href="/p/fuel-calculator.html">Fuel Calculator</a></div>`;
    } else {
      html += `<div>${t} — Check official site</div>`;
    }
  });

  if (c.hub_city) {
    const key = `${c.hub_city}-${dest}`;
    const price = data.bus_prices?.[key];
    if (price && price.length === 2) {
      const minBus = price[0] * people;
      const maxBus = price[1] * people;

      html += `<div>🚌 Bus via ${c.hub_city}: ₹${minBus}–₹${maxBus}</div>`;

      minTotal += minBus;
      maxTotal += maxBus;
    } else {
      html += `<div>🚌 Bus via ${c.hub_city}: price unavailable</div>`;
    }
  }

  html += `<h4>Estimated Total: ₹${minTotal} – ₹${maxTotal}</h4>`;
  html += `<p class="disclaimer">*Prices are approximate and may vary. Always check official transport and hotel sites before booking.</p>`;

  result.innerHTML = html;
}
