import { ComponentProps } from "react";

type CardProps = ComponentProps<"div">;

const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      // REMOVED: 'p-5' (Padding must be handled by the child to support full-width dividers)
      // ADDED: 'overflow-hidden' (Ensures children like headers/footers respect the rounded corners)
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card