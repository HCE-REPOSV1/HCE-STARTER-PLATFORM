import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { setUser } from '../store/auth';
import { Button, TextInput, Card } from '@jarvis/design-system';

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
      <div style={{ width: 380 }}>
        <Card>
          <div style={styles.logoArea}>
            <div style={styles.logoCircle}>J</div>
            <h1 style={styles.title}>Jarvis Platform</h1>
            <p style={styles.subtitle}>XXXXXXX</p>
          </div>
          <form onSubmit={handleSubmit} style={styles.form}>
            <TextInput
              label="Usuario"
              value={username}
              onChange={setUsername}
              placeholder="admin"
              required
            />
            <TextInput
              label="Contraseña"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              required
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              size="lg"
            >
              {loading ? 'Validando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>
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
    background: 'linear-gradient(135deg, #1A3A6B 0%, #1E4FA3 60%, #2B5BA8 100%)',
  },
  logoArea: { textAlign: 'center', marginBottom: 28 },
  logoCircle: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3A6B, #1E4FA3)',
    color: '#fff', fontSize: 28, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--jarvis-navy)', margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--jarvis-text-secondary)', marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
};
