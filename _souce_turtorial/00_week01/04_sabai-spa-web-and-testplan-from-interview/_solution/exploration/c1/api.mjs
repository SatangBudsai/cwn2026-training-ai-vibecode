const U='http://localhost:3000/api/';
const P={S01:1000,S02:1400,S04:2000,S06:1500,P01:2900};
async function post(serviceId,date,time,therapistId,extra={},n=1){
  const body={serviceId,partySize:1,date,time,guest:{name:'ทดสอบ ซีวัน',phone:'0891000001'},expectedPayAtShop:P[serviceId],...extra};
  if(therapistId)body.therapistId=therapistId;
  const r=await fetch(U+'bookings',{method:'POST',headers:{'content-type':'application/json','x-locale':'th'},body:JSON.stringify(body)});
  const j=await r.json();
  return `${serviceId} ${date} ${time} ${therapistId||'any'} => ${r.status} ${j.error?j.error.code+' "'+j.error.message+'"':j.booking.bookingCode+' '+j.booking.therapists.map(t=>t.id)+' ฿'+j.booking.lines.payAtShop}`;
}
async function quote(serviceId,date,time){
  const r=await fetch(U+'quote',{method:'POST',headers:{'content-type':'application/json','x-locale':'th'},body:JSON.stringify({serviceId,partySize:1,date,time})});
  const j=await r.json();
  return `quote ${serviceId} ${date} ${time} => ${r.status} ${j.error?j.error.code+' "'+j.error.message+'"':JSON.stringify(j).slice(0,160)}`;
}
const d='2026-07-02';
for(const [s,t] of [['S01','09:30'],['S01','10:15'],['S01','21:30'],['S02','21:00'],['S04','21:00'],['P01','20:30'],['S01','22:00'],['S01','9:00'],['S01','25:00'],['S01','10:00:00']])
  console.log(await post(s,d,t,'T01'));
console.log(await post('S06',d,'10:00','T01'));
console.log(await post('S01',d,'10:00','T99'));
console.log(await post('S01','2026-06-22','14:00','T01'));
for(const a of [['S01','2026-06-15','10:00'],['S01','2026-07-16','10:00'],['S01','2026-06-14','10:00'],['S01','2026-07-02','09:30'],['S01','2026-07-02','10:15']])
  console.log(await quote(...a));
