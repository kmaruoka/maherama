type CustomImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export default function CustomImage({ className = '', ...rest }: CustomImageProps) {
  return <img {...rest} className={`object-contain ${className}`.trim()} />;
}
