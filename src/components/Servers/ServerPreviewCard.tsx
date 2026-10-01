import React from 'react';
import type { Settings } from '../Students/StudentPreviewCard';

export interface Server {
  full_name?: string;
  role_name?: string;
  phone_1?: string;
  phone_2?: string;
  registration_number?: string;
}

interface ServerPreviewCardProps {
  server: Server | null;
  globalSchoolName: string;
  directorName?: string;
  layoutMode?: '8' | '6';
  settings?: Settings;
}

const getFontSize = (val?: string, fallback?: string) => {
  if (!val) return fallback;
  return val.endsWith('px') || val.endsWith('rem') || val.endsWith('pt') ? val : `${val}px`;
};

const ServerPreviewCard: React.FC<ServerPreviewCardProps> = ({ 
  server, 
  globalSchoolName,
  directorName,
  layoutMode = '8',
  settings = { logo_prefeitura_url: null, logo_expo_url: null }
}) => {
  const isLayout6 = layoutMode === '6';
  
  // Sizing in mm to guarantee correct scale in print and screen
  const cardWidth = '98mm';
  const cardHeight = '66mm';

  if (!server) {
    return (
      <div style={{ width: cardWidth, height: cardHeight, boxSizing: 'border-box' }} className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-medium bg-white">
        Adicione um servidor para visualizar
      </div>
    );
  }

  // Check if labels are explicitly customized by the user (different from base template defaults)
  const hasCustomLabelNome = Boolean(settings?.label_nome && settings.label_nome.trim() !== '' && settings.label_nome !== 'NOME COMPLETO:');
  const hasCustomLabelEscola = Boolean(settings?.label_escola && settings.label_escola.trim() !== '' && settings.label_escola !== 'ESCOLA:');
  const hasCustomLabelDiretor = Boolean(settings?.label_diretor && settings.label_diretor.trim() !== '' && settings.label_diretor !== 'DIRETOR(A) RESPONSÁVEL:');
  
  const title2Top = '8.8%';
  const title2Height = '10.0%';

  const nomeValTop = '29.0%';
  const nomeValHeight = '4.2%';

  const escolaValTop = '38.2%';
  const escolaValHeight = '4.2%';

  const cargoValTop = '47.4%';
  const cargoValHeight = '4.2%';

  const matriculaValTop = '65.6%';
  const matriculaValHeight = '4.2%';

  const diretorValTop = '74.8%';
  const diretorValHeight = '4.2%';

  const shouldShowDirector = (settings?.show_diretor !== false) && Boolean(directorName);

  return (
    <div 
      style={{ 
        width: cardWidth, 
        height: cardHeight, 
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }} 
      className="rounded-[4px] print:rounded-none relative overflow-hidden shrink-0 select-none shadow-md print:shadow-none font-sans bg-white"
    >
      {/* Pristine Official Base Image (cracha_base_perfect.png) */}
      <img 
        src="/cracha_base_perfect.png?v=8" 
        alt="Base Cracha" 
        style={{ width: '100%', height: '100%', objectFit: 'fill', position: 'absolute', top: 0, left: 0 }}
        className="pointer-events-none z-0" 
      />

      {/* Header Title SERVIDOR Patch */}
      <div style={{ top: title2Top, left: '25.0%', width: '50%', height: title2Height, position: 'absolute', zIndex: 10 }} className="flex items-center justify-center">
        <span 
          style={{ 
            color: settings?.color_title_2 || '#000000', 
            fontSize: getFontSize(settings?.size_title_2, isLayout6 ? '21px' : '15.5px') 
          }} 
          className="font-black tracking-tight text-black uppercase leading-none"
        >
          {settings?.label_title_2 || 'SERVIDOR'}
        </span>
      </div>

      {/* Label patch for CARGO / FUNÇÃO on Box 3 */}
      <div style={{ top: '44.4%', left: '14.5%', width: '28%', height: '2.4%', position: 'absolute', zIndex: 10 }} className="bg-white flex items-center">
        <span className="font-extrabold text-[#0a2562] uppercase text-[6.5px] sm:text-[7.5px] tracking-wide leading-none">
          {settings?.label_cargo || 'CARGO / FUNÇÃO:'}
        </span>
      </div>

      {/* Label patch for MATRÍCULA on Box 5 */}
      <div style={{ top: '62.6%', left: '14.5%', width: '40%', height: '2.4%', position: 'absolute', zIndex: 10 }} className="bg-white flex items-center">
        <span className="font-extrabold text-[#0a2562] uppercase text-[6.5px] sm:text-[7.5px] tracking-wide leading-none">
          {settings?.label_matricula || 'MATRÍCULA:'}
        </span>
      </div>

      {/* Box 1: NOME COMPLETO */}
      {hasCustomLabelNome && (
        <div style={{ top: '26.0%', left: '14.5%', width: '32%', height: '2.4%', position: 'absolute', zIndex: 15 }} className="flex items-center bg-white">
          <span 
            style={{ 
              color: settings?.color_nome || '#0a2562', 
              fontSize: getFontSize(settings?.size_nome, '7.5px') 
            }} 
            className="font-extrabold text-[#0a2562] tracking-wide leading-none uppercase truncate"
          >
            {settings?.label_nome}
          </span>
        </div>
      )}
      <div style={{ top: nomeValTop, left: '14.5%', width: '78%', height: nomeValHeight, position: 'absolute', zIndex: 20 }} className="flex items-center min-w-0 overflow-hidden">
        <span 
          style={{ 
            color: (settings?.color_val_nome && settings.color_val_nome !== '#ffffff') ? settings.color_val_nome : '#000000', 
            fontSize: getFontSize(settings?.size_val_nome, isLayout6 ? '13.5px' : '10.5px') 
          }} 
          className="font-black text-black tracking-tight truncate leading-none block w-full"
        >
          {server.full_name || ''}
        </span>
      </div>

      {/* Box 2: ESCOLA */}
      {hasCustomLabelEscola && (
        <div style={{ top: '35.2%', left: '14.5%', width: '32%', height: '2.4%', position: 'absolute', zIndex: 15 }} className="flex items-center bg-white">
          <span 
            style={{ 
              color: settings?.color_escola || '#0a2562', 
              fontSize: getFontSize(settings?.size_escola, '7.5px') 
            }} 
            className="font-extrabold text-[#0a2562] tracking-wide leading-none uppercase truncate"
          >
            {settings?.label_escola}
          </span>
        </div>
      )}
      <div style={{ top: escolaValTop, left: '14.5%', width: '78%', height: escolaValHeight, position: 'absolute', zIndex: 20 }} className="flex items-center min-w-0 overflow-hidden">
        <span 
          style={{ 
            color: (settings?.color_val_escola && settings.color_val_escola !== '#ffffff') ? settings.color_val_escola : '#000000', 
            fontSize: getFontSize(settings?.size_val_escola, isLayout6 ? '13.0px' : '10.0px') 
          }} 
          className="font-black text-black tracking-tight truncate leading-none block w-full"
        >
          {globalSchoolName || ''}
        </span>
      </div>

      {/* Box 3: CARGO / FUNÇÃO Value */}
      <div style={{ top: cargoValTop, left: '14.5%', width: '78%', height: cargoValHeight, position: 'absolute', zIndex: 20 }} className="flex items-center min-w-0 overflow-hidden">
        <span 
          style={{ 
            color: (settings?.color_val_cargo || settings?.color_val_turma) && (settings?.color_val_cargo !== '#ffffff' && settings?.color_val_turma !== '#ffffff') ? (settings.color_val_cargo || settings.color_val_turma) : '#000000', 
            fontSize: getFontSize(settings?.size_val_cargo || settings?.size_val_turma, isLayout6 ? '13.0px' : '10.0px') 
          }} 
          className="font-black text-black tracking-tight truncate leading-none block w-full"
        >
          {server.role_name || ''}
        </span>
      </div>

      {/* Box 4: MATRÍCULA Value */}
      <div style={{ top: matriculaValTop, left: '14.5%', width: '78%', height: matriculaValHeight, position: 'absolute', zIndex: 20 }} className="flex items-center min-w-0 overflow-hidden">
        <span 
          style={{ 
            color: (settings?.color_val_matricula || settings?.color_val_contato) && (settings?.color_val_matricula !== '#ffffff' && settings?.color_val_contato !== '#ffffff') ? (settings.color_val_matricula || settings.color_val_contato) : '#000000', 
            fontSize: getFontSize(settings?.size_val_matricula || settings?.size_val_contato, isLayout6 ? '12.0px' : '9.5px') 
          }} 
          className="font-black text-black tracking-tight truncate leading-none block w-full"
        >
          {server.registration_number || ''}
        </span>
      </div>

      {/* Box 5: DIRETOR(A) RESPONSÁVEL */}
      {shouldShowDirector && (
        <>
          {hasCustomLabelDiretor && (
            <div style={{ top: '71.8%', left: '14.5%', width: '31%', height: '2.4%', position: 'absolute', zIndex: 15 }} className="flex items-center bg-white">
              <span 
                style={{ 
                  color: settings?.color_diretor || '#0a2562', 
                  fontSize: getFontSize(settings?.size_diretor, '7.0px') 
                }} 
                className="font-extrabold text-[#0a2562] tracking-wide leading-none uppercase truncate"
              >
                {settings?.label_diretor}
              </span>
            </div>
          )}
          <div style={{ top: diretorValTop, left: '14.5%', width: '31%', height: diretorValHeight, position: 'absolute', zIndex: 20 }} className="flex items-center min-w-0 overflow-hidden">
            <span 
              style={{ 
                color: (settings?.color_val_diretor && settings.color_val_diretor !== '#ffffff') ? settings.color_val_diretor : '#000000', 
                fontSize: getFontSize(settings?.size_val_diretor, isLayout6 ? '11.5px' : '9.0px') 
              }} 
              className="font-black text-black tracking-tight truncate leading-none block w-full"
            >
              {directorName}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ServerPreviewCard;
