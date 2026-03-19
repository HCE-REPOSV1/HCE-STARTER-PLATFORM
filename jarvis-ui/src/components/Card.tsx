import { ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function Card({ title, children, style }: Props) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,48,135,0.07)', padding: 24, ...style }}>
      {title && <h2 style={{ fontSize: 16, fontWeight: 700, color: '#003087', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e8f0fe' }}>{title}</h2>}
      {children}
    </div>
  );
}
