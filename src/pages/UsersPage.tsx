import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Edit, Trash2, X, Eye, EyeOff, Key } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  school_id?: string | null;
  schools?: { name: string };
}

interface SchoolOption {
  id: string;
  name: string;
}

export default function UsersPage({ isTab = false }: { isTab?: boolean }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schoolsList, setSchoolsList] = useState<SchoolOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { showConfirm, showAlert, showError } = useDialog();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'usuario',
    status: 'active',
    school_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name', { ascending: true });
    if (data) setSchoolsList(data as any);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('app_users').select(`
      id, name, email, role, status, school_id,
      schools (name)
    `).order('name', { ascending: true });
    if (data) setUsers(data as any);
  };

  const deleteUser = async (id: string) => {
    const confirmed = await showConfirm('Tem certeza que deseja excluir este usuário?', { title: 'Excluir Usuário', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      await supabase.from('app_users').delete().eq('id', id);
      fetchUsers();
    }
  };

  const openModal = (u?: AppUser) => {
    setShowPassword(false);
    if (u) {
      setEditingUser(u);
      setFormData({
        name: u.name || '',
        email: u.email || '',
        password: '',
        role: u.role || 'usuario',
        status: u.status || 'active',
        school_id: u.school_id || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'usuario', status: 'active', school_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) { 
      await showAlert('Nome e e-mail são obrigatórios.', { title: 'Campos obrigatórios' }); 
      return; 
    }
    
    if (!editingUser && !formData.password.trim()) {
      await showAlert('A senha é obrigatória ao criar um novo usuário.', { title: 'Campo obrigatório' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Tenta atualizar via RPC (auth.users + public.app_users)
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_user_credentials', {
          target_user_id: editingUser.id,
          new_name: formData.name.trim(),
          new_email: formData.email.trim(),
          new_password: formData.password ? formData.password.trim() : null,
          new_role: formData.role,
          new_status: formData.status,
          new_school_id: formData.school_id || null
        });

        if (rpcErr) {
          console.warn("RPC admin_update_user_credentials não encontrada no Supabase, usando fallback:", rpcErr);
          const { error: updateErr } = await supabase.from('app_users').update({
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            status: formData.status,
            school_id: formData.school_id || null
          }).eq('id', editingUser.id);

          if (updateErr) throw updateErr;

          if (formData.password) {
            await showAlert(
              "Perfil atualizado! Para habilitar a troca direta de senhas do Supabase no sistema, execute o script 'update_user_admin_rpc.sql' no SQL Editor do seu Supabase.",
              { title: 'Aviso de Credenciais' }
            );
          }
        } else if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.error || rpcRes.message);
        }
      } else {
        // Tenta criar via RPC (auth.users + public.app_users)
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_user', {
          new_name: formData.name.trim(),
          new_email: formData.email.trim(),
          new_password: formData.password.trim(),
          new_role: formData.role,
          new_status: formData.status,
          new_school_id: formData.school_id || null
        });

        if (rpcErr) {
          console.warn("RPC admin_create_user não encontrada no Supabase, usando fallback:", rpcErr);
          const { error: insertErr } = await supabase.from('app_users').insert([{
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            status: formData.status,
            school_id: formData.school_id || null
          }]);

          if (insertErr) throw insertErr;

          await showAlert(
            "Usuário cadastrado na tabela! Para permitir login direto com a nova senha, execute o script 'update_user_admin_rpc.sql' no SQL Editor do seu Supabase.",
            { title: 'Aviso de Autenticação' }
          );
        } else if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.error || rpcRes.message);
        }
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Erro ao salvar usuário:", err);
      if (err?.code === '23505') {
        await showAlert('Este e-mail já está em uso.', { title: 'E-mail duplicado' });
      } else {
        const msg = err?.message || String(err);
        await showError(`Erro ao salvar usuário: ${msg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full flex flex-col overflow-hidden`}>
      {!isTab && (
        <div className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Usuários</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie os acessos ao sistema.</p>
          </div>
          <button onClick={() => openModal()} className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>
      )}

      {isTab && (
        <div className="flex justify-end mb-4 shrink-0">
          <button onClick={() => openModal()} className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 bg-slate-50">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-expo-800 text-white z-10">
              <tr>
                <th className="p-3 font-semibold">Nome</th>
                <th className="p-3 font-semibold">E-mail</th>
                <th className="p-3 font-semibold">Perfil</th>
                <th className="p-3 font-semibold">Escola</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{user.name}</td>
                  <td className="p-3 text-slate-600 font-mono text-xs">{user.email}</td>
                  <td className="p-3 text-slate-600 capitalize">{user.role}</td>
                  <td className="p-3 text-slate-600">{user.schools?.name || 'Todas'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3 flex justify-center gap-1.5">
                    <button onClick={() => openModal(user)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition" title="Alterar E-mail / Senha / Dados">
                      <Key className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar usuário">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir usuário">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-expo-900">
                {editingUser ? 'Editar Usuário & Credenciais' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail Institucional (Login) *</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  placeholder="Ex: joao@edu.itaguai.rj.gov.br"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {editingUser ? 'Alterar Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                    placeholder={editingUser ? '•••••••• (Manter atual)' : 'Digite a nova senha...'}
                    required={!editingUser}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editingUser && (
                  <p className="text-[11px] text-slate-500 mt-1">Preencha este campo se quiser definir uma nova senha para o usuário.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Perfil</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  >
                    <option value="usuario">Usuário Comum</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vincular a uma Escola</label>
                <select 
                  value={formData.school_id}
                  onChange={e => setFormData({...formData, school_id: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                >
                  <option value="">-- Acesso a Todas as Escolas --</option>
                  {schoolsList.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="bg-expo-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

