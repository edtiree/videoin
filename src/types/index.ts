export type Role = "촬영비" | "편집비";
export type ContractType = "프리랜서" | "사업자";

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: Role;
  contractType: ContractType;
  categories?: string[];
}

export interface PDLineItem {
  performer: string;
  filmingDate: string;
  expense: number;
  receiptUrls: string[];
  amount: number; // 고정 200,000
}

export interface EditorLineItem {
  performer: string;
  videoLink: string;
  videoDuration: number; // 분
  amount: number; // 분 × 10,000
}

export interface SettlementSubmission {
  workerId: string;
  workerName: string;
  role: Role;
  contractType: ContractType;
  settlementMonth: string; // "2026-03" 형식
  items: PDLineItem[] | EditorLineItem[];
  totalAmount: number;
  totalExpense: number;
  tax: number;
  finalAmount: number;
}

export interface TaxResult {
  totalAmount: number;
  tax: number;
  finalAmount: number;
  label: string;
}
