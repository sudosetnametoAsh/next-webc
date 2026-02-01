type CardProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card