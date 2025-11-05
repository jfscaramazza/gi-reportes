"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  Calendar,
  Filter,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  parseCSV,
  filterByDateRange,
  aggregateByAgent,
  formatCurrency,
  titleCase,
} from "@/lib/csv-utils";
import { generatePDF } from "@/lib/pdf-utils";
import { useTranslations } from "@/hooks/use-translations";
import { ThemeToggle } from "@/components/theme-toggle";

// DatePicker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface AgentData {
  agentName: string;
  agentNumber?: string;
  monthlyPremium: number;
  annualizedPremium: number;
  products: string[];
  productCounts: Record<string, number>;
}

interface ParseResult {
  data: AgentData[];
  month: string;
  year: number;
  skippedRows: number;
  totalMonthly: number;
  totalAnnualized: number;
  availableMonths: string[];
  allAgents: string[];
  allProducts: string[];
  totalRecords?: number;
  displayedRecords?: number;
}

interface ExtendedAgentData extends AgentData {
  agentNumber: string;
  equipo: string;
  annualizedPrev: number | null;
}

interface FilteredResult extends ParseResult {
  data: ExtendedAgentData[];
  totalPrev: number;
  totalRecords: number;
  displayedRecords: number;
}

interface FilterState {
  selectedMonth: string; // 'current' | 'all' | 'custom' | 'YYYY-M'
  selectedAgents: string[];
  selectedProducts: string[];
  selectedEquipo: string;
}

