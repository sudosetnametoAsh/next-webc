import { ComponentProps } from "react"

type CardFooterProps = ComponentProps<"div">

const CardFooter = ({ children, className = "", ...props }: CardFooterProps) => {
  return (
    <div 
      className={`
        flex items-center justify-between 
        border-t border-gray-100 
        px-6 py-4 
        ${className}
      `} 
      {...props}
    >
      {children}
    </div>
  )
}

export default CardFooter