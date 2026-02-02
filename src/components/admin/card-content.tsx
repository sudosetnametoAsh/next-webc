import { ComponentProps } from "react";

type CardContentProps = ComponentProps<"div">;

const CardContent = ({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div 
      
      className={`p-6 ${className}`} 
      {...props}
    >
      {children}
    </div>
  ) 
}

export default CardContent