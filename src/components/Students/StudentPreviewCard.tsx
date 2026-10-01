import React from 'react';

export interface Settings {
  logo_prefeitura_url: string | null;
  logo_expo_url: string | null;
  label_title_1?: string;
  label_title_2?: string;
  label_nome?: string;
  label_escola?: string;
  label_turma?: string;
  label_contato?: string;
  color_title_1?: string;
  color_title_2?: string;
  color_nome?: string;
  color_escola?: string;
  color_turma?: string;
  color_contato?: string;
  color_val_nome?: string;
  color_val_escola?: string;
  color_val_turma?: string;
  color_val_contato?: string;
  size_title_1?: string;
  size_title_2?: string;
  size_nome?: string;
  size_escola?: string;
  size_turma?: string;
  size_contato?: string;
  size_val_nome?: string;
  size_val_escola?: string;
  size_val_turma?: string;
  size_val_contato?: string;
  label_alergia?: string;
  color_alergia?: string;
  size_alergia?: string;
  color_val_alergia?: string;
  size_val_alergia?: string;
  label_sangue?: string;
  color_sangue?: string;
  size_sangue?: string;
  color_val_sangue?: string;
  size_val_sangue?: string;
  label_diretor?: string;
  color_diretor?: string;
  size_diretor?: string;
  color_val_diretor?: string;
  size_val_diretor?: string;
  label_cargo?: string;
  color_cargo?: string;
  size_cargo?: string;
  color_val_cargo?: string;
  size_val_cargo?: string;
  label_matricula?: string;
  color_matricula?: string;
  size_matricula?: string;
  color_val_matricula?: string;
  size_val_matricula?: string;
  show_diretor?: boolean;
}

export interface Student {
  full_name?: string;
  class_name?: string;
  responsible_phone_1?: string;
  responsible_phone_2?: string;
  allergy?: string;
  blood_type?: string;
}

interface StudentPreviewCardProps {
  student: Student | null;
  globalSchoolName: string;
  directorName?: string;
  layoutMode?: '8' | '6';
  settings?: Settings;
}

type LayoutMode = '8' | '6';

/**
 * IMPORTANT: these measurements intentionally preserve the original artwork
 * aspect ratio (854 x 642).  The previous implementation stretched the badge
 * to 98x65.5mm / 98x88mm, which moved the text away from the printed boxes.
 *
 * 8/page reproduces the approved standalone HTML: 86 x 64.6mm.
 * 6/page reproduces the approved distributed A4 model: 95 x 71.42mm.
 */
export const getDirectorPhone = (directorStr: string): string => {
  if (!directorStr) return '';
  const phoneMatch = directorStr.match(/(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/);
  if (phoneMatch) return phoneMatch[0];
  const parts = directorStr.split(/[;,]/);
  if (parts.length > 1 && /\d/.test(parts[1])) return parts[1].trim();
  return '';
};

export const getCleanDirectorName = (directorStr: string): string => {
  if (!directorStr) return '';
  const phone = getDirectorPhone(directorStr);
  if (!phone) return directorStr.trim();
  return directorStr.replace(phone, '').replace(/[;,-]\s*$/, '').replace(/^\s*[;,-]/, '').trim();
};

export const STUDENT_BADGE_LAYOUT: Record<LayoutMode, { widthMm: number; heightMm: number }> = {
  '8': { widthMm: 86, heightMm: 64.6 },
  '6': { widthMm: 95, heightMm: 71.42 },
};

const getFontSize = (val?: string, fallback?: string, scale = 1) => {
  const value = val || fallback;
  if (!value) return undefined;

  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(px|pt|mm|rem)$/i);
  if (!match || scale === 1) return value;

  const numeric = Number(match[1]);
  const unit = match[2];
  return `${(numeric * scale).toFixed(3).replace(/\.?0+$/, '')}${unit}`;
};

/**
 * Legacy database defaults were stored in px.  When they are still unchanged,
 * use the exact mm values from the standalone HTML that visually matches the
 * official badge.  User-customized values continue to be respected.
 */
