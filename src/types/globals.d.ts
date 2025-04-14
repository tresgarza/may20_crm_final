// This file contains global declarations for modules without type definitions

// Declaration for uuid module if @types/uuid is not installed
declare module 'uuid' {
  export function v4(): string;
}

// Add other module declarations as needed 