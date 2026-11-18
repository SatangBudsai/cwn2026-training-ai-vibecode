---
name: vastai
description: เช่า GPU และจัดการ Template บน Vast.ai ผ่าน Python SDK (`vastai`) — ค้นหา offer/template, สร้าง/หยุด/ทำลาย instance, สร้าง/แก้ไข/ลบ template, ต่อ SSH, copy ไฟล์, ดู logs และคุมค่าใช้จ่าย ใช้เมื่อผู้ใช้ขอเช่า GPU, เปิด/ปิดเครื่อง Vast, ใช้หรือจัดการ Vast Template, รัน workload บน Vast หรือเช็คเครดิต
allowed-tools: Bash, Read, Write, Edit
---

# vastai — เช่า GPU และจัดการ Template บน Vast.ai

ไฟล์เดียวจบ — toolkit อยู่ในนี้ ไม่มีไฟล์ประกอบอื่น

**Verified: Python 3.12.3 · vastai 1.8.3 · 2026-10-17** (1.8.3 = โค้ด Python เหมือน 1.8.2 ทุกไฟล์) · ทดสอบจริง 2026-10-17: `sweep()` v5 (3 รอบแทน 4–5, ยืนยัน 2 เป้า, คุม rate limit ตาม header) · session keep-alive ร่วมกับ SDK · reconcile เร็วเมื่อ offer ถูกแย่ง (95 → 8 s) · deploy vLLM + Qwen 3.6 บน RTX 5090 · 5 เครื่อง จ่ายจริง ~$0.3 — ดู "ผลทดสอบ 2026-10-17" ท้ายไฟล์ · log watch + SSH ทุก endpoint ทดสอบจริง 2026-10-02 (deploy vLLM บน RTX 4090) · SSH 2 ทาง (direct+proxy, `connect`/`--via`) + ค่าดาวน์โหลดต่ำก่อน (`--max-down-cost`) + ค้นหาเครื่องแบบ `sweep()` (เร็วขึ้น ~40% ไม่พลาดราคาต่ำสุด 0/20) ทดสอบจริง 2026-10-03 (ทดสอบซ้ำครบทุกเส้นทางบน 1.8.2 ด้วย 3 instance พร้อมกัน ค่าใช้จ่ายจริง ~$0.044 — ดูท้ายไฟล์) · รุ่นก่อน: vastai 1.5.5 · 2026-08-27

## ขั้นที่ 0 — ตรวจว่าติดตั้ง `vastai` แล้วหรือยัง (ทำก่อนอย่างอื่นทุก session)

```bash
python -c "import importlib.metadata as m; print(m.version('vastai'))" 2>/dev/null || echo NOT_INSTALLED
```

- ได้เลขเวอร์ชัน → แจ้งผู้ใช้สั้น ๆ ว่า "vastai ติดตั้งแล้ว (เวอร์ชัน X)" แล้วไปต่อ
- `NOT_INSTALLED` → **แจ้งผู้ใช้ก่อนเริ่มติดตั้งเสมอ** ด้วยข้อความประมาณนี้ แล้วค่อยรัน `pip install`:

  > ยังไม่ได้ติดตั้ง `vastai` — **การรันครั้งแรกจะใช้เวลานานกว่าปกติ เพราะต้องติดตั้ง `pip install 'vastai~=1.8'` ก่อน**
  > (ดาวน์โหลด SDK + CLI และ dependency ใช้เวลาสักครู่ ขึ้นกับความเร็วเน็ต) ครั้งต่อไปจะเร็วตามปกติ

- รัน `pip install` **แยกเป็นคำสั่งของมันเอง** — อย่ารวมไว้ในคำสั่งเดียวกับ `env`/`keys`/`sweep` ผู้ใช้จะไม่รู้ว่าช้าเพราะอะไร
- ติดตั้งเสร็จแล้วแจ้งผลสั้น ๆ ("ติดตั้ง vastai X เรียบร้อย") แล้วไปต่อ · ติดตั้งไม่ผ่าน → หยุด แจ้ง error ให้ผู้ใช้

```bash
pip install 'vastai~=1.8'        # ได้ทั้ง SDK และ CLI ; ลงที่ /opt/venv ซึ่งไม่ถาวร (container ใหม่ = ต้องติดตั้งใหม่ และแจ้งผู้ใช้ใหม่)
```

## .env — เก็บ credential เท่านั้น

toolkit หาไฟล์เองตามลำดับ (อันแรกที่เจอชนะ) — **ไม่มี path ส่วนตัว hardcode ในสกิล**

1. `$VASTAI_ENV`  2. `~/.config/vastai/vastai.env`  ← แนะนำ  3. `./.env` ใน cwd

```dotenv
VAST_API_KEY=
VAST_SSH_KEY_FILE=     # **private** key เท่านั้น (สัมพัทธ์ = อิงโฟลเดอร์ .env)
VAST_HTTP_TIMEOUT=30                    # timeout ต่อ 1 request (SDK default 120s ซึ่งนานเกิน)
```

```bash
mkdir -p ~/.config/vastai && chmod 700 ~/.config/vastai
$EDITOR ~/.config/vastai/vastai.env && chmod 600 ~/.config/vastai/vastai.env
```

**ทำไมไม่มีตัวแปรของ public key?** `ssh`/`scp` ใช้แค่ private ส่วน public ต้องใช้เฉพาะตอน
"ผูกคีย์กับบัญชี" ครั้งเดียว — toolkit หาเอง: ลอง `<private>.pub` ก่อน ถ้าไม่มีก็ derive ด้วย
`ssh-keygen -y -f <private>` จึงไม่ต้องเก็บ path ของ `.pub` ไว้ที่ไหนเลย

```bash
python /tmp/vast.py keys            # คีย์ผูกกับบัญชีหรือยัง (ต้องได้ registered:true)
python /tmp/vast.py keys --attach   # ถ้ายัง — ผูกให้ instance ใหม่รับคีย์นี้อัตโนมัติ
```

**ไม่ต้อง `source` และไม่ต้อง `export`** — toolkit อ่านให้ทุกครั้งที่รัน
ลำดับค่า: ตัวแปรที่ `export` ใน shell **>** `.env` **>** default ในโค้ด
รองรับ `export KEY=…`, ค่าใน quote, inline comment, ค่าว่าง · เตือนถ้าไฟล์ `chmod` เปิดกว้าง

**เพดานเงิน/ความปลอดภัยไม่ต้องใส่ใน `.env`** — default อยู่ในโค้ด (บล็อกท้าย `SDK CONTRACT`)
override เฉพาะครั้งได้ทาง flag หรือ env:

| ตัวแปร | default | ความหมาย |
|:--|--:|:--|
| `VAST_MAX_DPH` | `0.20` | เพดาน $/hr — แพงกว่านี้ต้องสั่ง `--max-dph` เอง (กันเผลอเช่า H100 ทั้งคืน) |
| `VAST_MAX_INSTANCES` | `10` | เพดานจำนวนเครื่องพร้อมกัน |
| `VAST_MAX_DESTROY` | `10` | เพดานเครื่องที่ลบได้ต่อคำสั่งเดียว |
| `VAST_BLOCK_GEO` | `CN` | รหัสประเทศ (คั่นด้วย `,`) ที่ `plan`/`rent` **ไม่เลือก** เพราะ huggingface.co ถูก block — ตั้งว่าง หรือ `--allow-geo` เพื่อปิด |
| `VAST_LOADING_GRACE` | `420` | ค้าง `loading` เกินกี่วินาทีถึงลบ+เปลี่ยนเครื่อง — image ใหญ่ (vLLM ~11 GB) ตั้ง `1000` |
| `VAST_SEARCH_CALLS` | `28` | งบคำค้นต่อการค้นหนึ่งครั้ง (ไม่รวมขั้นยืนยันราคาต่ำสุด) — ปกติใช้จริง 15–20 · server ให้ burst ~30 ต่อ key แล้วเติม ~1/s (รวมทุก process) |
| `VAST_SEARCH_FOCUS` | `15` | ต้องค้นให้ครบสำหรับ N เครื่องถูกสุดที่ผ่านเกณฑ์ (ช่วงที่ `rent`/`plan` เลือกจริง) |
| `VAST_MAX_DOWN_COST` | `0.005` | $/GB ค่าดาวน์โหลด — `plan`/`rent` **หา offer ที่ถูกกว่านี้ก่อน** ไม่มีค่อย fallback (เรียงค่าดาวน์โหลดต่ำก่อน) · `0` = ปิด · ต่อคำสั่งใช้ `--max-down-cost` |
| `VAST_LABEL_PREFIX` | *(ว่าง)* | ตั้งเป็น prefix ของงาน → **ห้ามแตะ/ลบเครื่องที่ label ไม่ตรง** |

**ตรวจ config ก่อนเริ่มงานเสมอ:**

```bash
python /tmp/vast.py env      # โชว์ว่าอ่านไฟล์ไหน + ได้ค่าอะไร (ไม่โชว์ค่า secret) ; exit 1 ถ้าไม่มี key
```

**ตรวจว่า `VAST_API_KEY` โหลดจาก environment หรือไม่ — แล้วแจ้งผู้ใช้ทุกครั้ง** (ดูฟิลด์ `VAST_API_KEY_source`
ใน output ของ `env` หรือบรรทัด `NOTICE:` ใน stderr ของทุกคำสั่ง):

| `VAST_API_KEY_source` | ความหมาย | ต้องทำ |
|:--|:--|:--|
| `environment` | ได้จากตัวแปรที่ export ใน shell/process | ไปต่อได้ ไม่ต้องแจ้ง |
| `env_file` | **ไม่ได้โหลดจาก environment** — toolkit ใช้ค่าจากไฟล์ `.env` แทน | **แจ้งผู้ใช้** ว่า key ไม่ได้มาจาก environment และใช้จากไฟล์ไหน (ไม่ต้องโชว์ค่า) แล้วไปต่อได้ |
| `missing` | ไม่มีทั้งใน environment และ `.env` (หรือ export ไว้เป็นค่าว่าง) | **หยุด แจ้งผู้ใช้** พร้อม `VAST_API_KEY_notice` และวิธีตั้งค่า (`export VAST_API_KEY=…` หรือใส่ในไฟล์ `.env` ข้างบน) — ห้ามเดา/ค้นหา key จากไฟล์อื่นเอง |

---

## ขอยืนยันเมื่อไหร่ / ทำเองได้เลยเมื่อไหร่

| ทำเองได้เลย ไม่ต้องถาม | ต้องขอยืนยันจากผู้ใช้ |
|:--|:--|
| `plan` `sweep` `bill` `status` `logs` `template-search` `template-show` — หาข้อมูลให้จบก่อน | ขึ้นเพดานราคา `--max-dph` เกินที่ผู้ใช้/`.env` กำหนด |
| **`rent` / `create` — เช่าเครื่องได้ทันที ไม่ต้องถาม** (เลือก offer ดีที่สุดเอง ภายใต้เพดานราคา) | |
| `template-delete --dry-run` | `template-create` / `template-update` — เปลี่ยนข้อมูลบัญชี |
| `run` `push` `pull` เข้าเครื่องที่ผู้ใช้สั่งสร้างไว้แล้ว | **`destroy`** — ลบข้อมูลถาวร กู้ไม่ได้ |
| `stop` `start` เครื่องที่ผู้ใช้ขอให้จัดการอยู่แล้ว | ขยาย disk |
| `destroy` เครื่องทดสอบของตัวเองที่เกินเพดานเวลา | `template-delete` — ลบ template ถาวร |
|  | แตะ instance/template ที่ผู้ใช้ไม่ได้พูดถึง |

**เวลาผู้ใช้ขอเช่า — ห้ามถามว่าจะเอา offer ไหน ให้ตัดสินใจเองแล้วเช่าเลย** ด้วย `rent`
(offer อายุสั้นระดับวินาที–นาที ถามคนก่อน = offer หายเกือบทุกครั้ง — เจอจริง 2 ครั้งติดใน 2026-09-30)
เกณฑ์ "ดีที่สุด" ของ `rent`: กรอง `BASE_FILTER` + CUDA + เพดานราคา + **ค่าดาวน์โหลด `inet_down_cost<0.005` $/GB**
(ไม่มี offer ผ่านค่อยค้นใหม่ไม่จำกัด แล้วเรียงค่าดาวน์โหลดต่ำก่อนเป็นขั้นละ $0.005) → ให้ reliability ≥ 0.995 มาก่อน →
ถูกสุด → เน็ตเร็วสุด; offer หายระหว่างยิงก็ลองตัวถัดไปอัตโนมัติ (ไม่เกิน `--tries`, default 5)
เพดานราคายังบังคับเสมอ: ผู้ใช้ระบุราคา/GPU ที่แพงกว่า `VAST_MAX_DPH` มาแล้ว (เช่น ขอ 4090) = ส่ง `--max-dph`
ให้พอกับราคาตลาดของ GPU นั้นได้ แต่ถ้าไม่ได้ระบุ GPU ห้ามขยายเพดานเอง
หลังเช่าแล้ว**รายงาน**: `instance_id` · `gpu` · `$/hr` (แยก gpu+storage) · ที่ตั้ง · เหตุผลที่เลือก ·
**วิธีต่อ SSH ทั้ง 2 ทาง** (direct และ proxy จาก `connect` ใน output ของ `rent` พร้อมผลทดสอบแต่ละทาง — ดูหัวข้อ "SSH — ต่อได้ 2 ทาง")

🔒 **ห้ามพิมพ์ API key ออกมาไม่ว่ากรณีใด** — `create` คืน `instance_api_key`, instance row ทุกตัวมี
`jupyter_token` → `print(r)` ตรง ๆ = key หลุด (toolkit เรียก `redact()` ให้แล้ว)
public key ต้องผูกกับบัญชีก่อน (`vast.py keys --attach`) instance ใหม่จึงต่อได้ทันที
`vastai set api-key` เขียนลง `~/.config/vastai/vast_api_key` ซึ่งไม่ถาวรใน container → อย่าใช้ ให้ส่ง key ทุกครั้งแทน

---

## Toolkit — เขียนไฟล์นี้ครั้งเดียวต่อ session แล้วใช้ทุกคำสั่ง

