// @ts-ignore
const FileSaver = require('file-saver');
const saveAs = FileSaver.saveAs;
// @ts-ignore
const XLSX = require('xlsx');
import { IFilteredApiResponse } from '../types/api';
import { apiRequest } from '../utilities/apiRequest';

export interface ExportFilters {
  searchQuery?: string;
  status?: string[];
  applicationType?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
}

export interface ExportColumn {
  field: string;
  headerName: string;
}

export type ExportFormat = 'csv' | 'excel';

/**
 * Exports filtered applications to CSV or Excel
 * @param filters Filters to apply to the data
 * @param columns Columns to include in the export
 * @param format Export format (csv or excel)
 * @param fileName Name of the file to download
 */
export const exportFilteredApplications = async (
  filters: ExportFilters,
  columns: ExportColumn[],
  format: ExportFormat = 'csv',
  fileName: string = 'applications'
): Promise<void> => {
  try {
    // Make API request to get filtered data
    const response: IFilteredApiResponse = await apiRequest({
      endpoint: '/applications/filtered',
      method: 'POST',
      data: filters,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Transform the data for export (select only the columns we want)
    const exportData = response.data.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((column) => {
        // Handle nested fields with dot notation
        if (column.field.includes('.')) {
          const fields = column.field.split('.');
          let value = item;
          for (const field of fields) {
            value = value?.[field];
            if (value === undefined) break;
          }
          row[column.headerName] = value ?? '';
        } else {
          row[column.headerName] = item[column.field] ?? '';
        }
      });
      return row;
    });

    // Export the data in the specified format
    if (format === 'csv') {
      exportToCSV(exportData, fileName);
    } else {
      exportToExcel(exportData, fileName);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

/**
 * Exports data to CSV
 * @param data Data to export
 * @param fileName Name of the file to download
 */
const exportToCSV = (data: Record<string, any>[], fileName: string): void => {
  // Convert data to CSV format
  const headers = Object.keys(data[0] || {});
  const csvRows = [
    headers.join(','), // Header row
    ...data.map((row) => 
      headers.map((header) => {
        const cell = row[header]?.toString() || '';
        // Escape commas and quotes
        return cell.includes(',') || cell.includes('"') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell;
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${fileName}.csv`);
};

/**
 * Exports data to Excel
 * @param data Data to export
 * @param fileName Name of the file to download
 */
const exportToExcel = (data: Record<string, any>[], fileName: string): void => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
  
  // Write to buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create blob and save
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
}; 