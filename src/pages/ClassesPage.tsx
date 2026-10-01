import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

interface Class {
  id: string;
  name: string;
  grade: string;
  shift: string;
  status: string;
  school_id?: string;
  schools?: { name: string };
}

interface SchoolOption {
  id: string;
  name: string;
}

export default function ClassesPage({ isTab = false }: { isTab?: boolean }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolsList, setSchoolsList] = useState<SchoolOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { showConfirm, showAlert, showError } = useDialog();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    shift: 'Manhã',
    status: 'active',
    school_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name', { ascending: true });
    if (data) setSchoolsList(data as any);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select(`
      id, name, grade, shift, status,
      schools (name)
    `).order('name', { ascending: true });
    if (data) setClasses(data as any);
  };

  const deleteClass = async (id: string) => {
    const confirmed = await showConfirm('Tem certeza que deseja excluir esta turma?', { title: 'Excluir Turma', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      await supabase.from('classes').delete().eq('id', id);
      fetchClasses();
    }
  };

  const openModal = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name || '',
        grade: cls.grade || '',
        shift: cls.shift || 'Manhã',
        status: cls.status || 'active',
        school_id: cls.school_id || ''
      });
    } else {
      setEditingClass(null);
      setFormData({ name: '', grade: '', shift: 'Manhã', status: 'active', school_id: schoolsList[0]?.id || '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { await showAlert('O nome da turma é obrigatório.', { title: 'Campo obrigatório' }); return; }
    if (!formData.school_id) { await showAlert('Selecione uma escola.', { title: 'Campo obrigatório' }); return; }
    
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        grade: formData.grade || null,
        shift: formData.shift,
        status: formData.status,
        school_id: formData.school_id
      };

      if (editingClass) {
        await supabase.from('classes').update(payload).eq('id', editingClass.id);
      } else {
        await supabase.from('classes').insert([payload]);
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (err) {
      console.error(err);
      await showError('Erro ao salvar turma.');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = classes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full flex flex-col overflow-hidden`}>
      {!isTab && (
        <div className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Turmas</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie as turmas das escolas.</p>
          </div>
          <button onClick={() => openModal()} className="bg-cyan-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Nova Turma
          </button>
        </div>
      )}

      {isTab && (
        <div className="flex justify-end mb-4 shrink-0">
          <button onClick={() => openModal()} className="bg-cyan-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Nova Turma
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 bg-slate-50">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por turma..." 
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
                <th className="p-3 font-semibold">Nome da Turma</th>
                <th className="p-3 font-semibold">Escola</th>
                <th className="p-3 font-semibold">Ano/Série</th>
                <th className="p-3 font-semibold">Turno</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cls => (
                <tr key={cls.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{cls.name}</td>
                  <td className="p-3 text-slate-600">{cls.schools?.name || '-'}</td>
                  <td className="p-3 text-slate-600">{cls.grade || '-'}</td>
                  <td className="p-3 text-slate-600">{cls.shift || '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${cls.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {cls.status}
                    </span>
                  </td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => openModal(cls)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteClass(cls.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma turma encontrada.</td>
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
                {editingClass ? 'Editar Turma' : 'Nova Turma'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Turma *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  placeholder="Ex: Turma 101"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Escola *</label>
                <select 
                  value={formData.school_id}
                  onChange={e => setFormData({...formData, school_id: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  required
                >
                  <option value="" disabled>Selecione uma escola</option>
                  {schoolsList.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ano/Série</label>
                  <input 
                    type="text" 
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                    placeholder="Ex: 1º Ano"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Turno</label>
                  <select 
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-expo-500 outline-none"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
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
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancelar
                </button>
                 <button type="submit" disabled={isSaving} className="bg-cyan-600 hover:bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50">
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
