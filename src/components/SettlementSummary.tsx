"use client";

import { ContractType, TaxResult } from "@/types";
import { calculateTax, getRoleLabel } from "@/lib/tax";

interface SettlementSummaryProps {
  totalWork: number;
  totalExpense: number;
  contractType: ContractType;
  itemCount: number;
  role: string;
  totalDuration?: number;
}

export default function SettlementSummary({
  totalWork, totalExpense, contractType, itemCount, role, totalDuration,
}: SettlementSummaryProps) {
  const grandTotal = totalWork + totalExpense;
  const taxResult: TaxResult = calculateTax(grandTotal, contractType);
  const isFreelancer = contractType === "프리랜서";

  return (
    <div className="bg-toss-gray-50 rounded-2xl p-5">
      <h3 className="text-[16px] font-bold text-toss-gray-900 mb-4">정산 요약</h3>

      <div className="space-y-3 text-[14px]">
        <Row label={`${getRoleLabel(role)} ${role === "숏폼" || role === "카드뉴스" ? "편수" : "건수"}`} value={`${itemCount}${role === "숏폼" || role === "카드뉴스" ? "편" : "건"}`} />
        {role === "편집비" && totalDuration !== undefined && (
          <Row label="총 영상 길이" value={`${totalDuration}분`} />
        )}
        <Row label={getRoleLabel(role)} value={`${totalWork.toLocaleString()}원`} />
        {totalExpense > 0 && (
          <Row label="경비" value={`${totalExpense.toLocaleString()}원`} />
        )}

        <div className="border-t border-toss-gray-200 pt-3">
          <Row label={isFreelancer ? "총액" : "공급가액"} value={`${grandTotal.toLocaleString()}원`} />
        </div>

        <Row
          label={taxResult.label}
          value={`${isFreelancer ? "-" : "+"}${taxResult.tax.toLocaleString()}원`}
          valueColor={isFreelancer ? "text-toss-red" : "text-toss-blue"}
        />

        <div className="border-t border-toss-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-bold text-toss-gray-900">
              {isFreelancer ? "실수령액" : "총 청구액"}
            </span>
            <span className="text-[20px] font-bold text-toss-blue">
              {taxResult.finalAmount.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-toss-gray-600">{label}</span>
      <span className={`font-semibold ${valueColor || "text-toss-gray-900"}`}>{value}</span>
    </div>
  );
}
