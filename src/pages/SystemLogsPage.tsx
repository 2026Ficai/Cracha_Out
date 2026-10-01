import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type LogLevel = 'info' | 'warning' | 'error' | 'success';

interface SystemLog {
  id: string;
  level: LogLevel;
  message: string;
  source: string | null;
  actor_email: string | null;
  created_at: string;
}

const levelLabels: Record<LogLevel, string> = {
  info: 'Informação',
  warning: 'Atenção',
  error: 'Erro',
  success: 'Sucesso',
};

const levelStyles: Record<LogLevel, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export default function SystemLogsPage({ isTab = false }: { isTab?: boolean }) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_logs')
      .select('id, level, message, source, actor_email, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Erro ao carregar logs:', error);
      setTableUnavailable(true);
      setLogs([]);
    } else {
      setTableUnavailable(false);
      setLogs((data || []) as SystemLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const matchesSearch = `${log.message} ${log.source || ''} ${log.actor_email || ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR'));
    const matchesLevel = !level || log.level === level;
    const matchesDate = !date || log.created_at.slice(0, 10) === date;
    return matchesSearch && matchesLevel && matchesDate;
  }), [logs, search, level, date]);

  const clearFilters = () => {
    setSearch('');
    setLevel('');
    setDate('');
  };

  const exportLogs = () => {
    const rows = [
      ['Data', 'Nível', 'Atividade', 'Origem', 'Usuário'],
      ...filteredLogs.map((log) => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        levelLabels[log.level] || log.level,
        log.message,
        log.source || '',
        log.actor_email || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'logs-do-sistema.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full overflow-auto bg-slate-50`}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25"><FileText className="h-5 w-5" /></div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Logs do Sistema</h2>
          <p className="text-sm text-slate-500">Registro de atividades e eventos importantes.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_176px_150px_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500">
            <option value="">Todos os níveis</option>
            {Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 outline-none focus:border-blue-500" />
          <button onClick={clearFilters} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"><X className="h-4 w-4" /> Limpar filtros</button>
          <button onClick={exportLogs} disabled={filteredLogs.length === 0} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> Exportar</button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-500">{filteredLogs.length} registros de atividade encontrados</span>
          <button onClick={loadLogs} className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-800"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar</button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tableUnavailable ? (
          <div className="p-8 text-center text-sm text-slate-500">A tabela de logs ainda não foi configurada. Execute o script <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">create_system_logs.sql</code> no Supabase.</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Carregando registros...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Nenhum registro encontrado para os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="p-3">Data</th><th className="p-3">Nível</th><th className="p-3">Atividade</th><th className="p-3">Origem</th><th className="p-3">Usuário</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => <tr key={log.id} className="hover:bg-slate-50"><td className="whitespace-nowrap p-3 text-slate-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${levelStyles[log.level] || levelStyles.info}`}>{levelLabels[log.level] || log.level}</span></td><td className="p-3 font-medium text-slate-700">{log.message}</td><td className="p-3 text-slate-500">{log.source || '—'}</td><td className="p-3 text-slate-500">{log.actor_email || '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
