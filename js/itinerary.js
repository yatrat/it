const cityInput = document.getElementById('cityInput');
const cityList = document.getElementById('cityList');
const daysSelect = document.getElementById('daysSelect');
const generateBtn = document.getElementById('generateBtn');
const itineraryResults = document.getElementById('itineraryResults');
const GITHUB_USER = 'yatrat';
const GITHUB_REPO = 'it';
const GITHUB_BRANCH = 'main';
const CITY_LIST_URL = `https://cdn.jsdelivr.net/gh/yatrat/it@v2.2/data/citylist.json`;
const ITINERARY_DATA_URL = `https://cdn.jsdelivr.net/gh/yatrat/it@v2.2/data/itinerary-data.json`;
document.addEventListener('DOMContentLoaded', function() {
    console.log('Travel Itinerary Tool Loaded');
    initializeAutocomplete();
    if (generateBtn) {
        generateBtn.addEventListener('click', generateItinerary);
    }
    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateItinerary();
            }
        });
    }
});
async function initializeAutocomplete() {
    if (!cityInput || !cityList) return;
    
    try {
        const response = await fetch(CITY_LIST_URL);
        const data = await response.json();
        const cities = data.cities || [];
        
        cityInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            cityList.innerHTML = '';
            
            if (searchTerm.length === 0) {
                cityList.style.display = 'none';
                return;
            }
            
            const matches = cities.filter(city => 
                city.name.toLowerCase().includes(searchTerm)
            );
            
            if (matches.length > 0) {
                matches.slice(0, 8).forEach(city => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'yt-suggestion';
                    suggestion.innerHTML = `
                        <span class="suggestion-name">${city.name}</span>
                        <span class="suggestion-id">${city.id}</span>
                    `;
                    
                    suggestion.addEventListener('click', () => {
                        cityInput.value = city.name;
                        cityInput.dataset.cityId = city.id;
                        cityList.innerHTML = '';
                        cityList.style.display = 'none';
                    });
                    
                    cityList.appendChild(suggestion);
                });
                cityList.style.display = 'block';
            } else {
                const noResult = document.createElement('div');
                noResult.className = 'yt-suggestion';
                noResult.textContent = 'No cities found';
                cityList.appendChild(noResult);
                cityList.style.display = 'block';
            }
        });
        document.addEventListener('click', (e) => {
            if (!cityList.contains(e.target) && e.target !== cityInput) {
                cityList.style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error('Failed to load city list:', error);
    }
}

async function loadItineraryData() {
    try {
        const response = await fetch(ITINERARY_DATA_URL);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load itinerary data:', error);
        return { cities: {} };
    }
}

async function generateItinerary() {
    if (!cityInput || !daysSelect || !itineraryResults) return;
    
    const cityName = cityInput.value.trim();
    const cityId = cityInput.dataset.cityId || cityName.toLowerCase();
    const selectedDays = parseInt(daysSelect.value);
    
    if (!cityName || !selectedDays) {
        showMessage('Please select both city and number of days', 'error');
        return;
    }
    if (generateBtn) {
        generateBtn.innerHTML = 'Loading...';
        generateBtn.disabled = true;
    }
    try {
        const data = await loadItineraryData();
        
        if (!data.cities || !data.cities[cityId]) {
            showMessage(`Itinerary not available for ${cityName}`, 'error');
            return;
        } 
        const cityData = data.cities[cityId];
        let plan = null;
        if (cityData.plans && cityData.plans[selectedDays]) {
            plan = cityData.plans[selectedDays];
        } 
        else if (cityData.plans && cityData.plans["4"]) {
            plan = cityData.plans["4"].slice(0, selectedDays);
        }
        else {
            showMessage(`${selectedDays}-day itinerary not available for ${cityName}`, 'error');
            return;
        }
        
        displayItinerary(cityName, selectedDays, plan);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to generate itinerary', 'error');
    } finally {
        if (generateBtn) {
            generateBtn.innerHTML = 'Generate Itinerary';
            generateBtn.disabled = false;
        }
    }
}

function displayItinerary(cityName, selectedDays, plan) {
    if (!itineraryResults) return;
    
    itineraryResults.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'itinerary-header';
    header.innerHTML = `
        <h3>${selectedDays}-Day Itinerary for ${cityName}</h3>
        <p>${selectedDays} days of curated experiences</p>
    `;
    itineraryResults.appendChild(header);

    const planLength = plan.length;

    for (let dayNumber = 1; dayNumber <= selectedDays && dayNumber <= planLength; dayNumber++) {
        const dayCard = document.createElement('div');
        dayCard.className = 'itinerary-day';
 
        const dayData = plan[dayNumber - 1];
        
        let activitiesHTML = '';
        if (Array.isArray(dayData)) {
            activitiesHTML = dayData.map(activity => `<li>${activity}</li>`).join('');
        } else {
            activitiesHTML = `<li>${dayData}</li>`;
        }
        
        dayCard.innerHTML = `
            <div class="day-header">
                <span class="day-number">Day ${dayNumber}</span>
                <span class="day-duration">Full Day</span>
            </div>
            <ul class="day-activities">${activitiesHTML}</ul>
        `;
        
        itineraryResults.appendChild(dayCard);
    }
    if (selectedDays > planLength) {
        const extraDays = selectedDays - planLength;
        const warning = document.createElement('div');
        warning.className = 'itinerary-warning';
        warning.innerHTML = `
            <p><strong>Travel Tip:</strong> Detailed itinerary available for ${planLength} days. 
            You can use the remaining ${extraDays} day(s) for:
            <ul>
                <li>Free exploration of local markets</li>
                <li>Relaxation at your hotel/resort</li>
                <li>Visiting nearby attractions</li>
                <li>Travel buffer time</li>
            </ul>
            </p>
        `;
        itineraryResults.appendChild(warning);
    }
}

function showMessage(text, type = 'error') {
    if (!itineraryResults) return;
    
    itineraryResults.innerHTML = `
        <div class="message ${type}">
            ${text}
        </div>
    `;
}
