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
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 pt-8 shrink-0">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-expo-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 mt-1">Gerencie os cadastros base e os acessos | A Escola Vai ao Cinema | SMEDU | PMI.</p>
        </div>
        
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-semibold transition-colors ${
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

      <div className="flex-1 overflow-hidden">
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
