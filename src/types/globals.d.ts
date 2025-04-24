// This file contains global declarations for modules without type definitions

// Declaration for uuid module if @types/uuid is not installed
declare module 'uuid' {
  export function v4(): string;
}

// Add other module declarations as needed 

declare module 'file-saver' {
  export function saveAs(data: Blob, filename?: string, options?: Object): void;
}

declare module 'xlsx' {
  export const utils: {
    book_new: () => any;
    json_to_sheet: (data: any[]) => any;
    book_append_sheet: (workbook: any, worksheet: any, name: string) => void;
  };
  export function write(workbook: any, options: { bookType: string; type: string }): any;
} 