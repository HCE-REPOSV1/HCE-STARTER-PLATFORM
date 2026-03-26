import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { setUser } from '../store/auth';
import {
  Box, Typography,
  TextInput, PasswordInput, Button,
  baseColors,
  Syringe, Heart, Pill, Plus, Activity,
  Stethoscope, Bandage, Asterisk, FlaskConical, Thermometer,
  User, Lock,
} from '@hce/design-system';
import type { LucideIcon } from '@hce/design-system';

type BgIconDef = { Icon: LucideIcon; top: number; left: number; rotate: number }

const BG_ICONS: BgIconDef[] = [
  { Icon: Activity,     top:  4, left:  3, rotate:   0 },
  { Icon: Stethoscope,  top:  4, left: 13, rotate: -10 },
  { Icon: Activity,     top:  3, left: 37, rotate:   0 },
  { Icon: Syringe,      top:  3, left: 55, rotate: -40 },
  { Icon: Stethoscope,  top:  4, left: 65, rotate:  15 },
  { Icon: Syringe,      top:  3, left: 79, rotate: -30 },
  { Icon: Heart,        top:  4, left: 90, rotate:   0 },
  { Icon: Pill,         top: 18, left:  1, rotate:  20 },
  { Icon: Plus,         top: 18, left: 15, rotate:   0 },
  { Icon: Bandage,      top: 18, left: 26, rotate:  10 },
  { Icon: Plus,         top: 18, left: 45, rotate:   0 },
  { Icon: Bandage,      top: 18, left: 62, rotate: -10 },
  { Icon: Pill,         top: 19, left: 72, rotate:  25 },
  { Icon: Plus,         top: 18, left: 82, rotate:   0 },
  { Icon: Bandage,      top: 18, left: 93, rotate:  10 },
  { Icon: Plus,         top: 34, left:  2, rotate:   0 },
  { Icon: Pill,         top: 35, left: 13, rotate:  15 },
  { Icon: Plus,         top: 34, left: 25, rotate:   0 },
  { Icon: Plus,         top: 34, left: 45, rotate:   0 },
  { Icon: Pill,         top: 35, left: 62, rotate: -20 },
  { Icon: Syringe,      top: 34, left: 73, rotate:  30 },
  { Icon: Plus,         top: 34, left: 84, rotate:   0 },
  { Icon: FlaskConical, top: 51, left:  2, rotate:  10 },
  { Icon: Asterisk,     top: 51, left: 15, rotate:   0 },
  { Icon: Bandage,      top: 51, left: 26, rotate: -10 },
  { Icon: Plus,         top: 51, left: 45, rotate:   0 },
  { Icon: Asterisk,     top: 51, left: 62, rotate:   0 },
  { Icon: Bandage,      top: 51, left: 72, rotate:  15 },
  { Icon: Plus,         top: 51, left: 83, rotate:   0 },
  { Icon: Thermometer,  top: 51, left: 93, rotate:   0 },
  { Icon: Pill,         top: 68, left:  3, rotate:  25 },
  { Icon: Plus,         top: 68, left: 15, rotate:   0 },
  { Icon: Syringe,      top: 67, left: 26, rotate: -25 },
  { Icon: Plus,         top: 68, left: 45, rotate:   0 },
  { Icon: Pill,         top: 68, left: 62, rotate:  10 },
  { Icon: Syringe,      top: 67, left: 72, rotate:  20 },
  { Icon: Plus,         top: 68, left: 83, rotate:   0 },
  { Icon: Stethoscope,  top: 84, left:  2, rotate:   0 },
  { Icon: Plus,         top: 84, left: 36, rotate:   0 },
  { Icon: Pill,         top: 84, left: 57, rotate:  15 },
  { Icon: Syringe,      top: 83, left: 82, rotate: -30 },
]

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
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
    <Box sx={{
      minHeight:       '100vh',
      backgroundColor: baseColors.primaryLight,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      position:        'relative',
      overflow:        'hidden',
    }}>

      {/* Iconos médicos de fondo */}
      {BG_ICONS.map(({ Icon, top, left, rotate }, i) => (
        <Box
          key={i}
          sx={{
            position:      'absolute',
            top:           `${top}%`,
            left:          `${left}%`,
            transform:     `rotate(${rotate}deg)`,
            color:         '#B8CCE8',
            pointerEvents: 'none',
            userSelect:    'none',
          }}
        >
          <Icon size={28} strokeWidth={1.5} />
        </Box>
      ))}

      {/* Card wrapper */}
      <Box sx={{ position: 'relative', zIndex: 1, width: { xs: 'calc(100vw - 32px)', sm: 'auto' } }}>

        {/* Logo circle */}
        <Box sx={{
          position:        'absolute',
          top:             -44,
          left:            '50%',
          transform:       'translateX(-50%)',
          width:           88,
          height:          88,
          borderRadius:    '50%',
          backgroundColor: baseColors.secondary,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       '0 4px 20px rgba(111,178,63,0.45)',
          zIndex:          2,
        }}>
          <Plus size={44} color="white" strokeWidth={3} />
        </Box>

        {/* Login card */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            backgroundColor: baseColors.surface,
            border:          `1.5px solid ${baseColors.primary}`,
            borderRadius:    '16px',
            pt:              8,
            pb:              5,
            px:              { xs: 3, sm: 5 },
            width:           { xs: '100%', sm: 420 },
            boxShadow:       '0 8px 40px rgba(30,79,163,0.12)',
          }}
        >

          <Typography sx={{
            textAlign:  'center',
            fontWeight: 700,
            fontSize:   '1.375rem',
            color:      baseColors.primary,
            lineHeight: 1.3,
            mb:         1,
          }}>
            HCE Accelerator
          </Typography>

          <Typography sx={{
            textAlign: 'center',
            color:     baseColors.textSecondary,
            fontSize:  '0.875rem',
            mb:        3.5,
          }}>
            Inicia sesión para acceder
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            <TextInput
              label="Usuario"
              value={username}
              onChange={setUsername}
              placeholder="Ingrese usuario"
              startIcon={<User size={18} color={baseColors.textSecondary} strokeWidth={1.8} />}
              required
            />

            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={setPassword}
              placeholder="Ingrese contraseña"
              startIcon={<Lock size={18} color={baseColors.textSecondary} strokeWidth={1.8} />}
            />

            <Box sx={{ mt: 0.5 }}>
              <Button
                type="submit"
                fullWidth
                color="secondary"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Validando...' : 'Ingresar'}
              </Button>
            </Box>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}
