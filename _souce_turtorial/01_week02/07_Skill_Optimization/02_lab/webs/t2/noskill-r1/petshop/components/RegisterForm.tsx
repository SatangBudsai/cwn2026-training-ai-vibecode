"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { passwordStrength, validateRegister, type RegisterField } from "@/lib/validation";
import { useShop } from "./ShopProvider";

type Pet = "cat" | "dog" | "both";

const STRENGTH_CLASS = { อ่อน: "weak", ปานกลาง: "medium", แข็งแรง: "strong" } as const;

export function RegisterForm() {
  const router = useRouter();
  const { setUser, showToast } = useShop();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pet, setPet] = useState<Pet>("cat");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = password ? passwordStrength(password) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs = validateRegister({ name, email, password, confirm, terms });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirm, pet, terms }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setFormError(data.error ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
        setLoading(false);
        return;
      }
      setUser(data.user);
      showToast("สมัครสมาชิกสำเร็จ 🎉");
      router.push("/account?welcome=1");
      router.refresh();
    } catch {
      setFormError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
      setLoading(false);
    }
  };

  const err = (f: RegisterField) =>
    errors[f] ? (
      <p className="field-error" data-testid={`error-${f}`} role="alert">
        {errors[f]}
      </p>
    ) : null;

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="reg-name">ชื่อ-นามสกุล</label>
        <input
          id="reg-name"
          data-testid="reg-name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        {err("name")}
      </div>
      <div className="field">
        <label htmlFor="reg-email">อีเมล</label>
        <input
          id="reg-email"
          type="email"
          data-testid="reg-email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
        />
        {err("email")}
      </div>
      <div className="field">
        <label htmlFor="reg-password">รหัสผ่าน</label>
        <input
          id="reg-password"
          type="password"
          data-testid="reg-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby="pw-hint"
        />
        {strength ? (
          <div className={`strength ${STRENGTH_CLASS[strength]}`}>
            <span className="strength-bar" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              ความแข็งแรงของรหัสผ่าน: <strong data-testid="password-strength">{strength}</strong>
            </span>
          </div>
        ) : (
          <p id="pw-hint" className="hint">
            อย่างน้อย 8 ตัว และมีตัวเลข
          </p>
        )}
        {err("password")}
      </div>
      <div className="field">
        <label htmlFor="reg-confirm">ยืนยันรหัสผ่าน</label>
        <input
          id="reg-confirm"
          type="password"
          data-testid="reg-confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={!!errors.confirm}
        />
        {err("confirm")}
      </div>

      <fieldset className="field pet-choice">
        <legend>คุณเลี้ยงน้องอะไร?</legend>
        <div className="pet-radios">
          {(
            [
              ["cat", "🐱 แมว"],
              ["dog", "🐶 สุนัข"],
              ["both", "🐱🐶 ทั้งคู่"],
            ] as [Pet, string][]
          ).map(([v, label]) => (
            <label key={v} className={`pet-radio ${pet === v ? "active" : ""}`} htmlFor={`reg-pet-${v}`}>
              <input
                type="radio"
                id={`reg-pet-${v}`}
                name="pet"
                value={v}
                data-testid={`reg-pet-${v}`}
                checked={pet === v}
                onChange={() => setPet(v)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="check" htmlFor="reg-terms">
          <input
            type="checkbox"
            id="reg-terms"
            data-testid="reg-terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          ฉันยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว
        </label>
        {err("terms")}
      </div>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-lg btn-block" data-testid="reg-submit" disabled={loading}>
        {loading ? "กำลังสมัคร…" : "สมัครสมาชิก"}
      </button>
      <p className="auth-alt">
        มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}
