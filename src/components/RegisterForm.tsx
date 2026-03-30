"use client";

import { useState } from "react";
import { ContractType } from "@/types";

interface RegisterFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function RegisterForm({ onSuccess, onBack }: RegisterFormProps) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [name, setName] = useState("");
  const [contractType, setContractType] = useState<ContractType>("프리랜서");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const validateStep1 = (): string | null => {
    if (!phone || phone.replace(/\D/g, "").length < 10) return "휴대폰 번호를 입력해주세요.";
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return "PIN은 4자리 숫자로 입력해주세요.";
    if (pin !== pinConfirm) return "PIN이 일치하지 않습니다.";
    if (!name.trim()) return "이름을 입력해주세요.";
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(""); setStep(2);
  };

  const handleSubmit = async () => {
    if (!bankName) { setError("은행을 선택해주세요."); return; }
    if (!bankAccount) { setError("계좌번호를 입력해주세요."); return; }
    if (!accountHolder.trim()) { setError("예금주를 입력해주세요."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""), pin, name: name.trim(), contractType,
          bankName: bankName || undefined, bankAccount: bankAccount || undefined,
          accountHolder: accountHolder || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "가입 실패"); return; }
      onSuccess();
    } catch { setError("서버 연결에 실패했습니다."); }
    finally { setSubmitting(false); }
  };

  const inputClass = "w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400";

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-[22px] font-bold text-toss-gray-900 mb-1">회원가입</h2>
      <p className="text-toss-gray-500 text-[14px] mb-8">
        {step === 1 ? "기본 정보를 입력해주세요" : "계좌 및 사업자 정보를 입력해주세요"}
      </p>

      {/* 스텝 표시 */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? "bg-toss-blue" : "bg-toss-gray-200"}`} />
        ))}
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">{error}</div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <Field label="휴대폰 번호">
            <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
              className={inputClass} placeholder="010-1234-5678" inputMode="numeric" />
          </Field>
          <Field label="이름">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={inputClass} placeholder="실명을 입력하세요" />
          </Field>
          <Field label="PIN (4자리 비밀번호)">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={inputClass} placeholder="숫자 4자리" inputMode="numeric" />
          </Field>
          <Field label="PIN 확인">
            <input type="password" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={inputClass} placeholder="다시 입력하세요" inputMode="numeric" />
          </Field>

          <Field label="계약 유형">
            <div className="grid grid-cols-2 gap-2">
              {(["프리랜서", "사업자"] as ContractType[]).map((c) => (
                <button key={c} type="button" onClick={() => setContractType(c)}
                  className={`py-3 rounded-xl text-[14px] font-semibold border-2 transition-all ${
                    contractType === c ? "bg-toss-blue text-white border-toss-blue" : "bg-white text-toss-gray-600 border-toss-gray-200 hover:border-toss-blue"
                  }`}>{c}</button>
              ))}
            </div>
          </Field>

          <button type="button" onClick={handleNext}
            className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px] mt-2">
            다음
          </button>
          <button type="button" onClick={onBack}
            className="w-full py-3 text-toss-gray-500 text-[14px] hover:text-toss-gray-700 transition">
            뒤로
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="은행">
            <select value={bankName} onChange={(e) => setBankName(e.target.value)}
              className={`${inputClass} ${!bankName ? "text-toss-gray-400" : ""}`}>
              <option value="">선택하세요</option>
              {["카카오뱅크", "토스뱅크", "국민은행", "신한은행", "하나은행", "우리은행", "농협은행", "기업은행", "SC제일은행", "대구은행", "부산은행", "경남은행", "광주은행", "전북은행", "제주은행", "수협은행", "새마을금고", "신협", "우체국"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="계좌번호">
            <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
              className={inputClass} placeholder="- 없이 숫자만 입력" />
          </Field>
          <Field label="예금주">
            <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
              className={inputClass} placeholder="예금주명" />
          </Field>

          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:bg-toss-gray-300 active:scale-[0.98] transition-all text-[16px] mt-2">
            {submitting ? "가입 중..." : "가입하기"}
          </button>
          <button type="button" onClick={() => setStep(1)}
            className="w-full py-3 text-toss-gray-500 text-[14px] hover:text-toss-gray-700 transition">
            뒤로
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
