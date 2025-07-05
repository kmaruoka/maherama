type CustomTextProps = React.HTMLAttributes<HTMLSpanElement>;

export default function CustomText({ className = '', ...rest }: CustomTextProps) {
  return <span {...rest} className={className.trim()} />;
}
