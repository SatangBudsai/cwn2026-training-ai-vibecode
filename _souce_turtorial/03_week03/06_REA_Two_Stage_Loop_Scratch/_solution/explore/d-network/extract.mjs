// Offline extraction only. Does not replay recorded requests.
import fs from 'node:fs/promises';
const har=JSON.parse(await fs.readFile('har/flights.har','utf8'));
const entries=har.log.entries;
const decoded=[];
for(let i=0;i<entries.length;i++){
 const e=entries[i],c=e.response.content;
 let t=c.text||'';if(c.encoding==='base64')t=Buffer.from(t,'base64').toString();
 if(!/GetShoppingResults|GetBookingResults/.test(e.request.url))continue;
 for(const line of t.split('\n')){if(!line.startsWith('[['))continue;try{for(const v of JSON.parse(line))if(v[0]==='wrb.fr'&&v[2]){const a=JSON.parse(v[2]);decoded.push({entry:i,time:e.startedDateTime,url:new URL(e.request.url).pathname,data:a});await fs.writeFile(`data/rpc-${i}.json`,JSON.stringify(a,null,2));}}catch{}}
}
await fs.writeFile('data/rpc-index.json',JSON.stringify(decoded.map(({data,...r})=>r),null,2));
const get=(x,i)=>x?.[i]??null;
const dt=(d,t)=>d?`${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}T${String(t?.[0]||0).padStart(2,'0')}:${String(t?.[1]||0).padStart(2,'0')}:00`:null;
const shopping=decoded.filter(d=>d.url.endsWith('GetShoppingResults')&&Array.isArray(d.data[2]?.[0]));
const best=shopping.reduce((a,b)=>(a?.data[2][0].length+(a?.data[3]?.[0]?.length||0)||0)>(b.data[2][0].length+(b.data[3]?.[0]?.length||0))?a:b,null);
if(!best)throw Error('No successful shopping payload');
const snapshot=await fs.readFile('snapshots/03-more.yml','utf8');
const cards=snapshot.split(/\n      - listitem:/).slice(1).map(t=>({aria:t.match(/- link "([^"\n]*เลือกเที่ยวบิน)"/)?.[1],text:t.split('\n      - listitem:')[0]})).filter(c=>c.aria);
await fs.writeFile('data/03-more-cards.json',JSON.stringify(cards,null,2));
const rows=[...best.data[2][0].map(r=>({r,pop:true})),...(best.data[3]?.[0]||[]).map(r=>({r,pop:false}))];
const flights=rows.map(({r,pop},i)=>{
 const f=r[0],co=f[22],lay=f[13]||[],legs=f[2].map(l=>({departureAirport:{code:l[3],name:l[4]},arrivalAirport:{code:l[6],name:l[5]},departureLocal:dt(l[20],l[8]),arrivalLocal:dt(l[21],l[10]),flightNumber:[...(l[22]||[]).slice(0,2)].join(' '),airlineCode:l[22]?.[0],airlineName:l[22]?.[3]??null,aircraft:l[17]??null,durationMinutes:l[11],co2eGramsRaw:l[31]??null,raw:l}));
 return {id:i+1,popular:pop,observedAt:best.time,sourceHarEntry:best.entry,departureAirport:f[3],arrivalAirport:f[6],departureLocal:dt(f[4],f[5]),arrivalLocal:dt(f[7],f[8]),airlineCodes:f[0],airlineNames:f[1],durationMinutes:f[9],stopCount:Math.max(0,legs.length-1),legs,layovers:lay.map((l,j)=>({durationMinutes:l[0],arrivalAirport:l[1],departureAirport:l[2],arrivalAirportName:legs[j]?.arrivalAirport.name??null,arrivalCity:l[7],departureAirportName:legs[j+1]?.departureAirport.name??null,departureCity:l[5],airportChange:l[1]!==l[2],raw:l})),co2e:{kg:co?.[7]!=null?co[7]/1000:null,comparisonPercent:co?.[3]??null,typicalKg:co?.[8]!=null?co[8]/1000:null,raw:co},price:{amount:r[1]?.[0]?.[1]??null,currency:'THB'},specialLabels:{screenText:cards[i]?.text??null,airportChange:lay.some(l=>l[1]!==l[2]),overnightArrival:dt(f[7],f[8])?.slice(0,10)!==dt(f[4],f[5])?.slice(0,10),unmappedRawFlags:{row:r.slice(2,8),itinerary:f.slice(10,17)}},raw:r};
});
await fs.writeFile('data/flights-all.json',JSON.stringify({observedAt:best.time,count:flights.length,scope:'All itinerary rows returned after more flights, including all legs. Raw arrays retained for unmapped flags.',flights},null,2));
const filters=best.data[7];
await fs.writeFile('data/filters.json',JSON.stringify({observedAt:best.time,sourceHarEntry:best.entry,scope:'unfiltered shopping response after more',priceRange:{min:filters[0][0][1],max:filters[0][1][1],currency:'THB'},airlines:filters[1][1].map(a=>({code:a[0],name:a[1]})),alliances:filters[1][0],layoverAirports:filters[2][0].map(a=>({code:a[0],city:a[1]})),raw:filters},null,2));
const uiCount=Number((await fs.readFile('data/03-more-text.txt','utf8')).match(/มีผลลัพธ์ ([\d,]+) รายการ/)?.[1]?.replaceAll(',',''));
const prices=cards.slice(0,5).map(c=>Number(c.aria.match(/ราคาเริ่มต้นที่ (\d+)/)?.[1]));
const nonstopData=shopping.findLast(d=>d.data[2][0].concat(d.data[3]?.[0]||[]).every(r=>r[0][2].length===1));
const nonstopUi=await fs.readFile('data/05-nonstop-results-text.txt','utf8');
const validation={observedAt:best.time,allCount:{network:flights.length,screen:uiCount,domCards:cards.length,pass:flights.length===uiCount&&cards.length===uiCount},firstFive:{network:flights.slice(0,5).map(f=>f.price.amount),screen:prices,pass:JSON.stringify(prices)===JSON.stringify(flights.slice(0,5).map(f=>f.price.amount))},nonstop:{allLoaded:flights.filter(f=>f.stopCount===0).length,filteredNetwork:nonstopData?nonstopData.data[2][0].length+(nonstopData.data[3]?.[0]?.length||0):null,screen:Number(nonstopUi.match(/มีผลลัพธ์ (\d+) รายการ/)?.[1])}};
validation.nonstop.pass=validation.nonstop.allLoaded===validation.nonstop.screen;validation.nonstop.filteredNetworkBodyAvailable=!!nonstopData;validation.nonstop.note="Compared one-leg itineraries in full response with screen; filtered body absent from HAR.";
await fs.writeFile('data/validation.json',JSON.stringify(validation,null,2));
console.log(JSON.stringify(validation,null,2));
