function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block text-sm text-slate-300">
      {label && <span className="mb-2 block text-sm font-semibold text-slate-100">{label}</span>}
      <input
        className={`w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 transition duration-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${className}`}
        {...props}
      />
      {error && <span className="mt-2 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

export default Input;
