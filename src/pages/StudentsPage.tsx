import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Printer, School as SchoolIcon } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import StudentPreviewCard from '../components/Students/StudentPreviewCard';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  allergy?: string;
  blood_type?: string;
  school_id: string | null;
  responsible_phone_1?: string;
  responsible_phone_2?: string;
  schools?: { name: string; responsible_name?: string };
}

interface School {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const { appUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});
  const { showConfirm, showAlert } = useDialog();

  const isAdmin = appUser?.role === 'administrador';

  useEffect(() => {
    fetchSettings();
    if (isAdmin) {
      fetchSchools();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('badge_settings').select('*').limit(1);
    if (data && data.length > 0) setSettings(data[0]);
  };

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    if (data) setSchools(data);
  };

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      let targetSchoolId: string | null = null;
      if (isAdmin) {
        targetSchoolId = selectedSchoolId !== 'ALL' ? selectedSchoolId : null;
      } else if (appUser?.school_id) {
        targetSchoolId = appUser.school_id;
      }

      // Tentativa inicial selecionando todos os campos (incluindo allergy e blood_type)
      let query = supabase.from('students').select(`
        id, full_name, class_name, allergy, blood_type, school_id, responsible_phone_1, responsible_phone_2,
        schools (name, responsible_name)
      `).order('created_at', { ascending: false });

      if (targetSchoolId) {
        query = query.eq('school_id', targetSchoolId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Erro ao buscar alunos com campos de alergia/sangue (tentando query fallback):", error);
        // Query de fallback sem allergy e blood_type
        let fallbackQuery = supabase.from('students').select(`
          id, full_name, class_name, school_id, responsible_phone_1, responsible_phone_2,
          schools (name, responsible_name)
        `).order('created_at', { ascending: false });

        if (targetSchoolId) {
          fallbackQuery = fallbackQuery.eq('school_id', targetSchoolId);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;

        if (fallbackError) {
          console.error("Erro na busca de alunos:", fallbackError);
          setStudents([]);
        } else if (fallbackData) {
          const formatted = fallbackData.map((s: any) => ({
            ...s,
            allergy: '',
            blood_type: ''
          }));
          setStudents(formatted);
        }
      } else if (data) {
        setStudents(data as any);
      }
    } catch (err) {
      console.error("Exceção ao buscar alunos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, selectedSchoolId, appUser]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const deleteStudent = async (id: string) => {
    const confirmed = await showConfirm('Excluir este aluno?', { title: 'Excluir Aluno', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      await supabase.from('students').delete().eq('id', id);
      fetchStudents();
    }
  };

  const deleteSchoolStudents = async () => {
    if (!isAdmin || selectedSchoolId === 'ALL') return;

    const currentSchool = schools.find(s => s.id === selectedSchoolId);
    const schoolName = currentSchool?.name || 'esta escola';
    const totalCount = students.length;

    if (totalCount === 0) {
      await showAlert(`Não há alunos cadastrados na escola "${schoolName}".`, { title: 'Sem Registros' });
      return;
    }

    const confirmed = await showConfirm(
      `ATENÇÃO ADMINISTRADOR!\n\nTem certeza que deseja apagar permanentemente TODOS os ${totalCount} alunos da escola "${schoolName}"?\n\nEsta ação removerá todos os estudantes desta escola no banco de dados e não pode ser desfeita.`,
      {
        title: `Apagar Alunos de ${schoolName}`,
        confirmLabel: `Sim, apagar ${totalCount} alunos`,
        cancelLabel: 'Cancelar'
      }
    );

    if (confirmed) {
      try {
        const { error } = await supabase.from('students').delete().eq('school_id', selectedSchoolId);
        if (error) throw error;
        await showAlert(`Todos os ${totalCount} alunos da escola "${schoolName}" foram apagados com sucesso!`, { title: 'Alunos Excluídos' });
        fetchStudents();
      } catch (err: any) {
        console.error("Erro ao apagar alunos da escola:", err);
        await showAlert(`Erro ao apagar alunos: ${err.message || String(err)}`, { title: 'Erro' });
      }
    }
  };

  const handlePrint = async () => {
    if (filtered.length === 0) { 
      await showAlert('Nenhum aluno para imprimir.', { title: 'Lista vazia' }); 
      return; 
    }
    setIsPrinting(true);
    const cleanup = () => {
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const filtered = students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Alunos</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os estudantes cadastrados no sistema.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/students/manual" className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Adicionar em Lote (Tabela)
          </Link>
          <button onClick={handlePrint} className="bg-expo-900 hover:bg-expo-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Printer className="w-4 h-4" /> Imprimir ({filtered.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 shrink-0 bg-slate-50 items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Buscar por nome..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-expo-500 bg-white" 
              />
            </div>
            {isAdmin && schools.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <SchoolIcon className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-expo-500 text-slate-700 font-medium"
                >
                  <option value="ALL">Todas as Escolas</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {selectedSchoolId !== 'ALL' && (
                  <button 
                    onClick={deleteSchoolStudents}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm shrink-0"
                    title={`Apagar todos os alunos de ${schools.find(s => s.id === selectedSchoolId)?.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Apagar Alunos da Escola ({students.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total: <span className="font-bold text-slate-800">{filtered.length}</span> alunos
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-expo-800 text-white z-10">
              <tr>
                <th className="p-3 font-semibold">Nome Completo</th>
                <th className="p-3 font-semibold">Escola</th>
                <th className="p-3 font-semibold">Turma</th>
                <th className="p-3 font-semibold">Alergia</th>
                <th className="p-3 font-semibold">Sangue</th>
                <th className="p-3 font-semibold w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-expo-500 border-t-transparent rounded-full animate-spin"></div>
                      Carregando alunos...
                    </div>
                  </td>
                </tr>
              ) : filtered.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-800">{student.full_name}</td>
                  <td className="p-3 text-slate-600">{student.schools?.name || '-'}</td>
                  <td className="p-3 text-slate-600">{student.class_name || '-'}</td>
                  <td className="p-3 text-slate-600">{student.allergy || '-'}</td>
                  <td className="p-3 text-slate-600">{student.blood_type || '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => deleteStudent(student.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum aluno encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isPrinting && (
        <div id="actualPrintContainer" className="fixed top-0 left-0 w-full h-full bg-white z-[9999] overflow-auto flex flex-col items-center">
          {Array.from({ length: Math.ceil(filtered.length / 8) }).map((_, pageIndex) => (
            <div 
              key={pageIndex} 
              className="print-page student-badge-print-page layout-8 relative bg-white mx-auto" 
              style={{ 
                width: '210mm', 
                height: '297mm', 
                padding: '6mm 0', 
                boxSizing: 'border-box', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 86mm)', 
                gridTemplateRows: 'repeat(4, 64.6mm)', 
                columnGap: '5mm', 
                rowGap: '4mm', 
                justifyContent: 'center',
                alignContent: 'center', 
                pageBreakAfter: 'always' 
              }}
            >
              {filtered.slice(pageIndex * 8, pageIndex * 8 + 8).map(student => (
                <div key={student.id} className="badge-preview-container student-badge-print-wrapper" style={{ width: '86mm', height: '64.6mm', overflow: 'hidden', position: 'relative' }}>
                  <StudentPreviewCard 
                    student={student} 
                    globalSchoolName={student.schools?.name || ''} 
                    directorName={(student.schools as any)?.responsible_name}
                    settings={settings}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

