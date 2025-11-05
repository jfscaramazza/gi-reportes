import Papa from 'papaparse';

export interface CSVRow {
  'Submit Date': string;
  'Writing Agent Last Name': string;
  'Writing Agent First Name': string;
  'Product': string;
  'Premium Amount': string;
  [key: string]: any;
}

export interface AgentData {
  agentName: string;
  monthlyPremium: number;
  annualizedPremium: number;
  products: string[];
  productCounts: Record<string, number>;
}

export interface ParseResult {
  data: CSVRow[];
  errors: string[];
}

export interface FilterResult {
  data: CSVRow[];
  skippedRows: number;
}

const REQUIRED_COLUMNS = [
  'Submit Date',
  'Writing Agent Last Name',
  'Writing Agent First Name',
  'Product',
  'Premium Amount'
];

/**
 * Parse CSV content and validate required columns
 */
export function parseCSV(csvContent: string): ParseResult {
  const result = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });

  const errors: string[] = [];
  
  // Check for required columns
  if (result.data.length > 0) {
    const headers = Object.keys(result.data[0]);
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }
  }

  // Add Papa parse errors
  if (result.errors.length > 0) {
    errors.push(...result.errors.map(err => err.message));
  }

  return {
    data: result.data,
    errors
  };
}

/**
 * Parse date string in M/D/YYYY or MM/DD/YYYY format
 */
function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const cleaned = dateString.trim();
  
  // Try parsing with Date constructor first
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Try manual parsing for M/D/YYYY format
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
        month >= 1 && month <= 12 && 
        day >= 1 && day <= 31 && 
        year > 1900) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

/**
 * Parse premium amount string to number
 */
function parsePremium(premiumString: string): number {
  if (!premiumString || typeof premiumString !== 'string') {
    return 0;
  }

  // Remove $, commas, and spaces
  const cleaned = premiumString.replace(/[$,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Filter rows by specific month and year
 */
export function filterByDateRange(data: CSVRow[], targetMonth?: number, targetYear?: number): FilterResult {
  // If no target specified, return all data
  if (targetMonth === undefined || targetYear === undefined) {
    return {
      data,
      skippedRows: 0
    };
  }
  
  const filtered: CSVRow[] = [];
  let skippedRows = 0;

  for (const row of data) {
    const submitDate = parseDate(row['Submit Date']);
    
    if (!submitDate) {
      skippedRows++;
      continue;
    }

    if (submitDate.getMonth() === targetMonth && 
        submitDate.getFullYear() === targetYear) {
      filtered.push(row);
    }
  }

  return {
    data: filtered,
    skippedRows
  };
}

/**
 * Filter rows by product category
 */
export function filterByProduct(data: CSVRow[], selectedProducts: string[]): FilterResult {
  // If no products selected, return all data
  if (selectedProducts.length === 0) {
    return {
      data,
      skippedRows: 0
    };
  }
  
  const filtered: CSVRow[] = [];
  let skippedRows = 0;

  for (const row of data) {
    const product = row['Product']?.trim();
    
    if (!product) {
      skippedRows++;
      continue;
    }

    if (selectedProducts.includes(product)) {
      filtered.push(row);
    }
  }

  return {
    data: filtered,
    skippedRows
  };
}

/**
 * Get unique product categories from data
 */
export function getUniqueProducts(data: CSVRow[]): string[] {
  const products = new Set<string>();
  
  for (const row of data) {
    const product = row['Product']?.trim();
    if (product) {
      products.add(product);
    }
  }
  
  return Array.from(products).sort();
}

/**
 * Aggregate data by agent
 */
export function aggregateByAgent(data: CSVRow[]): AgentData[] {
  const agentMap = new Map<string, AgentData>();

  for (const row of data) {
    const firstName = titleCase(row['Writing Agent First Name']?.trim() || '');
    const lastName = titleCase(row['Writing Agent Last Name']?.trim() || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (!fullName) continue;

    const premium = parsePremium(row['Premium Amount']);
    const product = row['Product']?.trim() || '';
    
    // Use lowercase for grouping to handle case variations
    const groupKey = fullName.toLowerCase();
    
    if (agentMap.has(groupKey)) {
      const existing = agentMap.get(groupKey)!;
      existing.monthlyPremium += premium;
      existing.annualizedPremium += premium * 12;
      
      // Add product if not already present
      if (product && !existing.products.includes(product)) {
        existing.products.push(product);
      }
      
      // Update product counts
      existing.productCounts[product] = (existing.productCounts[product] || 0) + 1;
    } else {
      agentMap.set(groupKey, {
        agentName: fullName, // Use title-cased version for display
        monthlyPremium: premium,
        annualizedPremium: premium * 12,
        products: product ? [product] : [],
        productCounts: product ? { [product]: 1 } : {}
      });
    }
  }

  // Sort by annualized premium descending
  return Array.from(agentMap.values()).sort((a, b) => b.annualizedPremium - a.annualizedPremium);
}

/**
 * Format number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Convert string to title case
 */
export function titleCase(str: string): string {
  if (!str) return '';
  
  return str.toLowerCase().split(' ').map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}