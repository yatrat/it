
const cityInput = document.getElementById('cityInput');
const cityList = document.getElementById('cityList');
const daysSelect = document.getElementById('daysSelect');
const generateBtn = document.getElementById('generateBtn');
const itineraryResults = document.getElementById('itineraryResults');


const GITHUB_USER = 'yatrat';
const GITHUB_REPO = 'it';
const GITHUB_BRANCH = 'main';

const CITY_LIST_URL = `https://cdn.jsdelivr.net/gh/yatrat/it@v2/data/citylist.json`;
const ITINERARY_DATA_URL = `https://cdn.jsdelivr.net/gh/yatrat/it@v2/data/itinerary-data.json`;


document.addEventListener('DOMContentLoaded', function() {
    console.log('Travel Itinerary Tool Loaded');
    
    // Setup autocomplete
    initializeAutocomplete();
    
    // Setup generate button
    if (generateBtn) {
        generateBtn.addEventListener('click', generateItinerary);
    }
    
    // Enter key support
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
        
        // Hide suggestions on outside click
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
    const days = daysSelect.value;
    
    if (!cityName || !days) {
        showMessage('Please select both city and number of days', 'error');
        return;
    }
    
    // Show loading
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
        
        if (!cityData.plans || !cityData.plans[days]) {
            showMessage(`${days}-day itinerary not available for ${cityName}`, 'error');
            return;
        }
        
        displayItinerary(cityName, days, cityData.plans[days]);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to generate itinerary', 'error');
    } finally {
        // Reset button
        if (generateBtn) {
            generateBtn.innerHTML = 'Generate Itinerary';
            generateBtn.disabled = false;
        }
    }
}

function displayItinerary(cityName, days, plan) {
    if (!itineraryResults) return;
    
    itineraryResults.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'itinerary-header';
    header.innerHTML = `
        <h3>${days}-Day Itinerary for ${cityName}</h3>
        <p>${plan.length} days of curated experiences</p>
    `;
    itineraryResults.appendChild(header);
    
    plan.forEach((activities, index) => {
        const dayNumber = index + 1;
        const dayCard = document.createElement('div');
        dayCard.className = 'itinerary-day';
        
        let activitiesHTML = '';
        if (Array.isArray(activities)) {
            activitiesHTML = activities.map(activity => `<li>${activity}</li>`).join('');
        } else {
            activitiesHTML = `<li>${activities}</li>`;
        }
        
        dayCard.innerHTML = `
            <div class="day-header">
                <span>Day ${dayNumber}</span>
                <span>Full Day</span>
            </div>
            <ul>${activitiesHTML}</ul>
        `;
        
        itineraryResults.appendChild(dayCard);
    });
}

function showMessage(text, type = 'error') {
    if (!itineraryResults) return;
    
    itineraryResults.innerHTML = `
        <div class="message ${type}">
            ${text}
        </div>
    `;
}
