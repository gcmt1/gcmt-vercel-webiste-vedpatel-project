import s from "./commerce.module.css";

export default function QuantitySelector({
  value,
  name,
  max = 100,
  disabled,
  onChange,
}) {
  return (
    <div className={s.stepper} role="group" aria-label={"Quantity for " + name}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-label="Quantity" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
