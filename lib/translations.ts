export const translations = {
  en: {
    // Page title and description
    pageTitle: "Monthly Agent Premiums Report",
    pageDescription: "Upload CSV data to generate premium reports with PDF export",

    // Upload section
    uploadTitle: "Upload CSV File",
    uploadDescription: "Drag and drop your CSV file or click to browse",
    processingFile: "Processing file...",
    dropFileHere: "Drop your CSV file here, or",
    clickToBrowse: "click to browse",
    expectedFormat: "Expected CSV format:",
    csvExample: "Submit Date,Writing Agent Last Name,Writing Agent First Name,Product,Premium Amount",
    csvExampleData: "8/22/2025,HERNANDEZ COLMENARES,HECTOR,Health Plan A,$49.57",

    // Filters and search
    filtersTitle: "Filters & Search",
    searchPlaceholder: "Search agents by name...",
    timePeriod: "Time Period",
    currentMonth: "Current Month",
    allTime: "All Time",
    agents: "Agents",
    products: "Products",
    selectAgents: "Select agents...",
    selectProducts: "Select products...",
    searchAgents: "Search agents...",
    searchProducts: "Search products...",
    noAgentsFound: "No agents found.",
    noProductsFound: "No products found.",
    clear: "Clear",

    // Filter badges
    agentsSelected: "agents selected",
    productsSelected: "products selected",
    searchFor: "Search:",

    // Reset filters
    resetAllFilters: "Reset All Filters",

    // Results section
    resultsTitle: "Agent Premium Summary",
    agentsWithPremiums: "agents with premiums",
    totalRecords: "Total Records",
    displayedRecords: "Displayed Records",


    // PDF options
    pdfOptions: "PDF Options",
    maxRecords: "Max Records",
    allRecords: "All Records",
    top10: "Top 10",
    top25: "Top 25",
    top50: "Top 50",
    top100: "Top 100",
    sortBy: "Sort By",
    premiumAnnualized: "Premium Annualized (Desc)",
    premiumMonthly: "Premium Monthly (Desc)",
    alphabetical: "Alphabetical (A-Z)",
    originalOrder: "Original Order",
    generateDownloadPDF: "Generate & Download PDF",

    // Table headers
    agentName: "Agent Name",
    monthlyPremium: "Monthly Premium",
    annualizedPremium: "Annualized Premium",
    total: "TOTAL",

    // Warnings and errors
    skippedRowsWarning: "rows were skipped due to invalid date or premium amount formatting.",

    // Language selector
    language: "Language",
    english: "English",
    spanish: "Español",

    // PDF and Screenshot specific texts
    monthlyAgentPremiumsReport: "Monthly Agent Premiums Report",
    month: "Month",
    generated: "Generated",
    selectedAgents: "selected agents",
    monthlyPremiumReport: "Monthly Premium Report",
    generatedOn: "Generated on"
  },

  es: {
    // Título y descripción de la página
    pageTitle: "Reporte Mensual de Primas de Agentes",
    pageDescription: "Sube datos CSV para generar reportes de primas con exportación PDF",

    // Sección de carga
    uploadTitle: "Subir Archivo CSV",
    uploadDescription: "Arrastra y suelta tu archivo CSV o haz clic para explorar",
    processingFile: "Procesando archivo...",
    dropFileHere: "Suelta tu archivo CSV aquí, o",
    clickToBrowse: "haz clic para explorar",
    expectedFormat: "Formato CSV esperado:",
    csvExample: "Submit Date,Writing Agent Last Name,Writing Agent First Name,Product,Premium Amount",
    csvExampleData: "8/22/2025,HERNANDEZ COLMENARES,HECTOR,Health Plan A,$49.57",

    // Filtros y búsqueda
    filtersTitle: "Filtros y Búsqueda",
    searchPlaceholder: "Buscar agentes por nombre...",
    timePeriod: "Período de Tiempo",
    currentMonth: "Mes Actual",
    allTime: "Todo el Tiempo",
    agents: "Agentes",
    products: "Productos",
    selectAgents: "Seleccionar agentes...",
    selectProducts: "Seleccionar productos...",
    searchAgents: "Buscar agentes...",
    searchProducts: "Buscar productos...",
    noAgentsFound: "No se encontraron agentes.",
    noProductsFound: "No se encontraron productos.",
    clear: "Limpiar",

    // Badges de filtros
    agentsSelected: "agentes seleccionados",
    productsSelected: "productos seleccionados",
    searchFor: "Búsqueda:",

    // Resetear filtros
    resetAllFilters: "Resetear Todos los Filtros",

    // Sección de resultados
    resultsTitle: "Resumen de Primas de Agentes",
    agentsWithPremiums: "agentes con primas",
    totalRecords: "Total de Registros",
    displayedRecords: "Registros Mostrados",


    // Opciones de PDF
    pdfOptions: "Opciones de PDF",
    maxRecords: "Registros Máximos",
    allRecords: "Todos los Registros",
    top10: "Top 10",
    top25: "Top 25",
    top50: "Top 50",
    top100: "Top 100",
    sortBy: "Ordenar Por",
    premiumAnnualized: "Premium Anualizado (Desc)",
    premiumMonthly: "Premium Mensual (Desc)",
    alphabetical: "Alfabético (A-Z)",
    originalOrder: "Orden Original",
    generateDownloadPDF: "Generar y Descargar PDF",

    // Encabezados de tabla
    agentName: "Nombre del Agente",
    monthlyPremium: "Premium Mensual",
    annualizedPremium: "Premium Anualizado",
    total: "TOTAL",

    // Advertencias y errores
    skippedRowsWarning: "filas fueron omitidas debido a formato inválido de fecha o monto de prima.",

    // Selector de idioma
    language: "Idioma",
    english: "English",
    spanish: "Español",

    // PDF and Screenshot specific texts
    monthlyAgentPremiumsReport: "Reporte de Primas Mensuales de Agentes",
    month: "Mes",
    generated: "Generado",
    selectedAgents: "agentes seleccionados",
    monthlyPremiumReport: "Reporte de Primas Mensuales",
    generatedOn: "Generado el"
  }
};

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof translations.en;
