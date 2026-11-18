export const role=(p,r,n)=>p.getByRole(r,{name:n,exact:typeof n==='string'});
export async function route(p,url){
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await role(p,'combobox',/^เปลี่ยนประเภทตั๋ว/).click();await role(p,'option','เที่ยวเดียว').click();
 await role(p,'combobox','ต้นทาง').click();let d=role(p,'dialog','ป้อนต้นทาง');await d.getByRole('combobox').fill('กรุงเทพ');await role(d,'option','กรุงเทพมหานคร').click();
 await role(p,'combobox','ปลายทาง').click();d=p.getByRole('dialog');await d.getByRole('combobox').first().fill('โตเกียว');await role(d,'option','โตเกียว ญี่ปุ่น').click();
 await role(p,'textbox','ขาไป').click();await role(p,'button',/^วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026/).first().click();await role(p,'button',/^เสร็จ/).click();
 await role(role(p,'search','เที่ยวบิน'),'button','ค้นหา').click();
 await role(p,'heading','ผลการค้นหา').waitFor({timeout:20000});
 await p.getByText('อ๊ะ มีบางอย่างผิดพลาด',{exact:true}).or(role(p,'heading','เที่ยวบินยอดนิยม')).first().waitFor({timeout:20000});
}
