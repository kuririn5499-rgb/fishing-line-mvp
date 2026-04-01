/**
 * フォームフィールドコンポーネント
 * React Hook Form と組み合わせて使う
 */

import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import type { FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: ReactNode;
}

/** ラベル・エラー表示のラッパー */
export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500">{error.message}</p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

/** テキスト入力 */
export function Input({ hasError, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`
        w-full rounded-xl border px-3 py-2.5 text-sm
        focus:outline-none focus:ring-2 focus:ring-brand-500
        ${hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}
        ${className}
      `}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

/** テキストエリア */
export function Textarea({ hasError, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`
        w-full rounded-xl border px-3 py-2.5 text-sm resize-none
        focus:outline-none focus:ring-2 focus:ring-brand-500
        ${hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}
        ${className}
      `}
    />
  );
}

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  children: ReactNode;
}

/** セレクトボックス */
export function Select({ hasError, className = "", children, ...props }: SelectProps) {
  return (
    <select
      {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      className={`
        w-full rounded-xl border px-3 py-2.5 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-brand-500
        ${hasError ? "border-red-400 bg-red-50" : "border-gray-200"}
        ${className}
      `}
    >
      {children}
    </select>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/** チェックボックス付きフィールド */
export function CheckboxField({ label, checked, onChange, disabled }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-5 h-5 rounded text-brand-600 border-gray-300 focus:ring-brand-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
