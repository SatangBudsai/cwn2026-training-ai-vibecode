const U='http://localhost:3000/api/bookings';
const mk=(time,t,i)=>{const b={serviceId:'S01',partySize:1,date:'2026-07-03',time,guest:{name:'ซีวัน เรซ'+i,phone:'0891000002'},expectedPayAtShop:1000};if(t)b.therapistId=t;return fetch(U,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(async r=>{const j=await r.json();return r.status+' '+(j.error?j.error.code:j.booking.bookingCode+' '+j.booking.therapists.map(x=>x.id))})};
console.log('T01 ซ้ำ 5 พร้อมกัน 11:00',await Promise.all([0,1,2,3,4].map(i=>mk('11:00','T01',i))));
console.log('ใครก็ได้ 8 พร้อมกัน 16:00',await Promise.all([0,1,2,3,4,5,6,7].map(i=>mk('16:00',null,i))));
