import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/students/manual', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login Error:", error);
      setError(error.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Ocorreu um erro ao tentar entrar. (' + error.message + ')');
    } else {
      navigate('/students/manual', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sky-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Section */}
        <div className="bg-gradient-to-r from-navy-900 to-blue-800 flex flex-col items-center pt-8 pb-6 px-6 relative">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-4 overflow-hidden border-4 border-white/20">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/63/Bras%C3%A3o_de_Armas_de_Itagua%C3%AD.jpg" alt="Brasão de Itaguaí" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="text-white/80 text-xs tracking-widest font-bold uppercase mb-1">SMEDU | Infraestrutura</h2>
          <h1 className="text-white text-xl font-extrabold tracking-tight">Identificações dos Alunos</h1>
        </div>

        {/* Form Section */}
        <div className="px-8 py-8">
          <h3 className="text-navy-900 text-lg font-bold mb-6 text-center">Acesso ao Sistema</h3>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-navy-900 text-sm font-semibold mb-1.5" htmlFor="email">
                E-mail institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 text-sm text-navy-900"
                  placeholder="exemplo@edu.itaguai.rj.gov.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-navy-900 text-sm font-semibold mb-1.5" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 text-sm text-navy-900"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 text-center text-slate-500 text-xs font-medium tracking-wide">
        Prefeitura Municipal de Itaguaí — SMEDU/CPD
      </div>
    </div>
  );
}
