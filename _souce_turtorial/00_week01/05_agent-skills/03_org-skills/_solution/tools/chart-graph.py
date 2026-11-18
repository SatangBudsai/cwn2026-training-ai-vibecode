import json,glob,re,os,networkx as nx,matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.family']='Leelawadee UI'
IMG=r'C:/Users/oishi/Documents/GitHub/CWN/Teaching/00_week01/05_agent-skills/03_org-skills/img'
team={p['user']:p['team'] for p in json.load(open('novatech/seed/people.json',encoding='utf-8'))['people']}
pal={'exec':'#8e5ea2','sales':'#e4572e','sa':'#f2a541','dev':'#2f6fb3','qa':'#29a3a3','devops':'#4c9a2a','mlops':'#a05195','hr':'#d45087','finance':'#665191','platform':'#555555','core':'#222222','shared':'#999999','product':'#c2410c'}
def lst(v):
    v=(v or '').strip()
    if v.startswith('['): return [x.strip() for x in v[1:-1].split(',') if x.strip()]
    return [v] if v and v!='—' else []
# Day 1: personal skills, edges only where named skill exists in someone else's desk
G1=nx.DiGraph(); own1={}
files=glob.glob('C:/Users/oishi/Documents/GitHub/CWN/Teaching/00_week01/05_agent-skills/03_org-skills/_solution/desks-after-lab1/*/skills/*/SKILL.md')
meta={}
for f in files:
    t=open(f,encoding='utf-8').read(); fm=t.split('---')[1]
    g=lambda k:(re.search(rf'^\s*{k}:\s*(.*)$',fm,re.M) or [None,''])[1]
    n=g('name').strip(); u=f.replace(os.sep,'/').split('/')[-4]
    meta[n]=(u,lst(g('uses'))); own1[n]=team[u]
for n,(u,uses) in meta.items():
    G1.add_node(n)
# Day1 = no shared library: nobody can actually call another person's personal skill -> no working edges
# Today: edges from central headers
c=json.load(open('lab7/cards-header.json',encoding='utf-8'))
G2=nx.DiGraph(); col2={}
for s in c:
    n=s['name']; G2.add_node(n); col2[n]=s['plugin']
for s in c:
    m=s.get('metadata',{})
    for k,style in [('uses','uses'),('next','next'),('follows','follows')]:
        for t in lst(m.get(k)) if isinstance(m.get(k),str) else (m.get(k) or []):
            t=t.split(':')[-1]
            if t in G2: G2.add_edge(s['name'],t,kind=style)
fig,axs=plt.subplots(1,2,figsize=(16,8),dpi=110)
pos1=nx.circular_layout(G1)
nx.draw_networkx_nodes(G1,pos1,ax=axs[0],node_color=[pal.get(own1[n],'#888') for n in G1],node_size=420)
nx.draw_networkx_labels(G1,{k:(v[0],v[1]-0.09) for k,v in pos1.items()},ax=axs[0],font_size=8,font_family='Leelawadee UI')
axs[0].set_title(f'LAB 1 · skill ส่วนตัว {G1.number_of_nodes()} ตัว อยู่บนโต๊ะใครโต๊ะมัน\nเรียกใช้กันข้ามโต๊ะไม่ได้ = เส้นเชื่อมที่ใช้งานได้ 0 เส้น',fontsize=12)
pos2=nx.spring_layout(G2,seed=4,k=0.9)
ecol={'uses':'#2f6fb3','next':'#4c9a2a','follows':'#e4572e'}
for kind in ['follows','uses','next']:
    es=[(a,b) for a,b,d in G2.edges(data=True) if d['kind']==kind]
    nx.draw_networkx_edges(G2,pos2,edgelist=es,ax=axs[1],edge_color=ecol[kind],alpha=0.5 if kind=='follows' else 0.85,arrows=True,arrowsize=9,width=1.1,node_size=500)
deg=dict(G2.in_degree())
nx.draw_networkx_nodes(G2,pos2,ax=axs[1],node_color=[pal.get(col2[n],'#888') for n in G2],node_size=[300+120*deg[n] for n in G2])
nx.draw_networkx_labels(G2,{k:(v[0],v[1]-0.07) for k,v in pos2.items()},ax=axs[1],font_size=8,font_family='Leelawadee UI')
cnt={k:sum(1 for _,_,d in G2.edges(data=True) if d['kind']==k) for k in ecol}
axs[1].set_title(f'วันนี้ (หลัง LAB 6) · คลังกลาง {G2.number_of_nodes()} skill เชื่อมกัน {G2.number_of_edges()} เส้น\nfollows {cnt["follows"]} (แดง) · next {cnt["next"]} (เขียว) · uses {cnt["uses"]} (น้ำเงิน) · ขนาดวง = มีกี่ skill ชี้มาหา',fontsize=12)
for a in axs: a.axis('off')
fig.suptitle('องค์กรเก่งขึ้นเป็นกราฟ (ข้อมูลจริงจากหัวไฟล์ skill ของโนวาเทค)',fontsize=15)
plt.tight_layout(rect=(0,0,1,0.95)); plt.savefig(IMG+'/lab7-graph.png')
top=sorted(deg.items(),key=lambda x:-x[1])[:5]; print(G2.number_of_nodes(),G2.number_of_edges(),cnt,top)
