import { useState } from 'react';
import { School, BookOpen, Users, Shield, FileText, Image } from 'lucide-react';
import SchoolsPage from './SchoolsPage';
import ClassesPage from './ClassesPage';
import UsersPage from './UsersPage';
import PermissionsPage from './PermissionsPage';
import SystemLogsPage from './SystemLogsPage';
import VisualIdentityPage from './VisualIdentityPage';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('escolas');
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === 'administrador';

  const tabs = [
    { id: 'escolas', label: 'Escolas', icon: <School className="w-5 h-5" /> },
    { id: 'turmas', label: 'Turmas', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'usuarios', label: 'Usuários', icon: <Users className="w-5 h-5" /> },
    { id: 'permissoes', label: 'Permissões', icon: <Shield className="w-5 h-5" /> },
    { id: 'logs', label: 'Logs do Sistema', icon: <FileText className="w-5 h-5" /> },
    ...(isAdmin ? [{ id: 'identidade', label: 'Identidade Visual', icon: <Image className="w-5 h-5" /> }] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6 md:pt-5">
        <div className="mb-3 md:mb-4">
          <h1 className="text-xl font-black tracking-tight text-expo-900 md:text-2xl">Configurações do Sistema</h1>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">Gerencie os cadastros base e os acessos | A Escola Vai ao Cinema | SMEDU | PMI.</p>
        </div>
        
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 md:-mx-6 md:gap-3 md:px-6" aria-label="Seções de configurações">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-3 text-xs font-semibold transition-colors md:gap-2 md:text-sm ${
                activeTab === tab.id
                  ? 'border-expo-500 text-expo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'escolas' && <SchoolsPage isTab={true} />}
        {activeTab === 'turmas' && <ClassesPage isTab={true} />}
        {activeTab === 'usuarios' && <UsersPage isTab={true} />}
        {activeTab === 'permissoes' && <PermissionsPage isTab={true} />}
        {activeTab === 'logs' && <SystemLogsPage isTab={true} />}
        {isAdmin && activeTab === 'identidade' && <VisualIdentityPage isTab={true} />}
      </div>
    </div>
  );
}
