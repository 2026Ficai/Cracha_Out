import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppFooter from './AppFooter';
import { useAuth } from '../../contexts/AuthContext';
import { Download, FileText, LogOut, User, Menu } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_APP_LOGO = '/logo-escola-vai-ao-cinema.png';
const AUTHORIZATION_FORM_URL = '/formularios/autorizacao-projeto-escola-vai-ao-cinema.pdf';

const AppLayout = () => {
  const { appUser, signOut } = useAuth();
  const [appLogoUrl, setAppLogoUrl] = useState(DEFAULT_APP_LOGO);

  useEffect(() => {
    const loadBrandLogo = async () => {
      const { data, error } = await supabase.from('badge_settings').select('app_logo_url').limit(1);
      if (!error && data?.[0]?.app_logo_url) {
        setAppLogoUrl(data[0].app_logo_url);
      } else {
        setAppLogoUrl(DEFAULT_APP_LOGO);
      }
    };

    loadBrandLogo();
    window.addEventListener('brand-assets-updated', loadBrandLogo);
    return () => window.removeEventListener('brand-assets-updated', loadBrandLogo);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-[54px] bg-white border-b border-blue-100 flex items-center justify-between px-3 md:px-4 shrink-0 z-10 no-print shadow-[0_2px_12px_rgba(17,74,143,0.06)]">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <button className="p-2 text-slate-400 hover:text-navy-900 transition-colors lg:hidden">
                    <Menu className="w-6 h-6" />
                </button>
                <img src={appLogoUrl} alt="A Escola Vai ao Cinema" className="hidden sm:block h-[48px] w-[180px] object-contain object-left lg:w-[195px]" />
                <div className="hidden md:block h-8 w-px bg-blue-100"></div>
                <div className="min-w-0">
                    <h1 className="truncate text-sm font-extrabold leading-tight tracking-tight text-navy-900 lg:text-base">A ESCOLA VAI AO CINEMA 2026 | SMEDU | PMI</h1>
                    <p className="truncate text-[9px] text-slate-500">Gerador Automatizado de Crachás Escolares</p>
                </div>
            </div>
            {/* Right side actions */}
            <div className="flex shrink-0 items-center gap-3 md:gap-5">
                <div id="header-actions" className="hidden md:block"></div>
                <a
                  href={AUTHORIZATION_FORM_URL}
                  download="Autorização - Projeto A Escola Vai ao Cinema.pdf"
                  className="group flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-2.5 py-2 text-blue-800 shadow-sm transition-all hover:-translate-y-px hover:border-cyan-400 hover:from-blue-100 hover:to-cyan-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:px-3"
                  title="Baixar modelo de autorização em branco"
                  aria-label="Baixar modelo de autorização em branco do projeto A Escola Vai ao Cinema"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-cyan-600 shadow-sm">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden text-xs font-extrabold leading-none lg:block">Modelo da Autorização em branco</span>
                  <Download className="hidden h-3.5 w-3.5 text-blue-600 transition-transform group-hover:translate-y-0.5 lg:block" />
                </a>
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-3">
                    <div className="hidden flex-col text-right xl:flex">
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
        
        <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">
          <Outlet />
          <AppFooter />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
