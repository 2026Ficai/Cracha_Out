import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  School, Users, UserSquare2, 
  CheckCircle2, TrendingUp, BarChart3, Building2, Award, Clock
} from 'lucide-react';

interface SchoolStat {
  id: string;
  name: string;
  studentCount: number;
}

interface ClassStat {
  name: string;
  count: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchoolsCount: 0,
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalServers: 0,
    avgStudentsPerActiveSchool: 0,
    adoptionRate: 0
  });

  const [topSchools, setTopSchools] = useState<SchoolStat[]>([]);
  const [topClasses, setTopClasses] = useState<ClassStat[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, usersRes, classesRes, studentsRes, serversRes] = await Promise.all([
        supabase.from('schools').select('id, name'),
        supabase.from('app_users').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id, school_id, class_name'),
        supabase.from('servers').select('id, school_id')
      ]);

      const schools = schoolsRes.data || [];
      const students = studentsRes.data || [];
      const servers = serversRes.data || [];

      const totalSchools = schools.length;
      const totalStudents = students.length;
      const totalServers = servers.length;
      const totalUsers = usersRes.count || 0;
      const totalClasses = classesRes.count || 0;

      // Identificar escolas ativas (que já possuem pelo menos 1 aluno ou servidor cadastrado)
      const activeSchoolIds = new Set<string>();
      const schoolStudentMap: Record<string, number> = {};

      students.forEach(s => {
        if (s.school_id) {
          activeSchoolIds.add(s.school_id);
          schoolStudentMap[s.school_id] = (schoolStudentMap[s.school_id] || 0) + 1;
        }
      });

      servers.forEach(srv => {
        if (srv.school_id) {
          activeSchoolIds.add(srv.school_id);
        }
      });

      const activeSchoolsCount = activeSchoolIds.size;
      const adoptionRate = totalSchools > 0 ? Number(((activeSchoolsCount / totalSchools) * 100).toFixed(1)) : 0;
      const avgStudentsPerActiveSchool = activeSchoolsCount > 0 ? Math.round(totalStudents / activeSchoolsCount) : 0;

      // Ranking de escolas por alunos cadastrados
      const rankedSchools: SchoolStat[] = schools.map(sc => ({
        id: sc.id,
        name: sc.name,
        studentCount: schoolStudentMap[sc.id] || 0
      })).sort((a, b) => b.studentCount - a.studentCount);

      // Distribuição de alunos por turma
      const classMap: Record<string, number> = {};
      students.forEach(s => {
        const cName = s.class_name && s.class_name.trim() !== '' ? s.class_name.trim() : 'Sem Turma Defina';
        classMap[cName] = (classMap[cName] || 0) + 1;
      });

      const rankedClasses: ClassStat[] = Object.entries(classMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setStats({
        totalSchools,
        activeSchoolsCount,
        totalUsers,
        totalClasses,
        totalStudents,
        totalServers,
        avgStudentsPerActiveSchool,
        adoptionRate
      });

      setTopSchools(rankedSchools);
      setTopClasses(rankedClasses);
    } catch (err) {
      console.error("Erro ao carregar métricas do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Visão geral do sistema e engajamento da rede escolar.</p>
        </div>
        <div className="bg-expo-50 text-expo-800 border border-expo-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-expo-600" /> Atualizado em tempo real
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <div className="w-6 h-6 border-2 border-expo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
          Carregando estatísticas...
        </div>
      ) : (
        <>
          {/* Grid Principal de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
            
            {/* Card 1: Total Escolas */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Escolas</div>
                <div className="text-2xl font-black text-expo-900">{stats.totalSchools}</div>
              </div>
            </div>

            {/* Card 2 (REQUISIÇÃO PRINCIPAL): Escolas Ativas no Sistema */}
            <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Escolas Ativas</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-950">{stats.activeSchoolsCount}</span>
                  <span className="text-xs font-bold text-emerald-700">de {stats.totalSchools} ({stats.adoptionRate}%)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Alunos */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <UserSquare2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alunos Cadastrados</div>
                <div className="text-2xl font-black text-expo-900">{stats.totalStudents}</div>
              </div>
            </div>

            {/* Card 4 (INSIGHT 1): Média Alunos por Escola Ativa */}
            <div className="bg-white p-5 rounded-xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Média / Escola Ativa</div>
                <div className="text-2xl font-black text-indigo-950">{stats.avgStudentsPerActiveSchool} <span className="text-xs font-normal text-indigo-700">alunos</span></div>
              </div>
            </div>

            {/* Card 5: Usuários do App */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuários do Sistema</div>
                <div className="text-2xl font-black text-expo-900">{stats.totalUsers}</div>
              </div>
            </div>

          </div>

          {/* Seção de Insights & Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* INSIGHT 2: Taxa de Adesão da Rede Escolar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    <Building2 className="w-5 h-5 text-expo-500" />
                    Insight: Adesão da Rede
                  </h3>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {stats.adoptionRate}%
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-6">
                  Porcentagem de escolas da rede municipal de ensino que já iniciaram o cadastramento de estudantes no sistema de crachás.
                </p>

                {/* Barra de Progresso de Adesão */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700">
                    <span>Progresso de Uso</span>
                    <span>{stats.activeSchoolsCount} de {stats.totalSchools} escolas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.max(stats.adoptionRate, 4)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Escolas Ativas</div>
                    <div className="text-lg font-extrabold text-emerald-600">{stats.activeSchoolsCount}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Aguardando Início</div>
                    <div className="text-lg font-extrabold text-amber-600">{stats.totalSchools - stats.activeSchoolsCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* INSIGHT 3: Distribuição de Alunos por Turma */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Insight: Maiores Turmas
                  </h3>
                  <span className="text-xs font-medium text-slate-400">Distribuição</span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Turmas com maior volume de alunos cadastrados para a confecção dos crachás 2026.
                </p>

                <div className="space-y-3">
                  {topClasses.length === 0 ? (
                    <div className="text-sm text-slate-400 py-6 text-center">Nenhuma turma registrada ainda.</div>
                  ) : (
                    topClasses.map((c, index) => {
                      const percentage = stats.totalStudents > 0 ? Math.round((c.count / stats.totalStudents) * 100) : 0;
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="font-semibold text-slate-700">{c.name}</span>
                            <span className="text-slate-500 font-bold">{c.count} alunos ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* INSIGHT 4 / RANKING: Escolas em Destaque */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    <Award className="w-5 h-5 text-amber-500" />
                    Engajamento das Escolas
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">Top Cadastro</span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Escolas que lideram o número de alunos inseridos no sistema.
                </p>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[220px]">
                  {topSchools.slice(0, 5).map((sc, index) => (
                    <div key={sc.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate" title={sc.name}>
                          {sc.name}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        {sc.studentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            {sc.studentCount} alunos
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-normal">Pendente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

