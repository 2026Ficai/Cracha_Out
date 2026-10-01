import os

with open('src/pages/ManualStudentsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useMemo
content = content.replace(
    "import React, { useState, useEffect, useRef } from 'react';",
    "import React, { useState, useEffect, useRef, useMemo } from 'react';"
)

# Find the start of the return statement
return_start = content.find('  return (')

new_jsx = """
  const currentStep = useMemo(() => {
    if (!globalSchoolId) return 1;
    const validCount = students.filter(s => s.full_name.trim()).length;
    const pendingCount = students.filter(s => s.full_name.trim() === '' && (s.class_name || s.responsible_phone_1)).length;
    if (validCount === 0 && pendingCount === 0) return 2;
    if (pendingCount > 0) return 3;
    if (validCount > 0 && pendingCount === 0) return 4;
    return 2;
  }, [globalSchoolId, students]);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body, #root, main {
             height: auto !important;
             min-height: 100% !important;
             overflow: visible !important;
          }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 210mm;
            background: white;
          }
          .print-page {
             width: 210mm;
             height: 297mm;
             box-sizing: border-box;
             padding-top: 10mm;
             padding-left: 5mm;
             padding-right: 5mm;
             display: grid;
             grid-template-columns: 95mm 95mm;
             grid-template-rows: ${printLayout === '8' ? 'repeat(4, 66mm)' : 'repeat(3, 88mm)'};
             column-gap: 10mm;
             row-gap: ${printLayout === '8' ? '5mm' : '15mm'};
             justify-content: center;
             page-break-after: always;
             break-after: page;
          }
          .badge-print-wrapper {
             width: 95mm;
             height: ${printLayout === '8' ? '66mm' : '88mm'};
             break-inside: avoid;
             page-break-inside: avoid;
          }
          .badge-print-wrapper > div {
             transform: none !important;
             margin: 0 !important;
          }
        }
      `}</style>
      
      <div id="print-area" className="hidden print:block">
        {chunkedStudents.map((chunk, pageIndex) => (
          <div key={pageIndex} className="print-page">
            {chunk.map(s => (
              <div key={s._ui_id} className="badge-print-wrapper">
                 <StudentPreviewCard student={s} globalSchoolName={globalSchoolName} layoutMode={printLayout} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col bg-slate-50 relative pb-32 print:hidden">

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
              <Link to="/students" className="text-brand-blue-600 text-sm font-bold flex items-center gap-1 mb-2 hover:underline">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para Gerador de Crachás
              </Link>
              <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight flex items-center gap-3">
                  <Users className="w-8 h-8 text-brand-blue-500" />
                  Adicionar Alunos
                  <button onClick={() => setIsTourOpen(true)} className="bg-brand-blue-50 text-brand-blue-600 hover:bg-brand-blue-100 p-1.5 rounded-full transition-colors flex items-center justify-center" title="Tour pelo Sistema">
                      <HelpCircle className="w-5 h-5" />
                  </button>
              </h2>
              <p className="text-slate-500 text-sm mt-1.5">Inclua alunos colando dados do Excel ou cadastrando manualmente.</p>
          </div>
      </div>

      {/* Stepper */}
      <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl relative">
              <div className="absolute left-0 top-5 w-full h-0.5 bg-slate-200 -z-10"></div>
              
              {[ 
                { num: 1, title: 'Escola', desc: 'Selecione a escola' },
                { num: 2, title: 'Inserir dados', desc: 'Cole ou digite os dados' },
                { num: 3, title: 'Revisar', desc: 'Confira pendências e salve' },
                { num: 4, title: 'Gerar crachás', desc: 'Visualize e imprima' }
              ].map(step => (
                <div key={step.num} className="flex flex-col items-center bg-slate-50 px-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep === step.num ? 'bg-brand-blue-600 text-white border-brand-blue-600' : currentStep > step.num ? 'bg-brand-blue-100 text-brand-blue-600 border-brand-blue-600' : 'bg-white text-slate-400 border-slate-300'}`}>
                        {currentStep > step.num ? <Check className="w-5 h-5" /> : step.num}
                    </div>
                    <div className="text-center mt-3">
                        <div className={`text-sm font-bold ${currentStep === step.num ? 'text-navy-900' : 'text-slate-600'}`}>{step.title}</div>
                        <div className="text-xs text-slate-400 hidden sm:block">{step.desc}</div>
                    </div>
                </div>
              ))}
          </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Column */}
        <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col gap-6">
            
            {/* Escola Global Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-blue-500 flex items-center justify-center shrink-0">
                        <UserSquare2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Escola Selecionada</div>
                        <div className="text-sm font-bold text-navy-900">{globalSchoolName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Escola global</div>
                    </div>
                </div>
                
                <div className="flex flex-col sm:items-end gap-2">
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-100">
                        <Check className="w-3.5 h-3.5" />
                        <span>{validStudents.length} alunos em edição</span>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">Alterar:</span>
                          <select 
                            value={adminSelectedSchoolId} 
                            onChange={e => setAdminSelectedSchoolId(e.target.value)}
                            className="border border-slate-300 rounded text-xs px-2 py-1 bg-slate-50 text-navy-900 font-semibold outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500"
                          >
                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Insertion Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white">
                  <h3 className="text-base font-bold text-navy-900">2. Inserir dados dos alunos</h3>
              </div>
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button 
                  onClick={() => setActiveTab('paste')}
                  className={`tour-excel-tab flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'paste' ? 'border-b-brand-blue-600 text-brand-blue-600 bg-white' : 'border-b-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <div className="text-left leading-tight">
                    <div>Colar do Excel</div>
                    <div className="text-[10px] font-normal text-slate-400 hidden sm:block">Cole as linhas copiadas do Excel</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={`tour-manual-tab flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'manual' ? 'border-b-brand-blue-600 text-brand-blue-600 bg-white' : 'border-b-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                  <UserSquare2 className="w-4 h-4" />
                  <div className="text-left leading-tight">
                    <div>Cadastrar manualmente</div>
                    <div className="text-[10px] font-normal text-slate-400 hidden sm:block">Digite os dados linha por linha</div>
                  </div>
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'paste' ? (
                  <div className="flex flex-col gap-6">
                      <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-4 flex flex-col relative focus-within:border-brand-blue-500 focus-within:bg-brand-blue-50/30 transition-colors">
                          <div className={`absolute top-8 left-0 w-full flex flex-col items-center justify-center pointer-events-none transition-opacity ${importText ? 'opacity-0' : 'opacity-100'}`}>
                              <ClipboardPaste className="w-8 h-8 text-brand-blue-400 mb-2" />
                              <div className="font-bold text-navy-900">Cole aqui as linhas copiadas do Excel</div>
                              <div className="text-xs text-slate-500">Inclua o cabeçalho com os nomes das colunas.</div>
                          </div>
                          <textarea 
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            className="w-full h-40 bg-transparent resize-none outline-none relative z-10 text-sm font-mono text-slate-700"
                            placeholder=""
                          ></textarea>
                          
                          <div className="mt-4 pt-4 border-t border-slate-200/60 relative z-10">
                              <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Colunas aceitas:</div>
                              <div className="flex flex-wrap gap-2">
                                  <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-semibold shadow-sm">Nome do estudante</span>
                                  <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-semibold shadow-sm">Turma</span>
                                  <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-semibold shadow-sm">Contato Resp. 1</span>
                                  <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-semibold shadow-sm">Contato Resp. 2</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            onClick={() => processPastedData(importText)}
                            className="flex-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-md"
                          >
                              <ClipboardPaste className="w-4 h-4" /> Processar colagem
                          </button>
                          
                          <input 
                            type="file" 
                            accept=".xlsx,.xls" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="tour-import-btn flex-1 bg-white hover:bg-slate-50 border border-brand-blue-200 text-brand-blue-600 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
                          >
                              <Upload className="w-4 h-4" /> Importar planilha (.xlsx)
                          </button>
                      </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider text-slate-500">
                              <div className="col-span-5">Nome do estudante</div>
                              <div className="col-span-2">Turma</div>
                              <div className="col-span-2">Contato 1</div>
                              <div className="col-span-2">Contato 2</div>
                              <div className="col-span-1 text-center">Ação</div>
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-2">
                              {students.map((student, index) => (
                                <div key={student._ui_id} className="grid grid-cols-12 gap-2 items-center group">
                                    <div className="col-span-5">
                                        <input 
                                          type="text" 
                                          placeholder="Nome completo..."
                                          value={student.full_name}
                                          onChange={e => handleUpdate(index, 'full_name', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-500" 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                          type="text" 
                                          placeholder="Turma"
                                          value={student.class_name}
                                          onChange={e => handleUpdate(index, 'class_name', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-500" 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                          type="text" 
                                          placeholder="(00) 0000-0000"
                                          value={student.responsible_phone_1}
                                          onChange={e => handleUpdate(index, 'responsible_phone_1', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-500" 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                          type="text" 
                                          placeholder="(00) 0000-0000"
                                          value={student.responsible_phone_2}
                                          onChange={e => handleUpdate(index, 'responsible_phone_2', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-500" 
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
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
                      
                      <div className="mt-4 flex justify-start">
                          <button 
                            onClick={addRow}
                            className="flex items-center gap-2 text-brand-blue-600 hover:text-brand-blue-700 font-bold text-sm bg-brand-blue-50 hover:bg-brand-blue-100 px-4 py-2 rounded-lg transition"
                          >
                              <Plus className="w-4 h-4" /> Adicionar aluno
                          </button>
                      </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import Summary */}
            <div className="">
                <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Resumo da importação</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-blue-500 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-navy-900 leading-none">{students.length}</span>
                                <span className="text-xs font-bold text-slate-600">Linhas</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Preenchidas</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${pendingStudents.length > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-navy-900 leading-none">{pendingStudents.length}</span>
                                <span className="text-xs font-bold text-slate-600">Pendências</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Campos vazios</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-navy-900 leading-none">{validStudents.length}</span>
                                <span className="text-xs font-bold text-slate-600">Prontos</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Dados completos</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Como Funciona Card */}
            <div className="bg-blue-50/50 rounded-2xl border border-brand-blue-100 shadow-sm p-6 mt-4">
                <h3 className="font-bold text-navy-900 mb-6">Como funciona? Siga em 3 passos simples</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    <div className="hidden md:block absolute top-6 left-1/6 right-1/6 h-0.5 bg-brand-blue-100 z-0"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center group">
                        <div className="w-12 h-12 rounded-full bg-white border border-brand-blue-100 text-brand-blue-500 flex items-center justify-center font-black text-lg mb-3 shadow-sm group-hover:bg-brand-blue-500 group-hover:text-white transition-colors">1</div>
                        <h4 className="font-bold text-sm text-navy-900 mb-1">Escolher escola</h4>
                        <p className="text-xs text-slate-500 max-w-[180px]">Selecione a escola global que será aplicada aos alunos.</p>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center group">
                        <div className="w-12 h-12 rounded-full bg-white border border-brand-blue-100 text-brand-blue-500 flex items-center justify-center font-black text-lg mb-3 shadow-sm group-hover:bg-brand-blue-500 group-hover:text-white transition-colors">2</div>
                        <h4 className="font-bold text-sm text-navy-900 mb-1">Inserir dados</h4>
                        <p className="text-xs text-slate-500 max-w-[180px]">Cole do Excel ou cadastre manualmente os alunos.</p>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center group">
                        <div className="w-12 h-12 rounded-full bg-white border border-brand-blue-100 text-brand-blue-500 flex items-center justify-center font-black text-lg mb-3 shadow-sm group-hover:bg-brand-blue-500 group-hover:text-white transition-colors">3</div>
                        <h4 className="font-bold text-sm text-navy-900 mb-1">Revisar e salvar</h4>
                        <p className="text-xs text-slate-500 max-w-[180px]">Confira pendências e salve para gerar os crachás.</p>
                    </div>
                </div>
            </div>

        </div>

        {/* Middle Column - Dicas */}
        <div className="col-span-1 lg:col-span-5 xl:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                <h4 className="font-bold text-navy-900 flex items-center gap-2 mb-4 text-sm">
                    <AlertTriangle className="w-4 h-4 text-emerald-500" />
                    Dicas rápidas
                </h4>
                <ul className="space-y-4 text-[13px] text-slate-600 mb-6">
                    <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Copie os dados do Excel (incluindo o cabeçalho).</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Cole diretamente na área ao lado.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Confira os resultados e clique em "Salvar".</span>
                    </li>
                </ul>
                <div className="mt-auto pt-4 border-t border-slate-100">
                    <button 
                      onClick={downloadExampleTemplate}
                      className="text-brand-blue-600 text-xs font-bold hover:underline flex items-center gap-1.5"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Ver exemplo de planilha &rarr;
                    </button>
                </div>
            </div>
        </div>

        {/* Right Column - Preview */}
        <div className="col-span-1 lg:col-span-12 xl:col-span-4">
            <div className="sticky top-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                <div className="mb-6">
                    <h3 className="font-bold text-navy-900 text-base">Visualização do Crachá</h3>
                    <p className="text-xs text-slate-500 mt-1">Veja como o crachá será impresso.</p>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6 shadow-inner min-h-[350px]">
                    {previewStudent && previewStudent.full_name ? (
                        <div className="origin-center scale-[0.85] md:scale-[0.9] lg:scale-[0.85] xl:scale-100 transition-transform">
                            <StudentPreviewCard 
                              student={previewStudent} 
                              globalSchoolName={globalSchoolName} 
                              layoutMode={printLayout}
                            />
                        </div>
                    ) : (
                        <div className="text-center flex flex-col items-center opacity-50">
                            <UserSquare2 className="w-12 h-12 text-slate-400 mb-3" />
                            <p className="text-sm font-semibold text-slate-500">Adicione um aluno para visualizar</p>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50/80 rounded-xl border border-blue-100 p-4 flex gap-3 text-sm">
                    <Info className="w-5 h-5 text-brand-blue-500 shrink-0 mt-0.5" />
                    <p className="text-slate-600 text-xs leading-relaxed">A visualização usa os dados da primeira linha. Revise os dados para ver o crachá atualizado.</p>
                </div>
            </div>
        </div>

      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 left-0 md:left-[260px] right-0 bg-white border-t border-slate-200 shadow-[0_-10px_30px_-10px_rgb(0,0,0,0.1)] p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40 px-6">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <Save className="w-3.5 h-3.5" /> Seu progresso é salvo automaticamente.
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
              <button 
                onClick={handleCancel}
                className="px-4 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition flex items-center gap-2 border border-transparent"
              >
                  <X className="w-4 h-4" /> <span className="hidden xl:inline">Cancelar</span>
              </button>
              
              <button 
                onClick={handleDraftSave}
                className="tour-draft-save px-4 py-2.5 border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                  <Save className="w-4 h-4 text-slate-400" /> <span className="hidden xl:inline">Salvar rascunho</span>
              </button>
              
              <button 
                onClick={generatePDF}
                disabled={isPrinting}
                className="tour-print px-4 py-2.5 border border-slate-300 bg-white text-navy-900 font-bold text-sm hover:bg-slate-50 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                  <Printer className="w-4 h-4 text-slate-500" /> {isPrinting ? 'Gerando...' : 'Imprimir PDF'}
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 border border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700 font-bold text-sm hover:bg-brand-blue-100 rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                  <Upload className="w-4 h-4" /> <span className="hidden xl:inline">Importar (.xlsx)</span>
              </button>

              <button 
                onClick={handleSaveAndReturn}
                disabled={isSaving}
                className="tour-save-return px-6 py-2.5 bg-navy-950 text-white font-bold text-sm rounded-lg hover:bg-navy-900 transition flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                  <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar e voltar'}
              </button>
          </div>
      </div>

    </div>

    <Joyride
      steps={tourSteps}
      run={isTourOpen}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleTourCallback}
      locale={{
        last: 'Finalizar',
        next: 'Próximo',
        back: 'Anterior',
        skip: 'Pular'
      }}
    />

    </>
  );
}
"""

content = content[:return_start] + new_jsx

with open('src/pages/ManualStudentsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
