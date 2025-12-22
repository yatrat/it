const cityInput=document.getElementById('cityInput'),
      cityList=document.getElementById('cityList'),
      daysSelect=document.getElementById('daysSelect'),
      generateBtn=document.getElementById('generateBtn'),
      itineraryResults=document.getElementById('itineraryResults'),
      GITHUB_USER='yatrat',
      GITHUB_REPO='it',
      GITHUB_BRANCH='main',
      CITY_LIST_URL=`https://cdn.jsdelivr.net/gh/yatrat/it@2.3/data/citylist.json`,
      ITINERARY_DATA_URL=`https://cdn.jsdelivr.net/gh/yatrat/it@v2.3/data/itinerary-data.json`;

document.addEventListener('DOMContentLoaded',()=>{
    console.log('Travel Itinerary Tool Loaded');
    initializeAutocomplete();
    generateBtn&&generateBtn.addEventListener('click',generateItinerary);
    cityInput&&cityInput.addEventListener('keypress',e=>{
        if(e.key==='Enter') generateItinerary();
    });
});

async function initializeAutocomplete(){
    if(!cityInput||!cityList) return;
    try{
        const res=await fetch(CITY_LIST_URL),
              data=await res.json(),
              cities=data.cities||[];
        
        cityInput.addEventListener('input',function(){
            const term=this.value.trim().toLowerCase();
            cityList.innerHTML='';
            if(term.length===0){
                cityList.style.display='none';
                return;
            }
            const matches=cities.filter(c=>c.name.toLowerCase().includes(term)).slice(0,8);
            if(matches.length>0){
                matches.forEach(city=>{
                    const div=document.createElement('div');
                    div.className='yt-suggestion';
                    div.innerHTML=`<span class="suggestion-name">${city.name}</span><span class="suggestion-id">${city.id}</span>`;
                    div.addEventListener('click',()=>{
                        cityInput.value=city.name;
                        cityInput.dataset.cityId=city.id;
                        cityList.innerHTML='';
                        cityList.style.display='none';
                    });
                    cityList.appendChild(div);
                });
                cityList.style.display='block';
            }
        });
        
        document.addEventListener('click',e=>{
            if(!cityList.contains(e.target)&&e.target!==cityInput){
                cityList.style.display='none';
            }
        });
    }catch(e){
        console.error('Failed to load city list:',e);
    }
}

async function loadItineraryData(){
    try{
        const res=await fetch(ITINERARY_DATA_URL);
        return await res.json();
    }catch(e){
        console.error('Failed to load itinerary data:',e);
        return{cities:{}};
    }
}

async function generateItinerary(){
    if(!cityInput||!daysSelect||!itineraryResults) return;
    
    const cityName=cityInput.value.trim(),
          cityId=cityInput.dataset.cityId||cityName.toLowerCase(),
          selectedDays=parseInt(daysSelect.value);
    
    if(!cityName||!selectedDays){
        showMessage('Please select both city and number of days','error');
        return;
    }
    
    if(generateBtn){
        generateBtn.innerHTML='Loading...';
        generateBtn.disabled=true;
    }
    
    try{
        const data=await loadItineraryData();
        if(!data.cities||!data.cities[cityId]){
            showMessage(`Itinerary not available for ${cityName}`,'error');
            return;
        }
        
        const cityData=data.cities[cityId],
              allActivities=[];
        
        for(let day=1;day<=selectedDays;day++){
            const dayPlan=cityData.plans[day.toString()];
            if(dayPlan&&Array.isArray(dayPlan)){
                dayPlan.forEach(activity=>{
                    allActivities.push({day:day,activity:activity});
                });
            }
        }
        
        if(allActivities.length===0){
            showMessage(`${selectedDays}-day itinerary not available for ${cityName}`,'error');
            return;
        }
        
        displayItinerary(cityName,selectedDays,allActivities);
        
    }catch(e){
        console.error('Error:',e);
        showMessage('Failed to generate itinerary','error');
    }finally{
        if(generateBtn){
            generateBtn.innerHTML='Generate Itinerary';
            generateBtn.disabled=false;
        }
    }
}

function displayItinerary(cityName,selectedDays,allActivities){
    if(!itineraryResults) return;
    
    itineraryResults.innerHTML='';
    
    const header=document.createElement('div');
    header.className='itinerary-header';
    header.innerHTML=`<h3>${selectedDays}-Day Itinerary for ${cityName}</h3><p>${allActivities.length} activities across ${selectedDays} days</p>`;
    itineraryResults.appendChild(header);
    
    const activitiesByDay={};
    allActivities.forEach(item=>{
        (activitiesByDay[item.day]||(activitiesByDay[item.day]=[])).push(item.activity);
    });
    
    for(let day=1;day<=selectedDays;day++){
        if(activitiesByDay[day]){
            const dayCard=document.createElement('div');
            dayCard.className='itinerary-day';
            dayCard.innerHTML=`<div class="day-header"><span class="day-number">Day ${day}</span><span class="day-duration">${activitiesByDay[day].length} activities</span></div><ul class="day-activities">${activitiesByDay[day].map(a=>`<li>${a}</li>`).join('')}</ul>`;
            itineraryResults.appendChild(dayCard);
        }
    }
    
    const daysWithData=Object.keys(activitiesByDay).length;
    if(selectedDays>daysWithData){
        const missingDays=selectedDays-daysWithData,
              warning=document.createElement('div');
        warning.className='itinerary-warning';
        warning.innerHTML=`<p><strong>Travel Tip:</strong> Detailed itinerary available for ${daysWithData} days. You can use the remaining ${missingDays} day(s) for free exploration or relaxation.</p>`;
        itineraryResults.appendChild(warning);
    }
}

function showMessage(text,type='error'){
    itineraryResults&&(itineraryResults.innerHTML=`<div class="message ${type}">${text}</div>`);
}
