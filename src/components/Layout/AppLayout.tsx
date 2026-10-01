import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';

const AppLayout = () => {
  const { appUser, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-[86px] bg-white border-b border-blue-100 flex items-center justify-between px-6 shrink-0 z-10 no-print shadow-[0_2px_12px_rgba(17,74,143,0.06)]">
            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-navy-900 transition-colors lg:hidden">
                    <Menu className="w-6 h-6" />
                </button>
                <img src="/logo-escola-vai-ao-cinema.png" alt="A Escola Vai ao Cinema" className="hidden sm:block w-[270px] h-[70px] object-contain object-left" />
                <div className="hidden md:block h-8 w-px bg-blue-100"></div>
                <div>
                    <h1 className="text-navy-900 font-extrabold text-lg tracking-tight leading-tight">A ESCOLA VAI AO CINEMA 2026 | SMEDU | PMI</h1>
                    <p className="text-slate-500 text-xs">Gerador Automatizado de Crachás Escolares</p>
                </div>
            </div>
            {/* Right side actions */}
            <div className="flex items-center gap-6">
                <div id="header-actions" className="hidden md:block"></div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col hidden sm:flex text-right">
                        <span className="text-navy-900 text-sm font-bold leading-tight">{appUser?.name || 'Carregando...'}</span>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">{appUser?.role || 'Usuário'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-navy-900 font-bold shadow-sm">
                        {appUser?.name ? appUser.name.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                    <button 
                      onClick={signOut}
                      className="ml-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sair do sistema"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
        
        <div className="flex-1 overflow-auto relative flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
