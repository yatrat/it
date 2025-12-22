
const cityInput = document.getElementById('cityInput');
const cityList = document.getElementById('cityList');
const daysSelect = document.getElementById('daysSelect');
const generateBtn = document.getElementById('generateBtn');
const itineraryResults = document.getElementById('itineraryResults');


const CITY_LIST_URL = 'https://cdn.jsdelivr.net/gh/yatrat/it/data/citylist.json';
const ITINERARY_DATA_URL = 'https://cdn.jsdelivr.net/gh/yatrat/it/data/itinerary-data.json';


async function initializeAutocomplete() {
    try {
       
        const response = await fetch(CITY_LIST_URL);
        const data = await response.json();
        const cities = data.cities || [];
        
        console.log(`Loaded ${cities.length} cities for autocomplete`);
        
        
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
                        console.log(`Selected: ${city.name} (${city.id})`);
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
        
       
        cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cityList.style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error('Failed to load city list:', error);
        cityInput.placeholder = 'Type city name (e.g., Shimla)';
    }
}


async function loadItineraryData() {
    try {
        const response = await fetch(ITINERARY_DATA_URL);
        const data = await response.json();
        console.log('Itinerary data loaded successfully');
        return data;
    } catch (error) {
        console.error('Failed to load itinerary data:', error);
        return { cities: {} };
    }
}


async function generateItinerary() {
   
    const cityName = cityInput.value.trim();
    const cityId = cityInput.dataset.cityId || cityName.toLowerCase();
    const days = daysSelect.value;
    
    if (!cityName || !days) {
        showMessage('Please select both city and number of days', 'error');
        return;
    }
    
    
    generateBtn.innerHTML = '<span class="loading-spinner"></span> Generating...';
    generateBtn.disabled = true;
    
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
        console.error('Error generating itinerary:', error);
        showMessage('Failed to generate itinerary. Please try again.', 'error');
    } finally {
        
        generateBtn.innerHTML = 'Generate Itinerary';
        generateBtn.disabled = false;
    }
}



function displayItinerary(cityName, days, plan) {
    itineraryResults.innerHTML = '';
    
   
    const header = document.createElement('div');
    header.className = 'itinerary-header';
    header.innerHTML = `
        <h3>${days}-Day Itinerary for ${cityName}</h3>
        <p class="itinerary-subtitle">${plan.length} days of curated experiences</p>
    `;
    itineraryResults.appendChild(header);
    
   
    plan.forEach((activities, index) => {
        const dayNumber = index + 1;
        const dayCard = document.createElement('div');
        dayCard.className = 'itinerary-day';
        
        let activitiesHTML = '';
        if (Array.isArray(activities)) {
            activitiesHTML = activities.map(activity => 
                `<li>${activity}</li>`
            ).join('');
        } else {
            activitiesHTML = `<li>${activities}</li>`;
        }
        
        dayCard.innerHTML = `
            <div class="day-header">
                <span class="day-number">Day ${dayNumber}</span>
                <span class="day-duration">Full Day</span>
            </div>
            <ul class="day-activities">
                ${activitiesHTML}
            </ul>
        `;
        
        itineraryResults.appendChild(dayCard);
    });
    
   
    const footer = document.createElement('div');
    footer.className = 'itinerary-footer';
    footer.innerHTML = `
        <p><strong>Travel Tips:</strong> Book accommodations in advance, carry warm clothing, and check weather conditions.</p>
    `;
    itineraryResults.appendChild(footer);
    
    
    itineraryResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}



function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
   
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
   
    itineraryResults.innerHTML = '';
    itineraryResults.appendChild(messageDiv);
    
   
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}



document.addEventListener('DOMContentLoaded', function() {
    console.log('Travel Itinerary Planner initialized');
    
    
    initializeAutocomplete();
    
    generateBtn.addEventListener('click', generateItinerary);
    
  
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateItinerary();
        }
    });
    
   
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Local development mode - adding sample data');
       
    }
});
