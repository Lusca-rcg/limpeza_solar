
import { jsPDF } from 'jspdf';
import { QuoteData, CalculationResult } from '../types';
import { formatCurrency, sanitizeFilename } from './formatters';

export const generateQuotePdf = (data: QuoteData, calc: CalculationResult) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = data.calculatedAt?.toLocaleString('pt-BR') || new Date().toLocaleString('pt-BR');

  // Header
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('ORÇAMENTO DE MANUTENÇÃO', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('LIMPEZA E MANUTENÇÃO DE PLACAS SOLARES', pageWidth / 2, 30, { align: 'center' });

  // Client Info Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.clientName}`, 15, 65);
  doc.text(`Telefone: ${data.clientPhone}`, 15, 72);
  doc.text(`Endereço: ${data.address.logradouro}, ${data.address.numero}`, 15, 79);
  doc.text(`${data.address.bairro} - ${data.address.cidade}/${data.address.uf}`, 15, 86);
  doc.text(`CEP: ${data.address.cep}`, 15, 93);

  // Quote Details Table
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHAMENTO DO SERVIÇO', 15, 110);
  
  // Table Borders
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 115, pageWidth - 15, 115);
  
  doc.setFont('helvetica', 'normal');
  const startY = 125;
  const lineGap = 10;
  
  // Cleaning
  doc.text(`Limpeza de Placas (${data.panelCount} unid. - Faixa: ${calc.tier})`, 15, startY);
  doc.text(formatCurrency(calc.cleaningSubtotal), pageWidth - 15, startY, { align: 'right' });
  
  // Travel
  doc.text(`Taxa de Deslocamento (${data.distanceKm.toFixed(1)} km)`, 15, startY + lineGap);
  doc.text(formatCurrency(calc.travelFee), pageWidth - 15, startY + lineGap, { align: 'right' });
  
  // Maintenance
  if (data.hasMaintenance) {
    doc.text('Manutenção Preventiva/Corretiva', 15, startY + lineGap * 2);
    doc.text(formatCurrency(calc.maintenanceFee), pageWidth - 15, startY + lineGap * 2, { align: 'right' });
  }

  // Total
  doc.line(15, 160, pageWidth - 15, 160);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL FINAL:', 15, 175);
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrency(calc.total), pageWidth - 15, 175, { align: 'right' });

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Gerado em: ${dateStr}`, pageWidth / 2, 280, { align: 'center' });
  doc.text('Válido por 15 dias.', pageWidth / 2, 287, { align: 'center' });

  // Download
  const filename = `orcamento-manutencao-${sanitizeFilename(data.clientName)}-${new Date().getTime()}.pdf`;
  doc.save(filename);
};
