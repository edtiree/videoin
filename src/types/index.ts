export type Role = "촬영비" | "편집비";
export type ContractType = "프리랜서" | "사업자";

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: Role;
  contractType: ContractType;
  categories?: string[];
  bankName?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
  isAdmin?: boolean;
  allowedServices?: string[];
}

export interface PDLineItem {
  performer: string;
  filmingDate: string;
  expense: number;
  receiptUrls: string[];
  amount: number; // 고정 200,000
  quantity?: number; // 숏폼/카드뉴스 편수
  notificationId?: string | null; // 작업 요청 연결
}

export interface EditorLineItem {
  performer: string;
  videoLink: string;
  videoDuration: number; // 정산 적용 분 (반올림/반내림)
  videoMinutes?: number; // 입력 원본 분
  videoSeconds?: number; // 입력 원본 초
  amount: number; // 분 × 10,000
  notificationId?: string | null; // 작업 요청 연결
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
