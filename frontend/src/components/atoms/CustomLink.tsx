import { Link, type LinkProps } from 'react-router-dom';

export default function CustomLink(props: LinkProps) {
  const { className = '', ...rest } = props;
  return (
    <Link
      {...rest}
      className={`text-blue-600 hover:underline ${className}`.trim()}
    />
  );
}
