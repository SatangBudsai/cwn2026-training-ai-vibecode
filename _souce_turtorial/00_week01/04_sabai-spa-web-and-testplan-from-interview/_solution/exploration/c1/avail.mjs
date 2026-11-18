const B='http://localhost:3000/api/availability?';
const qs=process.argv.slice(2);
for(const q of qs){
  const r=await fetch(B+q); const j=await r.json();
  if(!r.ok){console.log(q,r.status,JSON.stringify(j));continue;}
  const keys=Object.keys(j).filter(k=>k!=='therapists');
  const s=j.slots||[];
  const fmt=s.map(x=>typeof x==='string'?x:(x.time||x.start||JSON.stringify(x))+(x.available===false?'x':'')+(x.therapistIds?'['+x.therapistIds.join(',').replace(/T0/g,'')+']':''));
  console.log(q,r.status,'keys',keys.join(','),'therapists',(j.therapists||[]).map(t=>t.id).join(','),'n',s.length,'first',JSON.stringify(s[0]));
  console.log('  ',fmt.join(' '));
}
