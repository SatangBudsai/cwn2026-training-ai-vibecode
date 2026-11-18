# ค่าและฟังก์ชันที่ installer กับ wrapper ใช้ร่วมกัน (source เท่านั้น ไม่ได้รันตรง ๆ)

BASE_PATH="$HOME/ai-accounts"   # แก้ที่นี่ที่เดียว

CLAUDE_ROOT="$BASE_PATH/.Claude"
CODEX_ROOT="$BASE_PATH/.Codex"

# ลิงก์ skill จาก shared เข้าบัญชี ทีละ skill (ไม่ symlink ทั้งโฟลเดอร์ เพราะ Codex เขียน skills/.system เอง)
#   - ไม่ทับของที่มีอยู่: skill ส่วนตัวของบัญชีที่ชื่อซ้ำจะยังเป็นของบัญชีนั้น
#   - skill ที่ถูกลบออกจาก shared จะถูกเอาลิงก์ที่ค้างออก (เฉพาะลิงก์ที่ชี้เข้า shared)
#   - ลิงก์เป็น relative เพื่อให้ยังใช้ได้แม้ volume ถูก mount ที่ path อื่น
# wrapper เรียกทุกครั้งที่เปิด จึงไม่ต้องรัน installer ซ้ำเมื่อเพิ่ม skill ใน shared
link_shared_skills() {
    local root="$1" account="$2"
    local dest="$root/$account/skills" link src name

    mkdir -p "$dest"

    for link in "$dest"/*; do
        if [ -L "$link" ] && [ ! -e "$link" ]; then
            case "$(readlink "$link")" in
                ../../shared/skills/*) rm -f "$link" ;;
            esac
        fi
    done

    for src in "$root/shared/skills"/*/; do
        [ -d "$src" ] || continue
        name="$(basename "$src")"
        link="$dest/$name"
        if [ ! -e "$link" ] && [ ! -L "$link" ]; then
            # เปิดหลายบัญชีพร้อมกันไม่ชนกัน เพราะแต่ละบัญชีมีโฟลเดอร์ของตัวเอง
            # แต่บัญชีเดียวเปิดซ้อนกันอาจแข่งสร้างลิงก์เดียวกัน: ใครสร้างก่อนก็ได้ผลเหมือนกัน
            ln -s "../../shared/skills/$name" "$link" 2>/dev/null || true
        fi
    done
}
