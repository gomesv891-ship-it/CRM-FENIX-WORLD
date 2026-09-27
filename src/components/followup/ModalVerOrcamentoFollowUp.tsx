import React, { useState } from 'react';
import {
  ChevronLeft,
  X,
  Copy,
  Download,
  Phone,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SavedOrcamento, FollowUpItem } from '../../types';
import { EspelhoOrcamento } from '../EspelhoOrcamento';
import { getOrcamentoExportFileName } from '../../utils/orcamentoFileName';
import {
  getOrcamentoMessageTemplate,
  formatOrcamentoMessage,
} from '../../utils/configOrcamentoEMetas';

interface ModalVerOrcamentoFollowUpProps {
  followUp: FollowUpItem;
  clientBudgets: SavedOrcamento[];
  selectedOrcamento: SavedOrcamento;
  onSelectOrcamento: (orc: SavedOrcamento) => void;
  onNavigateToOrcamento?: (orc: SavedOrcamento, mode?: 'view' | 'edit') => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ModalVerOrcamentoFollowUp: React.FC<ModalVerOrcamentoFollowUpProps> = ({
  followUp,
  clientBudgets,
  selectedOrcamento,
  onSelectOrcamento,
  onNavigateToOrcamento,
  onClose,
  showToast,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Formatação de Moeda
  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // 1. Download do PDF Oficial
  const handleDownloadPdf = async () => {
    const element =
      document.getElementById('espelho-oficial-orcamento') ||
      document.getElementById('espelho-followup-modal');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Gerando PDF oficial do orçamento...');

      let imgData = '';
      let elementWidth = Math.max(element.scrollWidth, element.offsetWidth, 1040);
      let elementHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

      try {
        imgData = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          width: elementWidth,
          height: elementHeight,
          canvasWidth: elementWidth * 2,
          canvasHeight: elementHeight * 2,
          style: {
            margin: '0',
            transform: 'none',
            width: `${elementWidth}px`,
            minWidth: `${elementWidth}px`,
            maxWidth: 'none',
            overflow: 'visible',
          },
        });
      } catch (errToPng) {
        console.warn('toPng falhou no PDF, usando fallback html2canvas...', errToPng);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: elementWidth,
          height: elementHeight,
        });
        imgData = canvas.toDataURL('image/png');
        elementWidth = canvas.width;
        elementHeight = canvas.height;
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const imgWidthMm = elementWidth * 0.264583;
      const imgHeightMm = elementHeight * 0.264583;
      const scale = Math.min(availableWidth / imgWidthMm, availableHeight / imgHeightMm);

      const renderWidth = imgWidthMm * scale;
      const renderHeight = imgHeightMm * scale;

