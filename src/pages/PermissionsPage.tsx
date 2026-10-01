import { Shield, Lock, Users, Key } from 'lucide-react';

export default function PermissionsPage({ isTab = false }: { isTab?: boolean }) {
  const roles = [
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Acesso total ao sistema, configurações, escolas, turmas, usuários e geração de crachás.',
      usersCount: 3,
      features: ['Cadastros Base', 'Geração de Crachás', 'Configurações do Sistema', 'Controle de Usuários'],
      icon: <Key className="w-5 h-5 text-expo-500" />
    },
    {
      id: 'usuario',
      name: 'Usuário Comum (Escola)',
      description: 'Acesso restrito apenas para gerenciar alunos de sua própria escola e gerar PDFs de crachás.',
      usersCount: 124,
      features: ['Leitura de Turmas (da própria escola)', 'Cadastro e Edição de Alunos', 'Geração de Crachás'],
      icon: <Users className="w-5 h-5 text-slate-500" />
    }
  ];

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full flex flex-col overflow-hidden`}>
      {!isTab && (
        <div className="mb-6 shrink-0">
          <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Permissões</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os níveis de acesso e funções dos usuários do sistema.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-auto pb-8">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full relative overflow-hidden group">
            {role.id === 'admin' && (
              <div className="absolute top-0 right-0 bg-expo-500 text-white text-[10px] font-bold px-3 py-1 uppercase rounded-bl-lg">
                Full Access
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${role.id === 'admin' ? 'bg-expo-50' : 'bg-slate-50'}`}>
                {role.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-expo-900">{role.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{role.usersCount} usuários vinculados</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 flex-1">
              {role.description}
            </p>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Permissões Habilitadas</h4>
              <ul className="space-y-2">
                {role.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
                {role.id !== 'admin' && (
                  <li className="flex items-start gap-2 text-sm text-slate-400">
                    <Lock className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    <span className="line-through">Configurações do Sistema</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button disabled className="w-full py-2 bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold opacity-60 cursor-not-allowed">
                Editar Permissões (Em Breve)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
