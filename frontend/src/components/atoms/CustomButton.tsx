import React from 'react';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string; // 通常色
  hoverColor?: string; // ホバー時
  disabledColor?: string; // 無効時
  textColor?: string; // 文字色
  children: React.ReactNode;
}

const defaultColor = '#28a745'; // 参拝用グリーン
const defaultHoverColor = '#218838'; // 濃いグリーン
const defaultDisabledColor = '#b1dfbb'; // 薄いグリーン

export const CustomButton: React.FC<CustomButtonProps> = ({
  color = defaultColor,
  hoverColor = defaultHoverColor,
  disabledColor = defaultDisabledColor,
  textColor,
  disabled,
  style,
  children,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const background = disabled
    ? disabledColor
    : isHovered
    ? hoverColor
    : color;
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background,
        color: textColor ?? '#fff',
        border: 'none',
        borderRadius: 4,
        padding: '6px 16px',
        fontSize: 16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

export default CustomButton; 