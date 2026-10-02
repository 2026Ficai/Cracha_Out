import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Check, ImagePlus, Link2, LoaderCircle, RotateCcw, Save, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_LOGO = '/logo-escola-vai-ao-cinema.png';
const DEFAULT_RIBBON = '/fita-cinema.png';
const DEFAULT_BADGE_BACKGROUND = '/cracha-cinema.png?v=1';
const DEFAULT_BADGE_CREST = '/brasao_itaguai.png';
const DEFAULT_BADGE_TITLE = '/logo-escola-vai-ao-cinema.png';
const DEFAULT_BADGE_CHARACTERS = '/cracha-cinema.png?v=1';

interface BrandSettings {
  id?: string;
  app_logo_url: string | null;
  header_ribbon_url: string | null;
  badge_background_url: string | null;
  badge_crest_url: string | null;
  badge_title_art_url: string | null;
  badge_characters_url: string | null;
}

type ImageField = 'app_logo_url' | 'header_ribbon_url' | 'badge_background_url' | 'badge_crest_url' | 'badge_title_art_url' | 'badge_characters_url';

const initialSettings: BrandSettings = {
  app_logo_url: null,
  header_ribbon_url: null,
  badge_background_url: null,
  badge_crest_url: null,
  badge_title_art_url: null,
  badge_characters_url: null,
};

