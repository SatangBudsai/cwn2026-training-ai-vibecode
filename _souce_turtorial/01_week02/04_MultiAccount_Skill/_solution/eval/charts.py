"""charts.py <results.json> <โฟลเดอร์ img> : วาดกราฟเทียบไม่ใช้สกิลกับใช้สกิลจากผลจริง"""
import sys, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
for f in fm.findSystemFonts():
    if "Loma" in f or "Sarabun" in f or "Leelawad" in f:
        fm.fontManager.addfont(f)
plt.rcParams["font.family"] = ["Loma", "Leelawadee UI", "Sarabun", "DejaVu Sans"]
R = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
ARM = [("noskill", "ไม่ใช้สกิล", "#2a78d6"), ("skill", "ใช้สกิล", "#ec6835")]
INK, MUTED, GRID, BG = "#1c1c1a", "#5f5e5a", "#e6e5e0", "#fcfcfb"
rows = lambda a: sorted([r for r in R if r["arm"] == a], key=lambda r: r["round"])
avg = lambda xs: sum(xs) / len(xs)
def style(ax, title):
    ax.set_facecolor(BG); ax.set_title(title, loc="left", fontsize=13, color=MUTED, pad=10)
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#b9b8b2"); ax.tick_params(colors=MUTED, length=0, labelsize=12)
    ax.yaxis.grid(True, color=GRID); ax.set_axisbelow(True)
def head(fig, title, sub):
    fig.patch.set_facecolor(BG)
    fig.text(0.02, 0.95, title, fontsize=19, fontweight="bold", color=INK, va="top")
    fig.text(0.02, 0.865, sub, fontsize=12, color=MUTED, va="top")
def pair(ax, get, fmt, title):
    style(ax, title)
    for i, (a, name, c) in enumerate(ARM):
        v = [get(r) for r in rows(a)]
        ax.bar(i, avg(v), width=0.56, color=c, zorder=2)
        ax.scatter([i - 0.1 + 0.2 * k for k in range(len(v))], v, s=46, color="white", edgecolor=INK, linewidth=1.3, zorder=3)
        ax.text(i, max(max(v), avg(v)) * 1.04, fmt(avg(v)), ha="center", va="bottom", fontsize=14, color=INK, fontweight="bold")
    ax.set_xticks([0, 1]); ax.set_xticklabels([n for _, n, _ in ARM]); ax.set_ylim(0, ax.get_ylim()[1] * 1.16)
# 1) ตัวชี้วัดการทำงานเป็นทีม
fig, axs = plt.subplots(1, 4, figsize=(17.6, 6.0), dpi=100)
head(fig, "ใช้สกิลแล้ว app ใช้คำสั่งน้อยลง ล้มน้อยลง และค่าใช้จ่ายถูกลง",
     "แท่ง = ค่าเฉลี่ย 2 รอบ · จุด = ผลแต่ละรอบ · โจทย์ พรอมต์ และข้อมูลชุดเดียวกัน")
pair(axs[0], lambda r: r["wall_s"] / 60, lambda v: "%.1f นาที" % v, "เวลารวม (นาที)")
pair(axs[1], lambda r: r["commands"], lambda v: "%.0f" % v, "คำสั่งของ app")
pair(axs[2], lambda r: r["failed"], lambda v: "%.1f" % v, "คำสั่งที่ล้ม")
pair(axs[3], lambda r: r["cost_usd"], lambda v: "$%.2f" % v, "ค่าใช้จ่ายของ app (USD)")
fig.subplots_adjust(left=0.035, right=0.99, top=0.72, bottom=0.08, wspace=0.22)
fig.savefig(out + "/result-01-team.png"); plt.close(fig)
# 2) ความถูกต้องบนชุดซ่อน
fig, ax = plt.subplots(figsize=(17.6, 5.6), dpi=100)
head(fig, "ทั้งสองวิธีได้คะแนนชุดซ่อนเต็ม 90 ทุกรอบ", "คะแนนของ clean.py บน ticket 1,000 ใบที่ทีมไม่เคยเห็น · เวลา 30 + เลขออเดอร์ 30 + รหัสข้อผิดพลาด 30")
style(ax, "คะแนนชุดซ่อน (เต็ม 90)")
x = 0; ticks = []
for a, name, c in ARM:
    for r in rows(a):
        ax.bar(x, r["hidden"]["total"], width=0.56, color=c, zorder=2, label=name if r["round"] == 1 else None)
        ax.text(x, r["hidden"]["total"] + 1.5, "%.0f" % r["hidden"]["total"], ha="center", fontsize=14, color=INK, fontweight="bold")
        ticks.append("%s\nรอบ %d" % (name, r["round"])); x += 1
    x += 0.5
ax.set_xticks([0, 1, 2.5, 3.5]); ax.set_xticklabels(ticks); ax.set_ylim(0, 105); ax.set_yticks([0, 30, 60, 90])
ax.legend(frameon=False, fontsize=12, loc="upper right", ncol=2, bbox_to_anchor=(1, 1.16))
fig.subplots_adjust(left=0.04, right=0.99, top=0.70, bottom=0.14)
fig.savefig(out + "/result-02-score.png"); plt.close(fig)
# 3) เวลาและ token ของ 3 บัญชี
ACC = [("yolo1", "yolo1 (Claude)"), ("yolo2", "yolo2 (Claude)"), ("cyolo1", "cyolo1 (Codex)")]
fig, axs = plt.subplots(1, 2, figsize=(17.6, 6.0), dpi=100)
head(fig, "3 บัญชีทำงานหนักพอกันทั้งสองวิธี สกิลไม่ได้ทำให้ลูกทีมใช้ token มากขึ้น",
     "ค่าเฉลี่ย 2 รอบ · ไม่ใช้สกิลนับจาก transcript ของแต่ละบัญชี · ใช้สกิลนับจาก ledger ของสกิล (รวมการตรวจความพร้อม)")
for ax, key, title, fmt in ((axs[0], "secs", "เวลาทำงานของแต่ละบัญชี (วินาที)", "%.0f"), (axs[1], "out", "output token ของแต่ละบัญชี", "{:,.0f}")):
    style(ax, title)
    for i, (a, name, c) in enumerate(ARM):
        v = [avg([r["accounts"][k][key] for r in rows(a)]) for k, _ in ACC]
        xs = [j - 0.2 + 0.4 * i for j in range(3)]
        ax.bar(xs, v, width=0.37, color=c, zorder=2, label=name)
        for xx, vv in zip(xs, v):
            ax.text(xx, vv * 1.02, (fmt % vv) if "%" in fmt else fmt.format(vv), ha="center", va="bottom", fontsize=12, color=INK)
    ax.set_xticks(range(3)); ax.set_xticklabels([n for _, n in ACC]); ax.set_ylim(0, ax.get_ylim()[1] * 1.12)
axs[1].legend(frameon=False, fontsize=12, loc="upper right")
fig.subplots_adjust(left=0.045, right=0.99, top=0.72, bottom=0.08, wspace=0.14)
fig.savefig(out + "/result-03-accounts.png"); plt.close(fig)
