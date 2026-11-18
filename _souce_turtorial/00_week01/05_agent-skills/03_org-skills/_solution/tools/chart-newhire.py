import json,matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.family']='Leelawadee UI'
R='C:/Users/oishi/Documents/GitHub/CWN/Teaching/00_week01/05_agent-skills/03_org-skills/'
sc=json.load(open('C:/t/rr/nh/judge/score.json',encoding='utf-8'))
L=['1 โครงโฟลเดอร์','2 การตั้งชื่อ','3 TypeScript strict + Zod','4 error แบบมีชนิด','5 ความลับใน .env','6 test ทุกโมดูล','7 migration','8 log กลาง','9 token 15 นาที + หมุน','10 รูปแบบ API','11 แก้บั๊ก token กลางการจ่ายเงิน','12 webhook กันรับซ้ำ']
fig,ax=plt.subplots(figsize=(10,6.5),dpi=120)
for col,k in enumerate(['A','B']):
    for i in range(12):
        ok=sc[k][str(i+1)]['pass']
        ax.add_patch(plt.Rectangle((col*1.08,i),1,0.88,color='#2e9d5b' if ok else '#e4572e'))
        ax.text(col*1.08+0.5,i+0.44,'ผ่าน' if ok else 'ไม่ผ่าน',ha='center',va='center',color='white',fontsize=11)
na=sum(v['pass'] for v in sc['A'].values()); nb=sum(v['pass'] for v in sc['B'].values())
ax.text(0.5,-0.15,f'ไม่มีแพ็ก\n{na}/12',ha='center',va='bottom',fontsize=13)
ax.text(1.58,-0.15,f'มีแพ็ก core + dev\n{nb}/12',ha='center',va='bottom',fontsize=13)
ax.set_xlim(0,2.08); ax.set_ylim(12,-1.2); ax.set_xticks([])
ax.set_yticks([i+0.44 for i in range(12)]); ax.set_yticklabels(L,fontsize=11)
for s in ax.spines.values(): s.set_visible(False)
ax.tick_params(length=0)
fig.suptitle('LAB 3 (ผลจริง): Dev คนใหม่วันแรก พรอมต์เดียวกัน ต่างกันแค่ติดตั้งแพ็กไหม',fontsize=14)
fig.text(0.5,0.015,'ตรวจแบบไม่รู้ว่าฉบับไหนเป็นฉบับไหน เทียบกับ coding-rules.md 10 ข้อ + โน้ตโปรเจกต์ของ dev-mew 2 ข้อ',ha='center',fontsize=10,color='#555')
plt.tight_layout(rect=(0,0.04,1,0.96)); plt.savefig(R+'img/lab3-newhire.png')
print(na,nb)
