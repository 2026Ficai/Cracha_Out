import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Printer } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import ServerPreviewCard from '../components/Servers/ServerPreviewCard';

interface Server {
  id: string;
  full_name: string;
  role_name: string;
  registration_number: string;
  school_id: string | null;
  schools?: { name: string; responsible_name?: string };
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    fetchServers();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('badge_settings').select('*').single();
    if (data) setSettings(data);
  };

  const fetchServers = async () => {
    const { data } = await supabase.from('servers').select(`
      id, full_name, role_name, registration_number, school_id,
      schools (name, responsible_name)
    `).order('created_at', { ascending: false });
    if (data) setServers(data as any);
  };

  const deleteServer = async (id: string) => {
    const confirmed = await showConfirm('Excluir este servidor?', { title: 'Excluir Servidor', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      await supabase.from('servers').delete().eq('id', id);
      fetchServers();
    }
  };

  const filtered = servers.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-expo-900 tracking-tight">Servidores</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os servidores cadastrados no sistema.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/servers/manual" className="bg-expo-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Adicionar em Lote (Tabela)
          </Link>
          <button onClick={async () => {
            if (filtered.length === 0) { await showAlert('Nenhum servidor para imprimir.', { title: 'Lista vazia' }); return; }
            setIsPrinting(true);
            setTimeout(() => {
              window.print();
              setIsPrinting(false);
            }, 500);
          }} className="bg-expo-900 hover:bg-expo-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
            <Printer className="w-4 h-4" /> Imprimir ({filtered.length})
          </button>
        </div>
      </div>

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
            <thead className="sticky top-0 bg-expo-800 text-white">
              <tr>
                <th className="p-3 font-semibold">Nome Completo</th>
                <th className="p-3 font-semibold">Escola</th>
                <th className="p-3 font-semibold">Cargo / Função</th>
                <th className="p-3 font-semibold">Matrícula</th>
                <th className="p-3 font-semibold w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(server => (
                <tr key={server.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{server.full_name}</td>
                  <td className="p-3 text-slate-600">{server.schools?.name || '-'}</td>
                  <td className="p-3 text-slate-600">{server.role_name || '-'}</td>
                  <td className="p-3 text-slate-600">{server.registration_number || '-'}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteServer(server.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum servidor encontrado.</td>
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
              className="print-page layout-8 relative bg-white mx-auto" 
              style={{ 
                width: '210mm', 
                height: '297mm', 
                padding: '8mm 6mm', 
                boxSizing: 'border-box', 
                display: 'grid', 
                gridTemplateColumns: '98mm 98mm', 
                gridTemplateRows: '66mm 66mm 66mm 66mm', 
                columnGap: '4mm', 
                rowGap: '4mm', 
                alignContent: 'start', 
                pageBreakAfter: 'always' 
              }}
            >
              {filtered.slice(pageIndex * 8, pageIndex * 8 + 8).map(server => (
                <div key={server.id} className="badge-preview-container" style={{ width: '98mm', height: '66mm', overflow: 'hidden', position: 'relative' }}>
                  <ServerPreviewCard 
                    server={server} 
                    globalSchoolName={server.schools?.name || ''} 
                    directorName={(server.schools as any)?.responsible_name}
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
