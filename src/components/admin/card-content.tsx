type CardContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const CardContent = ({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  ) 
}

export default CardContent