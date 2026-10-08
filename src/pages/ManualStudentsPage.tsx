import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ArrowLeft, Check, Save, Plus, Trash2, Printer, X, FileSpreadsheet, 
  UserSquare2, ClipboardPaste, AlertTriangle, Info, Upload, Download, FileSignature, HelpCircle, Loader2, Settings2, RotateCcw,
  Type, Palette, Image, ZoomIn
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StudentPreviewCard, { STUDENT_BADGE_LAYOUT, getDirectorPhone } from '../components/Students/StudentPreviewCard';
import type { Settings } from '../components/Students/StudentPreviewCard';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import * as XLSX from 'xlsx';
import { Joyride, STATUS } from 'react-joyride';
import type { Step } from 'react-joyride';
import { CustomTooltip } from '../components/Tour/CustomTooltip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface School {
  id: string;
  name: string;
  responsible_name?: string | null;
  phone?: string | null;
}

interface DraftStudent {
  _ui_id: string;
  full_name: string;
  class_name: string;
  responsible_phone_1: string;
  responsible_phone_2: string;
  allergy: string;
  blood_type: string;
  school_id: string | null;
  selected: boolean;
}

interface AuthorizationTemplateText {
  title: string;
  projectTitle: string;
  period: string;
  authorizationText: string;
}

