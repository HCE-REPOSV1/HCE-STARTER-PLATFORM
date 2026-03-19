import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { setUser } from '../store/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/login', { username, password });
      setUser(username);
      toast.success('Bienvenido al sistema');
      navigate('/dashboard');
    } catch {
      toast.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>J</div>
          <h1 style={styles.title}>Jarvis Platform</h1>
          <p style={styles.subtitle}>Clínica San Felipe</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Usuario</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} type="submit" disabled={loading}>
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #003087 0%, #0050b3 60%, #1a73e8 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '48px 40px',
    width: 380,
    boxShadow: '0 20px 60px rgba(0,48,135,0.25)',
  },
  logoArea: { textAlign: 'center', marginBottom: 32 },
  logoCircle: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #003087, #1a73e8)',
    color: '#fff', fontSize: 28, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: { fontSize: 22, fontWeight: 700, color: '#003087' },
  subtitle: { fontSize: 13, color: '#5a6a85', marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: {
    padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #d1d9e6', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
  },
  btn: {
    marginTop: 8, padding: '12px', borderRadius: 8,
    background: 'linear-gradient(135deg, #003087, #1a73e8)',
    color: '#fff', fontWeight: 700, fontSize: 15,
    border: 'none', letterSpacing: 0.5,
    transition: 'opacity 0.2s',
  },
};
