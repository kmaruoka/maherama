import { Link, type LinkProps } from 'react-router-dom';

export default function CustomMenuItem(
  props: LinkProps & { children?: React.ReactNode },
) {
  const { className = '', children, ...rest } = props;
  return (
    <Link {...rest} className={`flex-1 py-2 text-center block ${className}`.trim()}>
      {children}
    </Link>
  );
}
