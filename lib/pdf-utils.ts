import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from './csv-utils';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Define types for jsPDF-AutoTable
interface CellData {
  cell: {
    styles: {
      fillColor?: number[];
      fontStyle?: string;
      textColor?: number[];
    };
  };
  row: {
    index: number;
  };
}

export interface PDFData {
  data: Array<{
    agentName: string;
    monthlyPremium: number;
    annualizedPremium: number;
    annualizedPrev?: number | null;
    products: string[];
    productCounts: Record<string, number>;
    equipo?: string; // Added equipo field
  }>;
  month: string;
  year: number;
  totalMonthly: number;
  totalAnnualized: number;
  totalPrev?: number;
  selectedAgents?: string[];
  language?: 'en' | 'es';
}

/**
 * Generate and download PDF report
 */
export function generatePDF(data: PDFData): void {
  console.log('generatePDF llamada con datos:', data);
  console.log('Número de agentes:', data.data.length);
  console.log('Datos de agentes:', data.data);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Get language-specific texts
  const isSpanish = data.language === 'es';

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(isSpanish ? 'Reporte de Primas Mensuales de Agentes' : 'Monthly Agent Premiums Report', 15, 15);

  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  let subtitle = isSpanish ? `Mes: ${data.month} ${data.year}` : `Month: ${data.month} ${data.year}`;
  if (data.selectedAgents && data.selectedAgents.length > 0) {
    subtitle += isSpanish ? ` (${data.selectedAgents.length} agentes seleccionados)` : ` (${data.selectedAgents.length} selected agents)`;
  }
  doc.text(subtitle, 15, 25);

  // Generation timestamp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const timestamp = new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
  doc.text(isSpanish ? `Generado: ${timestamp}` : `Generated: ${timestamp}`, 15, 32);

  // Prepare table data
  console.log('Preparando datos de tabla...');
  console.log('Datos originales:', data.data);

  const tableData = data.data.map(agent => [
    agent.equipo || 'SIN EQUIPO',
    agent.agentName,
    typeof agent.annualizedPrev === 'number' ? formatCurrency(agent.annualizedPrev): '-',
    formatCurrency(agent.annualizedPremium)
  ]);

  console.log('Datos de tabla preparados:', tableData);

  // Add totals row
  tableData.push([
    isSpanish ? 'TOTAL' : 'TOTAL', '', formatCurrency(data.totalPrev ?? 0), formatCurrency(data.totalAnnualized)
  ]);

  console.log('Datos de tabla con totales:', tableData);

  // Create table
  console.log('Creando tabla con autoTable...');
  console.log('Headers:', [['Agent Name', 'Products', 'Monthly Premium', 'Annualized Premium']]);
  console.log('Body rows:', tableData.length);
  console.log('Primera fila de datos:', tableData[0]);
  console.log('Última fila de datos:', tableData[tableData.length - 1]);

  try {
    doc.autoTable({
      startY: 40,
      head: [[
        isSpanish ? 'Equipo' : 'Team',
        isSpanish ? 'Nombre del Agente' : 'Agent Name',
        isSpanish ? 'Mes Anterior' : 'Previous Month',
        isSpanish ? 'Prima Anualizada' : 'Annualized Premium'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105], // slate-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: {
        1: { halign: 'left', fontStyle: 'normal' },  // Products
        2: { halign: 'right', fontStyle: 'normal' }, // Mes Anterior
        3: { halign: 'right', fontStyle: 'normal' }  // Annualized Premium
      },
      // Style the totals row
      didParseCell: function (data: CellData) {
        if (data.row.index === tableData.length - 1) { // Last row (totals)
          data.cell.styles.fillColor = [226, 232, 240]; // slate-200
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        }
      },
      margin: { left: 15, right: 15 },
      pageBreak: 'avoid'
    });
    console.log('Tabla creada exitosamente');
  } catch (error) {
    console.error('Error al crear tabla:', error);
  }

  // Generate filename
  let monthNum = '00';
  if (data.month !== 'All Time') {
    monthNum = String(new Date(`${data.month} 1, ${data.year}`).getMonth() + 1).padStart(2, '0');
  }
  const filename = `agent-premiums-${data.year}-${monthNum}.pdf`;

  // Save the PDF
  doc.save(filename);
}