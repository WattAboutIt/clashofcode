function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`glass-card border border-white/10 shadow-[0_30px_80px_-35px_rgba(14,23,42,0.8)] transition-transform duration-300 hover:-translate-y-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