```bash
cat > /tmp/vast.py <<'VASTPY'
#!/usr/bin/env python3
"""vast.py — toolkit เดียวของ skill vastai (verified: Python 3.12.3 · vastai 1.8.3 · 2026-10-17)

  plan|rent|create|status|stop|start|destroy|sweep|bill|run|push|pull|connect|drift|watch
  template-search|template-show|template-create|template-update|template-delete

อ่าน key จาก env VAST_API_KEY (หรือ .env) · ถ้าไม่ได้มาจาก environment จะพิมพ์ NOTICE · log ไป stderr · ผลลัพธ์ JSON ไป stdout
"""
import argparse, io, json, os, re, subprocess, sys, time

# ===== SDK CONTRACT — แก้ที่นี่ที่เดียวเมื่อ SDK เปลี่ยน (ดู `drift`) =====================
VERIFIED = {"python": "3.12.3", "vastai": "1.8.3", "date": "2026-10-17"}
OFFER = {"id":"id","gpu":"gpu_name","num_gpus":"num_gpus","price":"dph_total","price_gpu":"dph_base",
         "reliability":"reliability","perf":"dlperf_per_dphtotal","cuda":"cuda_max_good","disk":"disk_space",
         "storage_cost":"storage_cost","inet":"inet_down","geo":"geolocation","ports":"direct_port_count",
         "gpu_ram":"gpu_ram","machine":"machine_id","duration":"duration","verification":"verification",
         "down_cost":"inet_down_cost","up_cost":"inet_up_cost"}
TEMPLATE = {"id":"id","hash":"hash_id","name":"name","image":"image","tag":"tag",
            "disk":"recommended_disk_space","recommended":"recommended","creator":"creator_id",
            "count":"count_created","ssh":"use_ssh","ssh_direct":"ssh_direct",
            "jup_direct":"jup_direct","private":"private"}
INST  = {"id":"id","label":"label","status":"actual_status","intended":"intended_status","cur":"cur_state",
         "msg":"status_msg","gpu":"gpu_name","price":"dph_total","price_gpu":"dph_base",
         "storage_ph":"storage_total_cost","storage_cost":"storage_cost","image":"image_uuid","disk":"disk_space",
         "start":"start_date","duration":"duration","ssh_host":"ssh_host","ssh_port":"ssh_port",
         "ip":"public_ipaddr","ports":"ports","machine":"machine_id","gpu_ram":"gpu_ram"}
SECRETS = ("instance_api_key","jupyter_token","api_key","ssh_key","password","token")
CREATE_KWARGS = ("image","disk","env","price","label","extra","onstart_cmd","login","python_utf8","lang_utf8",
                 "jupyter_lab","jupyter_dir","force","cancel_unavail","template_hash","user","runtype","args",
                 "volume_info","bid_price","ssh","jupyter","direct","create_volume","link_volume","volume_size",
                 "mount_path","volume_label")
RUNTYPE = {"ssh_direct":"ssh_direc ssh_proxy","ssh_proxy":"ssh_proxy",
           "jupyter_direct":"jupyter_direc ssh_direc ssh_proxy","jupyter_proxy":"jupyter_proxy ssh_proxy"}
# drift เทียบ "ชื่อพารามิเตอร์" ของแต่ละเมธอด (จับ rename/เพิ่ม/ลบ ได้ครบโดยไม่ต้องเก็บ signature ยาว ๆ)
_TF = "name,image,image_tag,href,repo,login,env,ssh,jupyter,direct,jupyter_dir,jupyter_lab,onstart_cmd,search_params,no_default,disk_space,readme,hide_readme,desc,public,runtype,use_ssh,jup_direct,ssh_direct,use_jupyter_lab,docker_login_repo,extra_filters,readme_visible,private"
SIGS = {"search_offers":"query,type,order,limit,storage,no_default",
 "create_instance":"id,"+",".join(CREATE_KWARGS), "show_instance":"id", "show_instances":"",
 "stop_instance":"id", "start_instance":"id", "destroy_instance":"id", "ssh_url":"id",
 "execute":"id,command", "copy":"src,dst", "logs":"instance_id,tail,filter,daemon_logs",
 "show_user":"", "show_invoices_v1":"kwargs", "label_instance":"id,label", "attach_ssh":"instance_id,ssh_key",
 "search_templates":"query", "create_template":_TF, "update_template":"hash_id,"+_TF,
 "delete_template":"template_id,hash_id", "show_ssh_keys":"", "create_ssh_key":"ssh_key",
 "recycle_instance":"id",
 "api.instances.create_instance":"client,id,"+",".join(CREATE_KWARGS)}
BEHAVIOUR = {"default_retry": 3, "retryable_status": [429,502,503,504], "default_timeout_s": 120,
             "search_hard_cap": 64, "hours_per_month": 720.0}
UP, DOWN, DEAD = {"running"}, {"exited","stopped"}, {"offline","unknown"}
TRANSIENT = {None,"created","loading","rebooting"}
BASE_FILTER = "rentable=true verified=true reliability>0.99 direct_port_count>=4 duration>2"
DEFAULT_IMAGE = "nvidia/cuda:12.4.1-runtime-ubuntu22.04"
SSH_OPTS = ["-o","StrictHostKeyChecking=no","-o","UserKnownHostsFile=/dev/null",
            "-o","ConnectTimeout=15","-o","LogLevel=ERROR"]
# image บางตัว (เช่น vllm/vllm-openai) ทำ /root ให้ group/other เขียนได้ → sshd ปฏิเสธ key ("bad ownership or modes")
SSH_FIX = ("(for i in 1 2 3 4 5 6 7 8 9; do chown root:root /root /root/.ssh /root/.ssh/authorized_keys; "
           "chmod go-w /root; chmod 700 /root/.ssh; chmod 600 /root/.ssh/authorized_keys; sleep 10; done) >/dev/null 2>&1 &")
DEFAULT_ONSTART = "env | grep _ >> /etc/environment; " + SSH_FIX
# log watch: (regex, ความหมาย, scope) — scope "host" = เปลี่ยนเครื่องช่วยได้ · "image" = เปลี่ยนเครื่องไม่ช่วย ต้องแก้ image/คำสั่ง
FATAL_LOG = [
 (r"bad ownership or modes for (file|directory) /root", "sshd ปฏิเสธ key: permission /root ผิด", "image"),
 (r"manifest unknown|pull access denied|repository does not exist|invalid reference format", "image/tag ผิด หรือเป็น private", "image"),
 (r"no space left on device", "disk เต็ม (ตั้ง --disk ใหญ่ขึ้น)", "image"),
 (r"nvidia-container-cli|unsatisfied condition: cuda|CUDA driver version is insufficient", "driver/CUDA ของ host ไม่พอกับ image", "host"),
 # "Error response from daemon: No such container" ขึ้นปกติก่อน container ถูกสร้าง → ห้ามนับ
 (r"OCI runtime (create|exec|start) failed|Error response from daemon: (?!No such container)|failed to register layer", "docker ของ host พัง", "host"),
 (r"No CUDA GPUs are available|cudaErrorNoDevice|CUDA error: (unknown error|no CUDA-capable)", "GPU ไม่โผล่ใน container", "host"),
 (r"GPU has fallen off the bus|NVRM: Xid|uncorrectable ECC", "GPU ของ host เสีย", "host"),
 (r"(net/http|TLS handshake|i/o) timeout.*(registry|docker\.io|ghcr|nvcr)", "host ดึง image ไม่ไหว (เน็ต host มีปัญหา)", "host"),
]
APP_FATAL = [   # ใช้กับ log ของ server ที่ผู้ใช้รันเอง (watch --file)
 (r"torch\.OutOfMemoryError|CUDA out of memory|insufficient (GPU )?memory|No available memory for the cache blocks", "VRAM ไม่พอ", "image"),
 (r"Engine core initialization failed|EngineCore failed|Application startup failed|RuntimeError: |ValueError: |OSError: |ImportError|ModuleNotFoundError|Could not load (this )?library", "server init พัง", "image"),
 (r"CUDA error: |cudaErrorIllegalAddress|NCCL error", "CUDA runtime error", "host"),
 (r"^Killed$|exited with code -9|Out of memory: Killed process", "RAM ของเครื่องไม่พอ (OOM killer)", "host"),
]

# ===== .env — เก็บ "credential เท่านั้น" ================================================
# หาไฟล์ตามลำดับนี้ อันแรกที่เจอชนะ (ไม่มี path ส่วนตัว hardcode ในสกิล):
#   1) $VASTAI_ENV        2) ~/.config/vastai/vastai.env       3) ./.env ใน cwd
# ลำดับค่า: ตัวแปรที่ export ไว้ใน shell > ค่าใน .env > default ในโค้ดข้างล่าง
ENV_CANDIDATES = ("~/.config/vastai/vastai.env", "./.env")

def env_paths():
    p = os.environ.get("VASTAI_ENV")
    return ([p] if p else []) + [os.path.expanduser(x) for x in ENV_CANDIDATES]

def load_env(path=None):
    """อ่าน .env แบบไม่ override ค่าที่ shell ตั้งไว้ · คืน (path, คำเตือนเรื่อง permission)"""
    warn = None
    for p in ([path] if path else env_paths()):
        if not p or not os.path.isfile(p):
            continue
        try:                                   # ไฟล์ที่มี key ไม่ควรให้คนอื่นอ่านได้
            mode = os.stat(p).st_mode & 0o077
            if mode: warn = "%s เปิดให้ group/other อ่านได้ (chmod 600 %s)" % (p, p)
        except OSError: pass
        for raw in io.open(p, encoding="utf-8", errors="replace"):
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, val = line.partition("=")
            k = k.strip()
            if k.startswith("export "):
                k = k[7:].strip()
            if not k or not k.replace("_", "").isalnum():
                continue
            val = val.strip()
            if val[:1] in ("'", '"') and val[:1] == val[-1:] and len(val) > 1:
                val = val[1:-1]                                  # quote ไว้ = เก็บทั้งก้อน
            else:
                val = re.split(r"(?:^|\s)#", val, 1)[0].strip()   # ตัด inline comment
            os.environ.setdefault(k, val)
        return p, warn
    return None, None

# จำไว้ "ก่อน" อ่าน .env ว่า VAST_API_KEY มาจาก environment (shell export) หรือไม่ — ใช้แจ้งผู้ใช้
_KEY_IN_ENV = "VAST_API_KEY" in os.environ
ENV_FILE, ENV_WARN = load_env()
if ENV_WARN: sys.stderr.write("WARN: %s\n" % ENV_WARN)

def key_source():
    """คืน (source, ข้อความแจ้งผู้ใช้) · source = environment | env_file | missing"""
    if not os.environ.get("VAST_API_KEY", "").strip():
        if _KEY_IN_ENV:
            return "missing", ("VAST_API_KEY ถูก export ใน environment แต่เป็นค่าว่าง (และบังค่าใน .env) "
                               "— unset VAST_API_KEY หรือ export ค่าที่ถูกต้อง")
        return "missing", ("ไม่ได้โหลด VAST_API_KEY จาก environment และไม่พบใน .env "
                           "(หาไฟล์จาก: %s)" % ", ".join(env_paths()))
    if _KEY_IN_ENV:
        return "environment", None
    return "env_file", "VAST_API_KEY ไม่ได้โหลดจาก environment — ใช้ค่าจากไฟล์ %s แทน" % ENV_FILE

KEY_SOURCE, KEY_NOTICE = key_source()
if KEY_NOTICE: sys.stderr.write("NOTICE: %s\n" % KEY_NOTICE)

def _num(k, d, cast):
    try:
        return cast(os.environ.get(k) or d)
    except (TypeError, ValueError):
        sys.stderr.write("WARN: %s=%r ไม่ใช่ตัวเลข ใช้ค่า default %s\n"
                         % (k, os.environ.get(k), d))
        return cast(d)

def _keyfile():
    """VAST_SSH_KEY_FILE ที่เป็น path สัมพัทธ์ ให้อิงโฟลเดอร์ของ .env"""
    v = os.environ.get("VAST_SSH_KEY_FILE", "")
    if v and not os.path.isabs(v) and ENV_FILE:
        cand = os.path.join(os.path.dirname(os.path.abspath(ENV_FILE)), v)
        if os.path.isfile(cand): return cand
    return os.path.expanduser(v) if v else ""

# ---- ค่าคุมเงิน/ความปลอดภัย: default อยู่ในโค้ด ไม่ต้องใส่ใน .env -----------------------
# override ชั่วคราวได้ทาง env หรือ flag ของแต่ละคำสั่ง (--max-dph / --max-instances)
MAX_INSTANCES = _num("VAST_MAX_INSTANCES", 10, int)     # เพดานจำนวนเครื่องพร้อมกัน
MAX_DPH       = _num("VAST_MAX_DPH", 0.20, float)       # เพดาน $/hr — แพงกว่านี้ต้อง --max-dph เอง
MAX_DESTROY   = _num("VAST_MAX_DESTROY", 10, int)       # เพดานเครื่องที่ลบได้ต่อคำสั่ง
HTTP_TIMEOUT  = _num("VAST_HTTP_TIMEOUT", 30, float)    # timeout ต่อ 1 request (SDK default 120)
SEARCH_CALLS  = max(12, _num("VAST_SEARCH_CALLS", 28, int))   # งบคำค้นต่อ sweep (ไม่รวมยืนยันราคาต่ำสุด) — burst ที่ rate limit รับได้
SEARCH_FOCUS  = max(5, _num("VAST_SEARCH_FOCUS", 15, int))    # ช่วงราคาถูกสุดกี่เครื่อง (ที่ผ่านเกณฑ์) ที่ต้องค้นให้ครบ
# ค่าดาวน์โหลดต่อ GB ต่างกันได้ ~40 เท่า ($0.001–0.039/GB) — เคยจ่ายค่าโหลดโมเดล 23 GB แพงกว่าค่า GPU
# plan/rent ค้นแบบ inet_down_cost<cap ก่อน ถ้าไม่มี offer ผ่านเกณฑ์ค่อยค้นใหม่ไม่จำกัด (เรียงค่าดาวน์โหลดต่ำก่อน) · 0 = ปิด
MAX_DOWN_COST = _num("VAST_MAX_DOWN_COST", 0.005, float)   # $/GB
LABEL_PREFIX  = os.environ.get("VAST_LABEL_PREFIX", "") # ตั้งแล้วห้ามแตะเครื่องที่ label ไม่ตรง
# ประเทศที่ huggingface.co ถูก block (CN: curl ได้ 000) → โหลดโมเดลไม่ได้/ต้องใช้ mirror ที่ช้าและพังกับ Xet
# ตั้ง VAST_BLOCK_GEO="" เพื่อปิด หรือใส่ --allow-geo ต่อคำสั่ง
BLOCK_GEO     = {x.strip().upper() for x in os.environ.get("VAST_BLOCK_GEO", "CN").split(",") if x.strip()}
LOADING_GRACE = _num("VAST_LOADING_GRACE", 420, int)  # ค้าง loading นานเท่านี้ = ลบ (image ใหญ่ เช่น vLLM ~11 GB ให้ตั้ง 1000)
SSH_KEY_ENV   = _keyfile()

# ===== พื้นฐาน ===========================================================================
def log(m): print("[%s] %s" % (time.strftime("%H:%M:%S"), m), file=sys.stderr, flush=True)
def die(m, c=2): print("ERROR: %s" % m, file=sys.stderr); raise SystemExit(c)
def out(o): print(json.dumps(o, ensure_ascii=False))
def g(row, t, k, d=None):
    v = (row or {}).get(t[k]); return d if v is None else v
def gf(row, t, k, d=0.0):
    try: return float(g(row, t, k, d))
    except (TypeError, ValueError): return float(d)
def redact(r):
    return r if not isinstance(r, dict) else {
        k: ("<redacted>" if any(s in k.lower() for s in SECRETS) else v) for k, v in r.items()}

def http_err(e):
    """str(HTTPError) ไม่มี msg ของ Vast — ต้องอ่าน body เอง"""
    r = getattr(e, "response", None)
    if r is None: return {"code": None, "error": type(e).__name__, "msg": str(e)[:300]}
    o = {"code": r.status_code, "url": getattr(r, "url", None)}
    try:
        j = r.json(); o["error"] = j.get("error"); o["msg"] = j.get("msg") or j.get("message")
    except ValueError: o["msg"] = (r.text or "").strip()[:200]
    return o

_SESSIONS = {}
def _shared_sessions():
    """SDK สร้าง VastSession ใหม่ทุก request = DNS+TCP+TLS ใหม่ทุกครั้ง (~0.85 s, ครั้งแรก ~2 s · วัด 2026-10-17)
    → แทน factory ด้วย session เดียวต่อ server_url (keep-alive) ใช้ร่วมกับ Searcher · show_instance ฯลฯ เหลือ ~0.3 s"""
    import requests
    from vastai.api import client as C
    if getattr(C.VastSession, "_vastpy_shared", False): return
    orig = C.VastSession
    def factory(url):
        s = _SESSIONS.get(url)
        if s is None:
            s = _SESSIONS[url] = orig(url); s.mount("https://", requests.adapters.HTTPAdapter(pool_maxsize=16))
        return s
    factory._vastpy_shared = True; C.VastSession = factory

def client(retry=3):
    key = os.environ.get("VAST_API_KEY", "").strip()
    if not key:
        die("%s — export VAST_API_KEY=… หรือใส่ใน .env แล้ว chmod 600" % KEY_NOTICE)
    from vastai import VastAI
    _shared_sessions()
    v = VastAI(api_key=key, retry=retry)
    try: v.client.timeout = HTTP_TIMEOUT      # default 120s × retry = รอนานเกิน
    except AttributeError: pass
    return v

def fmt_inst(i):
    return "inst %-9s %-20s %-9s %-13s $%.4f/hr up %dm" % (
        g(i,INST,"id","-"), str(g(i,INST,"label","-"))[:20], str(g(i,INST,"status","provisioning")),
        g(i,INST,"gpu","-"), gf(i,INST,"price"), gf(i,INST,"duration")/60)

def rates(row):
    """instance dph_total = dph_base + storage_total_cost และ **ไม่ลดลงตอน stop**"""
    st = gf(row,INST,"storage_ph") or gf(row,INST,"storage_cost")*gf(row,INST,"disk")/BEHAVIOUR["hours_per_month"]
    gpu = gf(row,INST,"price_gpu") or max(gf(row,INST,"price") - st, 0.0)
    run = g(row,INST,"status") == "running"
    return {"gpu_per_hr": round(gpu,5), "storage_per_hr": round(st,5),
            "effective_per_hr": round(gpu+st if run else st, 5),
            "billed_now": "gpu+storage" if run else "storage only"}

# ===== offer =============================================================================
def build_query(a, price=True):
    """price=False: ไม่ใส่ dph<max (sweep หั่นช่วงราคาเอง — dph ซ้ำสองตัวใน query ตัวหลังทับตัวแรก)"""
    p = [BASE_FILTER, "num_gpus=%d" % a.num_gpus, "disk_space>%d" % (int(a.disk)+10),
         "inet_down>%d" % a.min_inet]
    # อย่าส่ง cuda_vers เข้า Offer API: พบว่า server คืน 0 แถวสำหรับ RTX 5090 แม้
    # raw offer มี cuda_max_good=13.x. ตรวจค่าจาก response ใน cmd_plan แทน.
    if a.gpu:          p.append("gpu_name=%s" % a.gpu.replace(" ","_"))
    if a.max_dph and price: p.append("dph<%s" % a.max_dph)
    if a.min_gpu_ram:  p.append("gpu_ram>=%s" % a.min_gpu_ram)      # หน่วย GB!
    if a.extra_query:  p.append(a.extra_query)
    return " ".join(p)

# ---- search: ทำไมต้อง sweep (วัดจริง 2026-10-03 — ดู "การค้นหาเครื่อง" ท้ายไฟล์) ----------------------------
# /bundles/ ไม่คืนตลาดทั้งหมด: server ตัด/สุ่ม raw offers ก่อนรวม bundle (เครื่อง 8 GPU = 8 offer) แล้วคืนตัวแทน 1 ตัว/bundle
#   → เรียก 1 ครั้งเห็น RTX 4090 ~44 จาก ~185 เครื่อง, พลาดราคาต่ำสุด ~1/3 ของครั้ง; limit>64 ไม่ช่วย
# ตัวกรอง dph เทียบ dph_base (ไม่รวม storage) ทีละ offer → หั่นช่วงราคาให้แคบ = bundle แตก = ผลครบ
# rate limit: X-RateLimit-Limit 5 ต่อ backend แต่ LB มีหลาย backend → 429 ลองใหม่ 0.3 s มักผ่าน (รอ Retry-After = เสีย 5–10 s)
# SDK เปิด session ใหม่ทุก request (~2.2 s) → ใช้ session เดียว keep-alive (~0.9 s) ยิง /bundles/ ตรง ด้วย body จาก parse_query ของ SDK
MID_MAX = 1 << 22                                   # machine_id สูงสุดที่ใช้หั่นเมื่อช่วงราคาแคบจนหั่นต่อไม่ได้

class Searcher:
    """rate limit (วัดจริง 2026-10-17): X-RateLimit-Limit 30 ต่อ API key รวมทุก process · burst ~25–30 แล้วเติม ~1 ครั้ง/วินาที
    → bucket ฝั่ง client เติม 1/s และเชื่อ X-RateLimit-Remaining ของ server เสมอ (ยิงจนโดน 429 = เสียครั้งละ ≥1 s)"""
    def __init__(self, v, rate=1.0, burst=24):
        import threading
        from vastai.api.query import parse_query, offers_fields, offers_alias, offers_mult
        from vastai.api import client as C
        self.pq = lambda q: parse_query(q, {"verified":{"eq":True},"external":{"eq":False},"rentable":{"eq":True}},
                                        offers_fields, offers_alias, offers_mult)      # = ค่า default ของ SDK search_offers
        self.v, self.url = v, v.client.server_url.rstrip("/") + "/api/v0/bundles/"
        _shared_sessions(); self.s = C.VastSession(v.client.server_url)              # connection เดียวกับ SDK
        self.h = {"Authorization": "Bearer " + v.client.api_key}
        self.rate, self.burst, self.tokens, self.t = rate, burst, float(burst), time.time()
        self.lock = threading.Lock(); self.calls = self.r429 = self.slow = 0; self.fallback = False
    def _take(self):
        while True:
            with self.lock:
                now = time.time(); self.tokens = min(self.burst, self.tokens + (now-self.t)*self.rate); self.t = now
                if self.tokens >= 1: self.tokens -= 1; return
                wait = (1-self.tokens)/self.rate
            time.sleep(min(wait, 1.0))
    def _seen(self, r):
        try: rem = float(r.headers.get("X-RateLimit-Remaining"))
        except (TypeError, ValueError): return
        with self.lock: self.tokens = min(self.tokens, rem)      # process อื่นที่ใช้ key เดียวกันกินโควตาไปได้
    def __call__(self, q, disk):
        """ต้องส่ง allocated_storage=disk ไม่งั้น dph_total คิด storage แค่ 5 GiB"""
        if self.fallback:                       # HTTP ตรงใช้ไม่ได้ → กลับไปใช้ SDK (ช้ากว่าแต่ผลเหมือนกัน)
            return [o for o in (self.v.search_offers(query=q, order="dph_total", limit=BEHAVIOUR["search_hard_cap"],
                    storage=float(disk)) or []) if o.get("dph_total") is not None]
        body = self.pq(q); body.update(order=[["dph_total","asc"]], type="on-demand",
                                       limit=BEHAVIOUR["search_hard_cap"], allocated_storage=float(disk))
        for k in range(12):
            self._take()
            # tail latency: warm p50 0.3 s · บางครั้งค้าง ~9 s (วัดจริง) → timeout สั้นแล้วยิงใหม่ทันที
            to = (3.0, 6.0)[k] if k < 2 else HTTP_TIMEOUT
            try: r = self.s.post(self.url, json=body, headers=self.h, timeout=to)
            except Exception as e:
                if k == 11: raise
                self.slow += 1
                if "Timeout" not in type(e).__name__: time.sleep(0.5*(k+1))
                continue
            self.calls += 1; self._seen(r)
            if r.status_code == 429:            # bucket ของ server หมด → รอเติม (≥1 s) ไม่ยิงรัว
                self.r429 += 1
                with self.lock: self.tokens = min(self.tokens, 0.0)
                try: ra = float(r.headers.get("Retry-After") or 0)
                except ValueError: ra = 0.0
                time.sleep(min(max(ra, 1.0/self.rate), 10)); continue
            if r.status_code in (404, 405):
                log("search: /bundles/ ตอบ %s → ใช้ SDK search_offers แทน" % r.status_code); self.fallback = True
                return self(q, disk)
            r.raise_for_status()
            return [o for o in (r.json().get("offers") or []) if o.get("dph_total") is not None]
        raise RuntimeError("search: 429/timeout ติดต่อกัน 12 ครั้ง")

_SEARCHER = None
def searcher(v):
    global _SEARCHER
    if _SEARCHER is None or _SEARCHER.v is not v: _SEARCHER = Searcher(v)
    return _SEARCHER

def _slice_q(q, s):
    lo, hi, mlo, mhi = s
    p = [q, "dph>=%.9f" % lo, "dph<%.9f" % hi]       # 9 ตำแหน่ง: %.6f ปัดขึ้นจน dph<min ยังเจอตัวมันเอง (บั๊กที่เจอจริง)
    if (mlo, mhi) != (0, MID_MAX): p += ["machine_id>=%d" % mlo, "machine_id<%d" % mhi]
    return " ".join(p)

def _in_slice(o, s):
    lo, hi, mlo, mhi = s
    return lo <= gf(o,OFFER,"price_gpu") < hi and mlo <= int(g(o,OFFER,"machine",0) or 0) < mhi

def search(v, q, disk):
    """ค้น query แคบ (machine_id=… ใน create, drift) — ไม่ใช่การเลือกเครื่อง
    server ตอบ query เดิมเหมือนเดิมทุกครั้ง (วัด 2026-10-17) → ยิงครั้งเดียว ว่างค่อยยิงซ้ำอีกครั้ง"""
    S = searcher(v); rows = S(q, disk) or S(q, disk)
    merged = {g(o,OFFER,"id"): o for o in rows}
    return sorted(merged.values(), key=lambda o: gf(o,OFFER,"price",9e9))

PREFER_REL = 0.995           # rent เลือกเครื่อง reliability ≥ ค่านี้ก่อน → ต้องยืนยันราคาต่ำสุดของกลุ่มนี้แยกด้วย

def sweep(v, q, disk, hi_cap, keep=lambda o: True, focus_k=None, max_calls=None, k0=8, per_slice=3, split_n=10):
    """ค้นตลาดให้ครบในช่วงที่จะถูกเลือกจริง — 3 รอบ ยิงขนานทุกรอบ:
    R1  k0 ช่วงราคา (dph_base) เท่ากันใน [0, hi_cap) — ไม่ยิง root (ช่วงกว้างคืน 64 แถว ช้ากว่า 0.62 vs 0.32 s)   8 calls
    R2  focus_hi = dph_total ของเครื่องที่ focus_k ที่ผ่าน keep() (+2%) — offer ใดถูกกว่านี้มี dph_base < focus_hi
        หั่น [0, focus_hi) ตามราคาที่รู้แล้ว ช่วงละ ~per_slice เครื่อง  **+ ยืนยันราคาต่ำสุดพร้อมกันในรอบเดียว**
    R3  ช่วงที่น่าสงสัยหั่นต่อ (≥ split_n แถว หรือเครื่องที่รู้ว่าอยู่ในช่วงไม่โผล่ · "แฝด" ราคาเดียวกันหั่นตาม machine_id)
        + ยืนยันซ้ำเฉพาะเป้าที่ราคาต่ำสุดเปลี่ยน/ยังยืนยันไม่ได้
    ยืนยัน 2 เป้า (เพราะ rent เรียง reliability ≥ PREFER_REL ก่อนราคา): ① ราคารวมต่ำสุดที่ผ่าน keep
        ② ราคารวมต่ำสุดที่ผ่าน keep และ reliability ≥ PREFER_REL — ใส่ reliability>=… ใน query ฝั่ง server ให้ช่วงเบาบาง
        วิธี: offer ใดที่ total < mt ต้องมี base < mt → ค้น [0, mt) **หั่นครึ่งตาม machine_id**
        (server รวม offer เป็น bundle คืนตัวแทน 1 ตัว/bundle และตอบ query เดิมเหมือนเดิมทุกครั้ง →
         ยิงซ้ำไม่ได้อะไรใหม่ แต่หั่นต่างแบบ = bundle แตกต่างแบบ = เห็นตัวที่ถูกซ่อน)
    คืน (offers เรียงราคา, stats)"""
    from concurrent.futures import ThreadPoolExecutor
    import math
    S = searcher(v); focus_k = focus_k or SEARCH_FOCUS; max_calls = max_calls or SEARCH_CALLS
    c0, r0, s0, t0 = S.calls, S.r429, S.slow, time.time(); found, got = {}, {}; rounds = 0
    TARGETS = (("min", lambda o: True, ""),
               ("min_rel", lambda o: gf(o,OFFER,"reliability") >= PREFER_REL, " reliability>=%s" % PREFER_REL))

    def qs(s):
        if s is None: return q
        return _slice_q(q + s[4], s[:4]) if len(s) > 4 else _slice_q(q, s)
    def run(ex, slices):
        nonlocal rounds
        if not slices: return []
        rounds += 1
        res = list(ex.map(lambda s: S(qs(s), disk), slices))
        for s, rows in zip(slices, res):
            for o in rows: found.setdefault(g(o,OFFER,"id"), o)
            if s is not None and len(s) == 4: got[s] = {g(o,OFFER,"machine") for o in rows}
        return res
    def known():
        k = {}
        for o in sorted(found.values(), key=lambda o: gf(o,OFFER,"price",9e9)): k.setdefault(g(o,OFFER,"machine"), o)
        return k
    def focus_hi():
        n = 0
        for o in known().values():
            if keep(o):
                n += 1
                if n >= focus_k: return min(hi_cap, gf(o,OFFER,"price") * 1.02)
        return hi_cap
    def left(): return max(0, max_calls - (S.calls - c0))
    def min_total(pred):
        return min((gf(o,OFFER,"price") for o in found.values() if keep(o) and pred(o)), default=None)
    def confirm(mt, extra):
        """[0, mt) 2 ชิ้น หั่นที่ machine_id มัธยฐานของเครื่องที่รู้จักในช่วงนั้น"""
        hi = math.floor(mt * 1e9) / 1e9
        ids = sorted(int(g(o,OFFER,"machine",0) or 0) for o in found.values() if gf(o,OFFER,"price_gpu") < hi)
        mm = ids[len(ids)//2] if len(ids) >= 2 and 0 < ids[len(ids)//2] < MID_MAX else MID_MAX // 64
        return [(0.0, hi, 0, mm, extra), (0.0, hi, mm, MID_MAX, extra)]
    def dense(res, mt, extra):
        """ช่วงยืนยันแน่นจนอาจถูกตัด (มักเป็นเครื่องที่ไม่ผ่าน keep เช่น CUDA ต่ำ) → หั่นตามราคาที่เห็น"""
        hi = math.floor(mt * 1e9) / 1e9
        bs = sorted(gf(o,OFFER,"price_gpu") for r in res for o in r)
        cs = [0.0] + [bs[i] for i in range(len(bs)//3, len(bs), max(1, len(bs)//3))][:3] + [hi]
        return [(a_, b_, 0, MID_MAX, extra) for a_, b_ in zip(cs, cs[1:]) if b_ > a_]
    def split(slices, res, fh, K):
        C = []
        for s, rows in zip(slices, res):
            inside = {m for m, o in K.items() if _in_slice(o, s)}
            if s[0] < fh and (len(rows) >= split_n or inside - got.get(s, set())):
                lo, hi, mlo, mhi = s
                ins = [K[m] for m in inside]
                if len(ins) >= 2 and len({round(gf(o,OFFER,"price_gpu"), 9) for o in ins}) == 1:
                    # "แฝด": หลายเครื่องราคาเดียวกัน (มัก host เดียว = bundle เดียว) หั่นราคาไม่แตก → หั่นตาม machine_id
                    ids = sorted(int(g(o,OFFER,"machine")) for o in ins); mm = ids[len(ids)//2]
                    if not (mlo < mm < mhi): mm = (mlo+mhi)//2
                    C += [(lo, hi, mlo, mm), (lo, hi, mm, mhi)]
                elif hi - lo > 0.002: m = (lo+hi)/2; C += [(lo, m, mlo, mhi), (m, hi, mlo, mhi)]
                else: mm = (mlo+mhi)//2; C += [(lo, hi, mlo, mm), (lo, hi, mm, mhi)]
        return sorted(C)

    state = {}                                   # เป้า → (mt ที่ยืนยัน, ok)
    def plan_confirm(prev_res=None):
        """คืนช่วงยืนยันของเป้าที่ยังไม่ผ่าน (หรือราคาต่ำสุดเปลี่ยนไปจากที่ยืนยัน)"""
        D, owner = [], []
        for name, pred, extra in TARGETS:
            mt = min_total(pred)
            if mt is None: continue
            done = state.get(name)
            if done and done[1] and abs(done[0] - mt) < 1e-9: continue
            pr = (prev_res or {}).get(name)
            sl = dense(pr, mt, extra) if pr and max(len(r) for r in pr) >= split_n else confirm(mt, extra)
            D += sl; owner += [(name, pred, mt)] * len(sl)
        return D, owner
    def judge(owner, res):
        by = {}
        for (name, pred, mt), r in zip(owner, res): by.setdefault((name, pred, mt), []).append(r)
        out = {}
        for (name, pred, mt), rs in by.items():
            cheap = [o for r in rs for o in r if gf(o,OFFER,"price") < mt - 1e-9 and keep(o) and pred(o)]
            state[name] = (mt, not cheap and max(len(r) for r in rs) < split_n); out[name] = rs
        return out

    B = C = []
    with ThreadPoolExecutor(12) as ex:
        w = hi_cap / k0
        run(ex, [(i*w, (i+1)*w, 0, MID_MAX) for i in range(k0)])                              # R1
        fh, K = focus_hi(), known()
        bases = sorted({round(gf(o,OFFER,"price_gpu"), 9) for o in K.values() if gf(o,OFFER,"price_gpu") < fh})
        cuts = [0.0]
        for i in range(per_slice, len(bases), per_slice):
            c = (bases[i-1] + bases[i]) / 2
            if c - cuts[-1] >= 0.001: cuts.append(c)
        cuts.append(fh)
        B = [(a_, b_, 0, MID_MAX) for a_, b_ in zip(cuts, cuts[1:]) if b_ > a_][:left()]
        D, own = plan_confirm()
        res = run(ex, B + D); prev = judge(own, res[len(B):])                                   # R2 (+ ยืนยัน)
        fh, K = focus_hi(), known()
        C = split(B, res[:len(B)], fh, K)[:left()]
        D, own = plan_confirm(prev)
        res = run(ex, C + D); prev = judge(own, res[len(C):]) or prev                          # R3 (+ ยืนยันซ้ำ)
        for _ in range(3):                       # เป้าที่ยังไม่ผ่าน → ยืนยันต่อจนจบ ไม่ขึ้นกับงบ
            D, own = plan_confirm(prev)
            if not D: break
            prev = judge(own, run(ex, D)) or prev
    min_checked = all(ok for _, ok in state.values()) and bool(state)
    st = {"calls": S.calls - c0, "r429": S.r429 - r0, "timeouts": S.slow - s0, "seconds": round(time.time()-t0, 2),
          "rounds": rounds, "offers": len(found), "machines": len(known()), "slices": k0 + len(B) + len(C),
          "focus_hi": round(fh, 4), "min_checked": min_checked,
          "confirmed": {k: ok for k, (_, ok) in state.items()}}
    log("sweep: %d calls/%d รอบ ใน %.1fs → %d offers / %d เครื่อง · focus ≤ $%.3f/hr · ราคาต่ำสุด%s"
        % (st["calls"], rounds, st["seconds"], st["offers"], st["machines"], fh,
           "ยืนยันแล้ว (รวม + rel≥%s)" % PREFER_REL if min_checked else "ยังไม่ยืนยัน (⚠ %s)" % st["confirmed"]))
    return sorted(found.values(), key=lambda o: gf(o,OFFER,"price",9e9)), st

def tiered_pool(v, a, keep):
    """ค้นแบบค่าดาวน์โหลดถูกก่อน: sweep ด้วย inet_down_cost<cap ใน query ก่อน (server กรอง)
    ไม่มี offer ผ่าน keep() ค่อย sweep ใหม่แบบไม่จำกัด · คืน (pool, cap ที่ได้ผล หรือ None ถ้า fallback/ปิด)"""
    q = build_query(a, price=False); cap = getattr(a, "max_down_cost", 0) or 0
    if cap > 0:
        qc = "%s inet_down_cost<%s" % (q, cap); log("query: %s (+ หั่นช่วง dph < %s)" % (qc, a.max_dph))
        pool = [o for o in sweep(v, qc, a.disk, a.max_dph, keep)[0] if keep(o)]
        if pool:
            log("ใช้ offer ค่าดาวน์โหลด < $%s/GB (%d offers)" % (cap, len(pool))); return pool, cap
        log("⚠ ไม่มี offer ค่าดาวน์โหลด < $%s/GB ที่ผ่านเกณฑ์ → ค้นใหม่ไม่จำกัด (เรียงค่าดาวน์โหลดต่ำก่อน)" % cap)
    log("query: %s (+ หั่นช่วง dph < %s)" % (q, a.max_dph))
    return [o for o in sweep(v, q, a.disk, a.max_dph, keep)[0] if keep(o)], None

def rank3(offers, cap):
    pool = [o for o in offers if gf(o,OFFER,"price",9e9) <= cap]
    if not pool: return []
    picks = [("ถูกสุด",       min(pool, key=lambda o: gf(o,OFFER,"price",9e9))),
             ("คุ้มสุด perf/$", max(pool, key=lambda o: gf(o,OFFER,"perf"))),
             ("นิ่งสุด",       max(pool, key=lambda o: (round(gf(o,OFFER,"reliability"),3),
                                                        gf(o,OFFER,"inet"), -gf(o,OFFER,"price"))))]
    seen, res = set(), []
    for tag, o in picks:
        if g(o,OFFER,"id") not in seen: seen.add(g(o,OFFER,"id")); res.append((tag,o))
    return res

def geo_ok(o, a):
    """ตัด offer ในประเทศที่ BLOCK_GEO (default CN — HF ถูก block) · geolocation รูปแบบ "City, CC" หรือ ", CC"
    ไม่รู้ประเทศ (ว่าง) = ให้ผ่าน · --allow-geo ปิดตัวกรองนี้"""
    if getattr(a, "allow_geo", False) or not BLOCK_GEO: return True
    cc = str(g(o,OFFER,"geo","") or "").rsplit(",", 1)[-1].strip().upper()
    return cc not in BLOCK_GEO

def cuda_compatible(o, minimum):
    """ตรวจ CUDA ฝั่ง client เพราะ server-side cuda_vers filter มี false negative บน RTX 5090."""
    try: return float(g(o,OFFER,"cuda",0)) >= float(minimum)
    except (TypeError, ValueError): return False

# ===== template ==========================================================================
def template_safe(t):
    """ไม่คืน env/login/onstart/readme เพราะอาจมี secret"""
    return {"template_id":g(t,TEMPLATE,"id"), "hash_id":g(t,TEMPLATE,"hash"),
            "name":g(t,TEMPLATE,"name"), "image":g(t,TEMPLATE,"image"), "tag":g(t,TEMPLATE,"tag"),
            "recommended_disk_gb":gf(t,TEMPLATE,"disk"), "recommended":bool(g(t,TEMPLATE,"recommended",False)),
            "creator_id":g(t,TEMPLATE,"creator"), "count_created":int(g(t,TEMPLATE,"count",0) or 0),
            "use_ssh":bool(g(t,TEMPLATE,"ssh",False)), "ssh_direct":bool(g(t,TEMPLATE,"ssh_direct",False)),
            "jupyter_direct":bool(g(t,TEMPLATE,"jup_direct",False)), "private":bool(g(t,TEMPLATE,"private",False)),
            "extra_filters":template_filters(t)}

def template_filters(t):
    """API คืน extra_filters เป็น JSON string และของที่เคย update ผิดอาจถูก encode ซ้ำหลายชั้น."""
    x=(t or {}).get("extra_filters")
    for _ in range(3):
        if x is None or x == "" or x == "null": return {}
        if isinstance(x,dict): return x
        if not isinstance(x,str): die("extra_filters ของ template ไม่ใช่ dict/JSON string")
        try: x=json.loads(x)
        except (TypeError,ValueError): die("extra_filters ของ template เป็น JSON ไม่ถูกต้อง")
    if isinstance(x,dict): return x
    die("extra_filters ของ template ถูก encode ซ้อนเกิน 3 ชั้น")

def template_query_parts(t):
    """แปลงหน่วย field ของ Template API เป็น query syntax ของ search offers."""
    fields={"cuda_max_good":"cuda_vers"}; ops={"gte":">=","lte":"<=","gt":">","lt":"<","eq":"=","neq":"!=","in":"in","notin":"notin"}
    parts=[]
    for field,rule in template_filters(t).items():
        if not isinstance(rule,dict): continue
        if field=="cuda_max_good": continue   # server-side cuda_vers มี false negative (#23) → ตรวจฝั่ง client ใน template_offer_mismatches
        for op,val in rule.items():
            if op not in ops: continue
            qfield=fields.get(field,field)
            if field in ("gpu_ram","gpu_total_ram") and isinstance(val,(int,float)): val=float(val)/1000.0
            if isinstance(val,list): val="["+",".join(str(x).replace(" ","_") for x in val)+"]"
            elif isinstance(val,str): val=val.replace(" ","_")
            parts.append(("%s %s %s" if op in ("in","notin") else "%s%s%s")%(qfield,ops[op],val))
    return parts

def template_offer_mismatches(t,o):
    """ตรวจซ้ำด้วยหน่วย response จริง (GPU RAM เป็น MiB) หลัง server-side filtering."""
    aliases={"cuda_max_good":"cuda_max_good"}; bad=[]
    for field,rule in template_filters(t).items():
        lhs=o.get(aliases.get(field,field))
        if lhs is None or not isinstance(rule,dict):
            if lhs is None: bad.append("ไม่มี field %s"%field)
            continue
        for op,rhs in rule.items():
            try:
                if op in ("in","notin"):
                    vals=[str(x) for x in rhs]; ok=(str(lhs) in vals); ok=ok if op=="in" else not ok
                else:
                    a,b=float(lhs),float(rhs); ok={"gte":a>=b,"lte":a<=b,"gt":a>b,"lt":a<b,"eq":a==b,"neq":a!=b}.get(op,True)
                if not ok: bad.append("%s %s %s (offer=%s)"%(field,op,rhs,lhs))
            except (TypeError,ValueError): bad.append("เทียบ %s ไม่ได้"%field)
    return bad

def template_find(v, tid):
    rows = v.search_templates(query={"id":{"eq":int(tid)}}) or []
    row = next((x for x in rows if int(x.get("id") or 0) == int(tid)), None)
    if row is None: die("ไม่พบ template id %s" % tid)
    return row

def template_require_owned(v,t):
    uid=int((v.show_user() or {}).get("id") or 0); creator=int(t.get("creator_id") or 0)
    if not uid or creator != uid: die("template id %s ไม่ได้เป็นของบัญชีนี้ — ปฏิเสธการแก้ไข/ลบ" % t.get("id"))

def owned_templates(v):
    uid=int((v.show_user() or {}).get("id") or 0)
    if not uid: die("อ่าน creator id ของบัญชีไม่ได้")
    return v.search_templates(query={"creator_id":{"eq":uid}}) or []

def cmd_template_search(a):
    v = client(); q = {}
    if a.mine:
        uid = int((v.show_user() or {}).get("id") or 0)
        if not uid: die("อ่าน creator id ของบัญชีไม่ได้")
        q["creator_id"] = {"eq":uid}
    elif not a.all:
        q["recommended"] = {"eq":True}
    rows = v.search_templates(query=q) or []
    if a.name: rows = [x for x in rows if a.name.lower() in str(x.get("name") or "").lower()]
    rows.sort(key=lambda x:(not bool(x.get("recommended")), -int(x.get("count_created") or 0), str(x.get("name") or "")))
    out({"mode":"template-search","count":len(rows),"templates":[template_safe(x) for x in rows[:a.limit]]})
    return 0

def cmd_template_show(a):
    out({"mode":"template-show","template":template_safe(template_find(client(),a.id))}); return 0

def cmd_template_create(a):
    if not a.yes: die("template-create เปลี่ยนข้อมูลในบัญชี ต้องมี --yes หลังผู้ใช้ยืนยัน")
    if a.ssh and a.jupyter: die("เลือก --ssh และ --jupyter พร้อมกันไม่ได้")
    v = client()
    before=owned_templates(v)
    if any(str(x.get("name"))==a.name for x in before): die("template ชื่อ %r มีอยู่แล้ว — ปฏิเสธการสร้างซ้ำ"%a.name)
    ids={x.get("id") for x in before}; t0=time.time()
    kw=dict(name=a.name,image=a.image,image_tag=a.image_tag,disk_space=a.disk,
            desc=a.desc,env=a.env,onstart_cmd=a.onstart_cmd,ssh=a.ssh,jupyter=a.jupyter,
            direct=a.direct,jupyter_lab=a.jupyter_lab,jupyter_dir=a.jupyter_dir,
            hide_readme=a.hide_readme,public=a.public)
    err=None
    try:
        r=client(retry=1).create_template(**kw)  # POST ยิงครั้งเดียว ป้องกัน duplicate เมื่อ response หาย
        if isinstance(r,dict) and r.get("success") is False: err=r
    except Exception as e: err=http_err(e)
    found=[]
    for _ in range(6):
        found=[x for x in owned_templates(v) if x.get("id") not in ids and x.get("name")==a.name
               and x.get("image")==a.image and x.get("tag")==a.image_tag]
        if found: break
        time.sleep(2)
    if len(found)!=1:
        safe_err=({k:err.get(k) for k in ("code","error","msg","success") if k in err}
                  if isinstance(err,dict) else {"error":str(err)[:200]})
        out({"mode":"template-create","ok":False,"error":safe_err,"matches":len(found)})
        die("ยืนยัน template ที่สร้างไม่ได้ (matches=%d) — ห้าม retry; ค้น --mine ก่อน"%len(found))
    row=found[0]
    out({"mode":"template-create","ok":True,"seconds":round(time.time()-t0,1),"template":template_safe(row)}); return 0

def _template_update_payload(t,a):
    runtype = str(t.get("runtype") or "args")
    mode_change=any(x is not None for x in (a.ssh,a.jupyter,a.direct))
    if not mode_change:
        use_ssh=bool(t.get("use_ssh")); ssh_direct=bool(t.get("ssh_direct")); jup_direct=bool(t.get("jup_direct"))
    else:
        ssh=(runtype=="ssh") if a.ssh is None else a.ssh
        jupyter=(runtype=="jupyter") if a.jupyter is None else a.jupyter
        if ssh and jupyter: die("เลือก --ssh และ --jupyter พร้อมกันไม่ได้")
        direct=bool(t.get("jup_direct") or t.get("ssh_direct")) if a.direct is None else a.direct
        runtype="jupyter" if jupyter else ("ssh" if ssh else "args")
        use_ssh=bool(ssh or jupyter); jup_direct=bool(jupyter and direct); ssh_direct=bool(use_ssh and direct)
    return {"name":a.name if a.name is not None else t.get("name"),
      "image":a.image if a.image is not None else t.get("image"),
      "image_tag":a.image_tag if a.image_tag is not None else t.get("tag"),
      "href":t.get("href"),"repo":t.get("repo"),
      "env":a.env if a.env is not None else t.get("env"),
      "onstart_cmd":a.onstart_cmd if a.onstart_cmd is not None else t.get("onstart"),
      "jup_direct":jup_direct,"ssh_direct":ssh_direct,
      "use_jupyter_lab":t.get("use_jupyter_lab",False) if a.jupyter_lab is None else a.jupyter_lab,
      "runtype":runtype,"use_ssh":use_ssh,
      "jupyter_dir":a.jupyter_dir if a.jupyter_dir is not None else t.get("jupyter_dir"),
      "docker_login_repo":t.get("docker_login_repo"),"extra_filters":template_filters(t),
      "disk_space":a.disk if a.disk is not None else t.get("recommended_disk_space"),
      "readme":t.get("readme"),"readme_visible":t.get("readme_visible",True),
      "desc":a.desc if a.desc is not None else t.get("desc"),
      "private":t.get("private",True) if a.public is None else not a.public}

def cmd_template_update(a):
    if not a.yes: die("template-update เปลี่ยนข้อมูลในบัญชี ต้องมี --yes หลังผู้ใช้ยืนยัน")
    v=client(); t=template_find(v,a.id); template_require_owned(v,t); h=t.get("hash_id")
    if not h: die("template id %s ไม่มี hash_id จึง update ไม่ได้" % a.id)
    payload=_template_update_payload(t,a); r=v.update_template(hash_id=h,**payload)
    if isinstance(r,dict) and r.get("success") is False: die("template-update success=False")
    bad=[]; after={}
    for _ in range(6):
        after=template_find(v,a.id); bad=[]
        for k,field in (("name","name"),("image","image"),("image_tag","tag"),("disk_space","recommended_disk_space"),
                        ("runtype","runtype"),("use_ssh","use_ssh"),("ssh_direct","ssh_direct"),("jup_direct","jup_direct")):
            if payload.get(k)!=after.get(field): bad.append("%s expected=%r got=%r"%(field,payload.get(k),after.get(field)))
        if template_filters(after)!=payload["extra_filters"]: bad.append("extra_filters ไม่ตรงหลัง update")
        if not bad: break
        time.sleep(2)
    out({"mode":"template-update","ok":not bad,"template":template_safe(after),"mismatches":bad}); return 1 if bad else 0

def cmd_template_delete(a):
    v=client(); t=template_find(v,a.id); template_require_owned(v,t); summary=template_safe(t)
    if a.dry_run: out({"mode":"template-delete","dry_run":True,"would_delete":summary}); return 0
    if not a.yes: die("template-delete ลบถาวร ต้องมี --yes หลังผู้ใช้ยืนยัน")
    r=v.delete_template(template_id=a.id)
    gone=False
    for _ in range(12):
        gone=not (v.search_templates(query={"id":{"eq":int(a.id)}}) or [])
        if gone: break
        time.sleep(2)
    out({"mode":"template-delete","ok":gone,"deleted":summary}); return 0 if gone else 1

# ===== instance ==========================================================================
def instances(v): return v.show_instances() or []
def by_label(v, lb): return [i for i in instances(v) if g(i,INST,"label","") == lb]

def preflight(v, label, max_inst, cap, offer=None, cur=None):
    if not label: die("ต้องมี label เสมอ — label คือ idempotency key ตัวเดียวที่ Vast มี")
    if LABEL_PREFIX and not label.startswith(LABEL_PREFIX):
        die("label %r ต้องขึ้นต้นด้วย %r" % (label, LABEL_PREFIX))
    cur = instances(v) if cur is None else cur
    dup = [g(i,INST,"id") for i in cur if g(i,INST,"label","") == label]
    if dup: die("label %r ถูกใช้แล้วโดย %s — ปฏิเสธการสร้างซ้ำ" % (label, dup))
    if len(cur) >= max_inst: die("มี %d เครื่องแล้ว เพดาน %d" % (len(cur), max_inst))
    if offer is not None and gf(offer,OFFER,"price",9e9) > cap:
        die("offer %s $%.4f/hr เกินเพดาน $%.4f/hr — ห้ามขยายเพดานเอง"
            % (g(offer,OFFER,"id"), gf(offer,OFFER,"price"), cap))
    return cur

def reconcile(v, label, window=90, poll=10):
    """create error → ห้าม retry เรียกตัวนี้แทน; คืน instance id ถ้าเครื่องเกิดจริง"""
    t0 = time.time()
    while True:
        try:
            h = by_label(v, label)
            if h: return g(sorted(h, key=lambda i: gf(i,INST,"start"), reverse=True)[0], INST, "id")
        except Exception as e: log("reconcile: %s — ลองใหม่" % type(e).__name__)
        if time.time()-t0 >= window: return None
        time.sleep(poll)

def scan(txt, pats):
    """คืน (บรรทัด, ความหมาย, scope) ของ pattern fatal ตัวแรกที่เจอ"""
    for line in str(txt or "").splitlines():
        for rx, meaning, scope in pats:
            if rx.search(line): return {"line": line.strip()[:240], "meaning": meaning, "scope": scope}
    return None

class LogWatch:
    """สุ่มอ่าน Vast logs() (และ log ไฟล์ในเครื่องผ่าน SSH ถ้าให้ fetch มา) ทุก every วินาทีระหว่าง init
    เจอ error ร้ายแรง = เลิกรอทันที ไม่ต้องรอจน timeout 420-900 s ทั้งที่เครื่องพังตั้งแต่นาทีแรก"""
    def __init__(self, v, iid, every=20, patterns=FATAL_LOG, fetch=None):
        self.v, self.iid, self.every, self.fetch = v, iid, every, fetch
        self.pats = [(re.compile(p, re.I | re.M), m, sc) for p, m, sc in patterns]
        self.last, self.hit, self.samples = 0.0, None, 0
    def check(self, force=False):
        if self.hit or (not force and time.time()-self.last < self.every): return self.hit
        self.last = time.time(); self.samples += 1
        try: txt = self.fetch() if self.fetch else self.v.logs(instance_id=self.iid, tail="200")
        except Exception: return None          # อ่าน log ไม่ได้ชั่วคราว ≠ เครื่องพัง
        self.hit = scan(txt, self.pats)
        if self.hit: log("  ‼ log fatal [%s]: %s\n      %s" % (self.hit["scope"], self.hit["meaning"], self.hit["line"]))
        return self.hit

def wait_for(v, iid, want, timeout=900, poll=8, grace=None, watch=None):
    grace = LOADING_GRACE if grace is None else grace
    t0, deadline, stuck, last = time.time(), time.time()+timeout, None, "<none>"
    row = {}
    while True:
        try: row = v.show_instance(id=iid) or {}
        except Exception as e: log("  show_instance %s — ลองใหม่" % type(e).__name__)
        st = g(row,INST,"status")
        if st in want: return True, row, "ok"
        if watch and watch.check(): return False, row, "log fatal: %s" % watch.hit["meaning"]
        if watch and not watch.hit:            # error ของ docker บน host มักโผล่ใน status_msg ไม่ใช่ logs()
            watch.hit = scan(g(row,INST,"msg",""), watch.pats)
            if watch.hit:
                log("  ‼ status_msg fatal [%s]: %s\n      %s" % (watch.hit["scope"], watch.hit["meaning"], watch.hit["line"]))
                return False, row, "status_msg fatal: %s" % watch.hit["meaning"]
        if st in DEAD: return False, row, "instance %s" % st
        if st in TRANSIENT:
            stuck = stuck or time.time()
            if time.time()-stuck > grace: return False, row, "ค้างที่ %r เกิน %ds" % (st, grace)
        else: stuck = None
        if st != last:
            log("  status=%r msg=%s (%ds)" % (st, str(g(row,INST,"msg",""))[:70], time.time()-t0)); last = st
        if time.time()+poll >= deadline: return False, row, "timeout %ds (สถานะสุดท้าย %r)" % (timeout, st)
        time.sleep(poll)

def verify_gone(v, iid, tries=12, poll=5):
    for _ in range(tries):
        try:
            if iid not in [g(i,INST,"id") for i in instances(v)]: return True
        except Exception: pass
        time.sleep(poll)
    return False

def ssh_target(row):
    # Template แบบ direct อาจคืน proxy ssh_host/ssh_port ที่เสีย แต่ direct 22/tcp ใช้ได้จริง
    ip=g(row,INST,"ip"); p=(g(row,INST,"ports",{}) or {}).get("22/tcp") or []
    if ip and p and p[0].get("HostPort"): return ip,int(p[0]["HostPort"])
    host=g(row,INST,"ssh_host"); port=g(row,INST,"ssh_port")
    return (host,int(port)) if host and port else (None,None)

def sh(cmd, timeout=600):
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout, p.stderr

def ssh_endpoints(row):
    """ทุกทางที่ SSH ได้: direct (public_ip + 22/tcp) แล้ว proxy (sshN.vast.ai) — direct อาจใช้ได้ตอนสร้างแล้วตายทีหลัง"""
    eps = []
    ip = g(row,INST,"ip"); p = (g(row,INST,"ports",{}) or {}).get("22/tcp") or []
    if ip and p and p[0].get("HostPort"): eps.append(("direct", ip, int(p[0]["HostPort"])))
    host = g(row,INST,"ssh_host"); port = g(row,INST,"ssh_port")
    if host and port and (host, int(port)) not in [(h, q) for _, h, q in eps]: eps.append(("proxy", host, int(port)))
    return eps

def ssh_probe(host, port, key, cmd="true", timeout=45):
    rc, o_, e_ = sh(["ssh","-i",key,"-p",str(port)]+SSH_OPTS+["root@%s"%host, cmd], timeout)
    return rc, o_.strip(), e_.strip()

def ssh_check(row, key, tries=20, poll=10, watch=None, settle=3):
    """ทดสอบ SSH ทันทีหลังสร้างเครื่อง — ลอง **ทั้ง direct และ proxy** แล้วรันคำสั่งจริง (nvidia-smi) ไม่ใช่แค่ `true`
    ทางแรกผ่านแล้ว ลองทางที่ยังไม่ผ่านต่ออีก settle รอบ (proxy มักขึ้นช้ากว่า direct ไม่กี่วินาที)
    คืน dict: ผลแต่ละ endpoint + ทางที่เลือก (direct ก่อน) + all_ok"""
    eps = ssh_endpoints(row); res = {"endpoints": {}, "chosen": None, "after_s": None, "all_ok": False}
    if not eps: res["error"] = "ไม่มี ssh endpoint ใน instance row"; return res
    first = None
    for k in range(tries):
        for name, h, p in eps:
            if res["endpoints"].get(name, {}).get("ok"): continue          # ผ่านแล้วไม่ต้องลองซ้ำ
            rc, o_, e_ = ssh_probe(h, p, key, "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", 45)
            res["endpoints"][name] = {"host": h, "port": p, "ok": rc == 0,
                                      **({"gpu": o_.splitlines()[0][:80]} if rc == 0 and o_ else {"err": (e_ or o_)[-160:]})}
        ok = [(n, h, p) for n, h, p in eps if res["endpoints"][n]["ok"]]
        if ok and first is None: first = k; res["after_s"] = k*poll
        if len(ok) == len(eps) or (ok and k - first >= settle): break
        if not ok and watch and k >= 1 and watch.check(force=True): break   # ssh พลาดทุกทาง → ดู log ว่าทำไม
        time.sleep(poll)
    ok = [(n, h, p) for n, h, p in eps if res["endpoints"][n]["ok"]]
    if ok: res["chosen"] = {"name": ok[0][0], "host": ok[0][1], "port": ok[0][2]}
    else: res["after_s"] = tries*poll
    res["all_ok"] = len(ok) == len(eps)
    for n, info in res["endpoints"].items():
        log("  ssh %-6s %s:%s -> %s" % (n, info["host"], info["port"], "OK " + info.get("gpu","") if info["ok"] else "FAIL " + info.get("err","")[-80:]))
    if ok and not res["all_ok"]:
        log("  ⚠ ใช้ได้แค่ %s — อีกทางยังไม่ผ่าน (ลอง `connect --id N` ภายหลัง)" % ", ".join(n for n, _, _ in ok))
    return res

def ssh_cmds(eps, key, iid=None):
    """คำสั่งพร้อมใช้ของทุก endpoint (ssh/scp + บล็อก ~/.ssh/config) — ให้ผู้ใช้สลับทางได้เองเมื่อทางหนึ่งหลุด"""
    k = key or "<VAST_SSH_KEY_FILE>"
    return {n: {"host": h, "port": p,
                "ssh": "ssh -i %s -p %d root@%s" % (k, p, h),
                "scp": "scp -i %s -P %d <src> root@%s:<dst>" % (k, p, h),
                "ssh_config": "Host vast-%s%s\n  HostName %s\n  Port %d\n  User root\n  IdentityFile %s\n"
                              "  StrictHostKeyChecking no\n  UserKnownHostsFile /dev/null" % ("%s-" % iid if iid else "", n, h, p, k)}
            for n, h, p in eps}

def ssh_ready(host, port, key, tries=20, poll=10, watch=None):
    """running != ต่อ SSH ได้ — Vast apt-install sshd เข้า image ที่ไม่มี ต้องรออีก 10-20s"""
    for k in range(tries):
        if sh(["ssh","-i",key,"-p",str(port)]+SSH_OPTS+["root@%s"%host,"true"], 45)[0] == 0:
            return True, k*poll
        if watch and k >= 1 and watch.check(force=True): return False, k*poll   # ssh พลาด → ดู log ว่าทำไม
        time.sleep(poll)
    return False, tries*poll

def pubkey(priv=None):
    """คืน (เนื้อ public key, ที่มา) — ไม่ต้องเก็บ path ของ .pub ใน .env

    ssh/scp ใช้แค่ private; public ต้องใช้เฉพาะตอน "ผูกคีย์กับบัญชี" (attach_ssh/create_ssh_key)
    ลอง <private>.pub ก่อน ถ้าไม่มีก็ derive จาก private ด้วย ssh-keygen -y
    """
    p = priv or SSH_KEY_ENV
    if not p: return None, "ไม่มี VAST_SSH_KEY_FILE"
    if os.path.isfile(p + ".pub"):
        return io.open(p + ".pub", encoding="utf-8").read().strip(), p + ".pub"
    rc, o_, e_ = sh(["ssh-keygen", "-y", "-f", p], 30)
    if rc == 0 and o_.strip():
        return o_.strip(), "derived จาก %s (ssh-keygen -y)" % p
    return None, "ดึง public จาก %s ไม่ได้: %s" % (p, e_.strip()[:120])


def fingerprint(priv=None):
    rc, o_, _ = sh(["ssh-keygen", "-lf", priv or SSH_KEY_ENV], 30)
    return o_.split()[1] if rc == 0 and len(o_.split()) > 1 else None


def need_key(a):
    k = a.key or SSH_KEY_ENV
    if not k: die("ต้องมี --key หรือ VAST_SSH_KEY_FILE ใน .env")
    return k

def running_target(v, a):
    """เลือก endpoint ที่ต่อได้จริงตอนนี้ — --via auto (default: direct ก่อน แล้ว proxy) | direct | proxy
    direct ที่เคยใช้ได้อาจตายทีหลัง (เจอจริง) → auto สลับไป proxy ให้เอง"""
    row = v.show_instance(id=a.id)
    if row is None: die("ไม่มี instance %s" % a.id)
    if g(row,INST,"status") != "running": die("instance %s = %r ไม่ใช่ running" % (a.id, g(row,INST,"status")))
    eps = ssh_endpoints(row); key = need_key(a)
    if not eps: die("instance %s ยังไม่มี ssh_host/ssh_port" % a.id)
    via = getattr(a, "via", "auto") or "auto"
    if via != "auto":
        eps = [e for e in eps if e[0] == via]
        if not eps: die("instance %s ไม่มี endpoint แบบ %s (มี: %s)" % (a.id, via, ", ".join(e[0] for e in ssh_endpoints(row))))
    for _ in range(3):
        for name, h, p in eps:
            if ssh_probe(h, p, key, "true", 30)[0] == 0:
                if name != eps[0][0]: log("  %s ต่อไม่ได้ → ใช้ %s %s:%s" % (eps[0][0], name, h, p))
                return h, p, key
        time.sleep(5)
    die("instance %s ต่อ SSH ไม่ได้ทุก endpoint: %s" % (a.id, ", ".join("%s %s:%s" % e for e in eps)))

# ===== subcommands =======================================================================
def cmd_plan(a):
    v = client(); template = template_find(v,a.template_id) if a.template_id else None
    if template:
        a.disk=max(a.disk,gf(template,TEMPLATE,"disk"))
        tq=" ".join(template_query_parts(template)); a.extra_query=" ".join(x for x in (a.extra_query,tq) if x)
    keep = lambda o: (cuda_compatible(o, a.min_cuda) and geo_ok(o, a) and gf(o,OFFER,"price",9e9) <= a.max_dph
                      and not (template and template_offer_mismatches(template, o)))
    offers, down_cap = tiered_pool(v, a, keep)
    log("พบ %d offers ผ่าน CUDA >= %s · ไม่อยู่ใน %s · template"
        % (len(offers), a.min_cuda, ",".join(sorted(BLOCK_GEO)) or "-"))
    picks = rank3(offers, a.max_dph)
    if not picks: die("ไม่มี offer <= $%.2f/hr ที่ตรงเกณฑ์ — ห้ามขยายเพดานเอง ให้รายงานผู้ใช้" % a.max_dph)
    rows = []
    print("\n%-3s %-15s %-11s %-10s %-6s %-7s %-6s %-8s %-18s %s"
          % ("#","เกณฑ์","offer_id","$/hr","cuda","rel","net","$/GB↓","geo","gpu"), file=sys.stderr)
    for n,(tag,o) in enumerate(picks,1):
        gpu_ph = gf(o,OFFER,"price_gpu")
        st_ph  = gf(o,OFFER,"storage_cost")*a.disk/BEHAVIOUR["hours_per_month"]
        tot    = gf(o,OFFER,"price") or gpu_ph+st_ph
        print("%-3d %-15s %-11s $%-9.4f %-6s %-7.4f %-6d $%-7.4f %-18s %s (gpu $%.4f + stor $%.4f)"
              % (n,tag,g(o,OFFER,"id"),tot,g(o,OFFER,"cuda","-"),gf(o,OFFER,"reliability"),
                 gf(o,OFFER,"inet"),gf(o,OFFER,"down_cost"),str(g(o,OFFER,"geo","-"))[:18],g(o,OFFER,"gpu","-"),gpu_ph,st_ph),
              file=sys.stderr)
        rows.append({"rank":n,"why":tag,"offer_id":g(o,OFFER,"id"),"machine_id":g(o,OFFER,"machine"),
                     "gpu":g(o,OFFER,"gpu"),"gpu_ram_mib":g(o,OFFER,"gpu_ram"),"cuda":g(o,OFFER,"cuda"),
                     "reliability":gf(o,OFFER,"reliability"),"inet_down_mbps":gf(o,OFFER,"inet"),
                     "geo":g(o,OFFER,"geo"),"perf_per_dollar":gf(o,OFFER,"perf"),
                     "download_per_gb":gf(o,OFFER,"down_cost"),
                     "gpu_per_hr":round(gpu_ph,5),"storage_per_hr":round(st_ph,5),"total_per_hr":round(tot,5)})
    th=g(template,TEMPLATE,"hash") if template else None
    image_name=("%s:%s"%(g(template,TEMPLATE,"image"),g(template,TEMPLATE,"tag"))) if template else a.image
    print("\nimage=%s disk=%sGB label=%s template=%s\nเลือกแล้วรันต่อ:" % (image_name,a.disk,a.label,g(template,TEMPLATE,"name") if template else "-"), file=sys.stderr)
    for r in rows:
        print("  #%d  create --label %s --offer-id %s --machine-id %s --expect-dph %.4f%s --yes"
              % (r["rank"],a.label,r["offer_id"],r["machine_id"],r["total_per_hr"],
                 " --template-id %s --template-hash %s"%(g(template,TEMPLATE,"id"),th) if th else ""), file=sys.stderr)
    out({"mode":"plan","image":image_name,"disk":a.disk,"label":a.label,"download_cap_per_gb":down_cap,
         "template":template_safe(template) if template else None,"offers":rows}); return 0

def cmd_create(a):
    v = client()
    cur = instances(v); ex = [i for i in cur if g(i,INST,"label","") == a.label]
    if ex:                                              # idempotent
        iid = g(ex[0],INST,"id"); log("label %r มีอยู่แล้ว -> adopt %s (ไม่สร้างใหม่)" % (a.label,iid))
        return _settle(v, iid, a)
    if not a.yes: die("create ต้องมี --yes (ผู้ใช้ยืนยันการเสียเงินแล้ว)")
    offer = getattr(a, "fresh_offer", None)            # rent ส่ง offer ที่เพิ่งค้นมา (< 10 s) → ไม่ต้องค้นยืนยันซ้ำ
    if offer is not None:
        pass
    elif a.machine_id:   # ⚠ id=<offer_id> กรองไม่ได้ server เมินเงียบ ๆ → ต้องใช้ machine_id
        offer = next((o for o in search(v, "machine_id=%d" % a.machine_id, a.disk)
                      if g(o,OFFER,"id") == a.offer_id), None)
        if offer is None: die("offer %s บน machine %s หายไปแล้ว — search ใหม่" % (a.offer_id,a.machine_id))
    else:
        log("ไม่ได้ส่ง --machine-id จึงยืนยัน offer ล่วงหน้าไม่ได้ (ถ้าหายไปแล้ว create จะได้ 400 แล้วเข้า reconcile)")
    if a.expect_dph and a.expect_dph > a.max_dph:
        die("ราคาที่อนุมัติ $%.4f/hr เกินเพดาน $%.4f/hr" % (a.expect_dph, a.max_dph))
    template=None
    if a.template_hash:
        if not a.template_id: die("ใช้ --template-hash ต้องมี --template-id เพื่อ validate hash/disk/compatibility")
        template=template_find(v,a.template_id)
        if template.get("hash_id")!=a.template_hash: die("template hash เปลี่ยนแล้ว — plan ใหม่")
        if a.disk < gf(template,TEMPLATE,"disk"): die("disk %.1fGB ต่ำกว่า template แนะนำ %.1fGB"%(a.disk,gf(template,TEMPLATE,"disk")))
        if offer:
            bad=template_offer_mismatches(template,offer)
            if bad: die("offer ไม่ตรง template: %s"%"; ".join(bad))
    preflight(v, a.label, a.max_instances, a.max_dph, offer, cur=cur)
    if a.template_hash:
        kw = dict(template_hash=a.template_hash,disk=a.disk,label=a.label,cancel_unavail=True)
    else:
        kw = dict(image=a.image, disk=a.disk, label=a.label, runtype=RUNTYPE[a.runtype],
                  onstart_cmd=a.onstart_cmd, env=_env(a.env), cancel_unavail=True)
    bad = [k for k in kw if k not in CREATE_KWARGS]
    if bad: die("kwargs ที่ SDK ไม่รับ: %s" % bad)
    log("create_instance(id=%s, %s)" % (a.offer_id, {k:v_ for k,v_ in kw.items() if k not in ("env","login")}))
    t0 = time.time()
    try:
        r = client(retry=1).create_instance(id=a.offer_id, **kw)   # retry=1 = ยิงครั้งเดียว
    except Exception as e:
        log("create ล้มเหลว: %s" % json.dumps(http_err(e), ensure_ascii=False))
        log("ห้าม retry — ตรวจก่อนว่าเครื่องเกิดขึ้นแล้วหรือยัง (จาก label)")
        he = http_err(e)
        # 400 no_such_ask = server ปฏิเสธชัดเจน (offer ถูกแย่ง) ไม่มีเครื่องเกิด → เช็ค label สั้น ๆ พอ
        # (เดิมรอ 90 s ทุกกรณี — rent 2 ตัวขนานแย่ง offer เดียวกัน เสียเวลาเปล่า 95 s · วัดจริง 2026-10-17)
        # error อื่น (timeout/network) ไม่รู้ว่า request ถึง server ไหม → รอเต็ม window เหมือนเดิม
        gone = he.get("code") == 400 and "no_such_ask" in str(he.get("msg") or "")
        iid = reconcile(v, a.label, window=6, poll=3) if gone else reconcile(v, a.label)
        if iid: log("เกิดขึ้นจริงแล้ว: %s -> adopt" % iid); return _settle(v, iid, a, t0)
        out({"mode":"create","ok":False,"instance_id":None,"error":http_err(e),
             "reason":"create failed, no instance created"})
        die("create ไม่สำเร็จ และไม่มีเครื่องเกิดขึ้น — search offer ใหม่")
    if not r.get("success"): out({"mode":"create","ok":False,"response":redact(r)}); die("success=False")
    iid = r.get("new_contract")                        # ⚠ ไม่ใช่ r["id"]; r มี instance_api_key
    if not iid: out({"mode":"create","ok":False,"response":redact(r)}); die("ไม่มี new_contract")
    log("created instance %s (%.1fs)" % (iid, time.time()-t0))
    return _settle(v, iid, a, t0)

def _env(s):
    if not s: return {}
    from vastai.cli.util import parse_env
    return parse_env(s)

def _settle(v, iid, a, t0=None):
    o = {"mode":"create","instance_id":iid,"ok":False}
    watch = None if getattr(a, "no_watch", False) else LogWatch(v, iid, every=getattr(a, "watch_every", 20))
    try:
        ok,row,why = wait_for(v, iid, UP, timeout=a.timeout, watch=watch)
        o["status"] = g(row,INST,"status")
        if not ok:
            o["reason"] = why
            if watch and watch.hit: o["fatal_log"] = watch.hit
            log("ยังไม่ running: %s — ทำต่อ: destroy --id %s --yes แล้วเลือก offer ใหม่" % (why,iid))
            out(o); return 3 if (watch and watch.hit) else 1
        host,port = ssh_target(row)
        o.update({"ok":True,"gpu":g(row,INST,"gpu"),"gpu_ram_mib":g(row,INST,"gpu_ram"),
                  "dph_total":gf(row,INST,"price"),"rates":rates(row),"ssh_url":v.ssh_url(id=iid),
                  "ssh_host":host,"ssh_port":port,"label":g(row,INST,"label"),"image":g(row,INST,"image"),
                  "seconds_to_running": round(time.time()-t0,1) if t0 else None})
        key = a.key or SSH_KEY_ENV
        if key and host:                    # ทดสอบ SSH ทันที: ทุก endpoint + รันคำสั่งจริง
            chk = ssh_check(row, key, watch=watch); o["ssh"] = chk
            o["ssh_ready"] = bool(chk["chosen"]); o["ssh_ready_after_s"] = chk["after_s"]
            o["ssh_all_ok"] = chk["all_ok"]; o["connect"] = ssh_cmds(ssh_endpoints(row), key, iid)
            if chk["chosen"]:
                o["ssh_host"], o["ssh_port"] = chk["chosen"]["host"], chk["chosen"]["port"]; host, port = o["ssh_host"], o["ssh_port"]
                seen = (chk["endpoints"][chk["chosen"]["name"]].get("gpu") or "")
                want = str(g(row,INST,"gpu") or "").replace("RTX ","")
                if want and want not in seen:
                    o["ok"]=False; o["reason"]="GPU ในเครื่อง (%s) ไม่ตรง offer (%s)" % (seen, g(row,INST,"gpu"))
            else:
                o["ok"]=False; o["reason"]="running แต่ต่อ SSH ไม่ได้ทุก endpoint"
                if watch and watch.hit: o["fatal_log"]=watch.hit; o["reason"]="log fatal: %s" % watch.hit["meaning"]
        if watch: o["log_samples"] = watch.samples
        log("RUNNING %s %s  ssh -p %s root@%s  ($%.4f/hr)" % (iid,o["gpu"],port,host,o["dph_total"]))
        out(o); return 0 if o["ok"] else (3 if o.get("fatal_log") else 1)
    except Exception as e:
        o["reason"]="exception หลัง create: %s" % type(e).__name__; o["error"]=http_err(e)
        log("‼ instance %s ถูกสร้างแล้วและกำลังคิดเงิน — ตรวจด้วย sweep" % iid); out(o); return 1

def cmd_rent(a):
    """เลือก offer ที่ดีที่สุดเองแล้ว create — offer หายก็ลองตัวถัดไป (ไม่ต้องถามผู้ใช้)"""
    v = client(); a.yes = True; a.template_id = a.template_hash = None; a.fresh_offer = None
    cur = instances(v)
    if any(g(i,INST,"label","") == a.label for i in cur):   # idempotent → cmd_create จะ adopt ให้
        a.offer_id, a.machine_id, a.expect_dph = 0, None, None; return cmd_create(a)
    preflight(v, a.label, a.max_instances, a.max_dph, cur=cur)   # guard ที่ไม่ขึ้นกับ offer → fail ทันที ไม่วนลอง offer
    pool, down_cap = tiered_pool(v, a, lambda o: cuda_compatible(o, a.min_cuda) and geo_ok(o, a)
                                                 and gf(o,OFFER,"price",9e9) <= a.max_dph)
    t_found = time.time()
    if not pool: die("ไม่มี offer <= $%.2f/hr ที่ตรงเกณฑ์ (ตัดประเทศ %s แล้ว — --allow-geo เพื่อรวม)" % (a.max_dph, ",".join(sorted(BLOCK_GEO)) or "-"))
    # ผ่าน cap แล้ว = เรียงราคาตามเดิม · fallback = ค่าดาวน์โหลดต่ำก่อน (ปัดเป็นขั้น $0.005 ให้ราคา/ชม. ยังมีผลในขั้นเดียวกัน)
    dkey = (lambda o: 0) if down_cap or not (a.max_down_cost or 0) > 0 else (lambda o: int(gf(o,OFFER,"down_cost") / 0.005))
    cand = sorted(pool, key=lambda o: (gf(o,OFFER,"reliability") < PREFER_REL, dkey(o),
                                       gf(o,OFFER,"price",9e9), -gf(o,OFFER,"inet")))[:a.tries]
    failed = []
    for n, o in enumerate(cand, 1):
        a.offer_id, a.machine_id, a.expect_dph = g(o,OFFER,"id"), g(o,OFFER,"machine"), gf(o,OFFER,"price")
        a.fresh_offer = o if time.time() - t_found < 10 else None   # offer สด ไม่ต้องค้นยืนยันซ้ำ (หายจริง create ได้ 400 → reconcile)
        log("ลอง #%d offer %s %s %s $%.4f/hr rel %.4f net %d down $%.4f/GB" % (n, a.offer_id, g(o,OFFER,"gpu"),
            g(o,OFFER,"geo","-"), a.expect_dph, gf(o,OFFER,"reliability"), gf(o,OFFER,"inet"), gf(o,OFFER,"down_cost")))
        buf = io.StringIO(); real = sys.stdout; sys.stdout = buf     # จับ JSON ของ create เพื่ออ่าน fatal_log
        try:
            rc = cmd_create(a)
        except SystemExit:
            sys.stdout = real
            if by_label(v, a.label): die("มีเครื่อง label %r เกิดแล้ว — หยุดลองต่อ ตรวจด้วย sweep" % a.label)
            log("offer %s ใช้ไม่ได้ → ลองตัวถัดไป" % a.offer_id); continue
        finally:
            sys.stdout = real
        res = {}
        for line in buf.getvalue().splitlines():
            try: res = json.loads(line)
            except ValueError: pass
        if rc == 0 or a.no_replace:
            res.update({"download_per_gb": gf(o,OFFER,"down_cost"), "upload_per_gb": gf(o,OFFER,"up_cost"),
                        "download_cap_per_gb": down_cap})
            out(res); return rc
        # เครื่องเกิดแล้วแต่ใช้ไม่ได้ (log fatal / ค้าง / ssh ไม่ติด) → ลบเครื่องที่เพิ่งสร้างเอง แล้วลองเครื่องถัดไป
        bad = [g(i,INST,"id") for i in by_label(v, a.label)]
        for iid in bad:
            try: v.destroy_instance(id=iid)
            except Exception as e: log("destroy %s: %s" % (iid, http_err(e)))
            log("ลบเครื่องเสีย %s -> %s" % (iid, "หายแล้ว" if verify_gone(v, iid) else "‼ ยังเห็นอยู่"))
        failed.append({"offer_id": a.offer_id, "instance_id": res.get("instance_id"), "reason": res.get("reason"),
                       "fatal_log": res.get("fatal_log")})
        if by_label(v, a.label): die("ลบเครื่อง label %r ไม่หมด — ตรวจด้วย sweep" % a.label)
        fl = res.get("fatal_log") or {}
        if fl.get("scope") == "image":
            out({"mode":"rent","ok":False,"failed":failed})
            die("error ระดับ image (%s) — เปลี่ยนเครื่องไม่ช่วย แก้ image/onstart แล้ว rent ใหม่" % fl.get("meaning"), 3)
        log("เครื่องเสีย (%s) → ลบแล้ว ลอง offer ถัดไป" % res.get("reason"))
    out({"mode":"rent","ok":False,"failed":failed})
    die("ลองครบ %d offers แล้วไม่สำเร็จ — เครื่องที่เสียถูกลบหมดแล้ว · rent ใหม่อีกรอบ" % len(cand))

def cmd_watch(a):
    """เฝ้า init ของ server ที่รันเองในเครื่อง: สุ่มอ่าน Vast logs + ไฟล์ log (ผ่าน SSH) ทุก --every วินาที
    ready (regex ใน log / --probe rc 0) → exit 0 · fatal → exit 3 (+ --destroy-on-fatal ลบเครื่องให้) · timeout → exit 1"""
    v = client(); host, port, key = running_target(v, a)
    pats = FATAL_LOG + APP_FATAL + [(x, "ผู้ใช้กำหนด (--fatal)", "image") for x in (a.fatal or [])]
    ssh = ["ssh","-i",key,"-p",str(port)]+SSH_OPTS+["root@%s"%host]
    rnow = sh(ssh+["date +%s"], 60)[1].strip(); t_remote = int(rnow) if rnow.isdigit() else 0
    def fetch():
        txt = v.logs(instance_id=a.id, tail="200") or ""
        if a.file:                   # log ไฟล์เก่า (mtime ก่อนเริ่ม watch) อาจมี error ของรอบก่อน → ไม่นับ
            r = sh(ssh+["stat -c %%Y %s 2>/dev/null; tail -n %d %s 2>/dev/null" % (a.file, a.lines, a.file)], 60)[1]
            h, _, body = r.partition("\n")
            if h.strip().isdigit() and int(h) >= t_remote: txt += "\n" + body
        return txt
    w = LogWatch(v, a.id, every=0, patterns=pats, fetch=fetch)
    ready_rx = re.compile(a.ready, re.M) if a.ready else None
    t0 = time.time(); last_line = ""
    # log เก่าของรอบก่อนยังค้างอยู่จนกว่า process ใหม่จะ truncate ไฟล์ → นับ ready เฉพาะเมื่อไฟล์ถูกแก้หลังเริ่ม watch (t_remote)
    while time.time()-t0 < a.timeout:
        hit = w.check(force=True)
        if hit: break
        txt = sh(ssh+["stat -c %%Y %s 2>/dev/null; tail -n %d %s 2>/dev/null" % (a.file, a.lines, a.file)], 60)[1] if a.file else ""
        head, _, txt = txt.partition("\n")
        fresh = (not a.file) or (head.strip().isdigit() and int(head) >= t_remote)
        tail = (txt.strip().splitlines() or [""])[-1][:150]
        if tail != last_line: log("  [%3ds] %s" % (time.time()-t0, tail)); last_line = tail
        if (ready_rx and fresh and ready_rx.search(txt)) or (a.probe and sh(ssh+[a.probe], 60)[0] == 0):
            out({"mode":"watch","id":a.id,"ready":True,"seconds":round(time.time()-t0),"samples":w.samples}); return 0
        # "[s]erver.py" กัน pgrep เจอ shell ของ ssh เองที่มีข้อความ pattern อยู่ใน command line
        if a.alive:
            rc_ = sh(ssh+["pgrep -f %s >/dev/null" % json.dumps("[%s]%s" % (a.alive[0], a.alive[1:]))], 60)[0]
            if rc_ == 255:                  # ssh ต่อไม่ได้ ≠ process ตาย (เจอจริง: direct port ตายกลางทาง) → หา endpoint ใหม่
                log("  ssh หลุด (rc 255) → เลือก endpoint ใหม่"); host, port, key = running_target(v, a)
                ssh[:] = ["ssh","-i",key,"-p",str(port)]+SSH_OPTS+["root@%s"%host]; time.sleep(a.every); continue
        if a.alive and rc_ == 1:
            w.hit = {"line": tail, "meaning": "process %r ไม่อยู่แล้ว (ตายระหว่าง init)" % a.alive, "scope": "image"}; break
        time.sleep(a.every)
    o = {"mode":"watch","id":a.id,"ready":False,"seconds":round(time.time()-t0),"samples":w.samples,
         "fatal_log":w.hit,"reason":"log fatal" if w.hit else "timeout %ds" % a.timeout}
    if w.hit and a.destroy_on_fatal:   # flag นี้คือการอนุญาตล่วงหน้าของผู้ใช้ให้ลบเครื่องที่ init พัง
        try: v.destroy_instance(id=a.id)
        except Exception as e: log("destroy: %s" % http_err(e))
        o["destroyed"] = verify_gone(v, a.id); log("ลบเครื่อง %s -> %s" % (a.id, o["destroyed"]))
    out(o); return 3 if w.hit else 1

def cmd_life(a):
    v = client()
    try: row = v.show_instance(id=a.id)
    except Exception as e:
        if http_err(e).get("code") == 404: out({"id":a.id,"exists":False}); return 0
        die("show_instance: %s" % json.dumps(http_err(e), ensure_ascii=False))
    if row is None: out({"id":a.id,"exists":False}); return 0
    st = g(row,INST,"status"); log("before: " + fmt_inst(row))
    if a.action == "status":
        out({"id":a.id,"exists":True,"actual_status":st,"intended_status":g(row,INST,"intended"),
             "cur_state":g(row,INST,"cur"),"status_msg":g(row,INST,"msg"),"rates":rates(row),
             "uptime_s":round(gf(row,INST,"duration"))}); return 0
    want = DOWN if a.action=="stop" else UP     # ⚠ 'created'/None ไม่นับเป็น "หยุดแล้ว"
    if st in want:
        log("already %r -> no-op"%st); out({"id":a.id,"actual_status":st,"ok":True,"noop":True}); return 0
    getattr(v, "%s_instance" % a.action)(id=a.id)
    ok,row,why = wait_for(v, a.id, want, timeout=a.timeout)
    log("after: %s (%s)" % (fmt_inst(row), why))
    if a.action=="stop" and ok:
        log("⚠ stopped แล้วยังเสียค่า storage $%.5f/hr — destroy เท่านั้นที่หยุดทุกอย่าง"
            % rates(row)["storage_per_hr"])
    out({"id":a.id,"actual_status":g(row,INST,"status"),"ok":bool(ok),"reason":why,"rates":rates(row)})
    return 0 if ok else 1

def cmd_destroy(a):
    ids = a.id or []
    if not (ids or a.label or a.label_prefix): die("ต้องระบุ --id / --label / --label-prefix")
    v = client(); rows = instances(v); byid = {g(r,INST,"id"): r for r in rows}
    tgt, gone = [], []
    for i in ids: (tgt.append(byid[i]) if i in byid else gone.append(i))
    if a.label:        tgt += [r for r in rows if g(r,INST,"label","")==a.label]
    if a.label_prefix: tgt += [r for r in rows if str(g(r,INST,"label","")).startswith(a.label_prefix)]
    seen, uniq = set(), []
    for r in tgt:
        if g(r,INST,"id") not in seen: seen.add(g(r,INST,"id")); uniq.append(r)
    if LABEL_PREFIX:
        blocked = [g(r,INST,"id") for r in uniq if not str(g(r,INST,"label","")).startswith(LABEL_PREFIX)]
        if blocked: die("VAST_LABEL_PREFIX=%r แต่เป้าหมาย %s ไม่ตรง — ปฏิเสธการลบ" % (LABEL_PREFIX, blocked))
    if not uniq: out({"destroyed":[],"already_gone":gone,"note":"ไม่มีอะไรต้องลบ"}); return 0
    if len(uniq) > MAX_DESTROY: die("เป้าหมาย %d เครื่อง เกินเพดาน %d" % (len(uniq), MAX_DESTROY))
    log("จะลบถาวร %d เครื่อง (ข้อมูลหายหมด กู้ไม่ได้):" % len(uniq))
    for r in uniq: log("  " + fmt_inst(r))
    if a.dry_run: out({"dry_run":True,"would_destroy":[g(r,INST,"id") for r in uniq]}); return 0
    if not a.yes: die("ต้องใส่ --yes (ผู้ใช้ยืนยันแล้ว)")
    done, failed = [], []
    for r in uniq:
        iid = g(r,INST,"id")
        try: v.destroy_instance(id=iid)
        except Exception as e: log("destroy %s: %s" % (iid, json.dumps(http_err(e), ensure_ascii=False)))
        ok = verify_gone(v, iid); (done if ok else failed).append(iid)
        log("destroy %s -> %s" % (iid, "หายจาก show_instances() แล้ว" if ok else "ยังเห็นอยู่"))
    out({"destroyed":done,"failed":failed,"already_gone":gone}); return 1 if failed else 0

def cmd_sweep(a):
    v = client(); user = v.show_user() or {}; rows = instances(v)
    if a.label_prefix: rows = [r for r in rows if str(g(r,INST,"label","")).startswith(a.label_prefix)]
    burn = spent = 0.0; items = []
    for r in rows:
        rt = rates(r); up = gf(r,INST,"duration")/3600.0
        burn += rt["effective_per_hr"]; spent += rt["effective_per_hr"]*up
        items.append({"id":g(r,INST,"id"),"label":g(r,INST,"label"),"status":g(r,INST,"status"),
                      "gpu":g(r,INST,"gpu"),"uptime_h":round(up,2),
                      "approx_spent_usd":round(rt["effective_per_hr"]*up,4), **rt})
    stale = [i["id"] for i in items if a.older_than is not None and i["uptime_h"]*60 > a.older_than]
    cred = float(user.get("credit") or 0)
    o = {"instances":len(items),"items":items,"burn_rate_per_hr":round(burn,5),
         "approx_spent_since_start_usd":round(spent,4),"credit_remaining_usd":round(cred,2),
         "hours_of_credit_left": round(cred/burn,1) if burn else None,"stale":stale}
    if a.json: out(o)
    elif not items: print("instances: 0 — ไม่มีเครื่องค้าง\ncredit เหลือ ~$%.2f" % cred)
    else:
        print("instances: %d" % len(items))
        for r in rows: print("  " + fmt_inst(r))
        print("burn ~$%.5f/hr | ใช้ไปแล้ว ~$%.4f | credit ~$%.2f" % (burn, spent, cred))
        if o["hours_of_credit_left"]: print("เครดิตพอไปอีก ~%.1f ชม." % o["hours_of_credit_left"])
        if stale: print("[!] เกิน %s นาที: %s" % (a.older_than, stale))
        print("stopped ยังเสียค่า storage — destroy เท่านั้นที่หยุดทุกอย่าง")
    return 1 if (items or stale) else 0

def charges(v, days):
    """ค่าใช้จ่ายจริงจาก show_invoices_v1(charges=True) — แยก gpu/disk/bwd/bwu ต่อ instance, มี label แม้เครื่องถูกลบแล้ว
    (show_invoices() เก่า deprecated ใน 1.8 และ bucket อัปเดตช้ากว่า)"""
    end = int(time.time()) + 86400; start = end - int((days or 7) * 86400) - 86400
    rows, tok = [], None
    for _ in range(50):
        kw = dict(charges=True, start_date=start, end_date=end, limit=100, latest_first=True)
        if tok: kw["next_token"] = tok
        r = v.show_invoices_v1(**kw) or {}
        rows += r.get("results") or []; tok = r.get("next_token")
        if not tok: break
    return rows

def cmd_bill(a):
    """สรุปค่าใช้จ่ายจริง แยก GPU/storage/download/upload ต่อ instance + สถิติรวม"""
    v = client(); user = v.show_user() or {}
    ids = set(a.id or []); kinds = ("gpu","storage","download","upload")
    kmap = {"gpu":"gpu","disk":"storage","bwd":"download","bwu":"upload"}
    per, total = {}, {k:0.0 for k in kinds}
    for x in charges(v, a.days):
        m = re.match(r"instance-(\d+)$", str(x.get("source") or ""))
        if x.get("type") != "instance" or not m: continue
        iid = int(m.group(1)); lb = str((x.get("metadata") or {}).get("label") or "")
        if ids or a.label or a.label_prefix:
            if not (iid in ids or (a.label and lb == a.label)
                    or (a.label_prefix and lb.startswith(a.label_prefix))): continue
        d = per.setdefault(iid, {"instance_id":iid, "label":lb, **{k:0.0 for k in kinds},
                                 "gpu_hours":0.0, "download_gb":0.0, "gpu_rate":None, "download_rate":None})
        for it in x.get("items") or []:
            k = kmap.get(it.get("type"))
            if not k: continue
            amt = float(it.get("amount") or 0); d[k] += amt; total[k] += amt
            desc = str(it.get("description") or "")
            n = re.match(r"([\d.]+) (?:hours|GB)[^$]*\$([\d.]+)", desc)
            if n and k == "gpu": d["gpu_hours"] += float(n.group(1)); d["gpu_rate"] = float(n.group(2))
            if n and k == "download": d["download_gb"] += float(n.group(1)); d["download_rate"] = float(n.group(2))
    for d in per.values(): d["total"] = round(sum(d[k] for k in kinds), 3)
    grand = round(sum(total.values()), 3)
    o = {"instances":[per[k] for k in sorted(per)], "total":{**{k:round(v_,3) for k,v_ in total.items()}, "usd":grand},
         "credit_remaining_usd": round(float(user.get("credit") or 0), 2),
         "note": "charges เป็น bucket รายวัน ยอดล่าสุดอาจช้ากว่าเวลาจริงหลักนาที"}
    if a.json: out(o); return 0
    if not per: print("ไม่พบรายการ charge ตามตัวกรองในช่วง %s วัน" % (a.days or 7)); return 0
    print("%-10s %-22s %7s %8s %9s %8s %8s %7s  %s" % ("instance","label","gpu_h","GPU$","storage$","down_GB","down$","up$","total$"))
    for d in o["instances"]:
        print("%-10d %-22s %7.3f %8.3f %9.3f %8.2f %8.3f %7.3f  %.3f" % (d["instance_id"], d["label"][:22], d["gpu_hours"],
              d["gpu"], d["storage"], d["download_gb"], d["download"], d["upload"], d["total"]))
        if d["download"] > d["gpu"]: print("   [!] ค่าดาวน์โหลด ($%.3f/GB) แพงกว่าค่า GPU — rent/plan ค้น inet_down_cost<$%s/GB ก่อนแล้ว (อย่าใส่ --max-down-cost 0)" % (d["download_rate"] or 0, MAX_DOWN_COST))
    print("รวม: GPU $%.3f + storage $%.3f + download $%.3f + upload $%.3f = **$%.3f** | credit เหลือ ~$%.2f"
          % (total["gpu"], total["storage"], total["download"], total["upload"], grand, o["credit_remaining_usd"]))
    print(o["note"]); return 0

def cmd_run(a):
    v = client(); host, port, key = running_target(v, a)
    ok, w = ssh_ready(host, port, key, tries=6)
    if not ok: die("ต่อ SSH ไม่ได้ใน %ds" % w)
    rc, o_, e_ = sh(["ssh","-i",key,"-p",str(port)]+SSH_OPTS+["root@%s"%host, a.cmd], a.timeout)
    sys.stderr.write(e_); sys.stdout.write(o_); return rc

def cmd_connect(a):
    """ทดสอบ SSH ทั้ง direct และ proxy ของเครื่องที่ running แล้วคืนคำสั่ง ssh/scp + ~/.ssh/config ของทุกทาง
    exit 0 = ใช้ได้ทุกทาง · 1 = ใช้ได้บางทาง · 2 = ใช้ไม่ได้เลย"""
    v = client(); row = v.show_instance(id=a.id)
    if row is None: die("ไม่มี instance %s" % a.id)
    if g(row,INST,"status") != "running": die("instance %s = %r ไม่ใช่ running" % (a.id, g(row,INST,"status")))
    key = need_key(a); chk = ssh_check(row, key, tries=a.tries, poll=10, settle=a.tries)
    cmds = ssh_cmds(ssh_endpoints(row), key, a.id)
    for n, c in cmds.items(): c.update({k: chk["endpoints"].get(n, {}).get(k) for k in ("ok","gpu","err")})
    out({"mode":"connect","id":a.id,"all_ok":chk["all_ok"],"chosen":chk["chosen"],"endpoints":cmds})
    return 0 if chk["all_ok"] else (1 if chk["chosen"] else 2)

def cmd_xfer(a):
    v = client(); host, port, key = running_target(v, a)
    ok, w = ssh_ready(host, port, key, tries=6)
    if not ok: die("ต่อ SSH ไม่ได้ใน %ds" % w)
    base = ["-i", key] + SSH_OPTS
    if a.action == "push":
        # ⚠ image ตระกูล nvidia/cuda ไม่มี /workspace — ต้อง mkdir ก่อน
        rdir = a.dst if a.dst.endswith("/") else (os.path.dirname(a.dst) or "/")
        rc,_,e_ = sh(["ssh"]+base+["-p",str(port),"root@%s"%host,"mkdir -p %s"%rdir], 120)
        if rc: die("mkdir -p %s ล้มเหลว: %s" % (rdir, e_.strip()[:200]))
        rc,_,e_ = sh(["scp","-r"]+base+["-P",str(port),a.src,"root@%s:%s"%(host,a.dst)], a.timeout)
        probe = a.dst.rstrip("/") + ("/"+os.path.basename(a.src.rstrip("/")) if a.dst.endswith("/") else "")
        vrc,vo,_ = sh(["ssh"]+base+["-p",str(port),"root@%s"%host,"ls -ld %s"%probe], 120)
        out({"action":"push","rc":rc,"verified":vrc==0,"remote":probe,
             "ls":vo.strip()[:200],"err":e_.strip()[:300]})
        return 0 if (rc==0 and vrc==0) else 1
    os.makedirs(a.dst if a.dst.endswith("/") else (os.path.dirname(a.dst) or "."), exist_ok=True)
    rc,_,e_ = sh(["scp","-r"]+base+["-P",str(port),"root@%s:%s"%(host,a.src),a.dst], a.timeout)
    guess = os.path.join(a.dst, os.path.basename(a.src.rstrip("/")))
    landed = guess if os.path.exists(guess) else a.dst
    out({"action":"pull","rc":rc,"verified":os.path.exists(landed),"local":landed,"err":e_.strip()[:300]})
    return 0 if (rc==0 and os.path.exists(landed)) else 1

def cmd_drift(a):
    """รันหลัง pip install -U vastai — รายงานเฉพาะจุดที่เปลี่ยน"""
    import inspect, importlib.metadata as md
    from vastai import VastAI
    from vastai.api import instances as I, client as C
    cur = {"python": "%d.%d.%d" % sys.version_info[:3], "vastai": md.version("vastai")}
    d = []
    for k, want in (("python",VERIFIED["python"]), ("vastai",VERIFIED["vastai"])):
        if cur[k] != want: d.append((k.upper(), want, cur[k]))
    for m, want in SIGS.items():
        f = I.create_instance if m.startswith("api.") else getattr(VastAI, m, None)
        got = (",".join(p for p in inspect.signature(f).parameters if p != "self")
               if f else "MISSING")
        if got != want: d.append((m, want, got))
    beh = {"default_retry": inspect.signature(C.VastClient.__init__).parameters["retry"].default,
           "retryable_status": sorted(getattr(C,"_RETRYABLE_STATUS",[])),
           "default_timeout_s": getattr(C,"_DEFAULT_TIMEOUT_SECONDS",None)}
    for k, got in beh.items():
        if BEHAVIOUR.get(k) != got: d.append(("behaviour."+k, BEHAVIOUR.get(k), got))
    live = None
    if a.live:
        v = client()
        o = search(v, "rentable=true num_gpus=1", 40)
        if o: d += [("live offer_fields[%s]"%k, f, "<<ไม่มีใน response>>")
                    for k,f in OFFER.items() if f not in o[0]]
        r = instances(v)
        if r: d += [("live instance_fields[%s]"%k, f, "<<ไม่มีใน response>>")
                    for k,f in INST.items() if f not in r[0] and k != "ports"]
        live = {"offers_checked": bool(o), "instances_checked": bool(r)}
    if a.json: out({"drift":[{"what":x[0],"was":x[1],"now":x[2]} for x in d],"live":live,"current":cur})
    elif not d:
        print("no drift — python %s / vastai %s ตรงกับ snapshot" % (cur["python"], cur["vastai"]))
        if live and not live["instances_checked"]: print("(ไม่มี instance รันอยู่ จึงไม่ได้เช็ค instance_fields)")
    else:
        print("DRIFT %d จุด (python %s / vastai %s):" % (len(d), cur["python"], cur["vastai"]))
        for w,a_,b_ in d: print("  - %s\n      was: %s\n      now: %s" % (w,a_,b_))
        print("\nแก้ที่ส่วน 'SDK CONTRACT' ด้านบนของไฟล์นี้ แล้วอัปเดต SKILL.md")
    return 1 if d else 0

def cmd_keys(a):
    """ตรวจ/ผูก ssh key กับบัญชี — instance ใหม่จะรับคีย์นี้อัตโนมัติ"""
    pub, src = pubkey()
    if not pub: die(src)
    v = client()
    reg = v.show_ssh_keys() or []
    def norm(k): return " ".join(str(k or "").split()[:2])      # type+base64 (ตัด comment)
    mine = [k for k in reg if norm(k.get("public_key")) == norm(pub)]
    o = {"pubkey_source": src, "fingerprint": fingerprint(),
         "registered": bool(mine), "key_id": (mine[0].get("id") if mine else None),
         "keys_on_account": len(reg)}
    if not mine and a.attach:
        r = v.create_ssh_key(ssh_key=pub)
        time.sleep(3)
        reg = v.show_ssh_keys() or []
        mine = [k for k in reg if norm(k.get("public_key")) == norm(pub)]
        o["attached"] = bool(mine); o["key_id"] = mine[0].get("id") if mine else None
        o["response"] = redact(r if isinstance(r, dict) else {"resp": str(r)[:200]})
    elif not mine:
        o["hint"] = "ยังไม่ผูกกับบัญชี — รัน: python vast.py keys --attach"
    out(o)
    return 0 if o.get("registered") or o.get("attached") else 1


def cmd_env(a):
    """แสดงว่าโหลด .env จากไหนและได้ค่าอะไร — ไม่โชว์ค่า secret"""
    o = {"env_file": ENV_FILE or "<ไม่พบไฟล์>", "env_file_exists": bool(ENV_FILE),
         "searched": env_paths(), "permission_warning": ENV_WARN,
         "VAST_API_KEY": "<set len=%d>" % len(os.environ.get("VAST_API_KEY","").strip())
                          if KEY_SOURCE != "missing" else "<MISSING>",
         "VAST_API_KEY_source": KEY_SOURCE, "VAST_API_KEY_notice": KEY_NOTICE,
         "VAST_SSH_KEY_FILE": SSH_KEY_ENV or "<unset>",
         "ssh_key_readable": bool(SSH_KEY_ENV and os.path.isfile(SSH_KEY_ENV)),
         "ssh_fingerprint": fingerprint() if SSH_KEY_ENV else None,
         "ssh_pubkey_from": pubkey()[1] if SSH_KEY_ENV else None,
         "VAST_LABEL_PREFIX": LABEL_PREFIX or "<unset — ไม่มี guard กันแตะเครื่องอื่น>",
         "VAST_MAX_DPH": MAX_DPH, "VAST_MAX_INSTANCES": MAX_INSTANCES,
         "VAST_MAX_DESTROY": MAX_DESTROY, "VAST_HTTP_TIMEOUT": HTTP_TIMEOUT, "VAST_MAX_DOWN_COST": MAX_DOWN_COST}
    out(o)
    return 0 if KEY_SOURCE != "missing" else 1

# ===== argparse ==========================================================================
def main():
    p = argparse.ArgumentParser(prog="vast.py"); s = p.add_subparsers(dest="action", required=True)
    def common(q, ssh=False):
        q.add_argument("--timeout", type=int, default=900)
        if ssh:
            q.add_argument("--key", default=None)
            q.add_argument("--via", default="auto", choices=("auto","direct","proxy"),
                           help="ทาง SSH: auto = direct ก่อน ต่อไม่ได้สลับ proxy")
    for name in ("plan","create"):
        q = s.add_parser(name); q.add_argument("--label", required=True)
        q.add_argument("--image", default=DEFAULT_IMAGE); q.add_argument("--disk", type=float, default=40)
        q.add_argument("--max-dph", type=float, default=MAX_DPH); q.add_argument("--key", default=None)
        q.add_argument("--timeout", type=int, default=900)
        if name == "plan":
            q.add_argument("--gpu"); q.add_argument("--num-gpus", type=int, default=1)
            q.add_argument("--min-cuda", default="12.4"); q.add_argument("--min-inet", type=int, default=500)
            q.add_argument("--allow-geo", action="store_true", help="ไม่ตัดประเทศใน VAST_BLOCK_GEO")
            q.add_argument("--min-gpu-ram", type=int, help="หน่วย GB"); q.add_argument("--extra-query", default="")
            q.add_argument("--template-id",type=int,help="ใช้ disk ขั้นต่ำและ template_hash จาก template นี้")
            q.add_argument("--max-down-cost", type=float, default=MAX_DOWN_COST,
                           help="$/GB ค่าดาวน์โหลด: หา offer ต่ำกว่านี้ก่อน ไม่มีค่อย fallback · 0 = ปิด")
        else:
            q.add_argument("--offer-id", type=int, required=True); q.add_argument("--machine-id", type=int)
            q.add_argument("--expect-dph", type=float); q.add_argument("--yes", action="store_true")
            q.add_argument("--template-id",type=int); q.add_argument("--template-hash")
            q.add_argument("--runtype", default="ssh_direct", choices=sorted(RUNTYPE))
            q.add_argument("--onstart-cmd", default=DEFAULT_ONSTART)
            q.add_argument("--no-watch", action="store_true"); q.add_argument("--watch-every", type=int, default=20)
            q.add_argument("--env", default=""); q.add_argument("--max-instances", type=int, default=MAX_INSTANCES)
    q = s.add_parser("rent"); q.add_argument("--label", required=True)
    q.add_argument("--gpu"); q.add_argument("--num-gpus", type=int, default=1)
    q.add_argument("--min-cuda", default="12.4"); q.add_argument("--min-inet", type=int, default=500)
    q.add_argument("--allow-geo", action="store_true", help="ไม่ตัดประเทศใน VAST_BLOCK_GEO")
    q.add_argument("--min-gpu-ram", type=int, help="หน่วย GB"); q.add_argument("--extra-query", default="")
    q.add_argument("--image", default=DEFAULT_IMAGE); q.add_argument("--disk", type=float, default=40)
    q.add_argument("--max-dph", type=float, default=MAX_DPH); q.add_argument("--key", default=None)
    q.add_argument("--timeout", type=int, default=900); q.add_argument("--tries", type=int, default=5)
    q.add_argument("--runtype", default="ssh_direct", choices=sorted(RUNTYPE))
    q.add_argument("--onstart-cmd", default=DEFAULT_ONSTART)
    q.add_argument("--env", default=""); q.add_argument("--max-instances", type=int, default=MAX_INSTANCES)
    q.add_argument("--no-watch", action="store_true", help="ไม่ต้องสุ่มอ่าน log ระหว่าง init")
    q.add_argument("--watch-every", type=int, default=20, help="อ่าน log ทุกกี่วินาที")
    q.add_argument("--no-replace", action="store_true", help="เครื่องเสียแล้วไม่ต้องลบ+เปลี่ยนเครื่องให้")
    q.add_argument("--max-down-cost", type=float, default=MAX_DOWN_COST,
                   help="$/GB ค่าดาวน์โหลด: หา offer ต่ำกว่านี้ก่อน ไม่มีค่อย fallback · 0 = ปิด")
    q = s.add_parser("watch"); q.add_argument("--id", type=int, required=True)
    q.add_argument("--file", help="log ไฟล์ในเครื่อง เช่น /workspace/server.log"); q.add_argument("--lines", type=int, default=300)
    q.add_argument("--ready", help="regex ใน log = พร้อม"); q.add_argument("--probe", help="คำสั่งในเครื่อง rc 0 = พร้อม")
    q.add_argument("--fatal", action="append", help="regex fatal เพิ่มเติม"); q.add_argument("--every", type=int, default=15)
    q.add_argument("--alive", help="pattern ของ process (pgrep -f) ที่ต้องยังอยู่ เช่น server.py — หายไป = fatal")
    q.add_argument("--timeout", type=int, default=1800); q.add_argument("--destroy-on-fatal", action="store_true")
    q.add_argument("--key", default=None); q.add_argument("--via", default="auto", choices=("auto","direct","proxy"))
    q = s.add_parser("connect"); q.add_argument("--id", type=int, required=True)
    q.add_argument("--key", default=None); q.add_argument("--tries", type=int, default=3, help="รอบทดสอบต่อ endpoint (ห่าง 10 s)")
    for name in ("status","stop","start"):
        q = s.add_parser(name); q.add_argument("--id", type=int, required=True)
        q.add_argument("--timeout", type=int, default=420)
    q = s.add_parser("destroy"); q.add_argument("--id", type=int, action="append")
    q.add_argument("--label"); q.add_argument("--label-prefix")
    q.add_argument("--yes", action="store_true"); q.add_argument("--dry-run", action="store_true")
    q = s.add_parser("sweep"); q.add_argument("--json", action="store_true")
    q.add_argument("--older-than", type=float); q.add_argument("--label-prefix")
    q = s.add_parser("run"); q.add_argument("--id", type=int, required=True)
    q.add_argument("--cmd", required=True); common(q, ssh=True)
    for name in ("push","pull"):
        q = s.add_parser(name); q.add_argument("--id", type=int, required=True)
        q.add_argument("--src", required=True); q.add_argument("--dst", required=True); common(q, ssh=True)
    q = s.add_parser("bill"); q.add_argument("--id", type=int, action="append", help="instance id (ระบุได้หลายครั้ง)")
    q.add_argument("--label"); q.add_argument("--label-prefix"); q.add_argument("--days", type=float, help="ย้อนหลัง N วัน (default 7)")
    q.add_argument("--json", action="store_true")
    q = s.add_parser("drift"); q.add_argument("--live", action="store_true")
    q.add_argument("--json", action="store_true")
    q = s.add_parser("env")          # ตรวจว่าอ่าน .env ได้ครบไหม (ไม่โชว์ค่า secret)
    q = s.add_parser("keys"); q.add_argument("--attach", action="store_true",
                                             help="ผูก public key กับบัญชีถ้ายังไม่ได้ผูก")
    q=s.add_parser("template-search"); q.add_argument("--mine",action="store_true")
    q.add_argument("--all",action="store_true"); q.add_argument("--name")
    q.add_argument("--limit",type=int,default=100)
    q=s.add_parser("template-show"); q.add_argument("--id",type=int,required=True)
    q=s.add_parser("template-create"); q.add_argument("--name",required=True); q.add_argument("--image",required=True)
    q.add_argument("--image-tag",required=True); q.add_argument("--disk",type=float,required=True)
    q.add_argument("--desc"); q.add_argument("--env"); q.add_argument("--onstart-cmd")
    q.add_argument("--ssh",action=argparse.BooleanOptionalAction,default=True)
    q.add_argument("--jupyter",action=argparse.BooleanOptionalAction,default=False)
    q.add_argument("--direct",action=argparse.BooleanOptionalAction,default=True)
    q.add_argument("--jupyter-lab",action=argparse.BooleanOptionalAction,default=False)
    q.add_argument("--jupyter-dir"); q.add_argument("--hide-readme",action="store_true")
    q.add_argument("--public",action="store_true"); q.add_argument("--yes",action="store_true")
    q=s.add_parser("template-update"); q.add_argument("--id",type=int,required=True)
    q.add_argument("--name"); q.add_argument("--image"); q.add_argument("--image-tag"); q.add_argument("--disk",type=float)
    q.add_argument("--desc"); q.add_argument("--env"); q.add_argument("--onstart-cmd")
    q.add_argument("--ssh",action=argparse.BooleanOptionalAction,default=None)
    q.add_argument("--jupyter",action=argparse.BooleanOptionalAction,default=None)
    q.add_argument("--direct",action=argparse.BooleanOptionalAction,default=None)
    q.add_argument("--jupyter-lab",action=argparse.BooleanOptionalAction,default=None)
    q.add_argument("--jupyter-dir"); q.add_argument("--public",action=argparse.BooleanOptionalAction,default=None)
    q.add_argument("--yes",action="store_true")
    q=s.add_parser("template-delete"); q.add_argument("--id",type=int,required=True)
    q.add_argument("--dry-run",action="store_true"); q.add_argument("--yes",action="store_true")
    a = p.parse_args()
    return {"env":cmd_env,"keys":cmd_keys,"plan":cmd_plan,"rent":cmd_rent,"create":cmd_create,"status":cmd_life,"stop":cmd_life,"start":cmd_life,"bill":cmd_bill,
            "destroy":cmd_destroy,"sweep":cmd_sweep,"run":cmd_run,"push":cmd_xfer,"pull":cmd_xfer,
            "drift":cmd_drift,"watch":cmd_watch,"connect":cmd_connect,"template-search":cmd_template_search,"template-show":cmd_template_show,
            "template-create":cmd_template_create,"template-update":cmd_template_update,
            "template-delete":cmd_template_delete}[a.action](a)

if __name__ == "__main__":
    raise SystemExit(main())
VASTPY
python /tmp/vast.py env            # ต้องเห็น VAST_API_KEY:<set …> · ดู VAST_API_KEY_source แล้วแจ้งผู้ใช้ (หัวข้อ .env)
```

