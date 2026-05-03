function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`surface-card hover-lift ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
