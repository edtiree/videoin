import { ContractType, TaxResult } from "@/types";

const FREELANCER_TAX_RATE = 0.033;
const BUSINESS_VAT_RATE = 0.1;

export function calculateTax(
  totalAmount: number,
  contractType: ContractType
): TaxResult {
  if (contractType === "프리랜서") {
    const tax = Math.floor(totalAmount * FREELANCER_TAX_RATE);
    return {
      totalAmount,
      tax,
      finalAmount: totalAmount - tax,
      label: "원천징수(3.3%)",
    };
  } else {
    const tax = Math.floor(totalAmount * BUSINESS_VAT_RATE);
    return {
      totalAmount,
      tax,
      finalAmount: totalAmount + tax,
      label: "부가세(10%)",
    };
  }
}

export const PD_RATE = 200000; // 롱폼 건당 20만원
export const SHORTFORM_RATE = 10000; // 숏폼 건당 1만원
export const CARDNEWS_RATE = 10000; // 카드뉴스 건당 1만원
export const EDITOR_RATE = 10000; // 편집 분당 1만원

// role → 표시 라벨
export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    "촬영PD": "촬영비",
    "숏폼": "숏폼",
    "카드뉴스": "카드뉴스",
    "편집자": "편집비",
  };
  return map[role] || role;
}
