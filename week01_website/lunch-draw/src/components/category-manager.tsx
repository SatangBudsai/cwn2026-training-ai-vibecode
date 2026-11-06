"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "./ui";

type Cat = { id: string; label: string; restaurants: number };

const input =
  "h-10 w-full rounded-lg border border-line-strong bg-raised px-3 text-sm placeholder:text-fg-3 focus:border-ember/60 focus:outline-none";

/** Add, rename and delete food categories. Changes reach everyone at once. */
export function CategoryManager({ initial, realtime }: { initial: Cat[]; realtime: "sse" | "poll" }) {
  const [cats, setCats] = useState(initial);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (realtime === "poll") return; // Vercel: the list refreshes after every change made here
    const es = new EventSource("/api/events");
    es.addEventListener("categories", (e) => setCats(JSON.parse((e as MessageEvent).data)));
    return () => es.close();
  }, [realtime]);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "ทำรายการไม่สำเร็จ");
      return false;
    }
    const fresh = await fetch("/api/categories", { cache: "no-store" });
    if (fresh.ok) setCats(await fresh.json());
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/categories", "POST", { label })) setLabel("");
  }

  return (
    <div className="rise mx-auto max-w-2xl pt-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-fg">
        <ArrowLeft size={16} strokeWidth={1.5} />
        กลับไปสุ่มร้าน
      </Link>
      <section className="mt-4 rounded-2xl border border-line bg-card p-5">
        <h1 className="text-xl font-medium">ประเภทอาหาร</h1>
        <p className="mt-1 text-sm text-fg-2">
          เพิ่ม แก้ชื่อ หรือลบประเภทอาหาร ถ้าลบ ประเภทนั้นจะหายไปจากทุกร้านและทุกโหวต
        </p>

        <form onSubmit={add} className="mt-5 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
            placeholder="เช่น ข้าวมันไก่, ติ่มซำ, สลัด"
            aria-label="ชื่อประเภทอาหารใหม่"
            className={input}
          />
          <Button variant="primary" className="h-10" disabled={busy || !label.trim()}>
            <Plus size={16} strokeWidth={1.5} />
            เพิ่มประเภท
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <ul className="mt-5" data-testid="category-list">
          {cats.map((c) => (
            <CategoryRow
              key={c.id}
              c={c}
              busy={busy}
              onRename={(l) => call(`/api/categories/${c.id}`, "PATCH", { label: l })}
              onDelete={() => call(`/api/categories/${c.id}`, "DELETE")}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CategoryRow({
  c,
  busy,
  onRename,
  onDelete,
}: {
  c: Cat;
  busy: boolean;
  onRename: (label: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.label);
  const [confirm, setConfirm] = useState(false);

  return (
    <li data-testid="category-row" data-id={c.id} className="flex min-h-12 items-center gap-3 border-b border-line py-1.5 last:border-0">
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onRename(draft)) setEditing(false);
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30} aria-label="ชื่อประเภทอาหาร" autoFocus className={input} />
          <Button variant="secondary" className="h-10" disabled={busy || !draft.trim()} aria-label="บันทึกชื่อ">
            <Check size={16} strokeWidth={1.5} />
          </Button>
          <Button type="button" variant="ghost" className="h-10" onClick={() => { setEditing(false); setDraft(c.label); }} aria-label="ยกเลิกแก้ชื่อ">
            <X size={16} strokeWidth={1.5} />
          </Button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" data-testid="category-label">{c.label}</div>
            <div className="font-mono text-xs text-fg-3 tnum">{c.restaurants} ร้าน</div>
          </div>
          {confirm ? (
            <>
              <span className="text-xs text-fg-3">{c.restaurants ? `เอาออกจาก ${c.restaurants} ร้าน` : "ยังไม่มีร้าน"}</span>
              <Button variant="ghost" className="text-bad hover:text-bad" disabled={busy} onClick={onDelete}>
                ยืนยันลบ
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                ยกเลิก
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" aria-label={`แก้ชื่อ ${c.label}`} onClick={() => setEditing(true)}>
                <Pencil size={16} strokeWidth={1.5} />
              </Button>
              <Button variant="ghost" aria-label={`ลบ ${c.label}`} onClick={() => setConfirm(true)}>
                <Trash2 size={16} strokeWidth={1.5} />
              </Button>
            </>
          )}
        </>
      )}
    </li>
  );
}