ทุก subcommand อ่าน `.env` เองแล้ว — ไม่ต้อง `source` และไม่ต้อง `export` อะไรก่อนรัน

---

## RUNBOOK 1 — CREATE

> เป้า: "อยากได้ GPU X" → running + SSH ต่อได้ ใน **คำสั่งเดียว ไม่ต้องถามผู้ใช้** และไม่มีเครื่องซ้ำแม้ error

| # | รัน | ต้องเห็นจึงไปต่อ | ถ้าไม่เห็น |
|--:|:--|:--|:--|
| 0 | `python /tmp/vast.py env && python /tmp/vast.py keys` | `VAST_API_KEY:<set …>` (ถ้า `VAST_API_KEY_source` ≠ `environment` → แจ้งผู้ใช้) · `ssh_key_readable:true` · `registered:true` | ตั้งค่าใน `.env` ให้ครบ แล้ว `keys --attach` (ดูหัวไฟล์) |
| 1 | `python /tmp/vast.py sweep` | จำนวนเครื่อง + เครดิต > ค่าใช้จ่ายที่คาด × 2 | เครดิตไม่พอ → หยุด แจ้งผู้ใช้ |
| 2 | `python /tmp/vast.py rent --label <unique> [--gpu RTX_4090] [--min-gpu-ram 24] [--max-dph 0.45]` | เลือก offer ดีสุดเอง + create + wait running + SSH (+ เฝ้า log, เครื่องเสีย = ลบ+เปลี่ยนเครื่องเอง — RUNBOOK 1b) → `{"ok":true,"instance_id":N,"ssh_ready":true,"chosen":{…}}` — ของจริง **41–96 s** | `ไม่มี offer <= $X` → ผ่อนเกณฑ์อื่นหรือรายงานผู้ใช้ · ลองครบ `--tries` แล้ว offer หายหมด → `rent` ใหม่อีกรอบ · `"ok":false`+`reason` → ดูตาราง state machine |
| 3 | (ทางเลือก) `plan` + `create --offer-id …` | ใช้เมื่อผู้ใช้อยากเลือก offer เองเท่านั้น | |
| 5 | `python /tmp/vast.py run --id N --cmd "nvidia-smi"` | ชื่อ GPU + VRAM **ตรงกับ offer** | ดู error playbook |
| 6 | `python /tmp/vast.py connect --id N` | `all_ok:true` — ต่อได้ทั้ง direct และ proxy | ได้ทางเดียว (exit 1) → ใช้ทางที่ได้ไปก่อน แล้ว `connect` ซ้ำภายหลัง · ไม่ได้เลย (exit 2) → error playbook #6 #11 #28 |

