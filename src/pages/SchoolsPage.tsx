import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Edit, Trash2, X, UserX } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

interface School {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  responsible_name: string | null;
}

export default function SchoolsPage({ isTab = false }: { isTab?: boolean }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { showConfirm, showAlert, showError } = useDialog();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    responsible_name: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name', { ascending: true });
    if (data) setSchools(data as any);
  };

  const deleteSchool = async (id: string) => {
    const confirmed = await showConfirm('Tem certeza que deseja excluir esta escola? Todos os alunos associados a ela ficarão sem escola.', { title: 'Excluir Escola', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      await supabase.from('schools').delete().eq('id', id);
      fetchSchools();
    }
  };

  const deleteSchoolStudents = async (school: School) => {
    try {
      const { count, error: countErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school.id);

      if (countErr) throw countErr;

      const studentCount = count || 0;
      if (studentCount === 0) {
        await showAlert(`A escola "${school.name}" não possui alunos cadastrados no momento.`, { title: 'Sem Registros' });
        return;
      }

      const confirmed = await showConfirm(
        `ATENÇÃO ADMINISTRADOR!\n\nA escola "${school.name}" possui ${studentCount} aluno(s) cadastrado(s).\n\nDeseja apagar permanentemente TODOS os ${studentCount} alunos desta escola?\n\nEsta ação removerá todos os registros de alunos desta escola e não pode ser desfeita.`,
        {
          title: `Apagar Alunos de ${school.name}`,
          confirmLabel: `Sim, apagar ${studentCount} alunos`,
          cancelLabel: 'Cancelar'
        }
      );

      if (confirmed) {
        const { error: deleteErr } = await supabase.from('students').delete().eq('school_id', school.id);
        if (deleteErr) throw deleteErr;
        await showAlert(`Todos os ${studentCount} alunos da escola "${school.name}" foram apagados com sucesso!`, { title: 'Alunos Excluídos' });
      }
    } catch (err: any) {
      console.error("Erro ao apagar alunos da escola:", err);
      await showError(`Erro ao apagar alunos da escola: ${err.message || String(err)}`);
    }
  };

  const openModal = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name || '',
        code: school.code || '',
        phone: school.phone || '',
        responsible_name: school.responsible_name || ''
      });
    } else {
      setEditingSchool(null);
      setFormData({ name: '', code: '', phone: '', responsible_name: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { await showAlert('O nome da escola é obrigatório.', { title: 'Campo obrigatório' }); return; }
    
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code || null,
        phone: formData.phone || null,
        responsible_name: formData.responsible_name || null
      };

      if (editingSchool) {
        await supabase.from('schools').update(payload).eq('id', editingSchool.id);
      } else {
        await supabase.from('schools').insert([payload]);
      }
      setIsModalOpen(false);
      fetchSchools();
    } catch (err) {
      console.error(err);
      await showError('Erro ao salvar escola.');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = schools.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full flex flex-col overflow-hidden`}>
      {!isTab && (
        <div className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Escolas</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie as escolas cadastradas na rede.</p>
          </div>
          <button onClick={() => openModal()} className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Nova Escola
          </button>
        </div>
      )}
      
      {isTab && (
        <div className="flex justify-end mb-4 shrink-0">
          <button onClick={() => openModal()} className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Nova Escola
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 bg-slate-50">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
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
                <th className="p-3 font-semibold">Nome da Escola</th>
                <th className="p-3 font-semibold">Código</th>
                <th className="p-3 font-semibold">Telefone</th>
                <th className="p-3 font-semibold">Diretor(a) Responsável</th>
                <th className="p-3 font-semibold w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(school => (
                <tr key={school.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{school.name}</td>
                  <td className="p-3 text-slate-600">{school.code || '-'}</td>
                  <td className="p-3 text-slate-600">{school.phone || '-'}</td>
                  <td className="p-3 text-slate-600">{school.responsible_name || '-'}</td>
                  <td className="p-3 flex justify-center gap-1.5">
                    <button onClick={() => deleteSchoolStudents(school)} title="Apagar todos os alunos cadastrados nesta escola" className="p-1.5 text-amber-600 hover:text-red-600 hover:bg-red-50 rounded transition">
                      <UserX className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal(school)} title="Editar escola" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSchool(school.id)} title="Excluir escola" className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma escola encontrada.</td>
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
                {editingSchool ? 'Editar Escola' : 'Nova Escola'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Escola *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  placeholder="Ex: E. M. José Machado"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Código (INEP)</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do(a) Diretor(a) Responsável</label>
                <input 
                  type="text" 
                  value={formData.responsible_name}
                  onChange={e => setFormData({...formData, responsible_name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  placeholder="Ex: Profª. Maria Silva"
                />
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
