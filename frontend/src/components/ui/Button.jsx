function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 font-semibold transition duration-200 ease-out shadow-lg shadow-black/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/30";
  const variants = {
    primary: "bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20 hover:text-white",
    secondary: "bg-violet-500/10 text-violet-200 hover:bg-violet-500/15 hover:text-white",
    danger: "bg-rose-500/15 text-rose-200 hover:bg-rose-500/20 hover:text-white",
  };
  const sizes = {
    sm: "h-10 text-sm",
    md: "h-12 text-sm",
    lg: "h-14 text-base",
  };

  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