      const posX = margin + (availableWidth - renderWidth) / 2;
      const posY = margin + (availableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

      const filename = getOrcamentoExportFileName(selectedOrcamento.clientName, selectedOrcamento.dataOrcamento, 'pdf');
      pdf.save(filename);

      showToast('✓ PDF oficial gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showToast('Erro ao exportar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Download da Imagem em alta resolução (PNG)
  const handleDownloadImage = async () => {
    const element =
      document.getElementById('espelho-oficial-orcamento') ||
      document.getElementById('espelho-followup-modal');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Gerando imagem em alta resolução...');

      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1040);
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

      let dataUrl = '';
      try {
        dataUrl = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          width: fullWidth,
          height: fullHeight,
          canvasWidth: fullWidth * 2,
          canvasHeight: fullHeight * 2,
          style: {
            margin: '0',
            transform: 'none',
            width: `${fullWidth}px`,
            minWidth: `${fullWidth}px`,
            maxWidth: 'none',
            overflow: 'visible',
          },
        });
      } catch (errToPng) {
        console.warn('toPng falhou na imagem, usando fallback html2canvas...', errToPng);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: fullWidth,
          height: fullHeight,
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const filename = getOrcamentoExportFileName(selectedOrcamento.clientName, selectedOrcamento.dataOrcamento, 'png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('✓ Imagem PNG baixada com sucesso!');
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      showToast('Erro ao exportar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Copiar Imagem para o WhatsApp (Ctrl+V)
  const handleCopyImage = async () => {
    const element =
      document.getElementById('espelho-oficial-orcamento') ||
      document.getElementById('espelho-followup-modal');
    if (!element) {
      showToast('Espelho do orçamento não encontrado.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Copiando imagem do espelho...');

      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1040);
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

      let blob: Blob | null = null;
      try {
        const dataUrl = await toPng(element, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          width: fullWidth,
          height: fullHeight,
          canvasWidth: fullWidth * 2,
          canvasHeight: fullHeight * 2,
          style: {
            margin: '0px',
            padding: '0px',
            transform: 'none',
            width: `${fullWidth}px`,
            minWidth: `${fullWidth}px`,
            maxWidth: 'none',
            overflow: 'visible',
          },
        });
        const res = await fetch(dataUrl);
        blob = await res.blob();
      } catch (errCanvas) {
        console.warn('toPng falhou, tentando fallback html2canvas...', errCanvas);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: fullWidth,
          height: fullHeight,
        });
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      }

      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showToast('✓ Imagem copiada! Pressione Ctrl+V no WhatsApp para enviar.');
      } else {
        throw new Error('Clipboard API não suportada');
      }
    } catch (err) {
      console.error('Erro ao copiar imagem:', err);
      handleDownloadImage();
      showToast('Cópia direta não suportada. A imagem foi baixada automaticamente!');
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Compartilhar via WhatsApp
  const handleSendWhatsApp = () => {
    const phone = (selectedOrcamento.clientContact || followUp.telefone || '').replace(/\D/g, '');
    const template = getOrcamentoMessageTemplate(selectedOrcamento.clientType || followUp.clientType);
    const message = formatOrcamentoMessage(template, {
      clientName: selectedOrcamento.clientName,
      consultoraName: selectedOrcamento.consultoraName || followUp.vendedor || 'Consultora Fênix',
      numeroOrcamento: selectedOrcamento.nomeOrcamento || followUp.pedido,
      totalFinal: selectedOrcamento.totalFinal,
      items: selectedOrcamento.items,
    });

    const encoded = encodeURIComponent(message);
    const waUrl = phone
      ? `https://wa.me/55${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // 5. Ir para o Orçamento original (módulo Orçamentos)
  const handleGoToOrcamento = () => {
    sessionStorage.setItem('fenix_target_orcamento_id', selectedOrcamento.id);
    sessionStorage.setItem('fenix_target_orcamento_action', 'view_espelho');
    onClose();
    if (onNavigateToOrcamento) {
      onNavigateToOrcamento(selectedOrcamento, 'view');
    } else {
      window.dispatchEvent(
        new CustomEvent('fenix_navigate_tab', {
          detail: { tab: 'Orçamentos', orcamento: selectedOrcamento, mode: 'view' },
        })
      );
    }
  };

  // 6. Editar Orçamento original (módulo Orçamentos)
  const handleEditOrcamento = () => {
    sessionStorage.setItem('fenix_target_orcamento_id', selectedOrcamento.id);
    sessionStorage.setItem('fenix_target_orcamento_action', 'edit');
    onClose();
    if (onNavigateToOrcamento) {
      onNavigateToOrcamento(selectedOrcamento, 'edit');
    } else {
      window.dispatchEvent(
        new CustomEvent('fenix_navigate_tab', {
          detail: { tab: 'Orçamentos', orcamento: selectedOrcamento, mode: 'edit' },
        })
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start py-6 px-3 sm:px-6 modal-print-container animate-in fade-in duration-200">
      {/* Action Header Bar (Hidden in Print) */}
      <div className="w-full max-w-[1080px] flex items-center justify-between gap-4 mb-4 no-print bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar para o Follow-up</span>
          </button>
          <div className="hidden sm:block border-l border-slate-200 pl-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Espelho Oficial
            </span>
            <span className="text-sm font-bold text-slate-800 line-clamp-1">
              {selectedOrcamento.nomeOrcamento || followUp.produto || 'Orçamento de Materiais'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Copiar Imagem para WhatsApp */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Copiar imagem para colar no WhatsApp (Ctrl+V)"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0052cc]" />
            ) : (
              <Copy className="w-4 h-4 text-[#0052cc]" />
            )}
            <span>Copiar Imagem</span>
          </button>

          {/* Baixar Imagem */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Baixar como imagem PNG em alta resolução"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Baixar Imagem</span>
          </button>

          {/* Salvar em PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Salvar Orçamento em formato PDF oficial"
          >
            <FileText className="w-4 h-4" />
            <span>Salvar em PDF</span>
          </button>

          {/* Enviar WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="h-9 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Enviar mensagem e link no WhatsApp do cliente"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Ir para o Orçamento */}
          <button
            type="button"
            onClick={handleGoToOrcamento}
            className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-[#0052cc] font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Abrir orçamento original no módulo Orçamentos"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden md:inline">Ver na Aba</span>
          </button>

          {/* Editar Orçamento */}
          <button
            type="button"
            onClick={handleEditOrcamento}
            className="h-9 px-3 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Editar Orçamento: incluir, remover produtos ou mudar preços"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden md:inline">Editar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dica Interativa de Cópia / WhatsApp */}
      <div className="w-full max-w-[1080px] no-print flex items-center justify-between bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-2.5 mb-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0052cc] flex-shrink-0" />
          <span>
            <strong>Dica rápida:</strong> Clique diretamente sobre o espelho abaixo para <strong>copiar a imagem</strong> e colar (Ctrl+V) no WhatsApp!
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyImage}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0052cc] text-white hover:bg-blue-700 font-semibold transition-colors cursor-pointer text-xs flex-shrink-0"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copiar Imagem</span>
        </button>
      </div>

      {/* Dedicated Espelho Rendering Wrapper (Scrollable se a tela for menor que 1040px) */}
      <div className="w-full max-w-[1080px] overflow-x-auto pb-6 flex justify-center no-scrollbar sm:custom-scrollbar">
        <div
          onClick={handleCopyImage}
          className="w-fit min-w-[960px] max-w-[1040px] shadow-2xl rounded-2xl bg-white cursor-pointer group relative hover:ring-4 hover:ring-blue-400/30 transition-all flex-shrink-0"
          title="Clique para copiar a imagem da proposta para o WhatsApp (Ctrl+V)"
        >
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md pointer-events-none no-print">
            <Copy className="w-3.5 h-3.5 text-blue-300" />
            <span>Clique para copiar imagem</span>
          </div>
          <EspelhoOrcamento
            id="espelho-oficial-orcamento"
            clientName={selectedOrcamento.clientName || followUp.cliente}
            clientType={selectedOrcamento.clientType || followUp.clientType || 'Cliente Final'}
            clientContact={selectedOrcamento.clientContact || followUp.telefone || ''}
            consultoraName={selectedOrcamento.consultoraName || followUp.vendedor || 'Consultora Fênix'}
            dataOrcamento={selectedOrcamento.dataOrcamento || followUp.dataCriacao || new Date().toLocaleDateString('pt-BR')}
            observacoes={selectedOrcamento.observacoes || ''}
            observacoesRodape={selectedOrcamento.observacoesRodape}
            items={
              selectedOrcamento.items && selectedOrcamento.items.length > 0
                ? selectedOrcamento.items
                : [
                    {
                      id: 'item_1',
                      qtd: '1',
                      descricao:
                        selectedOrcamento.nomeOrcamento ||
                        followUp.produto ||
                        'Orçamento de Materiais e Serviços',
                      unidade: 'un',
                      precoUnitario:
                        Number(selectedOrcamento.totalFinal) || Number(followUp.valor) || 0,
                      total:
                        Number(selectedOrcamento.totalFinal) || Number(followUp.valor) || 0,
                    },
                  ]
            }
            freteValor={Number(selectedOrcamento.freteValor) || 0}
            freteEndereco={selectedOrcamento.freteEndereco || ''}
            subtotal={selectedOrcamento.items?.reduce((acc, i) => acc + (Number(i.total) || 0), 0)}
            descontoValor={selectedOrcamento.descontoValor && selectedOrcamento.descontoValor > 0 ? selectedOrcamento.descontoValor : undefined}
            descontoTexto={selectedOrcamento.descontoTexto}
            totalFinal={Number(selectedOrcamento.totalFinal) || Number(followUp.valor) || 0}
          />
        </div>
      </div>

      <div className="text-center text-xs text-slate-300 no-print pb-6">
        Para gerar PDF oficial em alta resolução, clique em <strong>Salvar em PDF</strong>.
      </div>
    </div>
  );
};
