"use client";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "blue" | "red";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title, message, confirmText = "확인", cancelText = "취소",
  confirmColor = "blue", onConfirm, onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-bold text-toss-gray-900 mb-2">{title}</h3>
        <p className="text-[14px] text-toss-gray-500 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3.5 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl hover:bg-toss-gray-200 active:scale-[0.98] transition-all text-[15px]">
            {cancelText}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-3.5 font-semibold rounded-2xl active:scale-[0.98] transition-all text-[15px] ${
              confirmColor === "red"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-toss-blue text-white hover:bg-toss-blue-hover"
            }`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
