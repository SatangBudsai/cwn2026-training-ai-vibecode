FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Bangkok \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        gnupg \
        lsb-release \
        software-properties-common \
        sudo \
        vim \
        nano \
        less \
        net-tools \
        iputils-ping \
        dnsutils \
        git \
        tzdata \
        python3 \
        python3-pip \
        python3-venv \
        python-is-python3 \
 && ln -fs "/usr/share/zoneinfo/${TZ}" /etc/localtime \
 && dpkg-reconfigure -f noninteractive tzdata \
 && rm -rf /var/lib/apt/lists/*

# Git ล่าสุดจาก git-core PPA (git worktree ต้องใช้ git >= 2.5; Ubuntu 24.04 มี 2.43 อยู่แล้ว
# แต่ติดตั้งเวอร์ชันล่าสุดไว้เพื่อให้ได้ฟีเจอร์ worktree ครบทุกคำสั่ง เช่น repair/move)
RUN add-apt-repository -y ppa:git-core/ppa \
 && apt-get update && apt-get install -y --no-install-recommends git \
 && git --version \
 && git init -q /tmp/worktree-check \
 && git -C /tmp/worktree-check worktree list >/dev/null \
 && rm -rf /tmp/worktree-check /var/lib/apt/lists/*

RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y --no-install-recommends \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

# Node.js (LTS 22.x) สำหรับ run Next.js / React / Vite
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g npm@latest \
 && rm -rf /var/lib/apt/lists/*

RUN install -d /workspace

# ------------------------------------------------------------------
# JupyterLab + extensions (ติดตั้งลง system python เพื่อให้ kernel เห็น
# package เดียวกับที่ใช้ใน terminal)
#   - jupytext                : เปิด .py / .md เป็น notebook ได้ (pair notebook <-> script)
#   - jupyterlab-git          : Git UI ใน sidebar
#   - jupyterlab-lsp          : autocomplete / hover / diagnostics (python-lsp-server)
#   - jupyterlab-code-formatter + black + isort : จัดรูปแบบโค้ด
#   - jupyterlab-execute-time : แสดงเวลารันของแต่ละ cell
#   - jupyter-resource-usage  : แสดง CPU / RAM ใน status bar
#   - ipywidgets              : interactive widgets
#   - bash_kernel             : เขียน notebook ด้วย Bash kernel (เหมาะกับ DevTools lab)
# ------------------------------------------------------------------
ENV PIP_BREAK_SYSTEM_PACKAGES=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore

RUN pip install \
        "jupyterlab>=4.3,<5" \
        notebook \
        ipywidgets \
        jupytext \
        jupyterlab-git \
        jupyterlab-lsp \
        "python-lsp-server[all]" \
        jupyterlab-code-formatter \
        black \
        isort \
        jupyterlab-execute-time \
        jupyter-resource-usage \
        bash_kernel \
 && python -m bash_kernel.install --sys-prefix \
 && jupyter lab --version \
 && jupyter labextension list 2>&1 | grep -E 'enabled|OK' | head -20

# Jupyter Server config (system-wide)
RUN mkdir -p /etc/jupyter \
 && cat > /etc/jupyter/jupyter_server_config.py <<'EOF'
c = get_config()  # noqa

c.ServerApp.ip = "0.0.0.0"
c.ServerApp.port = 8888
c.ServerApp.root_dir = "/"          # เห็นทั้ง filesystem (โฟลเดอร์งานอยู่ที่ /workspace)
c.ServerApp.allow_root = True
c.ServerApp.open_browser = False
c.ServerApp.allow_remote_access = True

# แสดง hidden file / folder (ชื่อขึ้นต้นด้วย ".") ใน file browser เช่น .env .git .gitignore
# (ฝั่ง UI ตั้ง showHiddenFiles ไว้ใน overrides.json; ต้องเปิดทั้งสองฝั่งจึงจะเห็น)
c.ContentsManager.allow_hidden = True

# terminal ใน JupyterLab ใช้ bash login shell (อ่าน /etc/profile, ~/.bashrc)
c.ServerApp.terminals_enabled = True
c.ServerApp.terminado_settings = {"shell_command": ["/bin/bash", "-l"]}

# ไม่ใช้ token; รหัสผ่าน (ถ้ามี) ถูกตั้งจาก start.sh ผ่าน $JUPYTER_PASSWORD (default: ไม่มีรหัสผ่าน)
c.IdentityProvider.token = ""
c.PasswordIdentityProvider.allow_password_change = False
EOF

# JupyterLab UI defaults — file browser แสดง hidden file/folder และ terminal ให้ copy/paste ได้สะดวก:
#   * Ctrl+V           = paste (pasteWithCtrlV)
#   * Ctrl+Shift+C / V = copy / paste
#   * Ctrl+Insert / Shift+Insert = copy / paste
#   * คลิกขวาที่ terminal จะมีเมนู Copy / Paste
COPY jupyter_overrides.json /usr/local/share/jupyter/lab/settings/overrides.json


# start script: dockerd + jupyter lab (ไม่มีรหัสผ่าน เว้นแต่ตั้ง $JUPYTER_PASSWORD)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# ------------------------------------------------------------------
# AI coding CLI (pin เวอร์ชัน) + Playwright MCP + Chromium + ฟอนต์ไทย
#   - เปลี่ยนเวอร์ชันได้ที่ ARG ด้านล่างที่เดียว
#   - ลิงก์ claude เข้า /usr/local/bin แทนการเพิ่ม PATH (สเปกห้ามแก้ .bashrc)
#     และ bash -l ของ JupyterLab Terminal ก็มี /usr/local/bin ใน PATH อยู่แล้ว
#   - DISABLE_AUTOUPDATER=1 กัน Claude Code อัปเดตตัวเองจนเวอร์ชันที่ pin ไว้เพี้ยน
#   - ลบ state ที่ installer ทิ้งไว้ใน /root ตอนจบ ไม่ให้มี config/login ติดไปกับ image
# ------------------------------------------------------------------
ARG CLAUDE_CODE_VERSION=2.1.319
ARG CODEX_VERSION=0.167.0
ARG PLAYWRIGHT_MCP_VERSION=0.0.84

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    DISABLE_AUTOUPDATER=1

RUN curl -fsSL https://claude.ai/install.sh | bash -s "${CLAUDE_CODE_VERSION}" \
 && ln -s "$(readlink -f /root/.local/bin/claude)" /usr/local/bin/claude \
 && test "$(claude --version | cut -d' ' -f1)" = "${CLAUDE_CODE_VERSION}" \
 && rm -rf /root/.claude /root/.claude.json /root/.cache/claude

RUN npm install -g "@openai/codex@${CODEX_VERSION}" "@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}" \
 && test "$(codex --version | awk '{print $NF}')" = "${CODEX_VERSION}" \
 && npm cache clean --force \
 && rm -rf /root/.codex /root/.npm

# ใช้ playwright ที่อยู่ในแพ็กเกจ @playwright/mcp เพื่อให้เวอร์ชัน Chromium ตรงกับ MCP
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig fonts-thai-tlwg \
 && node "$(npm root -g)/@playwright/mcp/node_modules/playwright/cli.js" install --with-deps chromium \
 && fc-cache -f \
 && fc-list :lang=th family | grep -q . \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# ระบบหลายบัญชี: wrapper/installer อบใน image ส่วนบัญชีอยู่ใน volume /root/ai-accounts เท่านั้น
# (installer รันตอน container start ใน start.sh ไม่รันตอน build จึงไม่มีค่าสุ่มหรือ login ติด image)
COPY multi-account/ /usr/local/lib/multi-account/
RUN cd /usr/local/lib/multi-account \
 && chmod 0755 account-wrapper multi-account-install \
 && ln -s /usr/local/lib/multi-account/multi-account-install /usr/local/bin/multi-account-install \
 && for n in 1 2 3 4 5; do \
        ln -s /usr/local/lib/multi-account/account-wrapper "/usr/local/bin/yolo${n}"; \
        ln -s /usr/local/lib/multi-account/account-wrapper "/usr/local/bin/cyolo${n}"; \
    done

VOLUME /var/lib/docker
VOLUME /root/ai-accounts

# 8888=jupyterlab (ไม่มี SSH — สั่งงานผ่าน docker exec / Claude Code app)
EXPOSE 8888

WORKDIR /workspace

CMD ["/usr/local/bin/start.sh"]