preflight อัตโนมัติ — ผ่านครบถึงจะยิง create: label ไม่ซ้ำ (ซ้ำ = **adopt ตัวเดิม**) · จำนวนเครื่อง < เพดาน ·
`machine_id=` ยืนยัน offer ยังอยู่ **และราคา ≤ เพดาน** · kwargs ทุกตัวอยู่ใน `CREATE_KWARGS`

**create พัง = ห้าม retry** → `reconcile()` หาเครื่องจาก label ก่อน (เกิดแล้ว→adopt / ไม่เกิด→`plan` ใหม่)
label คือ **idempotency key ตัวเดียวที่ Vast มี** → ทุก create ต้องมี label unique

### TEMPLATE — Python SDK

```bash
python /tmp/vast.py template-search                         # recommended templates
python /tmp/vast.py template-search --mine                  # templates ของบัญชีนี้
python /tmp/vast.py template-search --name PyTorch --limit 10
python /tmp/vast.py template-show --id 561636
python /tmp/vast.py plan --label job-1 --template-id 561636 # ใช้ disk ขั้นต่ำ + template_hash
```

`vastai 1.5.5` มี type annotation ของ `search_templates(query)` เป็น string (1.8.2 แก้เป็น `str|dict` แล้ว) แต่ implementation จริงส่ง
`query` ตรงเข้า `select_filters` และต้องเป็น dict เช่น `{"recommended":{"eq":True}}`; toolkit ใช้ dict แล้ว

