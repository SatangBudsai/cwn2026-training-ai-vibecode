import json,matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Patch
plt.rcParams['font.family']='Leelawadee UI'
IMG=r'C:/Users/oishi/Documents/GitHub/CWN/Teaching/00_week01/05_agent-skills/03_org-skills/img'
before=json.load(open('logs/lab3-init/summary.json',encoding='utf-8'))
after=json.load(open('logs/lab3-init2/summary.json',encoding='utf-8'))
plugins=['core','shared','exec','sales','sa','dev','qa','devops','mlops','hr','finance']
us=list(after)
fig,ax=plt.subplots(figsize=(11,8.4),dpi=120)
for i,u in enumerate(us):
    have={s.split(':')[0] for s in after[u]}; had={s.split(':')[0] for s in before[u]['plugin']}
    for j,p in enumerate(plugins):
        col='#eceff3'
        if p in have: col='#2e9d5b' if (p in had or p!='core') else '#f2a541'
        ax.add_patch(plt.Rectangle((j,i),0.9,0.84,color=col))
    ax.text(len(plugins)+0.1,i+0.45,f'{len(after[u])} skill',va='center',fontsize=10)
ax.set_xlim(0,len(plugins)+1.2); ax.set_ylim(len(us),0)
ax.set_xticks([j+0.45 for j in range(len(plugins))]); ax.set_xticklabels(plugins,fontsize=10); ax.xaxis.tick_top()
ax.set_yticks([i+0.42 for i in range(len(us))]); ax.set_yticklabels(us,fontsize=10)
for s in ax.spines.values(): s.set_visible(False)
ax.tick_params(length=0)
ax.legend(handles=[Patch(color='#2e9d5b',label='ติดตั้งแล้ว'),Patch(color='#f2a541',label='core ที่ขาด ผู้ดูแลติดตั้งเพิ่มภายหลัง (13 โต๊ะ)'),Patch(color='#eceff3',label='ไม่ได้ติดตั้ง')],loc='lower center',bbox_to_anchor=(0.45,-0.09),ncol=3,frameon=False,fontsize=10)
fig.suptitle('LAB 3 (ผลจริง): แต่ละโต๊ะเห็นแค่ core + แพ็กแผนกตัวเอง ≈ 6 จาก 23 skill',fontsize=13)
plt.tight_layout(rect=(0,0.02,1,0.97)); plt.savefig(IMG+'/lab3-visibility.png')
