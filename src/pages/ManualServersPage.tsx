import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ArrowLeft, Save, Plus, Trash2, Printer, FileSpreadsheet, 
  ClipboardPaste, AlertTriangle, Download, X, ZoomIn,
  Type
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ServerPreviewCard from '../components/Servers/ServerPreviewCard';
import type { Settings } from '../components/Students/StudentPreviewCard';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import * as XLSX from 'xlsx';

interface School {
  id: string;
  name: string;
  responsible_name?: string | null;
}

interface DraftServer {
  _ui_id: string;
  full_name: string;
  role_name: string;
  registration_number: string;
  school_id: string | null;
  selected: boolean;
}

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function ManualServersPage() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { showAlert, showConfirm, showSuccess, showError, showWarning } = useDialog();
  
  const [schools, setSchools] = useState<School[]>([]);
  const [adminSelectedSchoolId, setAdminSelectedSchoolId] = useState<string>('');

  const isAdmin = appUser?.role === 'administrador';
  
  const globalSchoolName = isAdmin 
    ? (schools.find(s => s.id === adminSelectedSchoolId)?.name || 'Selecione uma Escola')
    : (appUser?.name || 'Carregando...');
    
  const globalSchoolId = isAdmin ? adminSelectedSchoolId : (appUser?.school_id || null);
  
  const [currentSchoolDirector, setCurrentSchoolDirector] = useState<string>('');
  
  const [servers, setServers] = useState<DraftServer[]>([
    { _ui_id: generateId(), full_name: '', role_name: '', registration_number: '', school_id: null, selected: false }
  ]);
  
  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
  const [importText, setImportText] = useState('');
  const [printLayout, setPrintLayout] = useState<'8' | '6'>('8');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [badgeSettings, setBadgeSettings] = useState<Settings>({ 
    logo_prefeitura_url: null, 
    logo_expo_url: null,
    label_title_1: 'IDENTIFICAÇÃO',
    label_title_2: 'SERVIDOR',
    label_nome: 'NOME COMPLETO:',
    label_escola: 'ESCOLA:',
    label_cargo: 'CARGO / FUNÇÃO:',
    label_matricula: 'MATRÍCULA:'
  });

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('badge_settings').select('*').limit(1);
      if (data && data.length > 0) {
        setBadgeSettings({
          logo_prefeitura_url: data[0].logo_prefeitura_url,
          logo_expo_url: data[0].logo_expo_url,
          label_title_1: 'IDENTIFICAÇÃO',
          label_title_2: 'SERVIDOR',
          label_nome: 'NOME COMPLETO:',
          label_escola: 'ESCOLA:',
          label_cargo: 'CARGO / FUNÇÃO:',
          label_matricula: 'MATRÍCULA:'
        });
      }
    };
    loadSettings();
  }, []);

  const formatNames = (format: 'upper' | 'lower' | 'title') => {
    const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
    setServers(prev => prev.map(s => {
      if (!s.full_name) return s;
      let newName = s.full_name;
      if (format === 'upper') newName = newName.toUpperCase();
      if (format === 'lower') newName = newName.toLowerCase();
      if (format === 'title') {
        newName = newName
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .map((word, index) => {
            if (!word) return '';
            if (prepositions.has(word) && index > 0) {
              return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(' ');
      }
      return { ...s, full_name: newName };
    }));
  };

  const downloadExampleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ["Nome Completo", "Cargo / Função", "Matrícula"],
      ["Ana Silva", "Professor de Matemática", "123456"],
      ["Pedro Santos", "Diretor Escolar", "789012"],
      ["João Costa", "Merendeira", "345678"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Servidores");
    XLSX.writeFile(wb, "Modelo_Importacao_Servidores.xlsx");
  };

  useEffect(() => {
    if (isAdmin) {
      const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name, responsible_name').order('name');
        if (data) {
          setSchools(data as any);
          if (data.length > 0) {
            setAdminSelectedSchoolId(data[0].id);
            setCurrentSchoolDirector(data[0].responsible_name || '');
          }
        }
      };
      fetchSchools();
    } else if (appUser?.school_id) {
      supabase.from('schools').select('responsible_name').eq('id', appUser.school_id).single().then(({ data }) => {
        if (data && data.responsible_name) {
          setCurrentSchoolDirector(data.responsible_name);
        }
      });
    }
  }, [isAdmin, appUser]);

  useEffect(() => {
    if (isAdmin && adminSelectedSchoolId) {
      const school = schools.find(s => s.id === adminSelectedSchoolId);
      if (school) {
        setCurrentSchoolDirector(school.responsible_name || '');
      }
    }
  }, [adminSelectedSchoolId, schools, isAdmin]);

  const handleSaveDirectorName = async () => {
    if (!globalSchoolId) return;
    try {
      await supabase.from('schools').update({ responsible_name: currentSchoolDirector || null }).eq('id', globalSchoolId);
      setSchools(prev => prev.map(s => s.id === globalSchoolId ? { ...s, responsible_name: currentSchoolDirector } : s));
    } catch (err) {
      console.error("Erro ao salvar diretor:", err);
    }
  };

  const loadFromDB = async () => {
    if (!globalSchoolId) {
      await showAlert("Por favor, selecione uma escola antes.", { title: 'Escola não selecionada' });
      return;
    }
    setIsLoadingDB(true);
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('school_id', globalSchoolId)
        .order('full_name');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        await showAlert("Nenhum servidor encontrado no banco para esta escola.", { title: 'Sem registros' });
        return;
      }
      
      const imported: DraftServer[] = data.map(s => ({
        _ui_id: generateId(),
        full_name: s.full_name,
        role_name: s.role_name || '',
        registration_number: s.registration_number || '',
        school_id: s.school_id,
        selected: false
      }));
      
      const currentFiltered = servers.filter(s => s.full_name.trim() !== '');
      const currentNames = new Set(currentFiltered.map(s => s.full_name.toLowerCase().trim()));
      const toAdd = imported.filter(s => !currentNames.has(s.full_name.toLowerCase().trim()));

      if (toAdd.length === 0) {
        await showAlert("Todos os servidores do banco já estão na sua lista atual.", { title: 'Lista atualizada' });
      } else {
        setServers([...currentFiltered, ...toAdd]);
        await showSuccess(`${toAdd.length} servidores carregados com sucesso!`);
      }
      
    } catch (err) {
      console.error(err);
      await showError("Erro ao carregar servidores do banco.");
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;
    
    const lines = importText.split('\n');
    const newServers: DraftServer[] = [];
    let isHeaderSkipped = false;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      let cols = line.split('\t');
      if (cols.length === 1) {
        cols = line.split(';');
      }
      
      if (cols[cols.length - 1] === '') {
        cols.pop();
      }
      
      if (cols.length >= 1 && cols[0].trim()) {
        const firstCol = cols[0].toLowerCase().trim();
        if (!isHeaderSkipped && (firstCol.includes('nome') || firstCol.includes('servidor') || firstCol.includes('funcionário'))) {
            isHeaderSkipped = true;
            return;
        }

        newServers.push({
            _ui_id: generateId(),
            full_name: cols[0].trim(),
            school_id: null,
            role_name: cols[1]?.trim() || '',
            registration_number: cols[2]?.trim() || '',
            selected: false
        });
      }
    });
    
    if (newServers.length === 0) {
      await showWarning("Nenhum servidor válido foi encontrado no texto colado.");
      return;
    }

    setServers(prev => [...prev.filter(s => s.full_name.trim() !== ''), ...newServers]);
    setImportText('');
    await showSuccess(`${newServers.length} servidores processados com sucesso!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      
      const newServers: DraftServer[] = [];
      let isHeaderSkipped = false;

      data.forEach(cols => {
        if (cols && cols.length >= 1 && cols[0]) {
            const firstCol = String(cols[0]).toLowerCase();
            if (!isHeaderSkipped && (firstCol.includes('nome') || firstCol.includes('servidor') || firstCol.includes('funcionário'))) {
                isHeaderSkipped = true;
                return;
            }

            newServers.push({
                _ui_id: generateId(),
                full_name: String(cols[0] || '').trim(),
                school_id: null,
                role_name: String(cols[1] || '').trim(),
                registration_number: String(cols[2] || '').trim(),
                selected: false
            });
        }
      });

      setServers([...servers.filter(s => s.full_name !== ''), ...newServers]);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveTable = async () => {
    setIsSaving(true);
    try {
      const validServers = servers.filter(s => s.full_name.trim() !== '');
      if (validServers.length === 0) {
        await showWarning("Nenhum servidor válido para salvar.");
        return false;
      }
      
      const payload = validServers.map(s => ({
        full_name: s.full_name,
        role_name: s.role_name,
        registration_number: s.registration_number,
        school_id: globalSchoolId || null
      }));

      const { error } = await supabase.from('servers').insert(payload);
      if (error) throw error;
      
      return true;
    } catch(err) {
      console.error(err);
      await showError("Erro ao salvar servidores.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndReturn = async () => {
    const success = await saveTable();
    if (success) {
      navigate('/servers');
    }
  };

  const addManualRow = () => {
    setServers(prev => [
      ...prev,
      { _ui_id: generateId(), full_name: '', role_name: '', registration_number: '', school_id: null, selected: false }
    ]);
  };

  const removeRow = (uiId: string) => {
    setServers(prev => {
      const filtered = prev.filter(s => s._ui_id !== uiId);
      if (filtered.length === 0) {
        return [{ _ui_id: generateId(), full_name: '', role_name: '', registration_number: '', school_id: null, selected: false }];
      }
      return filtered;
    });
  };

  const updateServerField = (uiId: string, field: keyof DraftServer, value: any) => {
    setServers(prev => prev.map(s => s._ui_id === uiId ? { ...s, [field]: value } : s));
  };

  const clearAll = async () => {
    const confirmed = await showConfirm("Tem certeza que deseja limpar toda a tabela atual?", { title: 'Limpar tabela', confirmLabel: 'Sim, limpar', cancelLabel: 'Cancelar' });
    if (confirmed) {
      setServers([{ _ui_id: generateId(), full_name: '', role_name: '', registration_number: '', school_id: null, selected: false }]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          
          const newServers: DraftServer[] = [];
          let isHeaderSkipped = false;
          
          rows.forEach(cols => {
            if (cols && cols.length >= 1 && cols[0]) {
              const firstCol = String(cols[0]).toLowerCase();
              if (!isHeaderSkipped && (firstCol.includes('nome') || firstCol.includes('servidor') || firstCol.includes('funcionário'))) {
                isHeaderSkipped = true;
                return;
              }
              
              newServers.push({
                _ui_id: generateId(),
                full_name: String(cols[0] || '').trim(),
                school_id: null,
                role_name: String(cols[1] || '').trim(),
                registration_number: String(cols[2] || '').trim(),
                selected: false
              });
            }
          });
          
          setServers(prev => [...prev.filter(s => s.full_name !== ''), ...newServers]);
          await showSuccess(`${newServers.length} servidores importados com sucesso!`);
        } catch (err) {
          await showError("Erro ao ler o arquivo Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = servers.every(s => s.selected);
    setServers(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const toggleSelectServer = (uiId: string) => {
    setServers(prev => prev.map(s => s._ui_id === uiId ? { ...s, selected: !s.selected } : s));
  };

  const deleteSelected = async () => {
    const selectedCount = servers.filter(s => s.selected).length;
    if (selectedCount === 0) return;
    const confirmed = await showConfirm(`Excluir os ${selectedCount} servidores selecionados da lista de edição?`, { title: 'Confirmar exclusão', confirmLabel: 'Excluir', cancelLabel: 'Cancelar' });
    if (confirmed) {
      setServers(prev => {
        const remaining = prev.filter(s => !s.selected);
        if (remaining.length === 0) {
          return [{ _ui_id: generateId(), full_name: '', role_name: '', registration_number: '', school_id: null, selected: false }];
        }
        return remaining;
      });
    }
  };

  const printBadges = async () => {
    const validServers = servers.filter(s => s.full_name.trim() !== '');
    if (validServers.length === 0) {
      await showAlert("Adicione pelo menos um servidor válido antes de imprimir.", { title: 'Lista vazia' });
      return;
    }
    
    // Create print container style dynamically
    const style = document.createElement('style');
    style.id = 'print-servers-style';
    style.innerHTML = `
      @media print {
        html, body, #root, #root *, .flex, .flex-1, .h-screen, .h-full, .overflow-hidden, .overflow-auto {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        html, body, #root, #root > div, #root > div > div {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          position: static !important;
          display: block !important;
        }

        .print\\:hidden, .no-print, header, nav, aside {
          display: none !important;
        }

        #actualPrintContainer {
          display: block !important;
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 210mm !important;
          height: auto !important;
          background: white !important;
          z-index: 9999999 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .print-page {
          page-break-after: always !important;
          margin: 0 !important;
          padding: 8mm 6mm !important;
          width: 210mm !important;
          height: 297mm !important;
          box-sizing: border-box !important;
          display: grid !important;
          grid-template-columns: 98mm 98mm !important;
          grid-template-rows: 66mm 66mm 66mm 66mm !important;
          column-gap: 4mm !important;
          row-gap: 4mm !important;
          align-content: start !important;
        }
      }
    `;
    document.head.appendChild(style);

    const printContainer = document.createElement('div');
    printContainer.id = 'actualPrintContainer';
    
    const itemsPerPage = 8;
    const pagesCount = Math.ceil(validServers.length / itemsPerPage);
    
    for (let page = 0; page < pagesCount; page++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'print-page';
      
      const pageServers = validServers.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);
      pageServers.forEach(server => {
        const badge = document.createElement('div');
        badge.className = 'badge-preview-container';
        badge.style.width = '95mm';
        badge.style.height = '66mm';
        badge.style.border = '2.5px solid #000';
        badge.style.boxSizing = 'border-box';
        badge.style.padding = '4mm';
        badge.style.display = 'flex';
        badge.style.flexDirection = 'column';
        badge.style.justifyContent = 'space-between';
        badge.style.background = '#fff';

        badge.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; height: 22%; margin-bottom: 4px;">
              <img src="${badgeSettings.logo_expo_url || '/Expo2.png'}" alt="Logo Expo" style="height: 100%; object-fit: contain; max-width: 28%;" />
              <div style="text-align: center; flex: 1; padding: 0 4px;">
                  <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: #64748b; line-height: 1.1;">IDENTIFICAÇÃO</div>
                  <div style="font-size: 15px; font-weight: 900; letter-spacing: -0.025em; color: #000; line-height: 1; text-transform: uppercase;">SERVIDOR</div>
              </div>
              <img src="${badgeSettings.logo_prefeitura_url || '/Expo1.png'}" alt="Logo Prefeitura" style="height: 100%; object-fit: contain; max-width: 28%;" />
          </div>
          <div style="display: flex; flexDirection: column; gap: 4px; height: 76%; justify-content: space-between; flex-direction: column;">
              <div style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; height: 23%;">
                  <span style="font-size: 6.5px; font-weight: 900; color: #64748b; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">NOME COMPLETO:</span>
                  <span style="font-size: 10px; font-weight: 700; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1; text-transform: uppercase;">${server.full_name}</span>
              </div>
              <div style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; height: 23%;">
                  <span style="font-size: 6.5px; font-weight: 900; color: #64748b; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">ESCOLA:</span>
                  <span style="font-size: 10px; font-weight: 700; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1; text-transform: uppercase;">${globalSchoolName}</span>
              </div>
              <div style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; height: 23%;">
                  <span style="font-size: 6.5px; font-weight: 900; color: #64748b; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">CARGO / FUNÇÃO:</span>
                  <span style="font-size: 10px; font-weight: 700; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1; text-transform: uppercase;">${server.role_name || '-'}</span>
              </div>
              <div style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; height: 25%; background-color: rgba(248, 250, 252, 0.4); overflow: hidden;">
                  <span style="font-size: 6.5px; font-weight: 900; color: #64748b; text-transform: uppercase; line-height: 1; margin-bottom: 1px; white-space: nowrap;">MATRÍCULA:</span>
                  <span style="font-size: 10px; font-weight: 700; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1;">${server.registration_number || '-'}</span>
              </div>
          </div>
        `;
        pageDiv.appendChild(badge);
      });
      
      printContainer.appendChild(pageDiv);
    }
    
    document.body.appendChild(printContainer);
    
    setTimeout(() => {
      window.print();
      document.body.removeChild(printContainer);
      const styleEl = document.getElementById('print-servers-style');
      if (styleEl) styleEl.remove();
    }, 500);
  };

  const validServers = servers.filter(s => s.full_name.trim() !== '');

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden bg-slate-50">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6 shrink-0 no-print">
        <div className="flex items-center gap-3">
          <Link to="/servers" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Inserir Servidores</h2>
              <span className="bg-cyan-100 text-cyan-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-cyan-200">Em Lote</span>
            </div>
            <p className="text-slate-500 text-sm mt-1.5">Inclua servidores colando dados do Excel ou cadastrando manualmente.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            {validServers.length} {validServers.length === 1 ? 'servidor' : 'servidores'} em edição
          </span>
          <button 
            onClick={clearAll} 
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-700 px-3 py-1.5 rounded-lg font-semibold border border-red-200 shadow-sm transition-colors"
          >
            Limpar Lista
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden no-print">
        
        {/* Left Side - Editor Tab */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-w-[500px]">
          
          {/* Header Controls / School Select */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-slate-50 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {isAdmin ? (
                <div className="flex items-center gap-2.5">
                  <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Escola do Lote:</label>
                  <select 
                    value={adminSelectedSchoolId} 
                    onChange={e => setAdminSelectedSchoolId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-expo-500 shadow-sm"
                  >
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Escola:</span>
                  <span className="text-sm font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200">{globalSchoolName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Diretor(a) Responsável:</label>
                <input 
                  type="text" 
                  value={currentSchoolDirector} 
                  onChange={e => setCurrentSchoolDirector(e.target.value)}
                  onBlur={handleSaveDirectorName}
                  placeholder="Nome do(a) Diretor(a)"
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-expo-500 shadow-sm w-72 sm:w-96 md:w-[380px] text-slate-900 font-semibold"
                  title="Edite e clique fora para salvar no banco de dados"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={loadFromDB}
                disabled={isLoadingDB}
                className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isLoadingDB ? "Carregando..." : "Carregar Servidores Atuais"}
              </button>
              <button 
                onClick={downloadExampleTemplate}
                className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 shadow-sm flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Planilha Modelo
              </button>
            </div>
          </div>

          {/* Format Tool & Tabs */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button 
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'paste' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                1. Copiar & Colar
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'manual' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                2. Edição Manual (${servers.length})
              </button>
            </div>

            {/* Quick format tool */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Formatar Nomes:</span>
              <button onClick={() => formatNames('upper')} className="px-2 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded">MAIÚSCULO</button>
              <button onClick={() => formatNames('title')} className="px-2 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded">Iniciais Maiúsculas</button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden min-h-0 relative">
            
            {/* Paste Tab */}
            {activeTab === 'paste' && (
              <div 
                className={`p-6 flex flex-col h-full overflow-y-auto transition-all ${isDragging ? 'bg-indigo-50/70 border-2 border-dashed border-indigo-400 m-2 rounded-xl' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mb-4 text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleFileUpload} 
                    ref={fileInputRef} 
                    className="hidden" 
                  />
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Arraste seu arquivo Excel aqui ou clique para fazer upload</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Selecionar Arquivo Excel
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <ClipboardPaste className="w-5 h-5 text-slate-500" /> Ou Cole os Dados do Excel Abaixo:
                    </label>
                    <span className="text-[10px] text-slate-500">Mantenha a ordem: Nome, Cargo/Função, Matrícula</span>
                  </div>
                  <textarea 
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Cole as colunas de sua planilha aqui...&#10;Exemplo:&#10;Maria de Souza&#9;Professor de Geografia&#9;234567&#10;José dos Santos&#9;Merendeira&#9;890123"
                    className="flex-1 p-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-expo-500 font-mono resize-none shadow-inner"
                  />
                  <button 
                    onClick={handleTextImport}
                    disabled={!importText.trim()}
                    className="mt-4 bg-expo-900 hover:bg-expo-800 text-white py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Salvar sua colagem
                  </button>
                </div>
              </div>
            )}

            {/* Manual Edit Tab */}
            {activeTab === 'manual' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="p-2 w-8">
                          <input type="checkbox" onChange={toggleSelectAll} checked={servers.length > 0 && servers.every(s => s.selected)} className="rounded" />
                        </th>
                        <th className="p-2">Nome Completo</th>
                        <th className="p-2">Cargo / Função</th>
                        <th className="p-2">Matrícula</th>
                        <th className="p-2 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {servers.map((server, index) => (
                        <tr key={server._ui_id} className={`hover:bg-slate-50/50 ${server.selected ? 'bg-cyan-50/40' : ''}`}>
                          <td className="p-2">
                            <input 
                              type="checkbox" 
                              checked={server.selected} 
                              onChange={() => toggleSelectServer(server._ui_id)} 
                              className="rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={server.full_name} 
                              onChange={e => updateServerField(server._ui_id, 'full_name', e.target.value)}
                              placeholder={`Nome Completo ${index + 1}`}
                              className="w-full border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-slate-500 font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={server.role_name} 
                              onChange={e => updateServerField(server._ui_id, 'role_name', e.target.value)}
                              placeholder="Cargo ou Função"
                              className="w-full border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-slate-500"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={server.registration_number} 
                              onChange={e => updateServerField(server._ui_id, 'registration_number', e.target.value)}
                              placeholder="Matrícula"
                              className="w-full border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-slate-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button 
                              onClick={() => removeRow(server._ui_id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                  <div className="flex gap-2">
                    <button 
                      onClick={addManualRow}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                    </button>
                    <button 
                      onClick={deleteSelected}
                      disabled={!servers.some(s => s.selected)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Excluir Selecionados
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Options */}
          <div className="p-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Ação de Envio:
              </span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={printBadges}
                className="bg-navy-900 hover:bg-navy-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Crachás ({validServers.length})
              </button>
              <button 
                onClick={handleSaveAndReturn}
                disabled={isSaving || validServers.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar no Banco e Voltar'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Badge Preview Panel */}
        <div className="w-[430px] flex flex-col bg-slate-800 text-white rounded-2xl border border-slate-700 shadow-2xl p-6 shrink-0 relative overflow-hidden">
          
          <div className="mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Type className="w-4 h-4 text-cyan-400" /> Visualização do Crachá
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Assim ficarão os crachás dos servidores na impressão.</p>
          </div>

          <div 
            onClick={() => setIsZoomModalOpen(true)}
            className="flex-1 flex items-center justify-center min-h-[300px] border border-slate-700/50 rounded-xl bg-slate-900/40 p-4 relative overflow-hidden group cursor-pointer hover:border-cyan-500/50 transition-all"
            title="Clique para abrir a visualização ampliada"
          >
            <div className="transition-transform group-hover:scale-105">
              <ServerPreviewCard 
                server={validServers.length > 0 ? validServers[0] : null}
                globalSchoolName={globalSchoolName}
                directorName={currentSchoolDirector}
                layoutMode={printLayout}
                settings={badgeSettings}
              />
            </div>
            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                <span className="bg-slate-900/90 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <ZoomIn className="w-4 h-4 text-cyan-400" /> Clique para Ampliar
                </span>
            </div>
          </div>

          <div className="mt-5 p-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                Layout de Impressão:
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => setPrintLayout('8')}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${printLayout === '8' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                8 por página (66mm x 98mm)
              </button>
              <button 
                onClick={() => setPrintLayout('6')}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${printLayout === '6' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                6 por página (88mm x 98mm)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Flutuante de Zoom Ampliado */}
      {isZoomModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-all animate-fadeIn"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center max-w-4xl w-full relative ring-1 ring-white/20 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl">
                  <ZoomIn className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Visualização Ampliada do Crachá</h3>
                  <p className="text-xs text-slate-500 font-medium">Crachá em tamanho expandido para conferência detalhada de dados do servidor.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsZoomModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 sm:p-10 bg-slate-100/80 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center overflow-auto max-h-[75vh] w-full">
              <div className="transform scale-[1.1] sm:scale-[1.3] md:scale-[1.5] origin-center transition-transform my-12 sm:my-20 shrink-0">
                <ServerPreviewCard 
                  server={validServers.length > 0 ? validServers[0] : null}
                  globalSchoolName={globalSchoolName}
                  directorName={currentSchoolDirector}
                  layoutMode={printLayout}
                  settings={badgeSettings}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end w-full">
              <button
                onClick={() => setIsZoomModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