export default function Home() {
  const { language, t, changeLanguage } = useTranslations();

  const [isDragging, setIsDragging] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [rawData, setRawData] = useState<any[]>([]);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    selectedMonth: "current",
    selectedAgents: [],
    selectedProducts: [],
    selectedEquipo: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<{
    maxRecords: number;
    sortBy: "alphabetical" | "monthly" | "annualized" | "month";
  }>({
    maxRecords: 0, // 0 = todos los registros
    sortBy: "annualized",
  });

  const [customRange, setCustomRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  const [equipoMap, setEquipoMap] = useState<{ [agentNumber: string]: string }>({});
  const [equipoList, setEquipoList] = useState<string[]>([]);
  const [isDraggingEquipos, setIsDraggingEquipos] = useState(false);

  // PWA and Service Worker setup
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPWA(true);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }
  }, []);

  /**
   * RESULTADO FILTRADO (núcleo de la lógica)
   */
  const filteredResult = useMemo<FilteredResult | null>(() => {
    if (!result || !rawData.length) return null;

    let filteredData = rawData;

    // 1) Filtro por fecha
    if (filters.selectedMonth !== "all") {
      if (filters.selectedMonth === "current") {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        filteredData = filterByDateRange(rawData, currentMonth, currentYear).data;
      } else if (filters.selectedMonth === "custom") {
        if (customRange.from && customRange.to) {
          const from = customRange.from;
          const to = customRange.to;
          filteredData = rawData.filter((row) => {
            const date = new Date(row["Submit Date"]);
            return date >= from && date <= to;
          });
        } else {
          // Rango incompleto -> no filtrar por fecha
          filteredData = rawData;
        }
      } else {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        filteredData = filterByDateRange(rawData, month, year).data;
      }
    }

    // 2) Filtro por agentes
    if (filters.selectedAgents.length > 0) {
      filteredData = filteredData.filter((row) => {
        const firstName = titleCase(row["Writing Agent First Name"]?.trim() || "");
        const lastName = titleCase(row["Writing Agent Last Name"]?.trim() || "");
        const fullName = `${firstName} ${lastName}`.trim();
        return filters.selectedAgents.includes(fullName);
      });
    }

    // 3) Filtro por productos
    if (filters.selectedProducts.length > 0) {
      filteredData = filteredData.filter((row) => {
        const product = row["Product"]?.trim();
        return product && filters.selectedProducts.includes(product);
      });
    }

    // 4) Filtro por búsqueda
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filteredData = filteredData.filter((row) => {
        const firstName = titleCase(row["Writing Agent First Name"]?.trim() || "");
        const lastName = titleCase(row["Writing Agent Last Name"]?.trim() || "");
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.toLowerCase().includes(lower);
      });
    }

    // 5) Agregar por agente
    const aggregated = aggregateByAgent(filteredData) as AgentData[];

    // 6) Calcular mes anterior para comparativos
    let prevMonth: number | undefined;
    let prevYear: number | undefined;

    if (filters.selectedMonth !== "all") {
      let targetMonth: number | undefined;
      let targetYear: number | undefined;

      if (filters.selectedMonth === "current") {
        const currentDate = new Date();
        targetMonth = currentDate.getMonth();
        targetYear = currentDate.getFullYear();
      } else if (filters.selectedMonth === "custom" && customRange.from && customRange.to) {
        const fromDate = customRange.from;
        targetMonth = fromDate.getMonth();
        targetYear = fromDate.getFullYear();
      } else {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        targetMonth = month;
        targetYear = year;
      }

      if (targetMonth !== undefined && targetYear !== undefined) {
        if (targetMonth === 0) {
          prevMonth = 11;
          prevYear = targetYear - 1;
        } else {
          prevMonth = targetMonth - 1;
          prevYear = targetYear;
        }
      }
    }

    let agentesMesAnterior: AgentData[] = [];
    if (prevMonth !== undefined && prevYear !== undefined) {
      const prevFiltered = filterByDateRange(rawData, prevMonth, prevYear);
      agentesMesAnterior = aggregateByAgent(prevFiltered.data) as AgentData[];
    }

    const agentesPrevMap = new Map<string, number>(
      agentesMesAnterior.map((a) => [a.agentName.toLowerCase(), a.annualizedPremium])
    );

    // 7) Construir datos extendidos (equipo, annualizedPrev, etc.)
    const displayData: ExtendedAgentData[] = aggregated.map((agent) => {
      const matchingRow = rawData.find((row) => {
        const firstName = titleCase(row["Writing Agent First Name"]?.trim() || "");
        const lastName = titleCase(row["Writing Agent Last Name"]?.trim() || "");
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.toLowerCase() === agent.agentName.toLowerCase();
      });

      const agentNumber = matchingRow?.["Writing Agent Number"]?.trim() || "";
      const equipo =
        agentNumber && equipoMap[agentNumber] ? equipoMap[agentNumber] : "SIN EQUIPO";

      const annualizedPrev =
        agentesPrevMap.get(agent.agentName.toLowerCase()) ?? null;

      return {
        ...agent,
        agentNumber,
        equipo,
        annualizedPrev,
      };
    });

    // 8) Ordenamiento
    let sortedData = [...displayData];
    switch (pdfOptions.sortBy) {
      case "alphabetical":
        sortedData.sort((a, b) => a.agentName.localeCompare(b.agentName));
        break;
      case "monthly":
        sortedData.sort((a, b) => b.monthlyPremium - a.monthlyPremium);
        break;
      case "annualized":
        sortedData.sort((a, b) => b.annualizedPremium - a.annualizedPremium);
        break;
      case "month":
      default:
        // mantener orden original
        break;
    }

    // 9) Límite de registros
    const displayDataFinal =
      pdfOptions.maxRecords > 0
        ? sortedData.slice(0, pdfOptions.maxRecords)
        : sortedData;

    // 10) Totales
    const totalMonthly = displayDataFinal.reduce(
      (sum, a) => sum + a.monthlyPremium,
      0
    );
    const totalAnnualized = displayDataFinal.reduce(
      (sum, a) => sum + a.annualizedPremium,
      0
    );
    const totalPrev = displayDataFinal.reduce(
      (sum, a) =>
        sum + (typeof a.annualizedPrev === "number" ? a.annualizedPrev : 0),
      0
    );

    // 11) Mes y año para display
    let displayMonth = "All Time";
    let displayYear = new Date().getFullYear();

    if (filters.selectedMonth === "current") {
      const currentDate = new Date();
      displayMonth = currentDate.toLocaleString("default", { month: "long" });
      displayYear = currentDate.getFullYear();
    } else if (filters.selectedMonth !== "all") {
      const [year, month] = filters.selectedMonth.split("-").map(Number);
      const date = new Date(year, month);
      displayMonth = date.toLocaleString("default", { month: "long" });
      displayYear = year;
    }

    // 12) Filtro por equipo
    let finalFilteredData = displayDataFinal;
    if (filters.selectedEquipo && filters.selectedEquipo !== "ALL") {
      finalFilteredData = displayDataFinal.filter((agent) =>
        filters.selectedEquipo === "SIN EQUIPO"
          ? !agent.equipo || agent.equipo === "SIN EQUIPO"
          : agent.equipo === filters.selectedEquipo
      );
    }

    // 13) Resultado final
    return {
      ...result,
      data: finalFilteredData,
      month: displayMonth,
      year: displayYear,
      totalMonthly,
      totalAnnualized,
      totalPrev,
      totalRecords: sortedData.length,
      displayedRecords: finalFilteredData.length,
    };
  }, [result, rawData, filters, searchTerm, pdfOptions, customRange, equipoMap]);

  /**
   * Manejo de archivos principales (CSV de producción)
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a .csv file");
        return;
      }

      setIsProcessing(true);
      setError(null);
      setResult(null);
      setRawData([]);

      try {
        const text = await file.text();
        const parsed = parseCSV(text);

        if (parsed.errors && parsed.errors.length > 0) {
          setError(`CSV parsing errors: ${parsed.errors.join(", ")}`);
          return;
        }

        setRawData(parsed.data);

        const availableMonths = new Set<string>();
        const allAgents = new Set<string>();
        const allProducts = new Set<string>();

        parsed.data.forEach((row: any) => {
          const submitDate = new Date(row["Submit Date"]);
          if (!isNaN(submitDate.getTime())) {
            const monthKey = `${submitDate.getFullYear()}-${submitDate.getMonth()}`;
            availableMonths.add(monthKey);
          }

          const firstName = titleCase(row["Writing Agent First Name"]?.trim() || "");
          const lastName = titleCase(row["Writing Agent Last Name"]?.trim() || "");
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) {
            allAgents.add(fullName);
          }

          const product = row["Product"]?.trim();
          if (product) {
            allProducts.add(product);
          }
        });

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const filtered = filterByDateRange(parsed.data, currentMonth, currentYear);
        const aggregated = aggregateByAgent(filtered.data) as AgentData[];

        const monthName = currentDate.toLocaleString("default", { month: "long" });
        const totalMonthly = aggregated.reduce(
          (sum, agent) => sum + agent.monthlyPremium,
          0
        );
        const totalAnnualized = aggregated.reduce(
          (sum, agent) => sum + agent.annualizedPremium,
          0
        );

        setResult({
          data: aggregated,
          month: monthName,
          year: currentDate.getFullYear(),
          skippedRows: filtered.skippedRows,
          totalMonthly,
          totalAnnualized,
          availableMonths: Array.from(availableMonths).sort(),
          allAgents: Array.from(allAgents).sort(),
          allProducts: Array.from(allProducts).sort(),
        });

        setFilters({
          selectedMonth: "current",
          selectedAgents: [],
          selectedProducts: [],
          selectedEquipo: "",
        });
        setCustomRange({ from: null, to: null });

        setShowWarning(filtered.skippedRows > 0);
      } catch (err) {
        setError(
          `Error processing file: ${err instanceof Error ? err.message : "Unknown error"
          }`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  /**
   * CSV de equipos
   */
  const handleDropEquipos = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingEquipos(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const text = await file.text();
        const parsed = parseCSV(text);
        const mapping: { [key: string]: string } = {};
        parsed.data.forEach((row: any) => {
          if (row["Writing Agent Number"] && row["ID de Equipo"]) {
            mapping[row["Writing Agent Number"].trim()] =
              row["ID de Equipo"].trim();
          }
        });
        setEquipoMap(mapping);
        setEquipoList(Array.from(new Set(Object.values(mapping))).sort());
      }
    },
    []
  );

  const handleDragOverEquipos = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEquipos(true);
  }, []);

  const handleDragLeaveEquipos = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEquipos(false);
  }, []);

  const handleFileSelectEquipos = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseCSV(text);
      const mapping: { [key: string]: string } = {};
      parsed.data.forEach((row: any) => {
        if (row["Writing Agent Number"] && row["ID de Equipo"]) {
          mapping[row["Writing Agent Number"].trim()] =
            row["ID de Equipo"].trim();
        }
      });
      setEquipoMap(mapping);
      setEquipoList(Array.from(new Set(Object.values(mapping))).sort());
    },
    []
  );

  /**
   * PDF
   */
  const downloadPDF = useCallback(() => {
    if (!filteredResult) {
      console.log("No hay datos filtrados para generar PDF");
      return;
    }

    let sortedData = [...filteredResult.data];

    switch (pdfOptions.sortBy) {
      case "alphabetical":
        sortedData.sort((a, b) => a.agentName.localeCompare(b.agentName));
        break;
      case "monthly":
        sortedData.sort((a, b) => b.monthlyPremium - a.monthlyPremium);
        break;
      case "annualized":
        sortedData.sort((a, b) => b.annualizedPremium - a.annualizedPremium);
        break;
      case "month":
      default:
        break;
    }

    if (pdfOptions.maxRecords > 0) {
      sortedData = sortedData.slice(0, pdfOptions.maxRecords);
    }

    console.log("Generando PDF con datos:", {
      data: sortedData,
      month: filteredResult.month,
      year: filteredResult.year,
      totalMonthly: filteredResult.totalMonthly,
      totalAnnualized: filteredResult.totalAnnualized,
      selectedAgents: filters.selectedAgents,
      options: pdfOptions,
    });

    generatePDF({
      data: sortedData,
      month: filteredResult.month,
      year: filteredResult.year,
      totalMonthly: filteredResult.totalMonthly,
      totalAnnualized: filteredResult.totalAnnualized,
      selectedAgents: filters.selectedAgents,
      language: language,
    });
  }, [filteredResult, filters.selectedAgents, pdfOptions, language]);

  /**
   * Filtros
   */
  const handleMonthChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, selectedMonth: value }));
  }, []);

  const handleAgentToggle = useCallback((agentName: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      selectedAgents: checked
        ? [...prev.selectedAgents, agentName]
        : prev.selectedAgents.filter((name) => name !== agentName),
    }));
  }, []);

  const clearAgentFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, selectedAgents: [] }));
  }, []);

  const handleProductToggle = useCallback(
    (productName: string, checked: boolean) => {
      setFilters((prev) => ({
        ...prev,
        selectedProducts: checked
          ? [...prev.selectedProducts, productName]
          : prev.selectedProducts.filter((name) => name !== productName),
      }));
    },
    []
  );

  const clearProductFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, selectedProducts: [] }));
  }, []);

  const resetAllFilters = useCallback(() => {
    setFilters({
      selectedMonth: "current",
      selectedAgents: [],
      selectedProducts: [],
      selectedEquipo: "",
    });
    setSearchTerm("");
    setCustomRange({ from: null, to: null });
  }, []);

  const handlePDFOptionsChange = useCallback(
    (field: "maxRecords" | "sortBy", value: any) => {
      setPdfOptions((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const formatMonthOption = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month);
    return `${date.toLocaleString("default", { month: "long" })} ${year}`;
  };

  // Colores para productos (no los usas aún en tabla, pero lo mantengo intacto)
  const getProductColor = (product: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
      "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700",
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700",
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700",
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
      "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-700",
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
      "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700",
    ];

    let hash = 0;
    for (let i = 0; i < product.length; i++) {
      hash = product.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-4 px-2 sm:px-4 sm:py-8">
      <div className="container mx-auto max-w-7xl px-2 sm:px-4">
        <div className="text-center mb-6 sm:mb-8">
          {/* Language and Theme Selectors */}
          <div className="flex justify-end mb-4 gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {t("language")}:
              </span>
              <Select
                value={language}
                onValueChange={(value: "en" | "es") => changeLanguage(value)}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("english")}</SelectItem>
                  <SelectItem value="es">{t("spanish")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ThemeToggle />
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-2">
            {t("pageTitle")}
          </h1>
          <p className="text-slate-600 text-sm sm:text-lg">
            {t("pageDescription")}
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              {t("uploadTitle")}
            </CardTitle>
            <CardDescription className="text-sm">
              {t("uploadDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-slate-600 text-sm sm:text-base">
                    {t("processingFile")}
                  </span>
                </div>
              ) : (
                <>
                  <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4 text-sm sm:text-base">
                    {t("dropFileHere")}{" "}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      {t("clickToBrowse")}
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <div className="bg-slate-100 rounded p-3 sm:p-4 text-left text-xs sm:text-sm font-mono">
                    <div className="font-semibold text-slate-700 mb-2">
                      {t("expectedFormat")}
                    </div>
                    <div className="text-slate-600 break-all">
                      {t("csvExample")}
                      <br />
                      {t("csvExampleData")}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Caja drag&drop equipos */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                Cargar equipos (opcional)
              </CardTitle>
              <CardDescription className="text-sm">
                Agrega aquí el CSV de equipos para asociar cada agente a un equipo. Este
                campo es opcional: si no lo usas, todos los agentes aparecerán como "SIN
                EQUIPO".
                <br />
                Campos mínimos requeridos: <b>Writing Agent Number</b>,{" "}
                <b>ID de Equipo</b>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${isDraggingEquipos
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 hover:border-slate-400"
                  } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={handleDragOverEquipos}
                onDragLeave={handleDragLeaveEquipos}
                onDrop={handleDropEquipos}
              >
                <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4 text-sm sm:text-base">
                  Arrastra el archivo CSV de equipos aquí o
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                    haz click para seleccionarlo
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelectEquipos}
                      className="hidden"
                    />
                  </label>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 sm:mb-8 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Warning for Skipped Rows */}
        {result && result.skippedRows > 0 && showWarning && (
          <Alert className="mb-6 sm:mb-8 border-slate-200 bg-slate-50">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            <AlertDescription className="text-slate-600 flex justify-between items-center text-sm">
              <span>
                {result.skippedRows} rows were skipped due to invalid date or premium
                amount formatting.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWarning(false)}
                className="text-slate-600 hover:text-slate-700 h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        {result && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t("filtersTitle")}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAllFilters}
                  className="text-xs"
                >
                  {t("resetAllFilters")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Compact Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Time Period Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {t("timePeriod")}
                  </label>
                  <Select value={filters.selectedMonth} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t("currentMonth")}</SelectItem>
                      <SelectItem value="all">{t("allTime")}</SelectItem>
                      <SelectItem value="custom">Rango personalizado</SelectItem>
                      {result.availableMonths.map((monthKey) => (
                        <SelectItem key={monthKey} value={monthKey}>
                          {formatMonthOption(monthKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filters.selectedMonth === "custom" && (
                    <div className="flex gap-2 items-center mt-2">
                      <label>From:</label>
                      <DatePicker
                        selected={customRange.from}
                        onChange={(d) =>
                          setCustomRange((r) => ({
                            ...r,
                            from: d,
                          }))
                        }
                        dateFormat="MM/dd/yyyy"
                        maxDate={customRange.to ?? undefined}
                        placeholderText="MM/DD/YYYY"
                        className="border rounded px-2 py-1"
                      />
                      <label>To:</label>
                      <DatePicker
                        selected={customRange.to}
                        onChange={(d) =>
                          setCustomRange((r) => ({
                            ...r,
                            to: d,
                          }))
                        }
                        dateFormat="MM/dd/yyyy"
                        minDate={customRange.from ?? undefined}
                        placeholderText="MM/DD/YYYY"
                        className="border rounded px-2 py-1"
                      />
                    </div>
                  )}
                </div>

                {/* Agent Filter Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {t("agents")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {filters.selectedAgents.length === 0
                          ? t("selectAgents")
                          : `${filters.selectedAgents.length} ${t("agentsSelected")}`}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder={t("searchAgents")} />
                        <CommandList>
                          <CommandEmpty>{t("noAgentsFound")}</CommandEmpty>
                          <CommandGroup>
                            {result.allAgents.map((agent) => (
                              <CommandItem
                                key={agent}
                                onSelect={() => {
                                  const isSelected =
                                    filters.selectedAgents.includes(agent);
                                  handleAgentToggle(agent, !isSelected);
                                }}
                              >
                                <Checkbox
                                  checked={filters.selectedAgents.includes(agent)}
                                  className="mr-2"
                                />
                                {agent}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.selectedAgents.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAgentFilters}
                      className="h-6 px-2 text-xs"
                    >
                      {t("clear")}
                    </Button>
                  )}
                </div>

                {/* Product Filter Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Products
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {filters.selectedProducts.length === 0
                          ? "Select products..."
                          : `${filters.selectedProducts.length} product${filters.selectedProducts.length !== 1 ? "s" : ""
                          } selected`}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup>
                            {result.allProducts.map((product) => (
                              <CommandItem
                                key={product}
                                onSelect={() => {
                                  const isSelected =
                                    filters.selectedProducts.includes(product);
                                  handleProductToggle(product, !isSelected);
                                }}
                              >
                                <Checkbox
                                  checked={filters.selectedProducts.includes(product)}
                                  className="mr-2"
                                />
                                {product}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.selectedProducts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearProductFilters}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Equipo Filter Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Equipo
                  </label>
                  <Select
                    value={filters.selectedEquipo || "ALL"}
                    onValueChange={(val) =>
                      setFilters((f) => ({ ...f, selectedEquipo: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      {equipoList.map((val) => (
                        <SelectItem key={val} value={val}>
                          {val}
                        </SelectItem>
                      ))}
                      <SelectItem value="SIN EQUIPO">SIN EQUIPO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(filters.selectedMonth !== "current" ||
                filters.selectedAgents.length > 0 ||
                filters.selectedProducts.length > 0 ||
                searchTerm.trim() ||
                filters.selectedEquipo) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {filters.selectedMonth !== "current" && (
                      <Badge variant="secondary" className="text-xs">
                        {filters.selectedMonth === "all"
                          ? "All Time"
                          : formatMonthOption(filters.selectedMonth)}
                      </Badge>
                    )}
                    {filters.selectedAgents.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {filters.selectedAgents.length} Agent
                        {filters.selectedAgents.length !== 1 ? "s" : ""} Selected
                      </Badge>
                    )}
                    {filters.selectedProducts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {filters.selectedProducts.length} Product
                        {filters.selectedProducts.length !== 1 ? "s" : ""} Selected
                      </Badge>
                    )}
                    {searchTerm.trim() && (
                      <Badge variant="secondary" className="text-xs">
                        Search: "{searchTerm}"
                      </Badge>
                    )}
                    {filters.selectedEquipo && (
                      <Badge variant="secondary" className="text-xs">
                        Equipo: {filters.selectedEquipo}
                      </Badge>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {filteredResult && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t("resultsTitle")}
                </CardTitle>
                <CardDescription className="text-sm">
                  {filteredResult.data.length} {t("agentsWithPremiums")}
                  {filters.selectedAgents.length > 0 &&
                    ` (${filters.selectedAgents.length} ${t("agentsSelected")})`}
                  {filters.selectedProducts.length > 0 &&
                    ` (${filters.selectedProducts.length} ${t(
                      "productsSelected"
                    )})`}
                  {pdfOptions.maxRecords > 0 && (
                    <span className="text-blue-600">
                      {" "}
                      ({t("displayedRecords")}:{" "}
                      {filteredResult.displayedRecords}/
                      {filteredResult.totalRecords})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                >
                  {filteredResult.month} {filteredResult.year}
                </Badge>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="flex items-center gap-2 w-full sm:w-auto">
                      <Download className="w-4 h-4" />
                      Download PDF
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">{t("pdfOptions")}</h4>

                      {/* Número máximo de registros */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          {t("maxRecords")}
                        </label>
                        <Select
                          value={pdfOptions.maxRecords.toString()}
                          onValueChange={(value) =>
                            handlePDFOptionsChange("maxRecords", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">
                              {t("allRecords")}
                            </SelectItem>
                            <SelectItem value="10">{t("top10")}</SelectItem>
                            <SelectItem value="25">{t("top25")}</SelectItem>
                            <SelectItem value="50">{t("top50")}</SelectItem>
                            <SelectItem value="100">
                              {t("top100")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Orden de clasificación */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          {t("sortBy")}
                        </label>
                        <Select
                          value={pdfOptions.sortBy}
                          onValueChange={(value) =>
                            handlePDFOptionsChange("sortBy", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annualized">
                              {t("premiumAnnualized")}
                            </SelectItem>
                            <SelectItem value="monthly">
                              {t("premiumMonthly")}
                            </SelectItem>
                            <SelectItem value="alphabetical">
                              {t("alphabetical")}
                            </SelectItem>
                            <SelectItem value="month">
                              {t("originalOrder")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botón de descarga */}
                      <Button onClick={downloadPDF} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        {t("generateDownloadPDF")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-800">
                        <th className="text-left py-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-slate-100 text-sm">
                          Equipo
                        </th>
                        <th className="text-left py-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-slate-100 text-sm">
                          Agente
                        </th>
                        <th className="text-right py-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-slate-100 text-sm">
                          Mes Anterior
                        </th>
                        <th className="text-right py-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-slate-100 text-sm">
                          Annualized Premium
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResult.data.map((agent, index) => (
                        <tr
                          key={index}
                          className="border-b hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                        >
                          <td className="py-3 px-3 sm:px-4 text-slate-900 dark:text-slate-100 text-sm">
                            {agent.equipo}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:text-slate-900 dark:group-hover:text-white">
                            <div className="truncate" title={agent.agentName}>
                              {agent.agentName}
                            </div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-700 dark:text-slate-300 text-sm group-hover:text-slate-700 dark:group-hover:text-white">
                            {typeof agent.annualizedPrev === "number"
                              ? formatCurrency(agent.annualizedPrev)
                              : "-"}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-700 dark:text-slate-300 text-sm group-hover:text-slate-700 dark:group-hover:text-white">
                            {formatCurrency(agent.annualizedPremium)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 font-semibold">
                        <td className="py-4 px-3 sm:px-4 text-slate-900 dark:text-slate-100 text-sm">
                          TOTAL
                        </td>
                        <td className="py-4 px-3 sm:px-4 text-slate-900 dark:text-slate-100 text-sm">
                          -
                        </td>
                        <td className="py-4 px-3 sm:px-4 text-right font-mono text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(filteredResult.totalPrev ?? 0)}
                        </td>
                        <td className="py-4 px-3 sm:px-4 text-right font-mono text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(filteredResult.totalAnnualized)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