`extra_filters` จาก API เป็น JSON string (บางรายการเก่าถูก encode ซ้ำ) แต่ `update_template()` ต้องการ dict:
toolkit decode ได้ถึง 3 ชั้น, แปลง `cuda_max_good→cuda_vers` และ GPU RAM จาก MB→GB สำหรับ query,
ใส่ filter เข้า offer search แล้วตรวจซ้ำกับ response หน่วย MiB ก่อนอนุญาต create

การเปลี่ยน Template ต้องถามผู้ใช้ก่อนทุกครั้ง และแสดง name/image:tag/disk/visibility/launch mode:

```bash
python /tmp/vast.py template-create --name NAME --image REPO --image-tag TAG --disk 32 --ssh --direct --yes
python /tmp/vast.py template-update --id N --image-tag TAG --yes
python /tmp/vast.py template-delete --id N --dry-run
# ถามยืนยันพร้อม id + name แล้วจึง:
python /tmp/vast.py template-delete --id N --yes
```

`template-create` ใช้ `retry=1`, ห้ามชื่อซ้ำ และ reconcile ด้วย creator/name/image/tag เพราะ response สำเร็จอาจไม่คืน id/hash ·
`update_template()` ส่งค่า default ทับ field ที่ไม่ระบุได้ จึงต้องอ่าน template เดิม, preserve launch flags ทุกตัว,
merge ทุก field ก่อน PUT และอ่านกลับ verify · output ไม่คืน `env`, docker login, onstart หรือ readme เพราะอาจมี secret ·
สร้าง instance จาก template ยังต้อง `plan` ราคา offer และถามยืนยันค่าใช้จ่ายเหมือน create ปกติ
โดย `create` ต้องรับทั้ง `--template-id` และ `--template-hash` เพื่อยืนยันว่า hash ไม่เปลี่ยน, disk พอ และ offer compatible

