import type { TooltipRenderProps } from 'react-joyride';
import { X, ChevronLeft, ChevronRight, Save, Upload, Edit, Printer, Database, Layout } from 'lucide-react';

export const CustomTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
  skipProps
}: TooltipRenderProps) => {
  // Select icon based on step target to make it look premium
  const renderIcon = () => {
    const target = step.target as string;
    if (target.includes('draft-save')) return <Save className="w-6 h-6 text-cyan-600" />;
    if (target.includes('excel') || target.includes('import')) return <Upload className="w-6 h-6 text-cyan-600" />;
    if (target.includes('manual')) return <Edit className="w-6 h-6 text-cyan-600" />;
    if (target.includes('print')) return <Printer className="w-6 h-6 text-cyan-600" />;
    if (target.includes('load-db')) return <Database className="w-6 h-6 text-cyan-600" />;
    if (target.includes('layout')) return <Layout className="w-6 h-6 text-cyan-600" />;
    return <Save className="w-6 h-6 text-cyan-600" />; // fallback
  };

  return (
    <div 
      {...tooltipProps} 
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] w-[340px] max-w-[90vw] overflow-hidden border border-white/50 animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 flex items-center justify-center shrink-0 shadow-inner">
            {renderIcon()}
          </div>
          {/* O step.title pode ser usado se passarmos title no steps array, mas o usuário pediu um layout limpo */}
        </div>
        <button 
          {...closeProps} 
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <div className="text-slate-600 text-[14px] leading-relaxed">
          {step.content}
        </div>
      </div>

      {/* Progress & Controls */}
      <div className="px-5 pb-5 pt-2 flex flex-col gap-4">
        
        {/* Progress indicators */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Passo {index + 1} de {size}
          </span>
          <div className="flex gap-1.5 flex-1">
            {Array.from({ length: size }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-cyan-500' : 
                  i < index ? 'w-2 bg-cyan-200' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-1">
          {index > 0 ? (
            <button 
              {...backProps} 
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          ) : (
            <div /> // Spacer if no back button
          )}

          <button 
            {...primaryProps} 
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            {isLastStep ? 'Finalizar' : 'Próximo'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Skip button */}
        {!isLastStep && (
          <div className="text-center mt-1">
            <button 
              {...skipProps}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
            >
              Pular tour
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
