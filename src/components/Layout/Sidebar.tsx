import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === 'administrador';
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside className={`bg-gradient-to-b from-[#002d6b] to-[#004d91] text-white flex flex-col shrink-0 h-full overflow-y-auto no-print shadow-2xl relative z-20 transition-all duration-300 ${isCollapsed ? 'w-[78px]' : 'w-[260px]'}`}>
      <div className={`p-4 flex flex-col items-center border-b border-white/10 transition-all ${isCollapsed ? 'px-1.5' : ''}`}>
        <div className={`${isCollapsed ? 'w-9 h-9' : 'w-20 h-20'} flex items-center justify-center mb-1.5 overflow-hidden transition-all`}>
          <img alt="Brasão de Itaguaí" className="w-full h-full object-contain" src="/brasao_itaguai.png" />
        </div>
        <div className={`text-center text-white/90 font-bold leading-relaxed ${isCollapsed ? 'text-[10px]' : 'text-xs'}`}>ITAGUAÍ<br /><span className={`${isCollapsed ? 'text-[8px]' : 'text-[10px]'} tracking-wide`}>SMEDU | PMI</span></div>
      </div>
      
      {!isCollapsed && <div className="px-6 mt-6 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Principal</div>}
      {isCollapsed && <div className="mt-4 mb-2"></div>}
      
      <nav className={`flex-1 space-y-1.5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <NavLink to="/dashboard" className={({isActive}) => `flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-3'} text-sm rounded-xl transition-all duration-200 ${isActive ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30' : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'}`} title="Dashboard">
          <LayoutDashboard className={`w-5 h-5 opacity-90 ${isCollapsed ? '' : 'mr-3'}`} /> {!isCollapsed && "Dashboard"}
        </NavLink>
        <NavLink to="/students/manual" className={({isActive}) => `flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-3'} text-sm rounded-xl transition-all duration-200 ${isActive || window.location.pathname.includes('/students') ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30' : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'}`} title="Alunos">
          <Users className={`w-5 h-5 opacity-90 ${isCollapsed ? '' : 'mr-3'}`} /> {!isCollapsed && "Alunos"}
        </NavLink>
        
        {isAdmin && (
          <NavLink to="/servers" className={({isActive}) => `flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-3'} text-sm rounded-xl transition-all duration-200 ${isActive || window.location.pathname.includes('/servers') ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30' : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'}`} title="Servidor">
            <Briefcase className={`w-5 h-5 opacity-90 ${isCollapsed ? '' : 'mr-3'}`} /> {!isCollapsed && "Servidor"}
          </NavLink>
        )}
        
        {isAdmin && (
          <NavLink to="/settings" className={({isActive}) => `flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-3'} text-sm rounded-xl transition-all duration-200 ${isActive || window.location.pathname !== '/dashboard' && window.location.pathname !== '/' && !window.location.pathname.includes('/students') && !window.location.pathname.includes('/servers') ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30' : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'}`} title="Configurações">
            <Settings className={`w-5 h-5 opacity-90 ${isCollapsed ? '' : 'mr-3'}`} /> {!isCollapsed && "Configurações"}
          </NavLink>
        )}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`mt-2 w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} text-xs font-medium text-slate-400 hover:text-white py-2 transition-colors`}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && "Recolher menu"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
