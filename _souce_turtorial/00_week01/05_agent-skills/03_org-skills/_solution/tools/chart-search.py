# วาดกราฟผลค้น skill ของ LAB 7 จาก score.json และ compare-result.json
import json,matplotlib,sys
matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.family']='Leelawadee UI'
SE=sys.argv[1]; IMG=sys.argv[2]
sc=json.load(open(SE+'/score.json',encoding='utf-8')); cp=json.load(open(SE+'/compare-result.json',encoding='utf-8'))['queries-heldout.json']
C1,C5='#2f6fb3','#9cc3e6'
def bars(ax,labels,h1,h5,w=0.36):
    x=range(len(labels))
    a=ax.bar([i-w/2 for i in x],h1,w,color=C1,label='hit@1'); b=ax.bar([i+w/2 for i in x],h5,w,color=C5,label='hit@5')
    for r in list(a)+list(b): ax.text(r.get_x()+r.get_width()/2,r.get_height()+1,f'{r.get_height():g}',ha='center',fontsize=11)
    ax.set_xticks(list(x)); ax.set_xticklabels(labels,fontsize=11); ax.set_ylim(0,112); ax.set_ylabel('% ของคำค้น')
    for s in ['top','right']: ax.spines[s].set_visible(False)
    ax.legend(frameon=False,loc='upper right',ncol=2)
fig,ax=plt.subplots(figsize=(10,5),dpi=120)
s=sc['seen'];h=sc['heldout']
bars(ax,['เคยเห็น\nหัวไฟล์อย่างเดียว','เคยเห็น\nหัวไฟล์ + สรุป','ใหม่\nหัวไฟล์อย่างเดียว','ใหม่\nหัวไฟล์ + สรุป'],[s['A']['hit1'],s['B']['hit1'],h['A']['hit1'],h['B']['hit1']],[s['A']['hit5'],s['B']['hit5'],h['A']['hit5'],h['B']['hit5']])
ax.set_title('LAB 7 (ผลจริง): คำค้นที่เคยเห็นคะแนนสูงเกินจริง · BM25 บนการ์ด 28 ใบ',fontsize=14,pad=14)
plt.tight_layout(); plt.savefig(IMG+'/lab7-search.png'); plt.close()
fig,ax=plt.subplots(figsize=(11,5.2),dpi=120)
order=['BM25','Embedding','Hybrid','Hybrid + Reranker','LLM (Claude)']
bars(ax,['BM25','Embedding','Hybrid','Hybrid +\nReranker','Claude อ่าน\nการ์ดครบ'],[cp[m]['hit1'] for m in order],[cp[m]['hit5'] for m in order])
ax.set_title(f"LAB 7 (ผลจริง): เทียบ 5 วิธี · คำค้นของพนักงาน {cp['BM25']['n']} ข้อ · การ์ด 28 ใบ",fontsize=14,pad=14)
plt.tight_layout(); plt.savefig(IMG+'/lab7-search-compare.png')
print(sc['seen'],[(m,cp[m]['hit1'],cp[m]['hit5']) for m in order])