export default function VisualIdentityPage({ isTab = false }: { isTab?: boolean }) {
  const [settings, setSettings] = useState<BrandSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('badge_settings')
      .select('id, app_logo_url, header_ribbon_url, badge_background_url, badge_crest_url, badge_title_art_url, badge_characters_url')
      .limit(1);

    if (error) {
      console.error('Erro ao carregar identidade visual:', error);
      setSchemaUnavailable(true);
    } else if (data?.[0]) {
      setSettings(data[0] as BrandSettings);
      setSchemaUnavailable(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const save = async (settingsToSave: BrandSettings = settings, uploadedNow = false) => {
    setSaving(true);
    setMessage('');

    const payload = {
      app_logo_url: settingsToSave.app_logo_url,
      header_ribbon_url: settingsToSave.header_ribbon_url,
      badge_background_url: settingsToSave.badge_background_url,
      badge_crest_url: settingsToSave.badge_crest_url,
      badge_title_art_url: settingsToSave.badge_title_art_url,
      badge_characters_url: settingsToSave.badge_characters_url,
    };

    const result = settingsToSave.id
      ? await supabase.from('badge_settings').update(payload).eq('id', settingsToSave.id).select('id').maybeSingle()
      : await supabase.from('badge_settings').insert(payload).select('id').single();

    const rowWasUpdated = !settingsToSave.id || Boolean(result.data);
    if (result.error || !rowWasUpdated) {
      console.error('Erro ao salvar identidade visual:', result.error);
      const columnMissing = result.error?.code === '42703' || result.error?.message?.includes('badge_background_url');
      const permissionDenied = result.error?.code === '42501' || !rowWasUpdated;
      setMessage(columnMissing || permissionDenied
        ? 'O Supabase ainda bloqueia esta gravação. Execute add_brand_assets.sql no Supabase e tente novamente.'
        : 'Não foi possível salvar a imagem. Tente novamente.');
    } else {
      const savedId = result.data?.id;
      if (!settingsToSave.id && savedId) {
        setSettings((current) => ({ ...current, id: savedId }));
      }
      window.dispatchEvent(new Event('brand-assets-updated'));
      setMessage(uploadedNow ? 'Imagem enviada e salva com sucesso.' : 'Identidade visual atualizada com sucesso.');
      setSchemaUnavailable(false);
    }

    setSaving(false);
  };

  const updateImage = (field: ImageField, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 2_000_000) {
      setMessage('Use imagens com até 2 MB para manter o sistema rápido.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setMessage('Não foi possível ler a imagem selecionada. Tente outro arquivo.');
    reader.onload = () => {
      const nextSettings = { ...settings, [field]: String(reader.result) };
      setSettings(nextSettings);
      void save(nextSettings, true);
    };
    reader.readAsDataURL(file);
  };

  const resetImage = (field: ImageField) => {
    setSettings((current) => ({ ...current, [field]: null }));
    setMessage('O modelo padrão será usado ao salvar as alterações.');
  };

  const imageField = (field: ImageField, title: string, description: string, defaultImage: string, className = '') => (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-black text-[#073780]">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className={`mb-4 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-blue-200 bg-gradient-to-br from-sky-50 to-white p-3 ${className}`}>
        <img src={settings[field] || defaultImage} alt={`Prévia: ${title}`} className="h-full w-full object-contain" />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#073780] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#05295e]">
          <Upload className="h-4 w-4" /> {saving ? 'Salvando imagem...' : 'Enviar imagem'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={saving} onChange={(event) => updateImage(field, event)} />
        </label>
        <button type="button" onClick={() => resetImage(field)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Padrão</button>
      </div>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white">
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <input value={settings[field] || ''} onChange={(event) => setSettings((current) => ({ ...current, [field]: event.target.value || null }))} placeholder="Ou cole a URL da imagem" className="w-full bg-transparent text-xs text-slate-700 outline-none" />
      </label>
    </div>
  );

  return (
    <div className={`${isTab ? 'p-4' : 'p-8'} h-full overflow-auto bg-slate-50`}>
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-600/25"><ImagePlus className="h-5 w-5" /></div>
        <div><h2 className="text-xl font-black text-slate-800">Identidade Visual</h2><p className="text-sm text-slate-500">Personalize o cabeçalho e a arte exibida nos crachás.</p></div>
      </div>

      {schemaUnavailable && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Para ativar a personalização, execute o script <code className="rounded bg-white px-1.5 py-0.5 font-semibold">add_brand_assets.sql</code> no Supabase.</div>}

      {loading ? <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Carregando configurações visuais...</div> : <>
        <div className="grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
          {imageField('app_logo_url', 'Logotipo principal', 'Imagem exibida no canto superior esquerdo. Prefira PNG transparente e formato horizontal.', DEFAULT_LOGO)}
          {imageField('header_ribbon_url', 'Faixa decorativa', 'Imagem cinematográfica exibida à direita no topo da tela de identificação dos alunos.', DEFAULT_RIBBON)}
        </div>

        <div className="mt-5 max-w-5xl">
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p><strong>Somente a arte é alterada.</strong> Nome, escola, turma, alergia, tipo sanguíneo e contatos continuam sendo preenchidos automaticamente pelo sistema e não são editados nesta tela.</p>
          </div>
          {imageField('badge_background_url', 'Arte de fundo do crachá', 'Imagem-base do crachá. O envio é salvo automaticamente e não modifica os campos dos alunos.', DEFAULT_BADGE_BACKGROUND, 'h-auto min-h-56')}
        </div>

        <section className="mt-5 max-w-6xl rounded-2xl border border-blue-100 bg-white/70 p-5">
          <div className="mb-4">
            <h3 className="text-base font-black text-[#073780]">Elementos do crachá</h3>
            <p className="mt-1 text-xs text-slate-500">Troque somente a parte desejada. As imagens devem preferencialmente ter fundo transparente para cobrir apenas sua área.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {imageField('badge_crest_url', 'Brasão', 'Exibido no canto superior esquerdo do crachá.', DEFAULT_BADGE_CREST)}
            {imageField('badge_title_art_url', 'Título do tema', 'Exibido no topo do crachá.', DEFAULT_BADGE_TITLE)}
            {imageField('badge_characters_url', 'Personagens', 'Exibidos no lado direito do crachá.', DEFAULT_BADGE_CHARACTERS)}
          </div>
        </section>

        <div className="mt-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-xs leading-relaxed text-blue-800">As imagens padrão continuam disponíveis. Para melhor desempenho, use arquivos JPG, PNG ou WEBP com até 2 MB.</p>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:from-blue-800 hover:to-cyan-700 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
        {message && <div className={`mt-3 flex max-w-5xl items-center gap-2 text-sm font-medium ${message.includes('sucesso') ? 'text-emerald-700' : 'text-red-600'}`}><Check className="h-4 w-4" />{message}</div>}
      </>}
    </div>
  );
}