const AUTHORIZATION_TEXT_STORAGE_KEY = 'cracha_authorization_template_text';
const DEFAULT_AUTHORIZATION_TEMPLATE: AuthorizationTemplateText = {
  title: 'TERMO DE AUTORIZAÇÃO PARA PARTICIPAÇÃO EM AÇÃO PEDAGÓGICA',
  projectTitle: 'A ESCOLA VAI AO CINEMA',
  period: '13 A 23 DE OUTUBRO DE 2026.',
  authorizationText: 'regularmente matriculado(a) na Rede Municipal de Educação de Itaguaí, AUTORIZO sua participação na AÇÃO PEDAGÓGICA – A ESCOLA VAI AO CINEMA que consistirá em sessão de cinema no CINE SERCLA – SHOPPING PÁTIO MIX, localizado na Rodovia Rio Santos, s/n – Santana – CEP: 23812-101 – Itaguaí – RJ, quando serão exibidos os filmes:'
};

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function ManualStudentsPage() {
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
  const [currentSchoolPhone, setCurrentSchoolPhone] = useState<string>('');

  const getEffectiveSchoolPhone = () => {
    return currentSchoolPhone || getDirectorPhone(currentSchoolDirector);
  };
  
  const [students, setStudents] = useState<DraftStudent[]>([
    { _ui_id: generateId(), full_name: '', class_name: '', responsible_phone_1: '', responsible_phone_2: '', allergy: '', blood_type: '', school_id: null, selected: false }
  ]);
  
  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
  const [importText, setImportText] = useState('');
  const [printLayout, setPrintLayout] = useState<'8' | '6'>('8');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [isGeneratingAuthorizations, setIsGeneratingAuthorizations] = useState(false);
  const [isAuthorizationEditorOpen, setIsAuthorizationEditorOpen] = useState(false);
  const [authorizationTemplate, setAuthorizationTemplate] = useState<AuthorizationTemplateText>(DEFAULT_AUTHORIZATION_TEMPLATE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRibbonUrl, setHeaderRibbonUrl] = useState('/fita-cinema.png');
  const [badgeBackgroundUrl, setBadgeBackgroundUrl] = useState<string | null>(null);
  const [badgeCrestUrl, setBadgeCrestUrl] = useState<string | null>(null);
  const [badgeTitleArtUrl, setBadgeTitleArtUrl] = useState<string | null>(null);
  const [badgeCharactersUrl, setBadgeCharactersUrl] = useState<string | null>(null);

  const [badgeSettings, setBadgeSettings] = useState<Settings>({ 
    logo_prefeitura_url: null, 
    logo_expo_url: null,
    label_title_1: 'IDENTIFICAÇÃO',
    label_title_2: 'ALUNO',
    label_nome: 'NOME COMPLETO:',
    label_escola: 'ESCOLA:',
    label_turma: 'TURMA:',
    label_alergia: '',
    label_sangue: '',
    label_contato: 'CONTATO DO RESPONSÁVEL:',
    label_diretor: 'DIRETOR(A) RESPONSÁVEL:',
    color_title_1: '#000000',
    size_title_1: '14px',
    color_title_2: '#000000',
    size_title_2: '22px',
    color_nome: '#000000',
    size_nome: '10px',
    color_val_nome: '#000000',
    size_val_nome: '10px',
    color_escola: '#000000',
    size_escola: '10px',
    color_val_escola: '#000000',
    size_val_escola: '10px',
    color_turma: '#000000',
    size_turma: '10px',
    color_val_turma: '#000000',
    size_val_turma: '10px',
    color_alergia: '#000000',
    size_alergia: '10px',
    color_val_alergia: '#000000',
    size_val_alergia: '10px',
    color_sangue: '#000000',
    size_sangue: '10px',
    color_val_sangue: '#000000',
    size_val_sangue: '10px',
    color_contato: '#000000',
    size_contato: '6px',
    color_val_contato: '#000000',
    size_val_contato: '11px',
    color_diretor: '#000000',
    size_diretor: '7px',
    color_val_diretor: '#000000',
    size_val_diretor: '9px',
    show_diretor: true
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('badge_settings').select('*').limit(1);
      if (data && data.length > 0) {
        setBadgeSettings({
          logo_prefeitura_url: data[0].logo_prefeitura_url,
          logo_expo_url: data[0].logo_expo_url,
          label_title_1: data[0].label_title_1 ?? 'IDENTIFICAÇÃO',
          label_title_2: data[0].label_title_2 ?? 'ALUNO',
          label_nome: data[0].label_nome ?? 'NOME COMPLETO:',
          label_escola: data[0].label_escola ?? 'ESCOLA:',
          label_turma: data[0].label_turma ?? 'TURMA:',
          label_alergia: data[0].label_alergia ?? '',
          label_sangue: data[0].label_sangue ?? '',
          label_contato: data[0].label_contato ?? 'CONTATO DO RESPONSÁVEL:',
          label_diretor: data[0].label_diretor ?? 'DIRETOR(A) RESPONSÁVEL:',
          color_title_1: data[0].color_title_1 || '#000000',
          color_title_2: data[0].color_title_2 || '#000000',
          color_nome: data[0].color_nome || '#000000',
          color_escola: data[0].color_escola || '#000000',
          color_turma: data[0].color_turma || '#000000',
          color_alergia: data[0].color_alergia || '#000000',
          color_sangue: data[0].color_sangue || '#000000',
          color_contato: data[0].color_contato || '#000000',
          color_diretor: data[0].color_diretor || '#000000',
          color_val_nome: data[0].color_val_nome || '#000000',
          color_val_escola: data[0].color_val_escola || '#000000',
          color_val_turma: data[0].color_val_turma || '#000000',
          color_val_alergia: data[0].color_val_alergia || '#000000',
          color_val_sangue: data[0].color_val_sangue || '#000000',
          color_val_contato: data[0].color_val_contato || '#000000',
          color_val_diretor: data[0].color_val_diretor || '#000000',
          size_title_1: data[0].size_title_1 || '14px',
          size_title_2: data[0].size_title_2 || '22px',
          size_nome: data[0].size_nome || '10px',
          size_val_nome: data[0].size_val_nome || '10px',
          size_escola: data[0].size_escola || '10px',
          size_val_escola: data[0].size_val_escola || '10px',
          size_turma: data[0].size_turma || '10px',
          size_val_turma: data[0].size_val_turma || '10px',
          size_alergia: data[0].size_alergia || '10px',
          size_val_alergia: data[0].size_val_alergia || '10px',
          size_sangue: data[0].size_sangue || '10px',
          size_val_sangue: data[0].size_val_sangue || '10px',
          size_contato: data[0].size_contato || '6px',
          size_val_contato: data[0].size_val_contato || '11px',
          size_diretor: data[0].size_diretor || '7px',
          size_val_diretor: data[0].size_val_diretor || '9px',
          show_diretor: data[0].show_diretor !== false
        });
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    try {
      const savedTemplate = localStorage.getItem(AUTHORIZATION_TEXT_STORAGE_KEY);
      if (savedTemplate) {
        setAuthorizationTemplate({ ...DEFAULT_AUTHORIZATION_TEMPLATE, ...JSON.parse(savedTemplate) });
      }
    } catch {
      localStorage.removeItem(AUTHORIZATION_TEXT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const loadHeaderRibbon = async () => {
      const { data, error } = await supabase.from('badge_settings').select('header_ribbon_url, badge_background_url, badge_crest_url, badge_title_art_url, badge_characters_url').limit(1);
      setHeaderRibbonUrl(!error && data?.[0]?.header_ribbon_url ? data[0].header_ribbon_url : '/fita-cinema.png');
      setBadgeBackgroundUrl(!error ? data?.[0]?.badge_background_url || null : null);
      setBadgeCrestUrl(!error ? data?.[0]?.badge_crest_url || null : null);
      setBadgeTitleArtUrl(!error ? data?.[0]?.badge_title_art_url || null : null);
      setBadgeCharactersUrl(!error ? data?.[0]?.badge_characters_url || null : null);
    };

    loadHeaderRibbon();
    window.addEventListener('brand-assets-updated', loadHeaderRibbon);
    return () => window.removeEventListener('brand-assets-updated', loadHeaderRibbon);
  }, []);

  const formatNames = (format: 'upper' | 'lower' | 'title') => {
    const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
    setStudents(prev => prev.map(s => {
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
    setShowFormatMenu(false);
  };

  const saveSettings = async () => {
    try {
      const { data } = await supabase.from('badge_settings').select('id').limit(1);
      if (data && data.length > 0) {
        await supabase.from('badge_settings').update(badgeSettings).eq('id', data[0].id);
      } else {
        await supabase.from('badge_settings').insert([badgeSettings]);
      }
      setIsSettingsModalOpen(false);
    } catch (err) {
      await showError('Erro ao salvar as configurações.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_prefeitura_url' | 'logo_expo_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) {
      alert('A imagem é muito grande. Escolha uma imagem de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBadgeSettings(prev => ({ ...prev, [field]: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const downloadExampleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ["Nome do estudante", "Turma", "Alergia", "Tipo Sang.", "Contato Resp. 1 (diretor ou Adjunto)", "Contato Resp. 2 (diretor ou Adjunto)"],
      ["Nome completo do(a) aluno(a)", "1º Ano A", "Poeira", "AB+", "(21) ****-****", "(21) ****-****"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [
      { wch: 32 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 40 },
      { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Alunos");
    XLSX.writeFile(wb, "Modelo_Importacao_Alunos.xlsx");
  };

  const tourSteps: Step[] = [
    {
      target: '.tour-excel-tab',
      content: (
        <div>
          <h3 className="font-bold text-emerald-600 mb-2">Importar do Excel</h3>
          <p className="text-sm">Abra sua planilha, copie as colunas (Nome, Turma, Telefone 1, Telefone 2) sem cabeçalho, e cole nesta área pressionando <strong>Ctrl + V</strong> ou clicando em <strong>Salvar sua colagem</strong>.</p>
        </div>
      ),
      skipBeacon: true,
    },
    {
      target: '.tour-import-btn',
      content: (
        <div>
          <h3 className="font-bold text-expo-700 mb-2">Importar Arquivo (.xlsx)</h3>
          <p className="text-sm">Se preferir, clique aqui para selecionar o seu arquivo Excel salvo no computador ao invés de copiar e colar. O sistema tentará ler automaticamente os dados.</p>
        </div>
      ),
    },
    {
      target: '.tour-manual-tab',
      content: (
        <div>
          <h3 className="font-bold text-slate-800 mb-2">Cadastrar Manualmente</h3>
          <p className="text-sm">Use esta aba se quiser apenas digitar os dados de um aluno avulso rapidamente, sem precisar de planilha.</p>
        </div>
      ),
    },
    {
      target: '.tour-draft-save',
      content: (
        <div>
          <h3 className="font-bold text-slate-700 mb-2">Salvar Rascunho</h3>
          <p className="text-sm">Salva os alunos que estão na grade temporariamente no seu navegador. Ótimo para não perder o trabalho se fechar a aba sem querer.</p>
        </div>
      ),
    },
    {
      target: '.tour-load-db',
      content: (
        <div>
          <h3 className="font-bold text-expo-800 mb-2">Carregar do Banco</h3>
          <p className="text-sm">Busca os alunos da sua escola que já foram salvos definitivamente no sistema para que você possa gerar o PDF deles.</p>
        </div>
      ),
    },
    {
      target: '.tour-layout-select',
      content: (
        <div>
          <h3 className="font-bold text-slate-700 mb-2">Ajuste de Impressão</h3>
          <p className="text-sm">Escolha entre 8 ou 6 crachás por folha. "8 por folha" faz crachás menores. "6 por folha" os deixa mais altos e preenchendo mais a folha A4.</p>
        </div>
      ),
    },
    {
      target: '.tour-print',
      content: (
        <div>
          <h3 className="font-bold text-expo-700 mb-2">Imprimir PDF</h3>
          <p className="text-sm">Abre a caixa de impressão do seu computador. Lembre-se de escolher "Salvar como PDF" (e desativar margens) para o crachá ficar perfeito.</p>
        </div>
      ),
    },
    {
      target: '.tour-save-return',
      content: (
        <div>
          <h3 className="font-bold text-expo-900 mb-2">Salvar e voltar</h3>
          <p className="text-sm">O passo final! Envia todos os alunos validados para o banco de dados oficial e volta para a tela inicial.</p>
        </div>
      ),
    }
  ];

  const handleTourCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setIsTourOpen(false);
      localStorage.setItem('cracha_hasSeenTour', 'true');
    }
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('cracha_hasSeenTour');
    if (!hasSeenTour) {
      // Pequeno delay para garantir que a tela foi montada antes de abrir o tour
      const timer = setTimeout(() => {
        setIsTourOpen(true);
        // Já marca como visto logo que abre, assim não fica reabrindo a cada F5/reload
        localStorage.setItem('cracha_hasSeenTour', 'true');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name, responsible_name, phone').order('name');
        if (data) {
          setSchools(data as any);
          if (data.length > 0) {
            setAdminSelectedSchoolId(data[0].id);
            setCurrentSchoolDirector(data[0].responsible_name || '');
            setCurrentSchoolPhone(data[0].phone || '');
          }
        }
      };
      fetchSchools();
    } else if (appUser?.school_id) {
      supabase.from('schools').select('responsible_name, phone').eq('id', appUser.school_id).single().then(({ data }) => {
        if (data) {
          if (data.responsible_name) setCurrentSchoolDirector(data.responsible_name);
          if (data.phone) setCurrentSchoolPhone(data.phone);
        }
      });
    }
  }, [isAdmin, appUser]);

  useEffect(() => {
    if (isAdmin && adminSelectedSchoolId) {
      const school = schools.find(s => s.id === adminSelectedSchoolId);
      if (school) {
        setCurrentSchoolDirector(school.responsible_name || '');
        setCurrentSchoolPhone(school.phone || '');
      }
    }
  }, [adminSelectedSchoolId, schools, isAdmin]);

  const prevAutoPhoneRef = useRef<string>('');

  useEffect(() => {
    const newDefaultPhone = getEffectiveSchoolPhone();
    const prevAutoPhone = prevAutoPhoneRef.current;

    setStudents(prev => prev.map(s => {
      if (!s.responsible_phone_1 || s.responsible_phone_1.trim() === '' || s.responsible_phone_1 === prevAutoPhone) {
        return { ...s, responsible_phone_1: newDefaultPhone };
      }
      return s;
    }));

    prevAutoPhoneRef.current = newDefaultPhone;
  }, [currentSchoolPhone, currentSchoolDirector]);

  const handleSaveDirectorName = async () => {
    if (!globalSchoolId) return;
    try {
      await supabase.from('schools').update({ responsible_name: currentSchoolDirector || null }).eq('id', globalSchoolId);
      setSchools(prev => prev.map(s => s.id === globalSchoolId ? { ...s, responsible_name: currentSchoolDirector } : s));
    } catch (err) {
      console.error("Erro ao salvar diretor:", err);
    }
  };

  const handleUpdate = (index: number, field: keyof DraftStudent, value: any) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };
    setStudents(newStudents);
  };

  const addRow = () => {
    const defaultPhone = getEffectiveSchoolPhone();
    setStudents([...students, { _ui_id: generateId(), full_name: '', class_name: '', responsible_phone_1: defaultPhone, responsible_phone_2: '', allergy: '', blood_type: '', school_id: null, selected: false }]);
  };

  const removeRow = (index: number) => {
    const newStudents = [...students];
    newStudents.splice(index, 1);
    if (newStudents.length === 0) {
      const defaultPhone = getEffectiveSchoolPhone();
      newStudents.push({ _ui_id: generateId(), full_name: '', class_name: '', responsible_phone_1: defaultPhone, responsible_phone_2: '', allergy: '', blood_type: '', school_id: null, selected: false });
    }
    setStudents(newStudents);
  };

  const detectHeaderMapping = (headerCols: string[]) => {
    let nameIdx = -1;
    let classIdx = -1;
    let allergyIdx = -1;
    let bloodIdx = -1;
    let phone1Idx = -1;
    let phone2Idx = -1;

    headerCols.forEach((col, idx) => {
      const norm = String(col || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (nameIdx === -1 && (norm.includes('nome') || norm.includes('estudante') || norm.includes('aluno'))) {
        nameIdx = idx;
      } else if (classIdx === -1 && (norm.includes('turma') || norm.includes('serie') || norm.includes('ano'))) {
        classIdx = idx;
      } else if (allergyIdx === -1 && norm.includes('alergia')) {
        allergyIdx = idx;
      } else if (bloodIdx === -1 && (norm.includes('sang') || norm.includes('sangue') || norm.includes('tipo'))) {
        bloodIdx = idx;
      } else if (norm.includes('contato') || norm.includes('tel') || norm.includes('fone') || norm.includes('resp')) {
        if (phone1Idx === -1) {
          phone1Idx = idx;
        } else if (phone2Idx === -1) {
          phone2Idx = idx;
        }
      }
    });

    if (nameIdx === -1) nameIdx = 0;
    if (classIdx === -1) classIdx = 1;
    if (allergyIdx === -1 && bloodIdx === -1) {
      allergyIdx = 2;
      bloodIdx = 3;
      if (phone1Idx === -1) phone1Idx = 4;
      if (phone2Idx === -1) phone2Idx = 5;
    }

    return { nameIdx, classIdx, allergyIdx, bloodIdx, phone1Idx, phone2Idx };
  };

  const processPastedData = async (text: string) => {
    let sourceText = text;
    
    // Se o campo de texto estiver vazio, tenta ler diretamente do Clipboard do sistema
    if (!sourceText.trim()) {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && clipboardText.trim()) {
            sourceText = clipboardText;
            setImportText(clipboardText); // Mostra o texto colado no campo para feedback
          }
        }
      } catch (err) {
        console.warn("Não foi possível acessar a área de transferência:", err);
      }
    }

    if (!sourceText.trim()) {
      await showAlert("Por favor, cole os dados do Excel na caixa de texto ou copie-os para a área de transferência antes de processar.", { title: 'Dados não encontrados' });
      return;
    }

    const lines = sourceText.split('\n');
    const newStudents: DraftStudent[] = [];
    const defaultPhone = getEffectiveSchoolPhone();
    
    let headerMap = { nameIdx: 0, classIdx: 1, allergyIdx: 2, bloodIdx: 3, phone1Idx: 4, phone2Idx: 5 };
    let firstLineProcessed = false;

    lines.forEach(line => {
      const cleanLine = line.replace(/\r/g, '').trim();
      if (!cleanLine) return;
      
      // Divide por tabulação por padrão (comportamento padrão do Excel)
      let cols = cleanLine.split('\t');
      
      // Fallback para ponto-e-vírgula ou vírgula caso seja um CSV colado
      if (cols.length === 1 && cleanLine.includes(';')) {
        cols = cleanLine.split(';');
      } else if (cols.length === 1 && cleanLine.includes(',')) {
        cols = cleanLine.split(',');
      }

      // Remove células em branco extras selecionadas à direita no Excel
      while (cols.length > 0 && cols[cols.length - 1].trim() === '') {
        cols.pop();
      }
      
      if (cols.length >= 1 && cols[0].trim()) {
        const firstCol = cols[0].toLowerCase().trim();
        const isHeaderRow = (firstCol.includes('nome') || firstCol.includes('estudante') || firstCol.includes('aluno'));
        
        if (!firstLineProcessed && isHeaderRow) {
          headerMap = detectHeaderMapping(cols);
          firstLineProcessed = true;
          return;
        }

        firstLineProcessed = true;

        const fullName = cols[headerMap.nameIdx]?.trim() || '';
        if (fullName) {
          newStudents.push({
            _ui_id: generateId(),
            full_name: fullName,
            school_id: null,
            class_name: headerMap.classIdx >= 0 ? (cols[headerMap.classIdx]?.trim() || '') : '',
            allergy: headerMap.allergyIdx >= 0 ? (cols[headerMap.allergyIdx]?.trim() || '') : '',
            blood_type: headerMap.bloodIdx >= 0 ? (cols[headerMap.bloodIdx]?.trim() || '') : '',
            responsible_phone_1: (headerMap.phone1Idx >= 0 ? cols[headerMap.phone1Idx]?.trim() : '') || defaultPhone,
            responsible_phone_2: headerMap.phone2Idx >= 0 ? (cols[headerMap.phone2Idx]?.trim() || '') : '',
            selected: false
          });
        }
      }
    });
    
    if (newStudents.length === 0) {
      await showWarning("Nenhum estudante válido foi encontrado no texto colado.");
      return;
    }

    setStudents(prev => [...prev.filter(s => s.full_name.trim() !== ''), ...newStudents]);
    setImportText('');
    await showSuccess(`${newStudents.length} alunos processados com sucesso!`);
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
      
      const newStudents: DraftStudent[] = [];
      const defaultPhone = getEffectiveSchoolPhone();
      let headerMap = { nameIdx: 0, classIdx: 1, allergyIdx: 2, bloodIdx: 3, phone1Idx: 4, phone2Idx: 5 };
      let firstLineProcessed = false;

      data.forEach(cols => {
        if (cols && cols.length >= 1 && cols[0]) {
          const firstCol = String(cols[0] || '').toLowerCase().trim();
          const isHeaderRow = (firstCol.includes('nome') || firstCol.includes('estudante') || firstCol.includes('aluno'));
          
          if (!firstLineProcessed && isHeaderRow) {
            headerMap = detectHeaderMapping(cols.map(c => String(c || '')));
            firstLineProcessed = true;
            return;
          }

          firstLineProcessed = true;

          const fullName = String(cols[headerMap.nameIdx] || '').trim();
          if (fullName) {
            newStudents.push({
              _ui_id: generateId(),
              full_name: fullName,
              school_id: null,
              class_name: headerMap.classIdx >= 0 ? String(cols[headerMap.classIdx] || '').trim() : '',
              allergy: headerMap.allergyIdx >= 0 ? String(cols[headerMap.allergyIdx] || '').trim() : '',
              blood_type: headerMap.bloodIdx >= 0 ? String(cols[headerMap.bloodIdx] || '').trim() : '',
              responsible_phone_1: (headerMap.phone1Idx >= 0 ? String(cols[headerMap.phone1Idx] || '').trim() : '') || defaultPhone,
              responsible_phone_2: headerMap.phone2Idx >= 0 ? String(cols[headerMap.phone2Idx] || '').trim() : '',
              selected: false
            });
          }
        }
      });

      setStudents([...students.filter(s => s.full_name !== ''), ...newStudents]);
    };
    reader.readAsBinaryString(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveTable = async () => {
    setIsSaving(true);
    try {
      const validStudents = students.filter(s => s.full_name.trim() !== '');
      if (validStudents.length === 0) {
        await showWarning("Nenhum aluno válido para salvar.");
        return false;
      }
      
      // Salvar backup no rascunho local
      localStorage.setItem('cracha_draft_students', JSON.stringify(validStudents));
      
      const targetSchoolId = (globalSchoolId && globalSchoolId.trim() !== '') ? globalSchoolId.trim() : null;

      const fullPayload = validStudents.map(s => ({
        full_name: s.full_name.trim(),
        class_name: s.class_name ? s.class_name.trim() : '',
        allergy: s.allergy ? s.allergy.trim() : '',
        blood_type: s.blood_type ? s.blood_type.trim() : '',
        responsible_phone_1: s.responsible_phone_1 ? s.responsible_phone_1.trim() : '',
        responsible_phone_2: s.responsible_phone_2 ? s.responsible_phone_2.trim() : '',
        school_id: targetSchoolId
      }));

      const { error } = await supabase.from('students').insert(fullPayload);
      
      if (error) {
        console.warn("Erro no insert principal:", error);
        const errDetail = (error.message || '') + (error.details || '');
        if (errDetail.includes('allergy') || errDetail.includes('blood_type') || error.code === 'PGRST204') {
          const fallbackPayload = validStudents.map(s => ({
            full_name: s.full_name.trim(),
            class_name: s.class_name ? s.class_name.trim() : '',
            responsible_phone_1: s.responsible_phone_1 ? s.responsible_phone_1.trim() : '',
            responsible_phone_2: s.responsible_phone_2 ? s.responsible_phone_2.trim() : '',
            school_id: targetSchoolId
          }));
          
          const { error: fallbackError } = await supabase.from('students').insert(fallbackPayload);
          if (fallbackError) {
            throw fallbackError;
          }

          await showWarning(
            "Atenção: Os alunos foram salvos, mas a sua tabela do Supabase ainda não possui as colunas 'allergy' e 'blood_type' ativas. Para que o Tipo Sanguíneo e Alergia sejam gravados permanentemente no banco, execute o script 'add_alergia_sangue.sql' no SQL Editor do seu Supabase.",
            'Aviso do Banco de Dados'
          );
        } else {
          throw error;
        }
      }
      
      return true;
    } catch(err: any) {
      console.error("Erro ao salvar alunos:", err);
      const msg = err?.message || err?.details || err?.hint || String(err);
      await showError(`Erro ao salvar alunos no banco de dados: ${msg}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndReturn = async () => {
    const success = await saveTable();
    if (success) {
      await showSuccess("Alunos salvos com sucesso no banco de dados!");
      navigate('/students');
    }
  };

  const loadFromDatabase = async () => {
    setIsLoadingDB(true);
    try {
      const targetSchoolId = (globalSchoolId && globalSchoolId.trim() !== '') ? globalSchoolId.trim() : null;
      
      let query = supabase.from('students').select('*').order('created_at', { ascending: false });
      if (targetSchoolId) {
        query = query.eq('school_id', targetSchoolId);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        await showAlert("Nenhum aluno encontrado no banco de dados.", { title: 'Sem registros' });
        return;
      }
      
      const dbStudents: DraftStudent[] = data.map(s => ({
        _ui_id: generateId(),
        full_name: s.full_name || '',
        class_name: s.class_name || '',
        allergy: s.allergy || '',
        blood_type: s.blood_type || '',
        responsible_phone_1: s.responsible_phone_1 || '',
        responsible_phone_2: s.responsible_phone_2 || '',
        school_id: s.school_id || null,
        selected: false
      }));
      
      const existingNames = new Set(students.filter(s => s.full_name.trim()).map(s => s.full_name.toLowerCase().trim()));
      const newStudents = dbStudents.filter(s => !existingNames.has(s.full_name.toLowerCase().trim()));
      
      if (newStudents.length === 0) {
        await showAlert("Todos os alunos do banco já estão na sua lista atual.", { title: 'Lista atualizada' });
      } else {
        setStudents([...students.filter(s => s.full_name !== ''), ...newStudents]);
        await showSuccess(`${newStudents.length} alunos carregados com sucesso!`);
      }
      
    } catch (err: any) {
      console.error("Erro ao carregar alunos:", err);
      const msg = err?.message || String(err);
      await showError(`Erro ao carregar alunos do banco: ${msg}`);
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleDeleteSchoolDatabaseStudents = async () => {
    if (!isAdmin || !globalSchoolId) return;

    const schoolName = globalSchoolName;

    try {
      const { count, error: countErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', globalSchoolId);

      if (countErr) throw countErr;

      const dbCount = count || 0;
      if (dbCount === 0) {
        await showAlert(`A escola "${schoolName}" não possui alunos gravados no banco de dados.`, { title: 'Sem registros' });
        return;
      }

      const confirmed = await showConfirm(
        `ATENÇÃO ADMINISTRADOR!\n\nDeseja apagar permanentemente os ${dbCount} alunos da escola "${schoolName}" do banco de dados?\n\nEsta operação é irreversível e removerá todos os registros gravados para esta escola.`,
        {
          title: `Apagar Alunos do Banco (${schoolName})`,
          confirmLabel: `Sim, apagar ${dbCount} alunos`,
          cancelLabel: 'Cancelar'
        }
      );

      if (confirmed) {
        const { error } = await supabase.from('students').delete().eq('school_id', globalSchoolId);
        if (error) throw error;
        await showSuccess(`Todos os ${dbCount} alunos de "${schoolName}" foram removidos do banco com sucesso!`);
      }
    } catch (err: any) {
      console.error("Erro ao apagar alunos:", err);
      await showError(`Erro ao apagar alunos: ${err.message || String(err)}`);
    }
  };

  const handleDraftSave = async () => {
      const validStudents = students.filter(s => s.full_name.trim() !== '');
      if (validStudents.length > 0) {
        localStorage.setItem('cracha_draft_students', JSON.stringify(validStudents));
        await showSuccess(`${validStudents.length} alunos salvos no rascunho do navegador!`, 'Rascunho salvo');
      } else {
        await showWarning("Nenhum aluno preenchido para salvar no rascunho.");
      }
  };

  const handleCancel = async () => {
      const confirmed = await showConfirm("Tem certeza que deseja limpar a lista? Dados não salvos serão perdidos.", { title: 'Limpar Lista', confirmLabel: 'Sim, limpar', cancelLabel: 'Cancelar' });
      if (confirmed) {
          // Em vez de navegar para fora, "reseta" a tela atual
          setStudents([
            { _ui_id: generateId(), full_name: '', class_name: '', allergy: '', blood_type: '', responsible_phone_1: '', responsible_phone_2: '', school_id: null, selected: false }
          ]);
          setImportText('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const generatePDF = async () => {
    const validStudents = students.filter(s => s.full_name.trim() !== '');
    if (validStudents.length === 0) {
      await showAlert("Adicione pelo menos um aluno válido antes de imprimir.", { title: 'Lista vazia' });
      return;
    }
    
    // Dispara a impressão nativa do navegador
    // O usuário poderá escolher "Salvar como PDF" com qualidade vetorial perfeita
    window.print();
  };

  const generateAuthorizationsPDF = async () => {
    if (!globalSchoolId) {
      await showWarning('Selecione uma escola para gerar as autorizações.');
      return;
    }

    setIsGeneratingAuthorizations(true);
    try {
      const pageSize = 1000;
      const authorizationStudents: { full_name: string }[] = [];
      let from = 0;

      // Busca paginada para incluir todos os alunos, inclusive quando houver mais de 1.000 registros.
      while (true) {
        const { data, error } = await supabase
          .from('students')
          .select('full_name')
          .eq('school_id', globalSchoolId)
          .order('full_name', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const page = (data || []).filter(student => student.full_name?.trim());
        authorizationStudents.push(...page);

        if ((data || []).length < pageSize) break;
        from += pageSize;
      }

      if (authorizationStudents.length === 0) {
        await showAlert(`Não há alunos cadastrados para a escola "${globalSchoolName}".`, { title: 'Sem alunos cadastrados' });
        return;
      }

      const templateResponse = await fetch('/formularios/autorizacao-projeto-escola-vai-ao-cinema.pdf');
      if (!templateResponse.ok) {
        throw new Error('O modelo original de autorização não foi encontrado.');
      }

      const templateBytes = await templateResponse.arrayBuffer();
      const templateDocument = await PDFDocument.load(templateBytes);
      const authorizationDocument = await PDFDocument.create();
      const font = await authorizationDocument.embedFont(StandardFonts.Helvetica);
      const black = rgb(0, 0, 0);

      const drawFittedText = (page: ReturnType<typeof authorizationDocument.addPage>, value: string, x: number, y: number, maxWidth: number) => {
        let fontSize = 10.5;
        while (font.widthOfTextAtSize(value, fontSize) > maxWidth && fontSize > 7) {
          fontSize -= 0.25;
        }
        page.drawText(value, { x, y, size: fontSize, font, color: black });
      };
      const drawCenteredText = (page: ReturnType<typeof authorizationDocument.addPage>, value: string, y: number, maxWidth: number, initialSize: number) => {
        let fontSize = initialSize;
        while (font.widthOfTextAtSize(value, fontSize) > maxWidth && fontSize > 7) fontSize -= 0.25;
        page.drawText(value, { x: (595.32 - font.widthOfTextAtSize(value, fontSize)) / 2, y, size: fontSize, font, color: black });
      };

      for (const student of authorizationStudents) {
        const [templatePage] = await authorizationDocument.copyPages(templateDocument, [0]);
        authorizationDocument.addPage(templatePage);

        // Coordenadas do modelo original em pontos PDF (origem no canto inferior esquerdo).
        // Mantemos os campos de responsável, identidade e CPF sem qualquer preenchimento.
        const schoolName = globalSchoolName.trim().toUpperCase();
        const studentName = student.full_name.trim().toUpperCase();
        drawFittedText(templatePage, schoolName, 204, 713, 320);
        drawFittedText(templatePage, studentName, 255, 585, 275);

        // Só mascaramos áreas alteradas; o restante do PDF original continua inalterado.
        if (authorizationTemplate.title !== DEFAULT_AUTHORIZATION_TEMPLATE.title) {
          templatePage.drawRectangle({ x: 55, y: 739, width: 485, height: 20, color: rgb(1, 1, 1) });
          drawCenteredText(templatePage, authorizationTemplate.title.toUpperCase(), 748, 470, 10.5);
        }
        if (authorizationTemplate.projectTitle !== DEFAULT_AUTHORIZATION_TEMPLATE.projectTitle) {
          templatePage.drawRectangle({ x: 110, y: 663, width: 375, height: 18, color: rgb(1, 1, 1) });
          drawCenteredText(templatePage, authorizationTemplate.projectTitle.toUpperCase(), 674, 360, 11);
        }
        if (authorizationTemplate.period !== DEFAULT_AUTHORIZATION_TEMPLATE.period) {
          templatePage.drawRectangle({ x: 110, y: 648, width: 375, height: 16, color: rgb(1, 1, 1) });
          drawCenteredText(templatePage, authorizationTemplate.period.toUpperCase(), 656, 360, 9.5);
        }
        if (authorizationTemplate.authorizationText !== DEFAULT_AUTHORIZATION_TEMPLATE.authorizationText) {
          templatePage.drawRectangle({ x: 16, y: 503, width: 565, height: 66, color: rgb(1, 1, 1) });
          const lines = authorizationTemplate.authorizationText.trim().split(/\s+/).reduce<string[]>((result, word) => {
            const current = result[result.length - 1] || '';
            const candidate = current ? `${current} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, 9.5) > 555) result.push(word);
            else result[result.length - 1] = candidate;
            return result;
          }, ['']);
          lines.slice(0, 5).forEach((line, lineIndex) => templatePage.drawText(line, { x: 18, y: 558 - lineIndex * 11, size: 9.5, font, color: black }));
        }
      }

      const safeSchoolName = globalSchoolName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
      const generatedPdf = await authorizationDocument.save();
      const pdfBuffer = generatedPdf.buffer.slice(generatedPdf.byteOffset, generatedPdf.byteOffset + generatedPdf.byteLength) as ArrayBuffer;
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `autorizacoes-${safeSchoolName || 'escola'}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      await showSuccess(`${authorizationStudents.length} autorização(ões) foram geradas em um único PDF.`, 'Autorizações prontas');
    } catch (err: any) {
      console.error('Erro ao gerar autorizações:', err);
      await showError(`Não foi possível gerar as autorizações: ${err?.message || String(err)}`);
    } finally {
      setIsGeneratingAuthorizations(false);
    }
  };

  const saveAuthorizationTemplate = async () => {
    localStorage.setItem(AUTHORIZATION_TEXT_STORAGE_KEY, JSON.stringify(authorizationTemplate));
    setIsAuthorizationEditorOpen(false);
    await showSuccess('Os textos do modelo foram salvos e serão usados nas próximas autorizações.', 'Modelo atualizado');
  };

  const resetAuthorizationTemplate = () => {
    setAuthorizationTemplate(DEFAULT_AUTHORIZATION_TEMPLATE);
    localStorage.removeItem(AUTHORIZATION_TEXT_STORAGE_KEY);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setIsProcessingFile(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
          setTimeout(async () => {
            try {
              const data = evt.target?.result;
              const wb = XLSX.read(data, { type: 'array' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const text = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
              setImportText(text);
              processPastedData(text);
            } catch(err) {
              await showError("Erro ao processar o arquivo Excel.");
            } finally {
              setIsProcessingFile(false);
            }
          }, 600); // UI delay for animation
        };
        reader.readAsArrayBuffer(file);
      } else {
        await showAlert("Por favor, arraste um arquivo Excel (.xlsx, .xls) ou CSV.", { title: 'Formato inválido' });
      }
    }
  };

  const validStudents = students.filter(s => s.full_name.trim());
  const selectedStudents = students.filter(s => s.selected && s.full_name.trim());
  const printStudentsList = selectedStudents.length > 0 ? selectedStudents : validStudents;
  const pendingStudents = students.filter(s => s.full_name.trim() === '' && (s.class_name || s.responsible_phone_1));
  const previewStudent = printStudentsList[0] || students[0];

  // Helper to chunk students into pages of 8 or 6
  const layoutCount = printLayout === '8' ? 8 : 6;
  const chunkedStudents = [];
  for (let i = 0; i < printStudentsList.length; i += layoutCount) {
    chunkedStudents.push(printStudentsList.slice(i, i + layoutCount));
  }

  // The badge artwork is deliberately kept apart from field-style settings.
  // This prevents a visual settings save from replacing the chosen background.
  const previewSettings: Settings = {
    ...badgeSettings,
    badge_background_url: badgeBackgroundUrl,
    badge_crest_url: badgeCrestUrl,
    badge_title_art_url: badgeTitleArtUrl,
    badge_characters_url: badgeCharactersUrl,
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }

          html, body, #root,
          #root > div,
          #root > div > div,
          #root > div > div > div {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          html, body, #root,
          #root > div,
          #root > div > div {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print\\:hidden, .no-print, header, nav, aside {
            display: none !important;
          }

          #print-area {
            display: block !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            margin: 0 !important;
            background: #ffffff !important;
          }

          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* 8 por folha: dimensões exatamente iguais ao HTML aprovado TOP TOP. */
          .print-page.layout-8 {
            padding: 6mm 0 !important;
            grid-template-columns: repeat(2, 86mm) !important;
            grid-template-rows: repeat(4, 64.6mm) !important;
            column-gap: 5mm !important;
            row-gap: 4mm !important;
            justify-content: center !important;
            align-content: center !important;
          }

          /* 6 por folha: mantém a mesma proporção 854:642 sem esticar o crachá. */
          .print-page.layout-6 {
            padding: 0 !important;
            grid-template-columns: repeat(2, 95mm) !important;
            grid-template-rows: repeat(3, 71.42mm) !important;
            column-gap: 0 !important;
            row-gap: 0 !important;
            justify-content: space-evenly !important;
            align-content: space-evenly !important;
          }

          .badge-print-wrapper {
            position: relative !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .layout-8 .badge-print-wrapper,
          .layout-8 .badge-print-wrapper > .student-badge-card {
            width: 86mm !important;
            min-width: 86mm !important;
            max-width: 86mm !important;
            height: 64.6mm !important;
            min-height: 64.6mm !important;
            max-height: 64.6mm !important;
          }

          .layout-6 .badge-print-wrapper,
          .layout-6 .badge-print-wrapper > .student-badge-card {
            width: 95mm !important;
            min-width: 95mm !important;
            max-width: 95mm !important;
            height: 71.42mm !important;
            min-height: 71.42mm !important;
            max-height: 71.42mm !important;
          }

          .student-badge-card {
            position: relative !important;
            transform: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .student-badge-card > .student-badge-bg {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-width: 100% !important;
            min-height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: fill !important;
            display: block !important;
          }

          .student-badge-field {
            position: absolute !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 !important;
            line-height: 1 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      
      <div id="print-area" className="hidden print:block">
        {(chunkedStudents.length > 0 ? chunkedStudents : [[previewStudent]]).map((pageStudents, pageIndex) => (
          <div 
            key={pageIndex} 
            className={`print-page student-badge-print-page layout-${printLayout}`}
            style={{
              width: '210mm',
              height: '297mm',
              padding: printLayout === '8' ? '6mm 0' : '0',
              boxSizing: 'border-box',
              display: 'grid',
              gridTemplateColumns: printLayout === '8' ? 'repeat(2, 86mm)' : 'repeat(2, 95mm)',
              gridTemplateRows: printLayout === '8' ? 'repeat(4, 64.6mm)' : 'repeat(3, 71.42mm)',
              columnGap: printLayout === '8' ? '5mm' : '0',
              rowGap: printLayout === '8' ? '4mm' : '0',
              justifyContent: printLayout === '8' ? 'center' : 'space-evenly',
              alignContent: printLayout === '8' ? 'center' : 'space-evenly',
              pageBreakAfter: pageIndex === chunkedStudents.length - 1 ? 'auto' : 'always'
            }}
          >
            {pageStudents.map((student) => {
              const badgeMetrics = STUDENT_BADGE_LAYOUT[printLayout];
              return (
                <div
                  key={student._ui_id}
                  className="badge-print-wrapper student-badge-print-wrapper"
                  style={{
                    width: `${badgeMetrics.widthMm}mm`,
                    height: `${badgeMetrics.heightMm}mm`,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <StudentPreviewCard
                    student={student}
                    globalSchoolName={globalSchoolName}
                    directorName={currentSchoolDirector}
                    layoutMode={printLayout}
                    settings={previewSettings}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-[#f5fbff] via-white to-slate-50 relative print:hidden">
      <div className="flex-1 min-h-0 overflow-auto p-3 md:px-4 md:py-2 relative">

      <img
        src={headerRibbonUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 -top-1 w-[360px] max-w-none opacity-90 sm:left-auto sm:-right-8 sm:top-0 sm:w-[36rem] sm:max-w-[52%]"
      />

      <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-2 relative z-10">
          <div>
              {isAdmin && (
                  <Link to="/students" className="text-expo-500 text-xs font-semibold flex items-center gap-1 mb-1 hover:underline">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Voltar para Gerador de Crachás
                  </Link>
              )}
              <h2 className="text-2xl md:text-[28px] leading-tight font-black text-[#073780] tracking-tight flex items-center gap-2 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                  Identificação dos alunos <span className="text-yellow-400">★</span>
                  <button onClick={() => setIsTourOpen(true)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1 rounded-full transition-colors flex items-center justify-center" title="Tour pelo Sistema">
                      <HelpCircle className="w-4 h-4" />
                  </button>
              </h2>
              <p className="text-[#48689f] text-sm mt-0.5 font-medium">Cadastre os alunos e prepare os crachás para a sessão de cinema.</p>
          </div>
          <button
            type="button"
            onClick={generateAuthorizationsPDF}
            disabled={isGeneratingAuthorizations || !globalSchoolId}
            className="group mt-1 flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-white via-violet-50 to-indigo-50 px-3.5 py-2.5 text-left shadow-sm transition-all hover:-translate-y-px hover:border-violet-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 md:mt-0 md:w-auto md:min-w-[280px]"
            title={globalSchoolId ? 'Gerar uma autorização preenchida para cada aluno cadastrado' : 'Selecione uma escola para gerar as autorizações'}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#073780] to-[#00A8CC] text-white shadow-sm">
              {isGeneratingAuthorizations ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <FileSignature className="h-4.5 w-4.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-wide text-[#4c1d95]">{isGeneratingAuthorizations ? 'Gerando autorizações...' : 'Gerar autorizações preenchidas'}</span>
              <span className="block truncate text-[10px] font-medium text-[#6d5ca5]">Uma página para cada aluno cadastrado</span>
            </span>
            <FileSignature className="h-4 w-4 shrink-0 text-violet-700 transition-transform group-hover:translate-y-0.5" />
          </button>
      </div>

      {/* Header Controls & Summary */}
      <div className="mb-3 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-blue-100 shadow-[0_5px_18px_rgba(20,76,146,0.10)] flex flex-col xl:flex-row items-start xl:items-center gap-3 justify-between relative z-10">
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
              {isAdmin ? (
                  <>
                      <span className="text-sm font-bold text-slate-800 whitespace-nowrap">Escola global</span>
                      <select 
                        value={adminSelectedSchoolId} 
                        onChange={e => setAdminSelectedSchoolId(e.target.value)}
                        className="md:w-80 w-full border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-slate-50 text-expo-900 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-600 hover:bg-white transition"
                      >
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  </>
              ) : (
                  <>
                      <span className="text-sm font-bold text-slate-800 whitespace-nowrap">Escola global:</span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">{globalSchoolName}</span>
                  </>
              )}

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Diretor(a) Responsável:</span>
                  <input 
                    type="text" 
                    value={currentSchoolDirector}
                    onChange={e => setCurrentSchoolDirector(e.target.value)}
                    onBlur={handleSaveDirectorName}
                    placeholder="Nome e Tel. ex: Bianca Gonçalves; (21) 96930-7327"
                    className="w-72 sm:w-80 md:w-[350px] border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-600 hover:bg-white transition"
                    title="Exemplo: Bianca Gonçalves da Silva; (21) 96930-7327"
                  />
              </div>
          </div>
          
          <div className="hidden xl:block w-px h-6 bg-slate-200 mx-2"></div>
          
          {/* Import Summary */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto pb-1 xl:pb-0">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0 hidden md:block">Resumo:</div>
              
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-800 leading-none">{students.length}</span>
                      <span className="text-[11px] font-bold text-slate-600">Linhas</span>
                  </div>
              </div>
              
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border shrink-0 ${pendingStudents.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${pendingStudents.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                      <span className={`text-sm font-black leading-none ${pendingStudents.length > 0 ? 'text-orange-700' : 'text-slate-800'}`}>{pendingStudents.length}</span>
                      <span className={`text-[11px] font-bold ${pendingStudents.length > 0 ? 'text-orange-600' : 'text-slate-600'}`}>Pendências</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-emerald-700 leading-none">{validStudents.length}</span>
                      <span className="text-[11px] font-bold text-emerald-600">Prontos</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        
        {/* Left Column - Forms */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-4">
            
            {/* Main Insertion Card */}
            <div className="bg-white/95 rounded-[20px] shadow-[0_8px_24px_rgba(14,70,140,0.09)] p-3 md:p-4 flex flex-col border border-blue-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-cyan-500 text-white flex items-center justify-center shadow-md"><UserSquare2 className="w-5 h-5" /></div>
                  <div><h3 className="font-black text-xl text-[#093784] leading-none">Adicionar alunos</h3><p className="text-sm text-[#5671a3] mt-1">Inclua os dados pelo Excel ou faça o cadastro manualmente.</p></div>
                </div>
                <button onClick={() => processPastedData(importText)} className="hidden md:flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl border border-blue-100 bg-[#f4f9ff] text-[#073780] text-xs font-extrabold hover:bg-blue-50"><Save className="w-4 h-4" /> Salvar colagem</button>
              </div>
              
              {/* Top Horizontal Button Bar (4 Buttons Side-by-Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-4">
                {/* 1. Colar do Excel */}
                <button 
                  onClick={() => setActiveTab('paste')}
                  className={`tour-excel-tab py-2.5 px-3.5 rounded-[14px] flex items-center justify-center gap-2 font-bold transition-all ${
                    activeTab === 'paste' 
                      ? 'bg-gradient-to-r from-[#142850] to-[#00A8CC] text-white shadow-md shadow-cyan-900/20' 
                      : 'bg-[#F7FBFD] text-[#142850] border border-[#E1EEF4] hover:bg-sky-50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black whitespace-nowrap">Colar do Excel</span>
                </button>

                {/* 2. Cadastrar manualmente */}
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={`tour-manual-tab py-2.5 px-3.5 rounded-[14px] flex items-center justify-center gap-2 font-bold transition-all ${
                    activeTab === 'manual' 
                      ? 'bg-gradient-to-r from-[#142850] to-[#00A8CC] text-white shadow-md shadow-cyan-900/20' 
                      : 'bg-[#F7FBFD] text-[#142850] border border-[#E1EEF4] hover:bg-sky-50'
                  }`}
                >
                  <UserSquare2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black whitespace-nowrap">Cadastrar manualmente</span>
                </button>

                {/* 3. Salvar sua Colagem */}
                <button 
                  onClick={() => processPastedData(importText)}
                  className="py-2.5 px-3.5 bg-gradient-to-r from-[#142850] to-[#00A8CC] hover:from-[#0b1833] hover:to-[#0C7B93] text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition shadow-md shadow-cyan-900/20 disabled:opacity-50"
                >
                  <ClipboardPaste className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black whitespace-nowrap">Salvar sua Colagem</span>
                </button>

                {/* 4. Importar Planilha (.xlsx) */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="tour-import-btn py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 border border-emerald-500 hover:shadow-lg hover:shadow-emerald-600/30"
                >
                  <Upload className="w-4 h-4 shrink-0 text-white" />
                  <span className="text-xs font-black whitespace-nowrap text-white">Importar Planilha (.xlsx)</span>
                </button>

              </div>

              <div>
                {activeTab === 'paste' ? (
                  <div className="flex flex-col gap-4">
                      
                      {/* Left Paste Area */}
                      <div className="flex-1 flex flex-col">
                          <div 
                            className={`border-2 border-dashed rounded-[18px] p-4 md:p-5 flex flex-col relative transition-all duration-300 min-h-[140px] overflow-hidden ${
                              isDragging 
                                ? 'border-[#00A8CC] bg-[#e8f7fa] scale-[1.01] shadow-[0_0_20px_rgba(0,168,204,0.15)]' 
                                : 'border-[#A0C4CE] bg-[#F7FBFD] hover:border-[#00A8CC] focus-within:border-[#00A8CC] focus-within:bg-[#f0f8fb]'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                          >
                              {/* Loading Overlay */}
                              {isProcessingFile && (
                                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                                  <div className="relative">
                                    <div className="w-14 h-14 border-4 border-[#E1EEF4] rounded-full"></div>
                                    <div className="w-14 h-14 border-4 border-[#00A8CC] rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <FileSpreadsheet className="w-6 h-6 text-[#0C7B93] animate-pulse" />
                                    </div>
                                  </div>
                                  <div className="mt-4 text-base font-black text-[#142850] tracking-tight">Processando Planilha...</div>
                                  <div className="text-xs text-[#27496D]/70 mt-0.5 font-medium">Extraindo dados das colunas</div>
                                </div>
                              )}

                              <div className="relative flex-1 flex flex-col min-h-[70px]">
                                  <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 z-20 ${importText ? 'opacity-0' : 'opacity-100'}`}>
                                      <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#E1EEF4] flex items-center justify-center mb-2 overflow-hidden">
                                          <img src="https://images.seeklogo.com/logo-png/30/1/microsoft-excel-logo-png_seeklogo-300110.png" alt="Excel Icon" className="w-6 h-6 object-contain" />
                                      </div>
                                      <div className="text-base font-black text-[#142850]">Cole ou arraste aqui seu Excel</div>
                                      <div className="text-xs text-[#27496D]/70 mt-1">Arraste seu arquivo .xlsx, ou cole as linhas com cabeçalho.</div>
                                  </div>
                                  <textarea 
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                    className="w-full h-full flex-1 bg-transparent resize-none outline-none relative z-10 text-xs font-mono text-[#27496D]"
                                    placeholder=""
                                  ></textarea>
                              </div>
                              


                              {/* Modelo visual da planilha aceita */}
                              <div className="mt-3 relative z-10 rounded-[18px] border border-[#d7e9f7] bg-white/80 p-3 shadow-sm">
                                  <div className="mb-3 flex items-center justify-center gap-2 text-center">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#073780] to-[#00A8CC] text-white shadow-sm shrink-0">
                                          <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                                      </div>
                                      <div className="text-sm font-black tracking-tight text-[#073780]">
                                        ATENÇÃO! <span className="text-xs uppercase">Colunas aceitas na planilha:</span>
                                      </div>
                                  </div>

                                  <div className="overflow-x-auto rounded-xl border border-[#b9dcf6]">
                                    <table className="min-w-[850px] w-full border-collapse text-center text-xs text-[#17366b]">
                                      <thead className="bg-gradient-to-r from-[#eff8ff] to-[#e9f5ff]">
                                        <tr>
                                          <th className="w-[25%] border-r border-[#b9dcf6] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span>Nome do estudante</span></th>
                                          <th className="w-[12%] border-r border-[#b9dcf6] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span>Turma</span></th>
                                          <th className="w-[12%] border-r border-[#b9dcf6] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span>Alergia</span></th>
                                          <th className="w-[14%] border-r border-[#b9dcf6] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span>Tipo Sang.</span></th>
                                          <th className="w-[18%] border-r border-[#b9dcf6] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span><span>Contato Resp. 1<br />(diretor ou Adjunto)</span></span></th>
                                          <th className="w-[19%] px-3 py-3 font-extrabold"><span className="flex items-center justify-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00A8CC] shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span><span>Contato Resp. 2<br />(diretor ou Adjunto)</span></span></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="bg-white text-sm font-medium">
                                          <td className="border-r border-t border-[#d7e9f7] px-3 py-2.5">Nome completo do(a) aluno(a)</td>
                                          <td className="border-r border-t border-[#d7e9f7] px-3 py-2.5">1º Ano A</td>
                                          <td className="border-r border-t border-[#d7e9f7] px-3 py-2.5">Poeira</td>
                                          <td className="border-r border-t border-[#d7e9f7] px-3 py-2.5">AB+</td>
                                          <td className="border-r border-t border-[#d7e9f7] px-3 py-2.5">(21) ****-****</td>
                                          <td className="border-t border-[#d7e9f7] px-3 py-2.5">(21) ****-****</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Hidden File Input */}
                          <input 
                            type="file" 
                            accept=".xlsx,.xls" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                          />
                          
                          <div className="mt-3 flex justify-center">
                              <button 
                                onClick={downloadExampleTemplate} 
                                className="flex items-center gap-2.5 text-red-600 hover:text-red-700 font-black text-xs md:text-sm transition-all underline decoration-red-600/40 hover:decoration-red-700/70 underline-offset-4 group animate-pulse bg-red-50 hover:bg-red-100/80 px-4 py-2 rounded-full border border-red-200 shadow-sm"
                              >
                                  <img src="https://images.seeklogo.com/logo-png/30/1/microsoft-excel-logo-png_seeklogo-300110.png" alt="Excel Logo" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform shrink-0" /> 
                                  <span>CLIQUE AQUI E BAIXE O MODELO DA PLANILHA PARA FACILITAR O SEU PREENCHIMENTO</span>
                              </button>
                          </div>
                      </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider relative min-w-[900px]">
                              <div className="w-[30%] flex items-center justify-between">
                                  NOME DO ESTUDANTE
                                  <div className="relative">
                                      <button 
                                          onClick={() => setShowFormatMenu(!showFormatMenu)}
                                          className="flex items-center gap-1 text-[10px] bg-white border border-[#00A8CC] text-[#00A8CC] px-2 py-1 rounded-md hover:bg-[#00A8CC] hover:text-white transition-colors ml-2"
                                      >
                                          <Type className="w-3.5 h-3.5" strokeWidth={3} />
                                          Formatar
                                      </button>
                                      {showFormatMenu && (
                                          <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white border border-[#E1EEF4] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl py-1.5 z-30 flex flex-col overflow-hidden">
                                              <button onClick={() => {formatNames('upper'); setShowFormatMenu(false);}} className="px-4 py-2.5 text-left text-[11px] hover:bg-[#F7FBFD] text-[#142850] font-bold border-b border-[#E1EEF4] transition-colors flex items-center gap-3">
                                                  <span className="w-5 text-center text-[#00A8CC] font-black text-sm">AA</span> TUDO MAIÚSCULO
                                              </button>
                                              <button onClick={() => {formatNames('lower'); setShowFormatMenu(false);}} className="px-4 py-2.5 text-left text-[11px] hover:bg-[#F7FBFD] text-[#142850] font-bold border-b border-[#E1EEF4] transition-colors flex items-center gap-3">
                                                  <span className="w-5 text-center text-[#00A8CC] font-black text-sm">aa</span> tudo minúsculo
                                              </button>
                                              <button onClick={() => {formatNames('title'); setShowFormatMenu(false);}} className="px-4 py-2.5 text-left text-[11px] hover:bg-[#F7FBFD] text-[#142850] font-bold transition-colors flex items-center gap-3">
                                                  <span className="w-5 text-center text-[#00A8CC] font-black text-sm">Aa</span> Primeiras Letras
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </div>
                              <div className="w-[15%]">Turma</div>
                              <div className="w-[15%]">Alergia</div>
                              <div className="w-[10%]">Tipo Sang.</div>
                              <div className="w-[12%]">Contato 1</div>
                              <div className="w-[12%]">Contato 2</div>
                              <div className="w-[6%] text-center">Ação</div>
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-2 min-w-[900px]">
                              {students.map((student, index) => (
                                <div key={student._ui_id} className="flex gap-2 items-center group">
                                    <div className="w-[30%]">
                                        <input 
                                          type="text" 
                                          placeholder="Nome completo..."
                                          value={student.full_name}
                                          onChange={e => handleUpdate(index, 'full_name', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[15%]">
                                        <input 
                                          type="text" 
                                          placeholder="Turma"
                                          value={student.class_name}
                                          onChange={e => handleUpdate(index, 'class_name', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[15%]">
                                        <input 
                                          type="text" 
                                          placeholder="Alergia..."
                                          value={student.allergy}
                                          onChange={e => handleUpdate(index, 'allergy', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[10%]">
                                        <input 
                                          type="text" 
                                          placeholder="Tipo Sang."
                                          value={student.blood_type}
                                          onChange={e => handleUpdate(index, 'blood_type', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[12%]">
                                        <input 
                                          type="text" 
                                          placeholder="(00) 0000-0000"
                                          value={student.responsible_phone_1}
                                          onChange={e => handleUpdate(index, 'responsible_phone_1', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[12%]">
                                        <input 
                                          type="text" 
                                          placeholder="(00) 0000-0000"
                                          value={student.responsible_phone_2}
                                          onChange={e => handleUpdate(index, 'responsible_phone_2', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-expo-500" 
                                        />
                                    </div>
                                    <div className="w-[6%] flex justify-center">
                                        <button 
                                          onClick={() => removeRow(index)}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                              ))}
                          </div>
                      </div>
                      
                      <div className="mt-3 flex justify-start">
                          <button 
                            onClick={addRow}
                            className="flex items-center gap-2 text-expo-600 hover:text-expo-800 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                          >
                              <Plus className="w-3.5 h-3.5" /> Adicionar aluno
                          </button>
                      </div>
                  </div>
                )}
              </div>

              {/* Import summary moved to header */}
            </div>



        </div>

        {/* Right Column - Preview */}
        <div className="col-span-1 lg:col-span-4">
            <div className="sticky top-3 bg-white/95 backdrop-blur-sm rounded-[20px] border border-blue-100 shadow-[0_8px_24px_rgba(14,70,140,0.10)] p-4 flex flex-col">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div><h3 className="font-black text-[#093784] text-xl">Prévia do crachá</h3><p className="text-xs text-[#5671a3] mt-0.5">Veja como o crachá será impresso.</p></div>
                    <span className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-extrabold text-blue-700">Modelo Cinema 2026</span>
                </div>
                
                <div 
                  onClick={() => setIsZoomModalOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#f4faff] to-white rounded-xl border border-blue-100 p-3 mb-3 shadow-inner relative group cursor-pointer overflow-hidden transition-all hover:border-cyan-400 hover:shadow-md"
                  title="Clique para abrir a visualização ampliada"
                >
                    <div className="origin-center scale-[0.78] sm:scale-[0.82] md:scale-[0.85] lg:scale-[0.8] xl:scale-[0.9] transition-transform group-hover:scale-[0.82] xl:group-hover:scale-[0.93]">
                        <StudentPreviewCard 
                          student={previewStudent?.full_name ? previewStudent : null} 
                          globalSchoolName={globalSchoolName} 
                          directorName={currentSchoolDirector}
                          layoutMode={printLayout}
                          settings={previewSettings}
                        />
                    </div>
                    <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white/95 text-slate-800 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <ZoomIn className="w-3.5 h-3.5 text-cyan-600" /> Clique para Ampliar
                        </span>
                    </div>
                </div>

                <div className="bg-blue-50/80 rounded-xl border border-blue-100 p-3 flex gap-2 text-xs">
                    <Info className="w-4 h-4 text-expo-500 shrink-0 mt-0.5" />
                    <p className="text-slate-600 text-[11px] leading-relaxed">A visualização usa os dados da primeira linha. Revise os dados para ver o crachá atualizado.</p>
                </div>
            </div>
        </div>

      </div>

      </div>

      {/* Barra de ações: fora da área rolável para nunca cobrir o conteúdo. */}
      <div className="shrink-0 border-t border-sky-200 bg-white/95 px-3 py-2 shadow-[0_-4px_18px_rgba(20,76,146,0.10)]">
        <div className="bg-gradient-to-r from-slate-50 via-sky-50 to-blue-50 border border-sky-200/70 rounded-xl p-2 flex items-center justify-between gap-2 px-2 sm:px-4 ring-1 ring-sky-200/40">

          <div className="hidden xl:flex items-center gap-2 mr-auto text-xs text-slate-500 font-medium bg-white/60 px-3 py-1.5 rounded-full border border-white/80 shadow-sm">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Não se esqueça de salvar antes de sair
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button 
                onClick={handleCancel}
                className="shrink-0 px-2.5 py-1.5 text-red-600 hover:text-red-700 font-semibold text-xs bg-white/80 hover:bg-white border border-red-200 hover:border-red-400 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                title="Limpar Lista"
              >
                  <X className="w-4 h-4" /> <span className="hidden xl:inline">Limpar Lista</span>
              </button>
              
              <div className="h-6 w-[1px] bg-slate-300/50 mx-1 hidden sm:block"></div>

              <button 
                onClick={handleDraftSave}
                 className="tour-draft-save shrink-0 px-2.5 py-1.5 text-blue-800 font-bold text-xs bg-white hover:bg-blue-50 border border-blue-200/70 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,64,175,0.10)] hover:shadow-[0_4px_12px_rgba(30,64,175,0.18)] hover:border-blue-300"
                title="Salvar rascunho"
              >
                  <Save className="w-4 h-4 text-blue-800" /> <span className="hidden xl:inline">Salvar rascunho</span>
              </button>
              
              <button 
                onClick={loadFromDatabase}
                disabled={isLoadingDB}
                 className="tour-load-db shrink-0 px-2.5 py-1.5 text-blue-800 font-bold text-xs bg-white hover:bg-blue-50 border border-blue-200/70 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,64,175,0.10)] hover:shadow-[0_4px_12px_rgba(30,64,175,0.18)] hover:border-blue-300 disabled:opacity-50"
                title="Carregar do Banco"
              >
                  <Download className="w-4 h-4 text-blue-800" /> <span className="hidden xl:inline">{isLoadingDB ? 'Carregando...' : 'Carregar do Banco'}</span>
              </button>
              
              {isAdmin && globalSchoolId && (
                <button 
                  onClick={handleDeleteSchoolDatabaseStudents}
                  className="shrink-0 px-2.5 py-1.5 text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  title={`Apagar todos os alunos salvos no banco para ${globalSchoolName}`}
                >
                    <Trash2 className="w-4 h-4 text-red-600" /> <span className="hidden xl:inline">Limpar Banco da Escola</span>
                </button>
              )}
              
              {isAdmin && (
                <button 
                  onClick={() => setIsSettingsModalOpen(true)}
                   className="shrink-0 px-2.5 py-1.5 text-blue-800 font-bold text-xs bg-white hover:bg-blue-50 border border-blue-200/70 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,64,175,0.10)] hover:shadow-[0_4px_12px_rgba(30,64,175,0.18)] hover:border-blue-300"
                  title="Visual do Crachá"
                >
                    <Palette className="w-4 h-4 text-amber-600" /> <span className="hidden xl:inline">Visual</span>
                </button>
              )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
              <div className="relative group hidden sm:block">
                <select 
                  value={printLayout}
                  onChange={e => setPrintLayout(e.target.value as '8' | '6')}
                   className="tour-layout-select appearance-none pl-3 pr-8 py-1.5 bg-white border border-blue-200/70 hover:border-blue-400 rounded-xl text-xs text-blue-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer shadow-[0_2px_8px_rgba(30,64,175,0.10)]"
                >
                  <option value="8">8 por folha</option>
                  <option value="6">6 por folha</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-600 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              
              <button 
                onClick={generatePDF}
                 className="tour-print shrink-0 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-800 to-blue-900 text-white font-bold text-xs hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(30,58,138,0.35)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.45)] ring-1 ring-blue-700/50"
              >
                  <Printer className="w-4 h-4 text-blue-200" /> <span className="hidden sm:inline">Imprimir PDF</span>
              </button>

              <button
                onClick={generateAuthorizationsPDF}
                disabled={isGeneratingAuthorizations || !globalSchoolId}
                className="shrink-0 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-violet-700 to-indigo-700 text-white font-bold text-xs hover:from-violet-600 hover:to-indigo-600 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(91,33,182,0.28)] hover:shadow-[0_6px_20px_rgba(91,33,182,0.40)] disabled:cursor-not-allowed disabled:opacity-50"
                title={globalSchoolId ? 'Gerar uma autorização preenchida para cada aluno cadastrado' : 'Selecione uma escola para gerar as autorizações'}
              >
                  {isGeneratingAuthorizations ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4 text-violet-100" />}
                  <span className="hidden sm:inline">{isGeneratingAuthorizations ? 'Gerando...' : 'Gerar autorizações'}</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAuthorizationEditorOpen(true)}
                  className="shrink-0 px-2.5 sm:px-3 py-1.5 bg-white text-violet-800 font-bold text-xs border border-violet-200 hover:bg-violet-50 hover:border-violet-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  title="Editar textos do modelo de autorização"
                >
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Editar modelo</span>
                </button>
              )}
              
              <button 
                onClick={handleSaveAndReturn}
                disabled={isSaving}
                className="tour-save-return shrink-0 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center gap-1.5 shadow-[0_6px_16px_rgba(6,182,212,0.25)] hover:shadow-[0_8px_20px_rgba(6,182,212,0.35)] disabled:opacity-50"
              >
                  <Check className="w-4 h-4 text-cyan-100" /> <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar e voltar'}</span>
              </button>
          </div>
        </div>
      </div>

      {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/10">
                 <div className="p-6 border-b border-expo-800/20 bg-gradient-to-r from-expo-900 to-expo-800 flex items-center justify-between shadow-sm relative z-10">
                     <h2 className="text-xl font-bold text-white flex items-center gap-3">
                         <Palette className="w-6 h-6 text-expo-300" /> Personalização Visual
                     </h2>
                     <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                     
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="font-extrabold text-base text-expo-900 mb-5 flex items-center gap-2"><Image className="w-5 h-5 text-expo-500"/> Logos (Imagens)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                 <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Logo Prefeitura (Esquerda)</label>
                                 <div className="flex items-center justify-between gap-3 mb-2">
                                     <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo_prefeitura_url')} className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-expo-100 file:text-expo-800 hover:file:bg-expo-200 cursor-pointer transition" />
                                     {badgeSettings.logo_prefeitura_url && (
                                         <button onClick={() => setBadgeSettings({...badgeSettings, logo_prefeitura_url: null})} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg font-bold shrink-0 transition" title="Remover Logo">Remover</button>
                                     )}
                                 </div>
                                 <input type="text" value={badgeSettings.logo_prefeitura_url?.startsWith('data:') ? 'Imagem Carregada do Dispositivo' : (badgeSettings.logo_prefeitura_url || '')} onChange={e => setBadgeSettings({...badgeSettings, logo_prefeitura_url: e.target.value})} disabled={badgeSettings.logo_prefeitura_url?.startsWith('data:')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-expo-500 focus:bg-white transition disabled:text-emerald-700 disabled:font-bold disabled:bg-emerald-50/50" placeholder="Ou cole o link (https://...)" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Logo Expo (Direita)</label>
                                 <div className="flex items-center justify-between gap-3 mb-2">
                                     <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo_expo_url')} className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-expo-100 file:text-expo-800 hover:file:bg-expo-200 cursor-pointer transition" />
                                     {badgeSettings.logo_expo_url && (
                                         <button onClick={() => setBadgeSettings({...badgeSettings, logo_expo_url: null})} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg font-bold shrink-0 transition" title="Remover Logo">Remover</button>
                                     )}
                                 </div>
                                 <input type="text" value={badgeSettings.logo_expo_url?.startsWith('data:') ? 'Imagem Carregada do Dispositivo' : (badgeSettings.logo_expo_url || '')} onChange={e => setBadgeSettings({...badgeSettings, logo_expo_url: e.target.value})} disabled={badgeSettings.logo_expo_url?.startsWith('data:')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-expo-500 focus:bg-white transition disabled:text-emerald-700 disabled:font-bold disabled:bg-emerald-50/50" placeholder="Ou cole o link (https://...)" />
                             </div>
                         </div>
                     </div>
                     
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="font-extrabold text-base text-expo-900 mb-5 flex items-center gap-2"><Type className="w-5 h-5 text-expo-500"/> Rótulos e Textos</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Título Superior 1</label>
                                     <div className="flex items-center gap-2">
                                         <input type="text" value={badgeSettings.label_title_1 || ''} onChange={e => setBadgeSettings({...badgeSettings, label_title_1: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                             <input type="color" value={badgeSettings.color_title_1 || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_title_1: e.target.value})} className="w-7 h-7 p-0 border-0 cursor-pointer rounded-sm" title="Cor da fonte" />
                                             <input type="number" value={parseInt(badgeSettings.size_title_1 || '14')} onChange={e => setBadgeSettings({...badgeSettings, size_title_1: `${e.target.value}px`})} className="w-9 h-7 text-center font-bold text-xs bg-transparent focus:outline-none" title="Tamanho da fonte (px)" />
                                         </div>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Título Superior 2</label>
                                     <div className="flex items-center gap-2">
                                         <input type="text" value={badgeSettings.label_title_2 || ''} onChange={e => setBadgeSettings({...badgeSettings, label_title_2: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                             <input type="color" value={badgeSettings.color_title_2 || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_title_2: e.target.value})} className="w-7 h-7 p-0 border-0 cursor-pointer rounded-sm" title="Cor da fonte" />
                                             <input type="number" value={parseInt(badgeSettings.size_title_2 || '12')} onChange={e => setBadgeSettings({...badgeSettings, size_title_2: `${e.target.value}px`})} className="w-9 h-7 text-center font-bold text-xs bg-transparent focus:outline-none" title="Tamanho da fonte (px)" />
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div className="md:col-span-2 mt-2 mb-1">
                                     <div className="flex items-center gap-3">
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                        <p className="text-[9px] uppercase font-bold text-expo-500 tracking-widest">Campos de Informação</p>
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Nome</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_nome || ''} onChange={e => setBadgeSettings({...badgeSettings, label_nome: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_nome || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_nome: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_nome || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_nome: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_nome || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_nome: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_nome || '14')} onChange={e => setBadgeSettings({...badgeSettings, size_val_nome: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Escola</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_escola || ''} onChange={e => setBadgeSettings({...badgeSettings, label_escola: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_escola || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_escola: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_escola || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_escola: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_escola || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_escola: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_escola || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_val_escola: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Turma</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_turma || ''} onChange={e => setBadgeSettings({...badgeSettings, label_turma: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_turma || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_turma: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_turma || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_turma: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_turma || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_turma: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_turma || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_val_turma: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Alergia</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_alergia || ''} onChange={e => setBadgeSettings({...badgeSettings, label_alergia: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_alergia || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_alergia: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_alergia || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_alergia: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_alergia || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_alergia: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_alergia || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_val_alergia: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Tipo Sanguíneo</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_sangue || ''} onChange={e => setBadgeSettings({...badgeSettings, label_sangue: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_sangue || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_sangue: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_sangue || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_sangue: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_sangue || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_sangue: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_sangue || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_val_sangue: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Contato</label>
                                     <div className="flex items-end gap-2">
                                         <input type="text" value={badgeSettings.label_contato || ''} onChange={e => setBadgeSettings({...badgeSettings, label_contato: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                         
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_contato || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_contato: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                 <input type="number" value={parseInt(badgeSettings.size_contato || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_contato: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                             <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                 <input type="color" value={badgeSettings.color_val_contato || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_contato: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                 <input type="number" value={parseInt(badgeSettings.size_val_contato || '10')} onChange={e => setBadgeSettings({...badgeSettings, size_val_contato: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Rótulo Diretor(a) Responsável</label>
                                      <div className="flex items-end gap-2">
                                          <input type="text" value={badgeSettings.label_diretor || ''} onChange={e => setBadgeSettings({...badgeSettings, label_diretor: e.target.value})} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-expo-500 transition font-medium" />
                                          
                                          <div className="flex flex-col items-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Rótulo</span>
                                              <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                  <input type="color" value={badgeSettings.color_diretor || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_diretor: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Rótulo" />
                                                  <input type="number" value={parseInt(badgeSettings.size_diretor || '7')} onChange={e => setBadgeSettings({...badgeSettings, size_diretor: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Rótulo (px)" />
                                              </div>
                                          </div>
                                          <div className="flex flex-col items-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Dado</span>
                                              <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                                  <input type="color" value={badgeSettings.color_val_diretor || '#000000'} onChange={e => setBadgeSettings({...badgeSettings, color_val_diretor: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Cor do Dado" />
                                                  <input type="number" value={parseInt(badgeSettings.size_val_diretor || '9')} onChange={e => setBadgeSettings({...badgeSettings, size_val_diretor: `${e.target.value}px`})} className="w-8 h-6 text-center font-bold text-[11px] bg-transparent focus:outline-none" title="Tamanho do Dado (px)" />
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                             </div>
                     </div>
                 </div>
                 <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10">
                     <button onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancelar</button>
                     <button onClick={saveSettings} className="px-8 py-2.5 text-sm font-bold text-white bg-cyan-600 hover:bg-blue-800 rounded-xl transition shadow-lg shadow-cyan-600/20 flex items-center gap-2"><Save className="w-4 h-4"/> Salvar Visual</button>
                 </div>
             </div>
          </div>
      )}

    </div>

    <Joyride
      steps={tourSteps}
      run={isTourOpen}
      continuous={true}
      scrollToFirstStep={true}
      // @ts-ignore
      scrollOffset={120}
      // @ts-ignore
      showSkipButton={true}
      tooltipComponent={CustomTooltip}
      styles={({
        options: {
          overlayColor: 'rgba(15, 23, 42, 0.65)', // escurecido slate-900 com opacidade
          zIndex: 10000,
        },
        spotlight: {
          rx: 12, // border radius equivalente para o SVG mask
        }
      } as any)}
      callback={handleTourCallback}
      locale={{
        last: 'Finalizar',
        next: 'Próximo',
        back: 'Anterior',
        skip: 'Pular'
      }}
    />

    {isAdmin && isAuthorizationEditorOpen && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setIsAuthorizationEditorOpen(false)}>
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-6 py-5">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-md"><Settings2 className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Editar texto do modelo</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">A identidade visual e a estrutura do PDF original serão preservadas.</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsAuthorizationEditorOpen(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" title="Fechar"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Título do documento</span><input value={authorizationTemplate.title} onChange={event => setAuthorizationTemplate({ ...authorizationTemplate, title: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Nome da ação / projeto</span><input value={authorizationTemplate.projectTitle} onChange={event => setAuthorizationTemplate({ ...authorizationTemplate, projectTitle: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
            <label className="block md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Período / data</span><input value={authorizationTemplate.period} onChange={event => setAuthorizationTemplate({ ...authorizationTemplate, period: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
            <label className="block md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Texto de autorização</span><textarea rows={5} value={authorizationTemplate.authorizationText} onChange={event => setAuthorizationTemplate({ ...authorizationTemplate, authorizationText: event.target.value })} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" /><span className="mt-1 block text-[11px] text-slate-400">O texto será ajustado dentro da área original do formulário.</span></label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={resetAuthorizationTemplate} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-violet-800"><RotateCcw className="h-4 w-4" /> Restaurar texto original</button>
            <div className="flex gap-2"><button type="button" onClick={() => setIsAuthorizationEditorOpen(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-white">Cancelar</button><button type="button" onClick={saveAuthorizationTemplate} className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-800">Salvar alterações</button></div>
          </div>
        </div>
      </div>
    )}

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
                <p className="text-xs text-slate-500 font-medium">Crachá em tamanho expandido para conferência detalhada de dados.</p>
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
              <StudentPreviewCard 
                student={previewStudent?.full_name ? previewStudent : null} 
                globalSchoolName={globalSchoolName} 
                directorName={currentSchoolDirector}
                layoutMode={printLayout}
                settings={previewSettings}
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

    </>
  );
}
