!function(){
'use strict';
const C={
    urls:{
        cities:'https://cdn.jsdelivr.net/gh/yatrat/it@v3.5/data/citylist.json',
        itineraries:'https://cdn.jsdelivr.net/gh/yatrat/it@v3.5/data/itinerary-data.json'
    },
    selectors:{
        cityInput:'cityInput',cityList:'cityList',daysSelect:'daysSelect',
        generateBtn:'generateBtn',results:'itineraryResults'
    },
    limits:{maxSuggestions:8,maxDays:4},
    cache:{ttl:3e5} 
};

let S={
    cities:[],itineraries:{},lastFetch:0,
    elems:{},initialized:!1
};

const U={
    el:id=>document.getElementById(id),
    decode:txt=>{
        if(!txt)return'';
        const e=document.createElement('textarea');
        return e.innerHTML=txt.replace(/&amp;/g,'&'),e.value;
    },
    debounce:(f,w)=>{
        let t;return function(...a){
            clearTimeout(t),t=setTimeout(()=>f(...a),w);
        };
    },
    loading:(b,t='Loading...')=>{
        if(b){
            b.dataset.original=b.innerHTML;
            b.innerHTML=`<span class="loading-spinner"></span> ${t}`;
            b.disabled=!0;
        }
    },
    loaded:(b,d='Generate Plan')=>{
        if(b){
            b.innerHTML=b.dataset.original||d;
            b.disabled=!1;
        }
    },
    msg:(c,t,type='error')=>{
        if(!c)return;
        c.innerHTML=`<div class="message message-${type}">${t}</div>`;
    },
    clearMsg:c=>{
        const m=c?.querySelector('.message');
        m&&m.remove();
    }
};

const M={
    init(){
        try{
            S.elems={
                cityInput:U.el(C.selectors.cityInput),
                cityList:U.el(C.selectors.cityList),
                daysSelect:U.el(C.selectors.daysSelect),
                generateBtn:U.el(C.selectors.generateBtn),
                results:U.el(C.selectors.results)
            };
            
            if(!this.validateElems())return;
            
            this.setupEvents();
            
            this.loadData();
            
            S.initialized=!0;
            console.log('✓ Itinerary Tool Ready');
            
        }catch(e){
            console.error('Init error:',e);
            this.showError('Tool initialization failed');
        }
    },
    
    validateElems(){
        const r=['cityInput','daysSelect','generateBtn','results'];
        return r.every(k=>S.elems[k]);
    },
    
    setupEvents(){
        const I=S.elems.cityInput,L=S.elems.cityList,B=S.elems.generateBtn;
        
        I.addEventListener('input',U.debounce(()=>this.handleInput(),300));
        
        B.addEventListener('click',()=>this.generate());
        
        I.addEventListener('keypress',e=>{
            if(e.key==='Enter')this.generate();
        });
        
        document.addEventListener('click',e=>{
            if(!L.contains(e.target)&&e.target!==I){
                L.style.display='none';
            }
        });
        
        I.addEventListener('keydown',e=>{
            if(e.key==='Escape')L.style.display='none';
        });
    },
    
    async loadData(){
        try{
            const[citiesRes,itinerariesRes]=await Promise.all([
                this.fetchData(C.urls.cities),
                this.fetchData(C.urls.itineraries)
            ]);
            
            S.cities=citiesRes.cities||[];
            S.itineraries=itinerariesRes.cities||{};
            S.lastFetch=Date.now();
            
            console.log(`Loaded ${S.cities.length} cities, ${Object.keys(S.itineraries).length} itineraries`);
            
        }catch(e){
            console.error('Data load error:',e);
        }
    },
    
    async fetchData(url){
        if(Date.now()-S.lastFetch<C.cache.ttl){
            const key=`cache_${btoa(url)}`;
            const cached=sessionStorage.getItem(key);
            if(cached){
                try{return JSON.parse(cached);}
                catch(e){/* Cache corrupt */}
            }
        }
        
        const res=await fetch(url);
        if(!res.ok)throw new Error(`HTTP ${res.status}`);
        
        const data=await res.json();
        
        try{
            sessionStorage.setItem(`cache_${btoa(url)}`,JSON.stringify(data));
        }catch(e){}
        return data;
    },
    
    handleInput(){
        const I=S.elems.cityInput,L=S.elems.cityList;
        const term=I.value.trim().toLowerCase();
        L.innerHTML='';
        
        if(!term||term.length<2){
            L.style.display='none';
            return;
        }
        
        const matches=[];
        const seen=new Set();
        
        S.cities.forEach(city=>{
            const name=city.name.toLowerCase();
            if(name.includes(term)&&!seen.has(name)){
                seen.add(name);
                matches.push(city);
            }
        });
        
        if(matches.length){
            this.showSuggestions(matches.slice(0,C.limits.maxSuggestions));
            L.style.display='block';
        }else{
            L.innerHTML='<div class="yt-suggestion">No cities found</div>';
            L.style.display='block';
        }
    },
    
    showSuggestions(cities){
        const L=S.elems.cityList;
        L.innerHTML='';
        
        cities.forEach(city=>{
            const div=document.createElement('div');
            div.className='yt-suggestion';
            div.innerHTML=`<span>${city.name}</span><small>${city.id}</small>`;
            
            div.addEventListener('click',()=>{
                S.elems.cityInput.value=city.name;
                S.elems.cityInput.dataset.cityId=city.id;
                L.style.display='none';
            });
            
            L.appendChild(div);
        });
    },
    
    async generate(){
        U.clearMsg(S.elems.results);
        
        const I=S.elems.cityInput,D=S.elems.daysSelect,R=S.elems.results;
        const cityName=I.value.trim();
        const cityId=I.dataset.cityId||cityName.toLowerCase();
        const days=parseInt(D.value);
        
        
        if(!cityName||!days){
            U.msg(R,'Please select city and days','error');
            return;
        }
        
        if(days<1||days>C.limits.maxDays){
            U.msg(R,`Please select 1-${C.limits.maxDays} days`,'error');
            return;
        }
        
        U.loading(S.elems.generateBtn);
        
        try{
            if(Date.now()-S.lastFetch>C.cache.ttl){
                await this.loadData();
            }
            
            const cityData=S.itineraries[cityId];
            if(!cityData){
                throw new Error(`No itinerary for "${cityName}"`);
            }
            
            const activities=[];
            for(let day=1;day<=days;day++){
                const plan=cityData.plans?.[day.toString()];
                if(plan&&Array.isArray(plan)){
                    plan.forEach(act=>{
                        activities.push({
                            day:day,
                            activity:U.decode(act)
                        });
                    });
                }
            }
            
            if(activities.length===0){
                throw new Error(`No ${days}-day plan available`);
            }
            
            
            this.displayResult(cityName,days,activities);
            
        }catch(e){
            console.error('Generate error:',e);
            U.msg(R,'Failed to generate. Please try again.','error');
        }finally{
            U.loaded(S.elems.generateBtn);
        }
    },
    
    displayResult(cityName,days,activities){
        const R=S.elems.results;
        R.innerHTML='';
        
        const header=document.createElement('div');
        header.className='itinerary-header';
        header.innerHTML=`
            <h3>${days}-Day Itinerary for ${cityName}</h3>
            <p>${activities.length} activities across ${days} days</p>
        `;
        R.appendChild(header);
        
        const byDay={};
        activities.forEach(item=>{
            (byDay[item.day]||(byDay[item.day]=[])).push(item.activity);
        });
        
        for(let day=1;day<=days;day++){
            if(byDay[day]){
                const card=document.createElement('div');
                card.className='itinerary-day';
                card.innerHTML=`
                    <div class="day-header">
                        <span class="day-number">Day ${day}</span>
                        <span class="day-duration">${byDay[day].length} activities</span>
                    </div>
                    <ul class="day-activities">
                        ${byDay[day].map(a=>`<li>${a}</li>`).join('')}
                    </ul>
                `;
                R.appendChild(card);
            }
        }
        
        const daysWithData=Object.keys(byDay).length;
        if(days>daysWithData){
            const footer=document.createElement('div');
            footer.className='itinerary-footer';
            footer.innerHTML=`
                <p><strong>Tip:</strong> Use remaining ${days-daysWithData} day(s) for free exploration.</p>
            `;
            R.appendChild(footer);
        }
        
        R.scrollIntoView({behavior:'smooth',block:'start'});
    },
    
    showError(msg){
        U.msg(S.elems.results,msg,'error');
    }
};

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>M.init());
}else{
    M.init();
}


window.YatratItinerary={
    refresh:()=>M.loadData(),
    version:'2.0'
};

}();
