let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/it@v4.4/data/itinerary-data.json";

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

const directTransport = document.getElementById("directTransport");
const hubTransport = document.getElementById("hubTransport");
const hubSection = document.getElementById("hubSection");
const hubCity = document.getElementById("hubCity");

calcBtn.onclick = calculate;

function makeRange(value, percent = 10) {
  const delta = Math.round(value * percent / 100);
  return [value - delta, value + delta];
}

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
        onDestinationSelected(c);
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

  const [hotelMin, hotelMax] = makeRange(c.hotel * days);
  const [foodMin, foodMax] = makeRange(c.food * days * people);

  let minTotal = hotelMin + foodMin;
  let maxTotal = hotelMax + foodMax;

  let html = `<h3>${dest.replace(/_/g," ")}</h3>`;

  html += `<p>🏨 Hotel cost: ₹${hotelMin}–₹${hotelMax} for ${days} days</p>`;
  html += `<p>🍽 Food cost: ₹${foodMin}–₹${foodMax} for ${people} people for ${days} days</p>`;

  const dt = directTransport.value;
  if (dt === "own_vehicle") {
    html += `<p>🚗 Travel: Own vehicle — <a href="/p/fuel-calculator.html">use fuel calculator</a></p>`;
  } else {
    html += `<p>✈️ Travel: ${dt} — check official site</p>`;
  }

  if (c.hub_city && hubTransport.value === "bus") {
    const price = data.bus_prices[`${c.hub_city}-${dest}`];
    if (price) {
      const busMin = price[0] * people;
      const busMax = price[1] * people;

      html += `<p>🚌 Bus via ${c.hub_city}: ₹${busMin}–₹${busMax} for ${people} people</p>`;
      minTotal += busMin;
      maxTotal += busMax;
    }
  }

  html += `<hr>`;
  html += `<p><strong>Total rough estimate for ${people} people for ${days} days trip:</strong> ₹${minTotal}–₹${maxTotal}</p>`;
  html += `<p class="disclaimer">* All prices are approximate and may vary based on season, availability, and booking time.</p>`;

  result.innerHTML = html;
  result.style.display = "block";

}


function onDestinationSelected(destKey) {
  const c = data.cities[destKey];

  directTransport.innerHTML = "";
  c.direct_transport.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    directTransport.appendChild(opt);
  });

  if (c.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = c.hub_city;

    hubTransport.innerHTML = "";
    c.hub_transport.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      hubTransport.appendChild(opt);
    });
  } else {
    hubSection.style.display = "none";
  }
}
