function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  const base = "ui-button focus:outline-none";
  const variants = {
    primary: "ui-button--primary",
    secondary: "ui-button--secondary",
    danger: "ui-button--danger",
  };
  const sizes = {
    sm: "ui-button--sm",
    md: "ui-button--md",
    lg: "ui-button--lg",
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
