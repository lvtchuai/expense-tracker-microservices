'use client';

/**
 * VND amount input. Shows thousands separators as you type (3000 → "3.000")
 * but keeps only digits internally. `value` is the raw digit string (""
 * when empty); parse with Number(value) before sending to the API.
 */
export function AmountInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (digits: string) => void;
}) {
  const display = value ? Number(value).toLocaleString('vi-VN') : '';

  return (
    <div className="input-suffix">
      <input
        type="text"
        inputMode="numeric"
        required
        value={display}
        onChange={(e) => {
          // Strip everything except digits; drop leading zeros.
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
          onChange(digits);
        }}
        placeholder="0"
      />
      <span>₫</span>
    </div>
  );
}
