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

export const PD_RATE = 200000; // 건당 20만원
export const EDITOR_RATE = 10000; // 분당 1만원
