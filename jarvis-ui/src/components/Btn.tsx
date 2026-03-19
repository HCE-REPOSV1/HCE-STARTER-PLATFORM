import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const variants: Record<string, React.CSSProperties> = {
  primary: { background: 'linear-gradient(135deg,#003087,#1a73e8)', color: '#fff', border: 'none' },
  secondary: { background: '#e8f0fe', color: '#003087', border: '1.5px solid #d1d9e6' },
  danger: { background: '#fdecea', color: '#d32f2f', border: '1.5px solid #f5c6c6' },
  ghost: { background: 'transparent', color: '#5a6a85', border: '1.5px solid #d1d9e6' },
};

export default function Btn({ children, onClick, type = 'button', variant = 'primary', disabled, size = 'md', style }: Props) {
  const pad = size === 'sm' ? '6px 14px' : '10px 20px';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad, borderRadius: 8, fontSize: size === 'sm' ? 13 : 14,
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, display: 'inline-flex',
        alignItems: 'center', gap: 6, transition: 'opacity 0.15s',
        ...variants[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}
