type CardFooterProps = {
  children: React.ReactNode
  className?: string
}

const CardFooter = ({ children, className = "", ...props }: CardFooterProps) => {
  return (
    <div className={`mt-4 flex items-center justify-between border-t border-gray-100 pt-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export default CardFooter