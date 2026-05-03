function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="ui-field-label">{label}</span>}
      <input
        className={`ui-input ${className}`}
        {...props}
      />
      {error && <span className="ui-field-error">{error}</span>}
    </label>
  );
}

export default Input;
