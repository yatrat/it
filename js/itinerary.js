/* ============================================
   YATRAT ITINERARY PLANNER v3.0
   Permanent Tool for Travel Planning
   Author: Yatrat
   Last Updated: 2024
============================================ */

(function() {
    'use strict';
    
    // CONFIGURATION - Easy to modify
    const CONFIG = {
        // Data Sources
        dataURLs: {
            cities: 'https://cdn.jsdelivr.net/gh/yatrat/it@v3.6/data/citylist.json',
            itineraries: 'https://cdn.jsdelivr.net/gh/yatrat/it@v3.6/data/itinerary-data.json'
        },
        
        // DOM Elements
        elements: {
            cityInput: 'cityInput',
            suggestionsBox: 'cityList',
            daysSelect: 'daysSelect',
            generateBtn: 'generateBtn',
            resultsDiv: 'itineraryResults',
            loadingIndicator: 'loadingIndicator'
        },
        
        // Limits
        limits: {
            maxSuggestions: 8,
            maxDays: 7,
            minSearchChars: 2
        },
        
        // Settings
        settings: {
            cacheDuration: 3600000, // 1 hour in milliseconds
            debounceDelay: 300,
            enableOffline: true,
            enableAnalytics: false
        },
        
        // Messages
        messages: {
            loading: 'Loading...',
            generating: 'Creating Your Plan...',
            noCity: 'Please enter a city name',
            noDays: 'Please select number of days',
            invalidDays: 'Please select 1-7 days',
            noResults: 'No itinerary found for this city',
            errorFetch: 'Unable to load data. Please check connection.',
            tryAgain: 'Please try again',
            offline: 'Working offline with cached data'
        }
    };

    // STATE MANAGEMENT
    const STATE = {
        // Data
        allCities: [],
        allItineraries: {},
        cachedData: null,
        
        // UI State
        currentCity: null,
        currentDays: 1,
        isGenerating: false,
        isOffline: false,
        
        // DOM References
        dom: {},
        
        // Timestamps
        lastUpdated: null,
        lastFetch: 0,
        
        // Initialize
        init: function() {
            this.dom = {};
            Object.keys(CONFIG.elements).forEach(key => {
                this.dom[key] = document.getElementById(CONFIG.elements[key]);
            });
            return this.validateDOM();
        },
        
        validateDOM: function() {
            const required = ['cityInput', 'generateBtn', 'resultsDiv'];
            return required.every(id => this.dom[id] !== null);
        }
    };

    // CORE UTILITIES
    const UTILS = {
        // DOM Utilities
        $: id => document.getElementById(id),
        create: (tag, className) => {
            const el = document.createElement(tag);
            if (className) el.className = className;
            return el;
        },
        show: (el, display = 'block') => el && (el.style.display = display),
        hide: el => el && (el.style.display = 'none'),
        
        // Text Processing
        sanitizeText: function(text) {
            if (!text || typeof text !== 'string') return '';
            
            // Remove checkmarks and special symbols
            text = text.replace(/[✓✔✗✘×☑✅❌❎]|&#1000[0-8];/g, '');
            
            // Decode HTML entities
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value.trim();
        },
        
        // Debouncing for search
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Loading States
        setLoading: function(isLoading, button = STATE.dom.generateBtn) {
            if (!button) return;
            
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.innerHTML = `<span class="spinner"></span> ${CONFIG.messages.generating}`;
                button.disabled = true;
            } else {
                button.textContent = button.dataset.originalText || 'Generate Itinerary';
                button.disabled = false;
            }
        },
        
        // Messages and Alerts
        showMessage: function(type, text, duration = 5000) {
            const container = STATE.dom.resultsDiv;
            if (!container) return;
            
            // Clear existing messages
            this.clearMessage();
            
            // Create message element
            const message = this.create('div', `alert alert-${type}`);
            message.innerHTML = `
                <div class="alert-content">
                    <span class="alert-icon">${type === 'success' ? '✓' : '!'}</span>
                    <span class="alert-text">${text}</span>
                </div>
            `;
            
            // Add to container
            container.prepend(message);
            
            // Auto-remove if duration specified
            if (duration > 0) {
                setTimeout(() => message.remove(), duration);
            }
            
            return message;
        },
        
        clearMessage: function() {
            const container = STATE.dom.resultsDiv;
            if (!container) return;
            
            const existing = container.querySelector('.alert');
            if (existing) existing.remove();
        },
        
        // Storage with fallback
        storage: {
            set: function(key, value) {
                try {
                    if (CONFIG.settings.enableOffline) {
                        localStorage.setItem(`yatrat_${key}`, JSON.stringify({
                            data: value,
                            timestamp: Date.now()
                        }));
                    }
                } catch (e) {
                    console.warn('Storage full or not available');
                }
            },
            
            get: function(key, maxAge = CONFIG.settings.cacheDuration) {
                try {
                    if (!CONFIG.settings.enableOffline) return null;
                    
                    const item = localStorage.getItem(`yatrat_${key}`);
                    if (!item) return null;
                    
                    const parsed = JSON.parse(item);
                    const age = Date.now() - parsed.timestamp;
                    
                    if (age > maxAge) {
                        this.remove(key);
                        return null;
                    }
                    
                    return parsed.data;
                } catch (e) {
                    return null;
                }
            },
            
            remove: function(key) {
                try {
                    localStorage.removeItem(`yatrat_${key}`);
                } catch (e) {}
            }
        }
    };

    // DATA MANAGER
    const DATA_MANAGER = {
        // Load all required data
        load: async function() {
            try {
                // Show loading state
                UTILS.showMessage('info', 'Loading travel data...', 2000);
                
                // Try to get from cache first
                const cached = UTILS.storage.get('itinerary_data');
                if (cached && CONFIG.settings.enableOffline) {
                    STATE.allCities = cached.cities || [];
                    STATE.allItineraries = cached.itineraries || {};
                    STATE.isOffline = true;
                    STATE.lastUpdated = cached.timestamp;
                    
                    console.log('Using cached data');
                    return true;
                }
                
                // Fetch fresh data
                const [citiesData, itinerariesData] = await Promise.all([
                    this.fetchData(CONFIG.dataURLs.cities),
                    this.fetchData(CONFIG.dataURLs.itineraries)
                ]);
                
                // Process data
                STATE.allCities = citiesData.cities || [];
                STATE.allItineraries = itinerariesData.cities || {};
                STATE.lastUpdated = Date.now();
                STATE.isOffline = false;
                
                // Cache for offline use
                UTILS.storage.set('itinerary_data', {
                    cities: STATE.allCities,
                    itineraries: STATE.allItineraries,
                    timestamp: STATE.lastUpdated
                });
                
                console.log(`✓ Loaded ${STATE.allCities.length} cities`);
                return true;
                
            } catch (error) {
                console.error('Data load error:', error);
                
                // Try to use any available cached data
                const cached = UTILS.storage.get('itinerary_data', 86400000); // 24 hour max
                if (cached) {
                    STATE.allCities = cached.cities || [];
                    STATE.allItineraries = cached.itineraries || {};
                    STATE.isOffline = true;
                    UTILS.showMessage('warning', CONFIG.messages.offline, 3000);
                    return true;
                }
                
                UTILS.showMessage('error', CONFIG.messages.errorFetch);
                return false;
            }
        },
        
        // Fetch with retry logic
        fetchData: async function(url, retries = 2) {
            for (let i = 0; i <= retries; i++) {
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'max-age=3600'
                        }
                    });
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    return await response.json();
                } catch (error) {
                    if (i === retries) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        },
        
        // Search cities with duplicate prevention
        searchCities: function(searchTerm) {
            if (!searchTerm || searchTerm.length < CONFIG.limits.minSearchChars) {
                return [];
            }
            
            const term = searchTerm.toLowerCase();
            const results = [];
            const seen = new Set();
            
            for (const city of STATE.allCities) {
                if (seen.has(city.name)) continue;
                
                if (city.name.toLowerCase().includes(term) || 
                    city.id.toLowerCase().includes(term)) {
                    seen.add(city.name);
                    results.push(city);
                    
                    if (results.length >= CONFIG.limits.maxSuggestions) {
                        break;
                    }
                }
            }
            
            return results;
        },
        
        // Get itinerary for city
        getItinerary: function(cityId, days) {
            if (!STATE.allItineraries[cityId]) {
                return null;
            }
            
            const itinerary = [];
            const cityData = STATE.allItineraries[cityId];
            
            for (let day = 1; day <= days; day++) {
                const dayPlans = cityData.plans?.[day.toString()] || [];
                dayPlans.forEach(activity => {
                    itinerary.push({
                        day: day,
                        activity: UTILS.sanitizeText(activity)
                    });
                });
            }
            
            return itinerary.length > 0 ? itinerary : null;
        }
    };

    // UI MANAGER
    const UI_MANAGER = {
        // Initialize UI
        init: function() {
            this.setupEventListeners();
            this.setupDaysDropdown();
            this.checkOfflineStatus();
        },
        
        // Setup event listeners
        setupEventListeners: function() {
            const { cityInput, suggestionsBox, generateBtn } = STATE.dom;
            
            if (!cityInput || !generateBtn) return;
            
            // City search with debounce
            cityInput.addEventListener('input', UTILS.debounce(() => {
                this.handleCitySearch();
            }, CONFIG.settings.debounceDelay));
            
            // Generate button
            generateBtn.addEventListener('click', () => this.generateItinerary());
            
            // Enter key support
            cityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.generateItinerary();
            });
            
            // Click outside to close suggestions
            document.addEventListener('click', (e) => {
                if (!suggestionsBox.contains(e.target) && e.target !== cityInput) {
                    UTILS.hide(suggestionsBox);
                }
            });
            
            // Escape key to close suggestions
            cityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') UTILS.hide(suggestionsBox);
            });
        },
        
        // Setup days dropdown
        setupDaysDropdown: function() {
            const daysSelect = STATE.dom.daysSelect;
            if (!daysSelect) return;
            
            daysSelect.innerHTML = '';
            for (let i = 1; i <= CONFIG.limits.maxDays; i++) {
                const option = UTILS.create('option');
                option.value = i;
                option.textContent = `${i} Day${i > 1 ? 's' : ''}`;
                daysSelect.appendChild(option);
            }
            
            daysSelect.value = 3; // Default to 3 days
            STATE.currentDays = 3;
            
            // Update state when changed
            daysSelect.addEventListener('change', (e) => {
                STATE.currentDays = parseInt(e.target.value);
            });
        },
        
        // Handle city search
        handleCitySearch: function() {
            const cityInput = STATE.dom.cityInput;
            const suggestionsBox = STATE.dom.suggestionsBox;
            
            if (!cityInput || !suggestionsBox) return;
            
            const searchTerm = cityInput.value.trim();
            
            // Clear suggestions if search is too short
            if (searchTerm.length < CONFIG.limits.minSearchChars) {
                UTILS.hide(suggestionsBox);
                return;
            }
            
            // Search for cities
            const results = DATA_MANAGER.searchCities(searchTerm);
            
            // Display results
            if (results.length > 0) {
                this.displaySuggestions(results);
                UTILS.show(suggestionsBox);
            } else {
                suggestionsBox.innerHTML = '<div class="no-results">No cities found</div>';
                UTILS.show(suggestionsBox);
            }
        },
        
        // Display city suggestions
        displaySuggestions: function(cities) {
            const suggestionsBox = STATE.dom.suggestionsBox;
            if (!suggestionsBox) return;
            
            suggestionsBox.innerHTML = '';
            
            cities.forEach(city => {
                const suggestion = UTILS.create('div', 'city-suggestion');
                suggestion.innerHTML = `
                    <div class="suggestion-content">
                        <strong>${city.name}</strong>
                        <small>${city.country || ''}</small>
                    </div>
                `;
                
                suggestion.addEventListener('click', () => {
                    STATE.dom.cityInput.value = city.name;
                    STATE.dom.cityInput.dataset.cityId = city.id;
                    STATE.currentCity = city;
                    UTILS.hide(suggestionsBox);
                });
                
                suggestionsBox.appendChild(suggestion);
            });
        },
        
        // Generate itinerary
        generateItinerary: async function() {
            if (STATE.isGenerating) return;
            
            const cityInput = STATE.dom.cityInput;
            const resultsDiv = STATE.dom.resultsDiv;
            
            if (!cityInput || !resultsDiv) return;
            
            // Get inputs
            const cityName = cityInput.value.trim();
            const cityId = cityInput.dataset.cityId || cityName.toLowerCase().replace(/\s+/g, '-');
            const days = STATE.currentDays;
            
            // Validation
            if (!cityName) {
                UTILS.showMessage('error', CONFIG.messages.noCity);
                return;
            }
            
            if (!days || days < 1 || days > CONFIG.limits.maxDays) {
                UTILS.showMessage('error', CONFIG.messages.invalidDays);
                return;
            }
            
            // Set generating state
            STATE.isGenerating = true;
            UTILS.setLoading(true);
            UTILS.clearMessage();
            
            try {
                // Get itinerary
                const itinerary = DATA_MANAGER.getItinerary(cityId, days);
                
                if (!itinerary) {
                    UTILS.showMessage('error', CONFIG.messages.noResults);
                    return;
                }
                
                // Display results
                this.displayItinerary(cityName, days, itinerary);
                
                // Log success
                if (CONFIG.settings.enableAnalytics) {
                    console.log(`Generated ${days}-day itinerary for ${cityName}`);
                }
                
            } catch (error) {
                console.error('Generation error:', error);
                UTILS.showMessage('error', `${CONFIG.messages.errorFetch}. ${CONFIG.messages.tryAgain}`);
            } finally {
                STATE.isGenerating = false;
                UTILS.setLoading(false);
            }
        },
        
        // Display itinerary results
        displayItinerary: function(cityName, days, itinerary) {
            const resultsDiv = STATE.dom.resultsDiv;
            if (!resultsDiv) return;
            
            // Group by day
            const daysMap = {};
            itinerary.forEach(item => {
                if (!daysMap[item.day]) {
                    daysMap[item.day] = [];
                }
                daysMap[item.day].push(item.activity);
            });
            
            // Create HTML
            let html = `
                <div class="itinerary-header">
                    <h2><span class="icon">✈️</span> ${days}-Day ${cityName} Itinerary</h2>
                    <div class="header-info">
                        <span class="days">${days} days</span>
                        <span class="activities">${itinerary.length} activities</span>
                        ${STATE.isOffline ? '<span class="offline-badge">Offline</span>' : ''}
                    </div>
                </div>
            `;
            
            // Add each day
            for (let day = 1; day <= days; day++) {
                const activities = daysMap[day] || [];
                
                html += `
                    <div class="day-card">
                        <div class="day-header">
                            <h3>Day ${day}</h3>
                            <span class="activity-count">${activities.length} activities</span>
                        </div>
                        
                        ${activities.length > 0 ? `
                            <div class="day-activities">
                                <ol class="activity-list">
                                    ${activities.map((activity, index) => `
                                        <li class="activity-item">
                                            <span class="activity-number">${index + 1}</span>
                                            <span class="activity-text">${activity}</span>
                                        </li>
                                    `).join('')}
                                </ol>
                            </div>
                        ` : `
                            <div class="free-day">
                                <p>Free day for exploration, shopping, or relaxation</p>
                            </div>
                        `}
                    </div>
                `;
            }
            
            // Add footer
            html += `
                <div class="itinerary-footer">
                    <div class="tips">
                        <h4><span class="icon">💡</span> Travel Tips</h4>
                        <ul>
                            <li>Customize this itinerary based on your interests</li>
                            <li>Check local COVID-19 guidelines before traveling</li>
                            <li>Book accommodations in advance during peak seasons</li>
                            ${days > Object.keys(daysMap).length ? 
                                `<li>Use free days for spontaneous exploration</li>` : ''}
                        </ul>
                    </div>
                    <div class="actions">
                        <button class="btn-print" onclick="window.print()">
                            <span class="icon">🖨️</span> Print Itinerary
                        </button>
                        <button class="btn-save" onclick="YATRAT_TOOL.saveItinerary()">
                            <span class="icon">💾</span> Save
                        </button>
                    </div>
                </div>
            `;
            
            resultsDiv.innerHTML = html;
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        },
        
        // Check offline status
        checkOfflineStatus: function() {
            STATE.isOffline = !navigator.onLine;
            if (STATE.isOffline) {
                UTILS.showMessage('info', 'Working in offline mode', 3000);
            }
        }
    };

    // MAIN APPLICATION
    const YATRAT_ITINERARY_TOOL = {
        // Initialize the tool
        init: async function() {
            console.log('🚀 Yatrat Itinerary Tool v3.0');
            
            // Initialize state
            if (!STATE.init()) {
                console.error('Required DOM elements not found');
                return;
            }
            
            // Setup UI
            UI_MANAGER.init();
            
            // Load data
            await DATA_MANAGER.load();
            
            // Set up offline detection
            window.addEventListener('online', () => {
                STATE.isOffline = false;
                UTILS.showMessage('success', 'Back online!', 2000);
            });
            
            window.addEventListener('offline', () => {
                STATE.isOffline = true;
                UTILS.showMessage('warning', 'Working offline', 3000);
            });
            
            console.log('✓ Tool initialized successfully');
        },
        
        // Public API Methods
        generate: function(cityName, days = 3) {
            if (!cityName) return false;
            
            STATE.dom.cityInput.value = cityName;
            STATE.dom.daysSelect.value = days;
            STATE.currentDays = days;
            
            return UI_MANAGER.generateItinerary();
        },
        
        refreshData: async function() {
            UTILS.storage.remove('itinerary_data');
            return await DATA_MANAGER.load();
        },
        
        getStats: function() {
            return {
                cities: STATE.allCities.length,
                itineraries: Object.keys(STATE.allItineraries).length,
                lastUpdated: STATE.lastUpdated,
                isOffline: STATE.isOffline
            };
        },
        
        saveItinerary: function() {
            const resultsDiv = STATE.dom.resultsDiv;
            if (!resultsDiv) return;
            
            const itineraryText = resultsDiv.textContent;
            const blob = new Blob([itineraryText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `itinerary-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            UTILS.showMessage('success', 'Itinerary saved!', 2000);
        },
        
        clearCache: function() {
            UTILS.storage.remove('itinerary_data');
            UTILS.showMessage('success', 'Cache cleared', 2000);
        }
    };

    // GLOBAL EXPORT
    window.YATRAT_TOOL = YATRAT_ITINERARY_TOOL;

    // AUTO-INITIALIZE
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            YATRAT_ITINERARY_TOOL.init();
        });
    } else {
        YATRAT_ITINERARY_TOOL.init();
    }

})();