## SSH — ต่อได้ 2 ทาง (direct + proxy)

ทุกเครื่องมี SSH 2 ทาง และ toolkit ทดสอบ/ใช้ได้ทั้งคู่:

| ทาง | host:port มาจาก | ข้อดี | ข้อเสีย |
|:--|:--|:--|:--|
| `direct` | `public_ipaddr` + `ports["22/tcp"][0].HostPort` | เร็ว ไม่ผ่านตัวกลาง · ใช้ map port อื่น (HTTP) ได้ด้วย | network ของ host หลุดชั่วคราวได้ (playbook #31) · บางเครื่องไม่มี |
| `proxy` | `ssh_host` (`sshN.vast.ai`) + `ssh_port` | มีทุกเครื่อง · รอดตอน direct หลุด | ผ่านตัวกลางของ Vast (ช้ากว่าเล็กน้อย) · บาง template แบบ direct proxy เสีย (playbook #21) |

```bash
python /tmp/vast.py connect --id N                    # ทดสอบทั้ง 2 ทาง (nvidia-smi จริง) + คืนคำสั่ง ssh/scp/~/.ssh/config ของแต่ละทาง
python /tmp/vast.py run  --id N --via proxy --cmd "…"  # บังคับทาง: auto (default) | direct | proxy
python /tmp/vast.py push --id N --via proxy --src f --dst /workspace/
```

- `rent`/`create` ทดสอบทั้ง 2 ทางทันทีหลัง running — ทางแรกผ่านแล้วยังลองอีกทางต่ออีก 3 รอบ (proxy มักขึ้นช้ากว่า)
  แล้วคืน `ssh_all_ok` + `connect.{direct,proxy}.{ssh,scp,ssh_config}` · ผ่านแค่ทางเดียวไม่นับว่าเครื่องเสีย (`ok` ยังเป็น true) แต่ต้องแจ้งผู้ใช้
- `run`/`push`/`pull`/`watch` แบบ `--via auto` ลอง direct ก่อน ต่อไม่ได้สลับ proxy ให้เอง (log: `direct ต่อไม่ได้ → ใช้ proxy …`)
  · `--via direct|proxy` ล็อกทางเดียว ไม่ fallback (ใช้ทดสอบ หรือเมื่อรู้ว่าอีกทางเสีย)
- `connect` exit code: `0` ได้ทุกทาง · `1` ได้บางทาง · `2` ไม่ได้เลย
- รายงานผู้ใช้ทุกครั้งที่เช่าเครื่อง: คำสั่ง ssh ของ**ทั้งสองทาง** + บอกว่าทางไหนผ่าน/ไม่ผ่าน — ให้ผู้ใช้สลับทางเองได้เมื่อทางหนึ่งหลุด
- ผล `ssh_config` ใช้ alias `vast-<id>-direct` / `vast-<id>-proxy` → ผู้ใช้วางต่อท้าย `~/.ssh/config` แล้ว `ssh vast-<id>-proxy` ได้เลย

## RUNBOOK 1b — LOG WATCH (สุ่มอ่าน log ระหว่าง init → เจอ error ลบ+หาเครื่องใหม่เอง)

`rent`/`create` **เฝ้า log ให้อัตโนมัติ** ระหว่างรอ `running` และรอ SSH: อ่าน `logs(tail=200)` ทุก `--watch-every` วินาที (default 20)
แล้วเทียบกับ `FATAL_LOG` (ใน SDK CONTRACT) — เจอเมื่อไหร่เลิกรอทันที ไม่ต้องเสียเงินรอ timeout 420–900 s

| scope ของ pattern | ตัวอย่าง | `rent` ทำอะไร |
|:--|:--|:--|
| `host` — เครื่องนี้เสีย | `Error response from daemon` · `nvidia-container-cli` · `No CUDA GPUs` · `Xid` · pull timeout | **ลบเครื่องที่เพิ่งสร้าง (verify หาย) → ลอง offer ถัดไป** |
| `image` — เปลี่ยนเครื่องไม่ช่วย | `bad ownership or modes … /root` · `manifest unknown` · `no space left` | ลบเครื่อง แล้ว**หยุด** exit 3 พร้อม `fatal_log` → แก้ image/onstart/disk |

เครื่องที่ค้าง/SSH ไม่ติดโดยไม่มี fatal log ก็ถูกลบ+เปลี่ยนเครื่องเหมือน `host` · ปิดด้วย `--no-replace` (เก็บเครื่องไว้ debug) หรือ `--no-watch`
การลบในเส้นทางนี้ = ลบเฉพาะเครื่องที่ `rent` **เพิ่งสร้างเองในคำสั่งเดียวกัน** (label เดียวกัน) จึงไม่ต้องถามผู้ใช้

**init ของ server ที่รันเองหลัง SSH ได้** (โหลดโมเดล, vLLM, pip install) ใช้ `watch`:

```bash
python /tmp/vast.py watch --id N --file /workspace/server.log \
    --ready "Application startup complete" --probe "curl -sf localhost:8000/health" --alive server.py \
    --every 15 --timeout 1800 [--fatal "regex เพิ่ม"] [--destroy-on-fatal]
```

อ่านทั้ง Vast logs + `tail` ของไฟล์ผ่าน SSH ทุก `--every` วินาที เทียบ `FATAL_LOG + APP_FATAL` (OOM, `Engine core initialization failed`,
`RuntimeError:`, `CUDA error:`, OOM killer …) · ready → exit 0 · fatal → exit 3 พร้อม `fatal_log{line,meaning,scope}` · timeout → exit 1
`--destroy-on-fatal` = ผู้ใช้อนุญาตล่วงหน้าให้ลบเครื่องเมื่อ init พัง (ไม่ใส่ = รายงานอย่างเดียว) · scope `host` → `rent` label ใหม่ได้เลย ·
scope `image` → แก้โค้ด/ค่าก่อน (เช่น VRAM ไม่พอ: ลด `max_model_len`/`gpu_memory_utilization`) ไม่ใช่เปลี่ยนเครื่อง

## บทเรียน deploy model server บน Vast (vLLM, 2026-10-02 · RTX 4090 · 1 เครื่อง ~1 ชม. · จ่ายจริง ~$0.47)

ลำดับที่ได้ผล — แต่ละขั้น **verify ก่อนไปต่อ**:

1. `rent --gpu … --min-inet … --max-dph … --disk <image×2 + model + 10> --env "-p 8000:8000"` → ดู `ssh.endpoints` ว่า direct/proxy ผ่านทั้งคู่
2. `push` server + start script → รัน start แบบ detach: `(setsid nohup bash start.sh > start.log 2>&1 < /dev/null &)` (ไม่งั้น ssh ค้างรอ)
3. `watch --file server.log --ready "Application startup complete" --alive server.py` — init ของ vLLM ~45–50 s หลังโหลด model เสร็จ
4. ทดสอบจากนอกเครื่องที่ `http://<public_ip>:<HostPort ของ 8000/tcp>` (ดูจาก `ports` ของ instance) + endpoint สำรอง (tunnel)
5. **soak test** (รันชุดทดสอบซ้ำ ≥5 รอบ) ดู VRAM ใน `/health` — ผ่านรอบแรกไม่ได้แปลว่าไม่ OOM รอบที่ 5

**เลือกประเทศที่เข้า HF ได้** — `rent` ตัด `CN` ให้อัตโนมัติ (`VAST_BLOCK_GEO`) · หลังเช่าเช็คทันที `curl -s -o /dev/null -w "%{http_code}" https://huggingface.co` ต้องได้ 200

image `vllm/vllm-openai:*` ~11 GB pull 7 นาทีบนเครื่องเน็ต 2 Gbps (ตั้ง `VAST_LOADING_GRACE=1000`) · ใช้ tag ที่ pin commit · cu129 ต้องการ driver CUDA ≥ 12.9 (`--min-cuda 12.9`)

**โมเดลที่ weight เกือบเต็ม VRAM** (เช่น 20 GiB บน 24 GB): ต้นทุนหลักคือการลองผิดลองถูกเรื่อง memory — ปรับทีละค่าแล้ว `watch` ทุกครั้ง

| อาการใน log | ปรับ |
|:--|:--|
| OOM ตอน profiling / `cutlass … Error Internal` หลัง OOM | `max_num_batched_tokens`↓, `max_num_seqs=1`, `enforce_eager=True` |
| `… KV cache is needed, which is larger than the available KV cache memory` | `max_model_len`↓ (log บอกค่าที่พอ) หรือ util↑ |
| OOM **ระหว่างใช้งาน** หลังผ่านไปหลาย request | util↓ เหลือ ≥ 5–7% นอก vLLM · งานที่รันเองนอก vLLM (head/post-process) ย้ายไป CPU · `gc.collect()+empty_cache()` |

ถ้าต้อง trade-off มากขนาดนี้ ให้เสนอผู้ใช้ GPU ที่ VRAM ใหญ่ขึ้น (เช่น 32/48 GB) เทียบราคาด้วย `plan` ก่อนเสียเวลาจูน

### Qwen 3.6 บน vLLM (ทดสอบจริง 2026-10-17 · RTX 5090 · ~18 นาที · ~$0.26 รวมค่าโหลด)

Qwen 3.6 บน HF มีแค่ 27B (dense) และ 35B-A3B (MoE) → บน GPU 32 GB ใช้ **`nvidia/Qwen3.6-35B-A3B-NVFP4`** (23.5 GB, Apache-2.0,
NVFP4 native บน Blackwell) · ทางเลือก VRAM 24 GB: `cyankiwi/Qwen3.6-27B-AWQ-INT4` (20.5 GB — UNVERIFIED บน vLLM ในสกิลนี้)

```bash
VAST_LOADING_GRACE=1000 python /tmp/vast.py rent --label qwen36-vllm --gpu RTX_5090 --min-cuda 12.9 --disk 80 --max-dph 0.80 \
    --image vllm/vllm-openai:v0.31.0-cu129 --env "-p 8000:8000"
# start.sh (push แล้วรันแบบ detach — RUNBOOK บทเรียน deploy ข้อ 2):
pip uninstall -y torchcodec                              # playbook #49 — ไม่งั้น vllm serve ตายทันที
python3 -c "from huggingface_hub import snapshot_download as d; d('nvidia/Qwen3.6-35B-A3B-NVFP4', max_workers=16)"
vllm serve nvidia/Qwen3.6-35B-A3B-NVFP4 --host 0.0.0.0 --port 8000 --quantization modelopt --served-model-name qwen3.6 \
    --max-model-len 32768 --gpu-memory-utilization 0.90 --max-num-seqs 8 --reasoning-parser qwen3 > /workspace/server.log 2>&1
python /tmp/vast.py watch --id N --file /workspace/server.log --ready "Application startup complete" \
    --probe "curl -sf localhost:8000/health" --alive "vllm serve" --every 15 --timeout 1500
```

| ขั้น | วัดได้จริง |
|:--|:--|
| `rent` → running + SSH 2 ทาง (pull image 11.8 GB) | 159 s |
| โหลดโมเดล 23.5 GB (`snapshot_download`, 16 workers) | 89 s = **265 MB/s** · ค่าดาวน์โหลด $0.0026/GB = $0.06 |
| `vllm serve` → `Application startup complete` (รวม CUDA graph capture ~100 s) | 265 s |
| VRAM ใช้ 27.7 / 32.6 GB · KV cache 5.44 GiB = 232k tokens (7 request × 32k พร้อมกัน) | |
| decode เดี่ยว (soak 5 รอบจากนอกเครื่องผ่าน `public_ip:HostPort ของ 8000/tcp`) | ~170 tok/s (รอบหนึ่งตกเหลือ 69 tok/s) |

ต้องปิด thinking หรือให้ `max_tokens` ยาวพอ (playbook #50) · ทั้งงาน (เช่า→ทดสอบ→destroy) ~18 นาที

## RUNBOOK 2 — STOP / START (verify จริงทุกครั้ง อย่าเชื่อ return value)

| # | รัน | ต้องเห็น | ถ้าไม่เห็น |
|--:|:--|:--|:--|
| 1 | `… status --id N` | `actual_status` ปัจจุบัน | `exists:false` → เครื่องหายแล้ว |
| 2 | `… stop --id N` | `{"ok":true,"actual_status":"exited"}` (จริง **30–44 s**) | ค้าง → `recycle_instance` → ยังค้าง → destroy |
| 3 | `… start --id N` | `{"ok":true,"actual_status":"running"}` (จริง **40–47 s**) | host เอาไปให้คนอื่นแล้ว → สร้างใหม่จาก offer อื่น |
| 4 | `… run --id N --cmd "true"` | rc 0 | sshd ยังไม่ขึ้น รออีก 10–20 s |

`stop` หยุดค่า GPU แต่ **ยังเสียค่า storage** — `destroy` เท่านั้นที่หยุดทุกอย่าง (toolkit เตือนให้ทุกครั้ง)
ข้อมูลใน disk รอด stop→start (ทดสอบแล้ว)

## RUNBOOK 3 — DESTROY

| # | รัน | ต้องเห็น | ถ้าไม่เห็น |
|--:|:--|:--|:--|
| 1 | `… destroy --id N --dry-run` | รายการที่จะโดนลบ | เป้าหมายผิด → แก้ตัวกรอง |
| 2 | **ถามผู้ใช้** พร้อมเลข id + เตือนข้อมูลหายถาวร | ตอบตกลง | ไม่ตอบ = ไม่ลบ |
| 3 | `… destroy --id N --yes` | `{"destroyed":[N],"failed":[]}` — verify แล้วว่าหายจาก `show_instances()` (จริง ≤ 5 s) | ยังเห็นอยู่ → สั่งซ้ำ (idempotent) แล้วเช็ค console |
| 4 | `… sweep` | เครื่องที่เหลือตรงกับที่ตั้งใจ | ตามลบ |

`--id` ที่ไม่มีแล้ว = นับว่าสำเร็จ · ตั้ง `VAST_LABEL_PREFIX` แล้วจะ**ปฏิเสธการลบเครื่องที่ label ไม่ตรง** ·
เพดาน 10 เครื่อง/ครั้ง (`VAST_MAX_DESTROY`)

## RUNBOOK 4 — SWEEP & AUDIT (บังคับก่อนจบทุก session)

```bash
python /tmp/vast.py sweep --older-than 60      # exit 1 ถ้ายังมีเครื่องเหลือ
```

แล้ว**รายงานผู้ใช้เสมอ** แม้เป็น 0: กี่เครื่องรันอยู่ / burn rate / ใช้ไปประมาณเท่าไร / เครดิตเหลือ
คิดถูกต้อง: `running` = `dph_base + storage`, `exited/stopped` = **storage อย่างเดียว**

## RUNBOOK 5 — BILL (บังคับหลัง destroy ทุกครั้ง: สรุปค่าใช้จ่ายและสถิติให้ผู้ใช้)

```bash
python /tmp/vast.py bill --id N [--id M …]      # ระบุ id ตรง ๆ
python /tmp/vast.py bill --label-prefix job-     # เลือกจาก label ได้ทั้งเครื่องที่ยังอยู่และที่ลบแล้ว
python /tmp/vast.py bill --days 1 --json         # ย้อนหลัง N วัน (default 7) / รูปแบบเครื่องอ่าน
```

`bill` ใช้ `show_invoices_v1(charges=True)` (1.8+; `show_invoices()` เดิม deprecated) — ได้ `metadata.label` มาด้วย
จึงกรอง `--label`/`--label-prefix` ได้**แม้เครื่องถูกลบไปแล้ว** · ยอดของเครื่องที่เพิ่งลบยัง**โตต่ออีกหลายนาที**หลัง destroy
(เคสจริง 2026-09-30: รันจริง 2.6 นาที แต่ settle ที่ 0.119 ชม. ≈ 7 นาที) ให้รัน `bill` ซ้ำหลัง ~10 นาทีก่อนสรุปยอดสุดท้าย

รายงานผู้ใช้เป็น **ตารางต่อเครื่อง**: ชั่วโมง GPU · ค่า GPU · storage · GB ที่ดาวน์โหลด · ค่าดาวน์โหลด · upload · รวม
ตามด้วยบรรทัดรวมทั้งงานและเครดิตที่เหลือ พร้อมสถิติของงาน (เวลาตั้งแต่ create ถึง destroy, จำนวนเครื่องที่เช่า/เปลี่ยน,
ความเร็วดาวน์โหลดที่วัดได้, offer ที่เลือกและเหตุผล) ตัวเลขจาก `sweep` เป็นค่าประมาณจาก `dph_total × uptime` เท่านั้น
ส่วน `bill` คือค่าจริงจาก invoice ซึ่ง **รวมค่าดาวน์โหลดต่อ GB** ที่ `sweep` มองไม่เห็น (เคสจริง 2026-09-20: โหลดโมเดล 11.8 GB
ที่ $0.029/GB = $0.34 มากกว่าค่า GPU $0.16 ของเครื่องเดียวกัน) invoice ออกเป็น bucket รายวัน ชั่วโมงล่าสุดอาจยังไม่ครบ
ให้บอกผู้ใช้ด้วย

**ป้องกันตั้งแต่ตอน plan (อัตโนมัติแล้ว):** `plan`/`rent` ค้น `inet_down_cost<$0.005/GB` ก่อนเสมอ (`VAST_MAX_DOWN_COST`/`--max-down-cost`)
ไม่มี offer ผ่านค่อย fallback แบบเรียงค่าดาวน์โหลดต่ำก่อน — ดูค่า `download_per_gb` ใน output (`plan` มีคอลัมน์ `$/GB↓`)
· เคสจริง 30 ก.ย.–3 ต.ค. 2026: ค่าดาวน์โหลดต่อ GB ต่างกัน ~40 เท่า ($0.001–0.039) — 2 เครื่องที่ $0.039/GB โหลด ~23–25 GB
จ่ายค่าดาวน์โหลด $1.85 (41% ของบิล 3 วัน) ขณะที่เครื่องที่โหลด 23.7 GB เท่ากันที่ $0.001/GB จ่าย $0.03 · ทดสอบ 2026-10-03:
4090 มี 21–28 offers และ 5090 มี 23–37 offers ที่ < $0.005/GB จึงแทบไม่ต้อง fallback · หลัง `create`
วัดความเร็วจริงทันที (`curl -o /dev/null -m 10 -w "%{speed_download}" <url ไฟล์ใหญ่>`) ค่า `inet_down` ที่ประกาศเชื่อไม่ได้
(เคสจริง: ประกาศ 1391 Mbps ได้จริง 1.8 MB/s) ถ้าช้ากว่า ~20 MB/s ให้ destroy แล้วเช่าเครื่องอื่นก่อนเริ่มติดตั้ง

---

## State machine + timeout (ตัวเลขจากการวัดจริง)

```
create ──► None(provisioning) ──► created/loading ──► running ──► exited/stopped ──► (destroy) หาย
                                       │                  │
                                       └── offline/unknown ┘  = ตาย ไปต่อไม่ได้
```

| ขั้น | วัดได้จริง | timeout | ครบแล้วทำอะไร |
|:--|:--|:--|:--|
| `create` ตอบกลับ | 1.3–1.8 s | — | error → reconcile **ห้าม retry** |
| → `running` (image cache แล้ว / ต้อง pull 2.4 GB) | 21–22 s / 30–138 s | 900 s | |
| ค้าง `loading`/provisioning | — | **420 s** | **destroy ทันที เปลี่ยน offer** (เจอจริง 1 ครั้ง) |
| `running` → sshd รับ connection | +0–20 s | poll 10 s × 20 | ดู error playbook ข้อ 6 |
| `stop` → `exited` / `start` → `running` | 30–44 s / 40–47 s | 420 s | `recycle_instance` แล้ววัดใหม่ |
| `destroy` → หายจาก `show_instances()` | ≤ 5 s | 60 s | สั่งซ้ำ |

**`running` ≠ ใช้งานได้** — นิยาม "พร้อม" ที่ใช้ได้จริง = `actual_status=="running"` **และ** `ssh … true` rc 0

## เลือก offer ให้ดีกว่า "ถูกสุด"

`BASE_FILTER` = `rentable=true verified=true reliability>0.99 direct_port_count>=4 duration>2`

`reliability>0.99` ต่ำกว่านี้เจอ host หลุด · `inet_down>500` pull เร็ว = จ่ายค่ารอน้อย (30 s vs 138 s) ·
`cuda_vers>=12.4` image ใหม่ต้องการ · `disk_space>` disk+10 · `direct_port_count>=4` เผื่อ map port ·
`duration>2` (**วัน**) host รับเช่าต่อได้อีก ≥2 วัน · `gpu_ram>=N` (**GB**) · `dlperf_per_dphtotal` สูง = คุ้มจริงไม่ใช่แค่ถูก

⚠ **ห้ามใช้ `georegion=true` / `chunked=true`** — ตัวแปลงฝั่ง client ตัดส่วนที่เหลือของ query ทิ้งเงียบ ๆ
(`georegion=true geolocation=EU dph<0.5 num_gpus=2` → `geolocation in [...] dph < 0`, `num_gpus` หาย)

### การค้นหาเครื่อง — `sweep()` (v5 · ออกแบบ+วัดจริง 2026-10-17 · รุ่นแรก 2026-10-03)

**ทำไมค้นครั้งเดียวไม่พอ** — `/bundles/` ไม่ได้คืนตลาดทั้งหมด (วัดจริง):
- server รวม offer เป็น **bundle** (field `bundle_id`) แล้วคืน**ตัวแทน 1 ตัวต่อ bundle** — เครื่องอื่นใน bundle เดียวกัน
  (มักเป็น GPU รุ่นเดียว ราคาเท่ากัน คนละ host ก็ได้) ถูกซ่อน · คืนสูงสุด 64 แถว (`limit` > 64 ไม่ช่วย · field `truncated` เป็น `false` เสมอ ใช้ไม่ได้)
- ช่วงกว้าง (root) ไม่ได้คืน 64 ตัวที่ถูกสุด แต่เป็นตัวอย่างกระจายทั้งช่วง — ตลาด ≤ $0.25 มี ~130 เครื่อง root เห็น 64
- ช่วงที่คืน 4–11 แถวยังซ่อนเครื่อง ~5% · ≥ 12 แถว ซ่อน 10–20% ทุกครั้ง → **ช่วงแคบ + หั่นต่างแบบ = เห็นครบขึ้น**
- **server ตอบ query เดิมเหมือนเดิมทุกครั้ง** (6 ครั้งติดใน 6 s ได้ชุดเดียวกัน 100%) → ยิง query ซ้ำ = เปลืองโควตาเปล่า ๆ
  แต่หั่นอีกแบบ (เช่น ตาม `machine_id`) bundle แตกคนละแบบ จึงเห็นตัวที่ถูกซ่อน
- `dph` ใน query เทียบ **`dph_base`** (ราคา GPU ไม่รวม storage) ทีละ offer · field ซ้ำใน query รวมเป็น AND (`reliability>0.99 reliability>=0.995` ✓)
- **rate limit** (วัด 2026-10-17 · เปลี่ยนจากเดิม): `X-RateLimit-Limit: 30` ต่อ API key **รวมทุก process** · burst ~30 แล้วเติม ~1 ครั้ง/วินาที ·
  `X-RateLimit-Remaining` แม่นยำ (0 = ครั้งถัดไป 429 แน่) · `Retry-After: 1` → toolkit คุม bucket ฝั่ง client ตาม header นี้
- latency: TCP RTT ~0.28 s, TLS ใหม่ ~0.85 s (DNS ครั้งแรก ~1.1 s) · warm request ช่วงแคบ 0.32 s แต่ช่วงกว้างที่คืน 64 แถว 0.62 s
  → SDK เปิด session ใหม่ทุก request ทั้ง `show_instance`/`show_user`/… · toolkit แทน factory ของ SDK ให้ใช้ session เดียว keep-alive
  (ใช้ร่วมกับ Searcher) · ยิง `/bundles/` ตรงด้วย body จาก `parse_query` ของ SDK
  (`/search/asks/` ตัวใหม่ **ไม่กรองตาม query** — RTX 4090 ได้ 5090 ปน — ห้ามใช้)

**algorithm** (`sweep()` · ใช้ใน `plan`/`rent` ผ่าน `tiered_pool`) — **3 รอบ** ยิงขนานทุกรอบ (เดิม 4–5 รอบ):

| รอบ | ทำอะไร | calls |
|:--|:--|--:|
| R1 | 8 ช่วง `dph` เท่ากันใน `[0, max_dph)` — **ไม่ยิง root** (ช่วงกว้างช้ากว่า 2 เท่าและไม่ได้ข้อมูลเพิ่ม) | 8 |
| R2 | focus = ราคาถูกสุด `VAST_SEARCH_FOCUS` เครื่องที่ผ่านเกณฑ์ → หั่น `[0, focus)` ตามราคาที่รู้แล้ว ช่วงละ ~3 เครื่อง **+ ยืนยันราคาต่ำสุดในรอบเดียวกัน** | ~3–8 + 4 |
| R3 | ช่วงที่น่าสงสัย (≥10 แถว หรือเครื่องที่รู้ว่าอยู่ในช่วงไม่โผล่) หั่นครึ่ง · "แฝด" ราคาเดียวกันหั่นตาม `machine_id` **+ ยืนยันซ้ำเฉพาะเป้าที่ราคาต่ำสุดเปลี่ยน** | เท่างบที่เหลือ |
| (ต่อ) | เป้าที่ยังยืนยันไม่ได้ → ยืนยันต่อ ≤ 3 รอบ ไม่ขึ้นกับงบ (ปกติไม่ต้อง) | 0–4 |

**ยืนยัน 2 เป้า** (เพราะ `rent` เรียง reliability ≥ 0.995 ก่อนราคา — รุ่นก่อนยืนยันแค่ราคาต่ำสุดรวม ตัวที่ rent เลือกจริงจึงไม่เคยถูกยืนยัน):
① ราคารวมต่ำสุดที่ผ่านเกณฑ์ ② ราคารวมต่ำสุดที่ผ่านเกณฑ์**และ** reliability ≥ `PREFER_REL` (ใส่ `reliability>=0.995` ใน query ฝั่ง server ให้ช่วงเบาบาง)
· แต่ละเป้า: ค้น `[0, mt)` **หั่นครึ่งที่ machine_id มัธยฐาน** (แทนการยิง query เดิม 2 ครั้งพร้อมกันซึ่งได้ผลเหมือนกันเป๊ะ) ·
ไม่มีแถวที่ถูกกว่าและไม่แน่น (< 10 แถว) = ยืนยัน · log: `sweep: N calls/R รอบ ใน X s → … · ราคาต่ำสุดยืนยันแล้ว (รวม + rel≥0.995)`

กันช้า: bucket ฝั่ง client เติม 1/s และ `tokens = min(tokens, X-RateLimit-Remaining)` ทุก response · 429 → รอ ≥ 1 s (ไม่ยิงรัว) ·
timeout ต่อครั้ง 3 → 6 s แล้วยิงใหม่ (บางครั้งค้าง ~9 s)

**ผลวัดจริง 2026-10-17** — benchmark: แต่ละ algorithm รอ bucket เต็ม (28 s) → ค้นแบบ `plan`/`rent` → **ground truth ทันทีหลังค้น**
(หั่นซ้อนจนทุก leaf ≤ 2 แถว ในช่วงถูกสุด 15 เครื่อง) · 6 เคส × 2 รอบ · "rent ถูก" = ได้ (tier reliability, ราคารวม) เท่ากับตัวดีสุดใน truth

| กรณี | เวลา v0 → v5 | calls | ราคาต่ำสุดถูก v0 / v5 | ตัวที่ rent เลือกถูก v0 / v5 |
|:--|:--|:--|:--|:--|
| RTX 4090 ≤ $0.60 (down < $0.005/GB) | 2.93 → 2.84 s | 16 → 15 | 1/2 · 2/2 | 1/2 · 2/2 |
| RTX 5090 ≤ $1.00 | 2.86 → 3.34 s | 14.5 → 15.5 | 2/2 · 1/2 | 2/2 · 1/2 |
| RTX 3090 ≤ $0.30 | 2.81 → **1.58 s** | 19 → 17.5 | 2/2 · 2/2 | 2/2 · 1/2 |
| ทุก GPU ≤ $0.20 | 3.55 → **2.39 s** | 17.5 → 18.5 | 2/2 · 2/2 | 2/2 · 2/2 |
| RTX 4090 ≤ $0.80 ไม่กรองค่าดาวน์โหลด | 3.30 → 3.76 s | 18 → 19.5 | 2/2 · 2/2 | 2/2 · 2/2 |
| ทุก GPU ≤ $0.30 ไม่กรองค่าดาวน์โหลด | 3.48 → **2.51 s** | 17.5 → 19 | 2/2 · 2/2 | 2/2 · 2/2 |
| **รวม** | **3.15 → 2.74 s (−13%)** | 17.1 → 17.5 | 11/12 · 11/12 | 11/12 · 10/12 |

- เมื่อมีโปรแกรมอื่นใช้ key เดียวกัน (bucket เหลือน้อย): v0 โดน 429 เฉลี่ย 6.2 ครั้ง/การค้น ช้า 6.05 s · รุ่นใหม่ 0.4 ครั้ง 4.89 s
- end-to-end CLI (session ร่วม): `sweep` 3.0 → 2.2 s · `bill` 4.0 → 3.2 s · `template-search` 4.0 → 3.1 s · `plan` 5090 3.8 → 2.1 s
- เคสที่พลาด (ทั้ง v0 และ v5 อัตราใกล้กัน) = เครื่องถูกที่ algorithm ไม่เห็นเลย ตรวจซ้ำทันที 4 ครั้งใน 30 s ไม่พบเครื่องใหม่ —
  ยังพิสูจน์สาเหตุไม่ได้ (**UNVERIFIED**: bundle ซ่อนแม้ช่วงเบาบาง หรือเครื่องเพิ่งลงตลาด)

**วิธีที่ลองแล้วแพ้** (อย่าทำซ้ำ):
- ค้นซ้ำหลายรอบด้วย query เดิม — server ตอบเหมือนเดิมทุกครั้ง ไม่ได้อะไรเพิ่ม
- หั่นครึ่งทีละชั้นหลายรอบ (ช้า 8–14 s) · pipeline ยิงต่อเนื่องไม่มีจังหวะ / cache แผนที่ตลาดไว้ค้นซ้ำ (โดน 429 หนัก ช้า 5–21 s)
- **ลด call เหลือ ~12 (root+4 หรือ 5–6 ช่วง)**: เร็วขึ้นแต่ "ตัวที่ rent เลือก" ถูกแค่ 10/12 — ตัวกำหนดเวลาคือ**จำนวนรอบ** ไม่ใช่จำนวน call
  (bucket รับ ~25 call ต่อ burst ได้สบาย) → ใช้ความกว้าง 8 ช่วงเท่าเดิม แต่รวมขั้นยืนยันเข้าไปในรอบที่มีอยู่แล้ว
- เพิ่มการหั่นทั้งช่วง focus ตาม machine_id (2 call ช่วงกว้าง) — query ช่วงกว้างช้า 0.62 s ทำให้ทั้งรอบช้าตาม (3.7 s)
- ประเมินโดยเทียบกับ truth ที่วัดหลังพักหลายสิบวินาที / union ของหลาย algorithm — noise จากตลาดเปลี่ยนกลบความต่างหมด

ถ้าเรียก `search_offers` เองนอก toolkit ต้องหั่นช่วงราคาแบบเดียวกัน ค้นครั้งเดียวไม่ครบ

ฟิลด์ query ทั้งหมด: `vastai search offers --help` = source of truth ที่แม่นกว่าเอกสารเว็บ
ชื่อ/หน่วยที่ต่างกันสองฝั่ง อยู่ในบล็อก `SDK CONTRACT` (`OFFER` / `INST`) ต้น toolkit แล้ว

---

## Error playbook — อาการ → สาเหตุ → ทางแก้

✅ = เจอของจริงในการทดสอบ · ⚠️ = รู้จากซอร์ส/เอกสาร ยังไม่ได้ทำให้เกิดจริง (UNVERIFIED)

| # | อาการ | สาเหตุ | ทางแก้ |
|--:|:--|:--|:--|
| 1 ✅ | create timeout / network ขาด → **เครื่องซ้ำ** | `VastAI()` default `retry=3` และ retry **ครอบ `PUT /asks/<offer>/`** → create ที่ response หายถูกยิงซ้ำเงียบ ๆ ได้ 3 ครั้ง (พิสูจน์ด้วย HTTP server จำลอง: retry=3→3 ครั้ง, retry=1→1, retry=0→0 ครั้ง + `AttributeError`) | `VastAI(api_key=…, retry=1)` เฉพาะตอน create แล้ว `reconcile()` — **ห้าม retry ด้วยมือซ้ำอีก** (toolkit ทำให้แล้ว) |
| 2 ✅ | `HTTPError 400 … /api/v0/asks/<OFFER_ID>/` | offer หมดอายุ/ถูกแย่งระหว่าง search→create (อายุหลักวินาที–นาที ใช้ได้ครั้งเดียว) | `reconcile()` ยืนยันไม่มีเครื่องเกิด → `plan` ใหม่ **ห้ามใช้ id เดิม** · โดนซ้ำ ≥3 ครั้ง = ของหายาก ให้ผ่อนเกณฑ์ **ห้ามขยายเพดานราคา** · ลดโอกาสด้วย `cancel_unavail=True` + ถามผู้ใช้ก่อน search รอบสุดท้าย |
| 3 ✅ | `HTTPError 400 … /instances/command/<ID>/` | `execute()` รองรับแค่ `ls`/`rm`/`du` ตาม help และของจริง **ตอบ 400 หมด** บน `nvidia/cuda:*-runtime` | ใช้ `run --cmd` (SSH) · ⚠️ ยังไม่ได้ลองบน `vastai/base-image:*` |
| 4 ✅ | `copy()` คืน `success:True` แต่ไฟล์ไม่ไป | ขา local = แค่จอง rsync endpoint (`cli/commands/storage.py:92-116` รัน rsync ต่อเอง) | ใช้ `push`/`pull` (scp) · `copy()` ใช้ได้เฉพาะ remote→remote |
| 5 ✅ | `vastai_kaalia@…: Permission denied` + `rsync error (code 5)` แต่ **exit 0** | rsync relay ปฏิเสธคีย์ที่ลงทะเบียนไว้ + CLI ไม่เช็ค returncode (`cli/main.py` จับ exception แล้ว break → `sys.exit(None)`) | **`vastai` CLI exit 0 แม้ API error** — `set -e`/`$?` จับไม่ได้ ใช้ SDK แทน หรือ verify ปลายทางเสมอ |
| 6 ✅ | ค้าง `loading` / `running` แล้วแต่ ssh ไม่ติด | host pull image ไม่ไหว; Vast apt-install `openssh-server` เข้า container เอง | poll `ssh … true` แทนที่จะเชื่อ `actual_status` · ดู `logs(instance_id=…, tail="200")` · **ค้างเกิน 420 s = destroy เปลี่ยน offer** (เจอจริง: RTX 4070S HK, inet 1377 Mbps, rel 0.9957 ก็ยังค้าง — reliability สูงไม่การันตี) |
| 7 ✅ | `scp: dest open "/workspace/x": No such file` | image `nvidia/cuda:*` **ไม่มี `/workspace`** | `mkdir -p` ก่อน (toolkit ทำให้แล้ว) หรือใช้ `/root/` — อย่า copy ลง `/root` หรือ `/` ทั้ง dir จะพัง permission `.ssh` |
| 8 ✅ | ราคาที่โดนจริง > ที่ประเมิน ($0.0947→$0.1044) | `search_offers(storage=5.0)` เป็น default | ส่ง `storage=<disk จริง>` ทุกครั้ง |
| 9 ✅ | `search_offers(query="id=…")` คืน 0 แถวทั้งที่ offer ยังอยู่ | server ไม่ honor `id` (ผ่าน `parse_query` แต่ถูกเมิน) | ค้นด้วย `machine_id=` แล้วหา offer id ในผลลัพธ์ — เอา `id=` ไปทำ preflight จะ **บล็อกการสร้างทุกครั้ง** |
| 10 ✅ | `search_offers(limit=500)` คืน 64 / ค้นซ้ำ query เดิมได้เครื่องไม่เหมือนเดิม / พลาดราคาต่ำสุด | server ตัด raw offers แล้วรวม bundle คืนตัวแทน 1 ตัว | ใช้ `sweep()` (หั่นช่วง `dph` ให้แคบ) — ดู "การค้นหาเครื่อง" |
| 11 ✅ | `ssh_url()` ปกติ แต่ `Permission denied (publickey)` | public key ยังไม่ผูกกับบัญชี (หรือผูกคนละคีย์กับที่ `VAST_SSH_KEY_FILE` ชี้) | `vast.py keys` ดู `registered` + `fingerprint` → ยังไม่ผูกก็ `keys --attach` แล้วรอ ~10 s · เครื่องที่สร้างไปแล้วใช้ `attach_ssh(instance_id=…, ssh_key=<เนื้อ public>)` · ยืนยันจาก `logs()` ที่จะขึ้น `Accepted key … authorized_keys` |
| 12 ✅ | `actual_status == "offline"` / ไม่อัปเดต | host หลุด | ถือว่าล้มเหลวทันที อย่ารอ → destroy แล้วเลือก offer ที่ `reliability` สูงกว่า |
| 13 ✅ | error message ไม่มีรายละเอียด | `str(HTTPError)` มีแค่ code+url | อ่าน `e.response.json()["msg"]` (toolkit มี `http_err()`) |
| 14 ⚠️ | `no space left on device` / `manifest unknown` / `pull access denied` | disk เล็กไป, tag ผิด, private repo | disk ≥ ขนาด image × 2 + data (`nvidia/cuda:*-runtime` ≈ 3.6 GB บนดิสก์) · private repo: `login="-u USER -p TOKEN docker.io"` · **ขยาย disk ทีหลังยาก ตั้งให้พอแต่แรก** |
| 15 ⚠️ | create ถูกปฏิเสธ / เครื่องถูก stop เอง | เครดิตหมด | เช็ค `show_user()["credit"]` ก่อนสร้างเสมอ · `stop` ยังเสียค่า storage มีแต่ `destroy` ที่หยุดทุกอย่าง |
| 16 ⚠️ | `running` แต่ container ตาย | `actual_status` บอกสถานะ *contract* ไม่ใช่สุขภาพ process | ดู `status_msg` + `logs()` · `recycle_instance()` (รี container ไม่เสียดิสก์) → ยังพัง → destroy |
| 17 ⚠️ | `HTTPError 429` | rate limit (SDK retry เอง: 429/502/503/504) | poll ไม่ถี่กว่า 5 s **แต่ห้าม backoff-retry บน create** |
| 18 ✅ | `show_invoices()` deprecated / `fetch_contracts()` 401 | API เก่า / ต้องสิทธิ์อื่น | `show_invoices_v1(**params)` · ประเมินค่าใช้จ่ายจาก `sweep` แทน |
| 19 ✅ | `template-create` ตอบ success แต่ไม่มี id/hash | response ของ API ไม่คืน identity | snapshot template ids ก่อน POST, ใช้ `retry=1`, แล้ว reconcile จาก creator+name+image+tag; ห้าม retry ถ้า match ไม่เท่ากับ 1 |
| 20 ✅ | update แค่ description แล้ว `extra_filters` จาก `{}` กลายเป็น `"{}"` | API คืน JSON string แต่ SDK PUT ต้องการ dict | decode JSON (รองรับค่าที่ encode ซ้ำ) ก่อน merge และอ่านกลับ verify |
| 21 ✅ | PyTorch Template `running` แต่ proxy SSH ต่อไม่ได้ ขณะที่ direct 22/tcp ใช้ได้ | `ssh_host/ssh_port` ชี้ proxy แม้มี direct mapping | ถ้ามี `public_ipaddr` + `ports["22/tcp"]` ให้ใช้ direct endpoint ก่อน |
| 22 ✅ | `plan --template-id` เสนอ GPU ที่ผิด requirement | ไม่ได้นำ Template `extra_filters` เข้า offer query | แปลง filter+หน่วยเข้า query และตรวจ raw offer ซ้ำก่อน plan/create |
| 23 ✅ | `plan --gpu RTX_5090` คืน 0 offers แต่ query ที่ตัด `cuda_vers` คืนเครื่องจำนวนมากซึ่งมี `cuda_max_good=13.x` | Offer API มี false negative เมื่อใช้ server-side `cuda_vers` ร่วมกับ RTX 5090 | ห้ามส่ง `cuda_vers` ใน offer query; กรอง `cuda_max_good >= --min-cuda` จาก raw response ฝั่ง client (toolkit ทำให้แล้ว) |
| 24 ✅ | `rent` ที่ label ผิด prefix / เครื่องเต็มเพดาน วนลอง 5 offers แล้วรายงานว่า "offer หาย" | guard ใน `preflight` ถูกเรียกใน loop ต่อ offer | แก้แล้ว: `rent` เรียก `preflight` ก่อน search → fail ทันทีพร้อมเหตุผลจริง |
| 25 ✅ | template ที่ `template-update` แล้ว ได้ `hash_id` ใหม่ | Vast ออก hash ใหม่ทุก update | `plan --template-id` ใหม่หลัง update ทุกครั้ง — `create` ด้วย hash เก่าจะถูกปฏิเสธ ("template hash เปลี่ยนแล้ว") |
| 26 ✅ | ยอดใน `bill` ของเครื่องที่ลบแล้วยังเพิ่มขึ้น | billing ฝั่ง Vast settle ช้า/ปัดเวลา | `show_invoices_v1()['current']` / `sweep` ยืนยันว่าไม่มีอะไรคิดเงินอยู่ แล้วรัน `bill` ซ้ำภายหลัง |
| 27 ✅ | `plan --template-id` ของ template ที่มี `cuda_max_good` ส่ง `cuda_vers` ไป server | `template_query_parts` แปลง filter ตรง ๆ (ชน #23) | แก้แล้ว: ข้าม `cuda_max_good` ใน query แล้วตรวจฝั่ง client ใน `template_offer_mismatches` |
| 28 ✅ | `running` แล้วแต่ SSH ไม่ติด, `logs()` มี `Authentication refused: bad ownership or modes for file /root/.ssh/authorized_keys` | image (เช่น `vllm/vllm-openai`) ทำ `/root` ให้ group/other เขียนได้ → sshd ปฏิเสธ key; เดิม `rent` รอเงียบ ๆ ~10 นาที | onstart default มี `SSH_FIX` (chown/chmod `/root` `.ssh` ซ้ำ 90 s) แล้ว · `LogWatch` จับ pattern นี้ได้ใน ≤20 s (scope `image`) |
| 30 ✅ | `watch` รอต่อทั้งที่ server ตายแล้วด้วย `OSError: Could not load this library: …libtorchcodec_image.so` | pattern ไม่ครอบคลุม `OSError`/`Application startup failed` และไม่ได้เช็คว่า process ยังอยู่ | เพิ่ม pattern + `--alive <pgrep pattern>` · (ต้นเหตุ: `vllm/vllm-openai:cu129-nightly` มี torchcodec ที่ build กับ CUDA 13 → `pip uninstall -y torchcodec` ถ้าไม่ใช้ audio) |
| 31 ✅ | direct SSH/port (`public_ip:HostPort`) ใช้ได้ตอนสร้าง แล้ว **timeout กลางทาง ~10 นาที** ก่อนกลับมาเอง ขณะที่ proxy `sshN.vast.ai` ยังใช้ได้ | network ของ host หลุดชั่วคราว (instance ยัง `running`) | หลังสร้างเครื่อง `ssh_check` ทดสอบ **ทุก endpoint** + รัน `nvidia-smi` จริง แล้วรายงานผลแต่ละทาง · `run`/`push`/`pull`/`watch` เลือก endpoint ที่ต่อได้ตอนนั้น (direct → proxy, หรือล็อกด้วย `--via`) · `connect --id N` ทดสอบ+ให้คำสั่งของทั้งสองทาง · บริการ HTTP ให้มีทางสำรอง เช่น `cloudflared tunnel --url http://localhost:PORT` |
| 32 ✅ | `watch --alive` รายงาน "process ตาย" ทั้งที่ server ยังรันอยู่ | ssh rc 255 (ต่อไม่ได้) ถูกนับเหมือน `pgrep` rc 1 | แก้แล้ว: rc 255 → หา endpoint ใหม่, นับว่าตายเฉพาะ rc 1 · pattern `[s]erver.py` กัน pgrep เจอ shell ของตัวเอง |
| 33 ✅ | `watch` รายงาน ready ภายใน 13 s หลัง restart (ยังไม่พร้อมจริง) / เจอ fatal ของรอบก่อน | อ่านเจอ `Application startup complete`/error ที่ค้างใน log เก่า ก่อน process ใหม่ truncate ไฟล์ | แก้แล้ว: นับ log ไฟล์เฉพาะเมื่อ mtime ≥ เวลาเริ่ม watch (เวลาฝั่ง remote) |
| 34 ✅ | `rent` ลบเครื่องดี ๆ ทิ้งเพราะ log มี `Error response from daemon: No such container: C.<id>` | บรรทัดนี้ขึ้นปกติก่อน container ถูกสร้าง | แก้แล้ว: pattern docker ใช้ `(?!No such container)` — **pattern ใหม่ทุกตัวต้องลองกับ log ของเครื่องที่ปกติก่อน** |
| 35 ✅ | โมเดล NVFP4 บน RTX 4090 (Ada) / โมเดลที่ weight เกือบเต็ม VRAM: OOM ตอน profiling, KV ไม่พอ, OOM สะสมระหว่างใช้งาน | NVFP4 native ต้อง Blackwell → vLLM fallback Marlin W4A16 (ใช้ได้ แต่ช้ากว่า) · weight 20 GiB บน 24 GB เหลือ ~2 GiB · ของนอก budget vLLM (CUDA ctx, head ที่รันเอง, triton autotune) โตเรื่อย ๆ | ดู "บทเรียน deploy" ด้านล่าง: ลด `max_model_len`/`max_num_batched_tokens`, `max_num_seqs=1`, `enforce_eager`, เว้น util ≥ 5–7%, งานเสริมย้ายไป CPU, เช็ค `/health` VRAM หลัง soak test |
| 36 ✅ | `vllm/vllm-openai:cu129-nightly` import vllm พัง `OSError: Could not load this library: …libtorchcodec_image.so` | torchcodec ใน image build กับ CUDA 13; vllm จับแค่ ImportError | `pip uninstall -y torchcodec` (ถ้าไม่ใช้ audio) ก่อนสตาร์ท |
| 37 ✅ | request ที่มีรูปใหญ่: `vLLM returned 819 positions for 2076 tokens` | ตั้ง `mm_processor_kwargs.max_pixels` ให้ vLLM ฝั่งเดียว แต่ HF processor ที่ใช้นับ token ไม่ได้จำกัด | ย่อรูปก่อนส่งให้ทั้งสองฝั่ง (หรือตั้งค่าเดียวกันทั้งคู่) |
| 38 ✅ | `curl` ไฟล์เดียวจาก HF ได้ ~7.6 MB/s แต่ `snapshot_download` + `HF_HUB_ENABLE_HF_TRANSFER=1` โหลด 23 GB ใน ~7.5 นาที (~50 MB/s) | single stream ถูกจำกัดต่อ connection | วัดความเร็วด้วยเครื่องมือที่จะใช้จริง (hf_transfer/หลาย connection) ก่อนตัดสินใจเปลี่ยนเครื่อง |
| 39 ✅ | เครื่องในจีน (`geolocation` ลงท้าย `, CN`) `curl https://huggingface.co/...` ได้ `000` · `hf-mirror.com` ใช้ได้แต่ Xet ตอบ `401 Unauthorized … cas-server.xethub.hf.co` และ HTTP ได้แค่ ~17 MB/s | HF ถูก block ในจีน; `inet_down` ที่ประกาศ (2212 Mbps) ไม่ช่วย | `plan`/`rent` **ตัดประเทศใน `VAST_BLOCK_GEO` (default `CN`) ให้แล้ว** · ถ้าจำเป็นต้องใช้: `--allow-geo` + `HF_ENDPOINT=https://hf-mirror.com HF_HUB_DISABLE_XET=1` · pull Docker Hub ในจีนก็ช้า (vLLM 11 GB ~13 นาที) |
| 40 ✅ | `rent` ลบเครื่องที่ยัง pull image vLLM อยู่ เพราะค้าง `loading` เกิน 420 s | image ~11 GB ใช้เวลาเกิน grace | ตั้ง `VAST_LOADING_GRACE=1000` สำหรับ image ใหญ่ · ดู `status_msg` (`Pulling from …`/`Download complete`) แยกจากเครื่องค้างจริง |
| 41 ✅ | ค้าง `created` นาน ๆ, `status_msg` = `Error response from daemon: failed to create task for container: …` แต่ `rent` รอจนครบ grace | error docker ของ host อยู่ใน `status_msg` ไม่ใช่ `logs()` | แก้แล้ว: `wait_for` scan `status_msg` ด้วย `FATAL_LOG` ทุก poll → ลบ+เปลี่ยนเครื่องทันที |
| 42 ✅ | `dph<0.330667` ยังคืน offer ที่ `dph_base=0.3306666…` (ยืนยันราคาต่ำสุดไม่จบ) | `%.6f` ปัดขึ้น | ใช้ `%.9f` และปัดขอบบนลง (`math.floor`) |
| 43 ✅ | "ยืนยันราคาต่ำสุดแล้ว" แต่มีเครื่องราคารวมถูกกว่า | ยืนยันแค่ `dph_base` ต่ำสุด แต่เครื่องที่ base สูงกว่าอาจค่า storage ถูกกว่า | ยืนยันด้วย `dph < total ต่ำสุด` แล้วดูว่ามีแถวไหน total ต่ำกว่า |
| 44 ✅ | HTTP 429 ตอนค้นถี่ · `Retry-After` 1 s | rate limit (2026-10-17: `X-RateLimit-Limit 30` ต่อ API key รวมทุก process, burst ~30 แล้วเติม ~1/s · ก่อนหน้านี้เคยเป็น 5 ต่อ backend) | toolkit คุม bucket ตาม `X-RateLimit-Remaining` ไม่ยิงจนโดน 429 · หลาย process ใช้ key เดียวกันพร้อมกัน = แบ่ง bucket กัน · การค้นหนึ่งครั้งใช้ ~15–20 call → ค้นติดกันได้ ~2 ครั้งก่อนช้าลงเหลือ 1 call/s |
| 45 ✅ | `search_offers_new` (`/search/asks/`) 400 `select_cols` หรือคืน GPU ผิดรุ่น | SDK ส่ง `["*"]` ที่ server ไม่รับ และ endpoint ไม่กรองตาม query | อย่าใช้ — ใช้ `/bundles/` |
| 29 ✅ | รอ `running`/SSH จน timeout ทั้งที่เครื่องพังตั้งแต่นาทีแรก | ไม่ได้ดู log ระหว่างรอ | `rent`/`create` สุ่มอ่าน log ทุก 20 s (`LogWatch`) · `watch` สำหรับ init ของ server เอง · ดู RUNBOOK 1b |
| 46 ✅ | `rent` หลายตัวพร้อมกันเลือก offer เดียวกัน → ตัวที่แย่งไม่ทันได้ `400 … no_such_ask  Instance type by id N is not available` แล้วค้างเฉย ๆ ~95 s ก่อนลองตัวถัดไป | `reconcile()` รอ label 90 s ทุกกรณี | แก้แล้ว: 400 `no_such_ask` = server ปฏิเสธชัดเจน ไม่มีเครื่องเกิด → เช็ค label สั้น ๆ 6 s แล้วไปต่อ (rent ที่ชนกัน 221 s → 43 s) · error อื่น (timeout/network) ยังรอเต็ม 90 s กันเครื่องซ้ำ |
| 47 ✅ | ค้นช่วงเดิมซ้ำได้ผลเหมือนเดิมทุกครั้ง แต่ยังขาดเครื่อง / เครื่อง GPU รุ่นเดียวราคาเดียวกันโผล่แค่ตัวเดียว | `/bundles/` คืนตัวแทน 1 ตัวต่อ `bundle_id` (เครื่องอื่นใน bundle ถูกซ่อน) และ deterministic ต่อ query | หั่นช่วงต่างแบบ (ราคา และ `machine_id`) แทนการยิงซ้ำ — `sweep()` ทำให้แล้ว |
| 48 ✅ | `rent` ได้เครื่องที่ไม่ใช่ตัวถูกสุดในกลุ่ม reliability ≥ 0.995 ทั้งที่ log บอก "ราคาต่ำสุดยืนยันแล้ว" | ยืนยันแค่ราคาต่ำสุดรวม แต่ rent เรียง reliability ≥ 0.995 ก่อน | แก้แล้ว: ยืนยัน 2 เป้า (รวม + `reliability>=0.995` ฝั่ง server) |
| 49 ✅ | `vllm/vllm-openai:v0.31.0-cu129` (stable ไม่ใช่แค่ nightly) `vllm serve` ตายใน 8 s ด้วย `OSError: Could not load this library: …libtorchcodec_image.so` | torchcodec ใน image build กับ CUDA 13 (เหมือน #36) | `pip uninstall -y torchcodec` ใน start script ก่อน `vllm serve` เสมอ (ถ้าไม่ใช้ audio/video) · `watch --alive "vllm serve"` จับได้ใน 16 s |
| 50 ✅ | Qwen 3.6 (`--reasoning-parser qwen3`) ตอบ `content` ว่าง, `finish_reason=length` | โมเดลใช้ token ไปกับ thinking (~1.6k ตัวอักษรใน `reasoning_content`) จนหมด `max_tokens` | ตั้ง `max_tokens` ≥ 1500 หรือปิด thinking ต่อ request: `"chat_template_kwargs": {"enable_thinking": false}` |

---

## ผลทดสอบ 2026-10-17 (vastai 1.8.3 · loop engineer 5 รอบ · เครื่องจริง 5 เครื่อง พร้อมกันสูงสุด 3 · จ่ายจริง ~$0.3)

5 รอบปรับ+วัด search: v1 (3 รอบ, call −42%) → v2 (หั่น focus ตาม machine_id — ช้า ตัด) → v3 (ไม่ยิง root) →
v4 (ยืนยัน 2 เป้า) → **v5 = v4 + กว้าง 8 ช่วง** (ใช้จริง) — ตารางใน "การค้นหาเครื่อง"

**ผ่าน (ของจริง)**: `env` `keys` `drift --live` (no drift บน 1.8.3) `sweep` `bill` · `plan` (default/GPU/template/`--max-down-cost 0`) ·
`rent` 5090 + vLLM image (159 s, SSH 2 ทาง) · `rent` 2 ตัวขนาน ×2 รอบ (ชนกันที่ offer เดียว → fix #46: 221 → 43 s) ·
`create` offer ที่ถูกแย่ง → 9 s ไม่มีเครื่องเกิด · adopt label ซ้ำ · `run` `connect` (exit 0 ทั้ง 2 ทาง) · `push`/`pull` 5 MB byte-match ·
`stop` 37 s → `exited` (no-op ซ้ำ, storage-only) → `start` 36 s ข้อมูลรอด (md5) · `watch` (จับ fatal #49 ใน 16 s, ready ใน 265 s) ·
`destroy --label-prefix`/`--id`/`--dry-run`/idempotent · `template-create` (+กันชื่อซ้ำ) `-show` `-update` (verify, hash ใหม่ #25)
`plan --template-id` `-delete --dry-run` `-delete` (verify หาย) · offline test 43 ข้อ (parser ทุก subcommand, .env, redact, filter, slice, geo/cuda, FATAL_LOG)

## ผลทดสอบซ้ำบน vastai 1.8.2 (2026-09-30)

SDK 1.8.2 เปลี่ยน signature เป็น explicit params (`create_instance`, `create_template`, `update_template`, `show_invoices`)
และเพิ่ม `ssh`/`jupyter`/`direct`/volume/`bid_price` — raw `runtype` string เดิมยังใช้ได้ (ห้ามส่งคู่กับ flag ใหม่ → ValueError)
· default `retry=3`, timeout 120 s, retryable 429/502/503/504 **ไม่เปลี่ยน** → กฎ `retry=1` ตอน create ยังจำเป็น

3 instance พร้อมกัน (`rent` · `plan`+`create --runtype ssh_proxy` · `plan --template-id`+`create` จาก private template) ·
รวม ~8 นาที · ค่าใช้จ่ายจริง ~$0.044 · **ผ่าน**: `drift --live` · `plan` (default/4090+RAM/5090 CUDA client-side/template/เพดานต่ำ→ปฏิเสธ)
· SSH direct+proxy ทั้ง 5 endpoint · `nvidia-smi` ตรง offer · `push` ลง `/workspace` ที่ไม่มี + `pull` byte-match · `stop`→`exited`
(no-op ซ้ำ, storage-only) → `start`→`running` ข้อมูลรอด · adopt label ซ้ำ (`rent`/`create`) · guard prefix/max-instances/expect-dph
· `destroy --dry-run`/guard prefix/idempotent · `template-create`+กันชื่อซ้ำ · `template-update` verify · `template-delete` verify · `bill` v1
· offer หายระหว่าง plan→create 1 ครั้ง → preflight `machine_id` ปฏิเสธถูกต้อง ไม่มีเครื่องเกิด · แก้บั๊ก #24 #27

## ผลทดสอบจริง (2026-08-26)

ทุกเครื่อง: `nvidia/cuda:12.4.1-runtime-ubuntu22.04` (~2.4 GB compressed) · disk 40 GB · on-demand (ไม่ใช้ bid)
· เพดาน $0.20/hr และ 20 นาที/เครื่อง · **8 instance รวม ~27 นาที ค่าใช้จ่ายจริงจากใบแจ้งหนี้ ~$0.04**
(GPU ~75% · storage ~22% · bandwidth ~3%) — ยอดตรงกับเครดิตที่ลดลงจริง

**ผ่านครบทุกเส้นทาง**: `plan` · `create`+anti-duplicate · `loading→running` · `ssh nvidia-smi` (GPU + VRAM ตรงกับ offer)
· `push`/`pull` สองทาง · `logs` · `label_instance` · `stop`+verify `exited` · `start`+verify `running` (ข้อมูลรอด)
· `destroy`+verify หายจริง · adopt เมื่อ label ซ้ำ · guard ปฏิเสธลบเครื่องผิด prefix · `drift`

**สองเคสล้มเหลวที่เจอจริงและระบบจัดการถูก**: offer หมดอายุ → HTTP 400, reconcile ยืนยันไม่มีเครื่องเกิด ไม่ retry
· host ค้าง `loading` 428 s → ตัดตามเพดาน 420 s, destroy, เปลี่ยน offer → running ใน 22 s

**Template live test (2026-08-26)**: สร้าง private template → search/readback → update → launch จริงบน RTX 3060 →
SSH+GPU ผ่าน → stop/destroy → delete template+verify · official PyTorch Template launch ผ่านและรัน
PyTorch 2.11.0+cu128 บน GPU จริง; พบและแก้ 4 จุดตาม error playbook ข้อ 19–22 ·
official vLLM offer ราคาถูกหายก่อน create 3 ครั้ง จึงหยุดตาม stopping condition และไม่มี instance ซ้ำ

**ยัง UNVERIFIED**: `execute()` บน `vastai/base-image:*` · สาเหตุที่ rsync relay ปฏิเสธคีย์ ·
พฤติกรรมตอนเครดิตหมด / 429 / disk เต็ม · เส้นทาง `bid`/spot · `fetch_contracts()` 401

---

## 🔐 ก่อนส่งสกิลนี้ให้คนอื่น

ไฟล์นี้ออกแบบให้**ส่งต่อได้ทันทีโดยไม่รั่วอะไรเลย** — key อยู่ใน `.env` ที่ไม่ได้อยู่ในสกิล
และไม่มี path ส่วนตัว / account id / เลข instance / ยอดเครดิต อยู่ในไฟล์

ถ้าแก้ไฟล์นี้เอง ให้เช็คก่อนส่งทุกครั้งว่าไม่มีสิ่งเหล่านี้หลุดเข้ามา:

```bash
grep -nE '(VAST_API_KEY|ssh-(rsa|ed25519))[= ]|/home/[a-z]|/Users/|[A-Za-z0-9]{40,}' SKILL.md
```

| อย่าใส่ | เพราะ | ใส่แทนด้วย |
|:--|:--|:--|
| ค่า `VAST_API_KEY` | ใครได้ไปก็เช่าเครื่องด้วยเครดิตคุณได้ | ชื่อตัวแปรเฉย ๆ |
| path เต็มของ `.env` / โฟลเดอร์โปรเจกต์ | เผยโครงสร้างเครื่องและชื่องาน | ลำดับการค้นหา (`$VASTAI_ENV` → `~/.config/vastai/…`) |
| account id / ssh key id | ใช้ระบุตัวตนคุณบน Vast | ตัดออก หรือบอกวิธีหาเอง (`show_user()` / `show_ssh_keys()`) |
| เลข instance / machine id ที่เคยเช่า | ผูกกับบัญชีคุณ | ตัวเลขสรุปรวม |
| ยอดเครดิต / ยอดเงินคงเหลือ | ข้อมูลการเงิน | ตัดออก |
| private key (`tp`, `id_rsa`) | ไม่ต้องพูดถึงเลย | อ้างผ่าน `VAST_SSH_KEY_FILE` |

ฝั่งผู้รับต้องทำแค่: `pip install 'vastai~=1.8'` → สร้าง `~/.config/vastai/vastai.env` (chmod 600)
→ `python /tmp/vast.py env` ต้องขึ้น `env_file_exists:true`

เพิ่มเติมสำหรับความปลอดภัยของตัวเอง:
- `.env` ต้อง `chmod 600` และอยู่ใน `.gitignore` — toolkit เตือนให้ถ้า group/other อ่านได้
- อย่าเก็บ `VAST_API_KEY` ปนกับ token อื่น (GitHub/Docker) ในไฟล์เดียว — สกิลนี้จะได้ไม่ต้องอ่านไฟล์ที่มีความลับอื่น
- ออก **API key แยกใบต่องาน** ที่ https://cloud.vast.ai/manage-keys/ แล้วเพิกถอนใบเดียวได้เมื่อรั่ว
- `/tmp/vast.py` ไม่มีความลับอยู่ในตัว (อ่าน key ตอน runtime) — แต่บนเครื่องที่ใช้ร่วมกันให้เขียนลงโฟลเดอร์ส่วนตัวแทน
- ตั้ง `VAST_LABEL_PREFIX` ทุกงาน แล้วสกิลจะปฏิเสธการลบเครื่องของงานอื่นให้เอง

---

## ✅ Checklist ก่อนจบงานทุกครั้ง

- [ ] `python /tmp/vast.py sweep` แล้ว **รายงานผู้ใช้**: กี่เครื่องรันอยู่ / burn rate / ใช้ไปประมาณเท่าไร / เครดิตเหลือ
- [ ] หลัง destroy รัน `python /tmp/vast.py bill --id …` แล้ว **สรุปค่าใช้จ่ายจริง + สถิติของงาน** (ตาราง GPU/storage/download/upload ต่อเครื่อง, รวม, เครดิตเหลือ, เวลา create→destroy, จำนวนเครื่องที่เช่า, ความเร็วเน็ตที่วัดได้)
- [ ] เครื่องที่ไม่ตั้งใจให้ค้าง → destroy แล้ว **verify ว่าหายจาก `show_instances()`** จริง
- [ ] ทุก `stop`/`start`/`destroy` อ่านสถานะซ้ำหลังทำ ไม่ได้เชื่อ return value
- [ ] รายงานค่าดาวน์โหลด `download_per_gb` ของเครื่องที่เช่า (และบอกถ้าเป็น fallback เพราะไม่มี offer < cap)
- [ ] รายงานคำสั่ง SSH ของ**ทั้ง direct และ proxy** พร้อมผลทดสอบแต่ละทาง (`connect --id N`)
- [ ] ไม่มี API key / `instance_api_key` / `jupyter_token` โผล่ใน output หรือไฟล์
- [ ] ถ้ามี `create` ที่ error → ยืนยันแล้วว่า **ไม่มีเครื่องซ้ำเกิดขึ้น** (เช็คจาก label)
- [ ] ชื่อ field / signature ที่ใช้ตรงกับบล็อก `SDK CONTRACT` — เดาไม่ได้ให้เขียน **UNVERIFIED**
- [ ] ไม่แตะ instance ที่ label ไม่ตรง `VAST_LABEL_PREFIX` ของงานนี้
- [ ] `.env` มีแต่ private key path — ไม่ต้องมี `.pub` (toolkit derive เอง)
- [ ] ค่า config ทั้งหมดอยู่ใน `.env` — ไม่มี key หรือเพดานราคา hardcode อยู่ในคำสั่งที่รัน
- [ ] Template create/update/delete อ่านกลับ verify แล้ว; test template ไม่ค้างในบัญชี
- [ ] Instance จาก Template ผ่านทั้ง template id+hash, recommended disk และ `extra_filters` compatibility