const getValueFontSize = (
  configured: string | undefined,
  legacyDefault: string,
  approvedDefaultMm: string,
  scale: number,
) => {
  if (!configured || configured.trim() === legacyDefault) {
    return getFontSize(approvedDefaultMm, approvedDefaultMm, scale);
  }
  return getFontSize(configured, approvedDefaultMm, scale);
};

const displayOptionalValue = (value?: string) => {
  const normalizedValue = value?.trim();
  return !normalizedValue || normalizedValue === '-' ? 'NÃO INFORMADO' : normalizedValue;
};

const StudentPreviewCard: React.FC<StudentPreviewCardProps> = ({
  student,
  globalSchoolName,
  directorName,
  layoutMode = '8',
  settings = { logo_prefeitura_url: null, logo_expo_url: null },
}) => {
  const metrics = STUDENT_BADGE_LAYOUT[layoutMode];
  const scale = metrics.widthMm / STUDENT_BADGE_LAYOUT['8'].widthMm;
  const cardWidth = `${metrics.widthMm}mm`;
  const cardHeight = `${metrics.heightMm}mm`;

  if (!student) {
    return (
      <div
        style={{ width: cardWidth, height: cardHeight, boxSizing: 'border-box' }}
        className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-medium bg-white"
      >
        Adicione um aluno para visualizar
      </div>
    );
  }

  let contactsText = '';
  const directorPhone = getDirectorPhone(directorName || '');
  const phone1 = student.responsible_phone_1 || directorPhone || (student as any).contact1;
  const phone2 = student.responsible_phone_2 || (student as any).contact2;
  if (phone1) contactsText += phone1;
  if (phone2) {
    if (contactsText) contactsText += ' / ';
    contactsText += phone2;
  }

  const cleanDirector = getCleanDirectorName(directorName || '');
  const shouldShowDirector = settings?.show_diretor !== false && Boolean(cleanDirector);

  // Only cover an artwork label when the administrator actually customized it.
  const hasCustomLabelNome = Boolean(settings?.label_nome && settings.label_nome.trim() !== '' && settings.label_nome !== 'NOME COMPLETO:');
  const hasCustomLabelEscola = Boolean(settings?.label_escola && settings.label_escola.trim() !== '' && settings.label_escola !== 'ESCOLA:');
  const hasCustomLabelTurma = Boolean(settings?.label_turma && settings.label_turma.trim() !== '' && settings.label_turma !== 'TURMA:');
  const hasCustomLabelAlergia = Boolean(settings?.label_alergia && settings.label_alergia.trim() !== '' && settings.label_alergia !== 'ALERGIA:');
  const hasCustomLabelSangue = Boolean(settings?.label_sangue && settings.label_sangue.trim() !== '' && settings.label_sangue !== 'SANGUE:');
  const hasCustomLabelContato = Boolean(
    settings?.label_contato &&
      settings.label_contato.trim() !== '' &&
      settings.label_contato !== 'CONTATO DO RESPONSÁVEL:' &&
      settings.label_contato !== 'CONTATO DO RESPONSÁVEL PELA ESCOLA:'
  );
  const hasCustomLabelDiretor = Boolean(settings?.label_diretor && settings.label_diretor.trim() !== '' && settings.label_diretor !== 'DIRETOR(A) RESPONSÁVEL:');

  const hasCustomTitle1 = Boolean(settings?.label_title_1 && settings.label_title_1.trim() !== '' && settings.label_title_1 !== 'IDENTIFICAÇÃO');
  const hasCustomTitle2 = Boolean(settings?.label_title_2 && settings.label_title_2.trim() !== '' && settings.label_title_2 !== 'ALUNO');


  const fieldBase: React.CSSProperties = {
    position: 'absolute',
    zIndex: 20,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 700,
    padding: 0,
    margin: 0,
    lineHeight: 1,
    minWidth: 0,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    textAlign: 'left',
    transform: 'translateY(-50%)',
  };

  const labelBase: React.CSSProperties = {
    position: 'absolute',
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    background: '#ffffff',
    overflow: 'hidden',
  };

  const labelTextClass = 'font-extrabold tracking-wide leading-none uppercase truncate';

  return (
    <div
      data-badge-layout={layoutMode}
      style={{
        width: cardWidth,
        height: cardHeight,
        minWidth: cardWidth,
        minHeight: cardHeight,
        maxWidth: cardWidth,
        maxHeight: cardHeight,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="student-badge-card rounded-[4px] print:rounded-none relative overflow-hidden shrink-0 select-none shadow-md print:shadow-none bg-white"
    >
      {/* Exact clean artwork extracted from the only approved/aligned standalone HTML. */}
      <img
        src="/cracha-cinema.png?v=1"
        alt="Base do crachá de aluno"
        className="student-badge-bg pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          minWidth: '100%',
          minHeight: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'fill',
          zIndex: 0,
          display: 'block',
        }}
      />

      {hasCustomTitle1 && (
        <div style={{ ...labelBase, top: '3.8%', left: '25%', width: '50%', height: '7%' }} className="justify-center">
          <span
            style={{ color: settings?.color_title_1 || '#000000', fontSize: getFontSize(settings?.size_title_1, '11.5px', scale) }}
            className="font-black tracking-wider uppercase leading-none"
          >
            {settings?.label_title_1}
          </span>
        </div>
      )}

      {hasCustomTitle2 && (
        <div style={{ ...labelBase, top: '8.8%', left: '25%', width: '50%', height: '10%' }} className="justify-center">
          <span
            style={{ color: settings?.color_title_2 || '#000000', fontSize: getFontSize(settings?.size_title_2, '15.5px', scale) }}
            className="font-black tracking-wider uppercase leading-none"
          >
            {settings?.label_title_2}
          </span>
        </div>
      )}

      {settings?.logo_prefeitura_url && (
        <div style={{ top: '4%', left: '4%', width: '20%', height: '18%', position: 'absolute', zIndex: 10 }} className="flex items-center justify-center bg-white rounded-lg p-1">
          <img src={settings.logo_prefeitura_url} alt="Logo Prefeitura" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Custom label overlays are positioned against the original 854x642 artwork. */}
      {hasCustomLabelNome && (
        <div style={{ ...labelBase, top: '28.1%', left: '14.29%', width: '32%', height: '2.4%' }}>
          <span style={{ color: settings?.color_nome || '#0a2562', fontSize: getFontSize(settings?.size_nome, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_nome}
          </span>
        </div>
      )}
      {hasCustomLabelEscola && (
        <div style={{ ...labelBase, top: '37.3%', left: '14.29%', width: '32%', height: '2.4%' }}>
          <span style={{ color: settings?.color_escola || '#0a2562', fontSize: getFontSize(settings?.size_escola, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_escola}
          </span>
        </div>
      )}
      {hasCustomLabelTurma && (
        <div style={{ ...labelBase, top: '46.5%', left: '14.29%', width: '32%', height: '2.4%' }}>
          <span style={{ color: settings?.color_turma || '#0a2562', fontSize: getFontSize(settings?.size_turma, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_turma}
          </span>
        </div>
      )}
      {hasCustomLabelAlergia && (
        <div style={{ ...labelBase, top: '55.8%', left: '14.29%', width: '20%', height: '2.4%' }}>
          <span style={{ color: settings?.color_alergia || '#0a2562', fontSize: getFontSize(settings?.size_alergia, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_alergia}
          </span>
        </div>
      )}
      {hasCustomLabelSangue && (
        <div style={{ ...labelBase, top: '55.8%', left: '65.34%', width: '15%', height: '2.4%' }}>
          <span style={{ color: settings?.color_sangue || '#0a2562', fontSize: getFontSize(settings?.size_sangue, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_sangue}
          </span>
        </div>
      )}
      {hasCustomLabelContato && (
        <div style={{ ...labelBase, top: '65.4%', left: '14.29%', width: '49%', height: '2.4%' }}>
          <span style={{ color: settings?.color_contato || '#0a2562', fontSize: getFontSize(settings?.size_contato, '7.5px', scale) }} className={labelTextClass}>
            {settings?.label_contato}
          </span>
        </div>
      )}
      {hasCustomLabelDiretor && shouldShowDirector && (
        <div style={{ ...labelBase, top: '74.2%', left: '14.29%', width: '31%', height: '2.4%' }}>
          <span style={{ color: settings?.color_diretor || '#0a2562', fontSize: getFontSize(settings?.size_diretor, '7px', scale) }} className={labelTextClass}>
            {settings?.label_diretor}
          </span>
        </div>
      )}

      {/*
        Values: exact percentages copied from cracha_a4_8_unidades_editavel TOP TOP.html.
        Read-only inputs intentionally reproduce the browser text-box metrics that kept
        the data aligned in the approved standalone model.
      */}
      <input
        className="student-badge-field student-badge-field--nome"
        readOnly
        tabIndex={-1}
        value={student.full_name || ''}
        aria-label="Nome completo"
        style={{
          ...fieldBase,
          left: '10.3%', top: '38.1%', width: '61.5%', height: '3.4%',
          color: settings?.color_val_nome || '#000000',
          fontSize: getValueFontSize(settings?.size_val_nome, '10px', '2.35mm', scale),
        }}
      />

      <input
        className="student-badge-field student-badge-field--escola"
        readOnly
        tabIndex={-1}
        value={globalSchoolName || ''}
        aria-label="Escola"
        style={{
          ...fieldBase,
          left: '10.3%', top: '47.7%', width: '61.5%', height: '3.4%',
          color: settings?.color_val_escola || '#000000',
          fontSize: getValueFontSize(settings?.size_val_escola, '10px', '2.2mm', scale),
        }}
      />

      <input
        className="student-badge-field student-badge-field--turma"
        readOnly
        tabIndex={-1}
        value={student.class_name || ''}
        aria-label="Turma"
        style={{
          ...fieldBase,
          left: '10.3%', top: '57.4%', width: '58.5%', height: '3.4%',
          color: settings?.color_val_turma || '#000000',
          fontSize: getValueFontSize(settings?.size_val_turma, '10px', '2.2mm', scale),
        }}
      />

      <input
        className="student-badge-field student-badge-field--alergia"
        readOnly
        tabIndex={-1}
        value={displayOptionalValue(student.allergy)}
        aria-label="Alergia"
        style={{
          ...fieldBase,
          left: '10.3%', top: '67.0%', width: '23.5%', height: '3.4%',
          color: settings?.color_val_alergia || '#000000',
          fontSize: getValueFontSize(settings?.size_val_alergia, '10px', '2.1mm', scale),
        }}
      />

      <input
        className="student-badge-field student-badge-field--sangue"
        readOnly
        tabIndex={-1}
        value={displayOptionalValue(student.blood_type)}
        aria-label="Tipo sanguíneo"
        style={{
          ...fieldBase,
          left: '42.1%', top: '67.0%', width: '24.5%', height: '3.4%',
          textAlign: 'center',
          color: settings?.color_val_sangue || '#000000',
          fontSize: getValueFontSize(settings?.size_val_sangue, '10px', '2.1mm', scale),
        }}
      />

      <input
        className="student-badge-field student-badge-field--contato"
        readOnly
        tabIndex={-1}
        value={contactsText}
        aria-label="Contato do responsável"
        style={{
          ...fieldBase,
          left: '10.3%', top: '77.8%', width: '57%', height: '3.4%',
          color: settings?.color_val_contato || '#000000',
          fontSize: getValueFontSize(settings?.size_val_contato, '11px', '2mm', scale),
        }}
      />

      {shouldShowDirector && (
        <input
          className="student-badge-field student-badge-field--diretor"
          readOnly
          tabIndex={-1}
          value={cleanDirector || ''}
          aria-label="Diretor ou diretora responsável"
          style={{
            ...fieldBase,
            left: '10.3%', top: '87.0%', width: '57%', height: '3.4%',
            color: settings?.color_val_diretor || '#000000',
            fontSize: getValueFontSize(settings?.size_val_diretor, '9px', '1.92mm', scale),
          }}
        />
      )}
    </div>
  );
};

export default StudentPreviewCard;
