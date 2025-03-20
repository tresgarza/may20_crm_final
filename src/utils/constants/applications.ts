export enum APPLICATION_TYPE {
  AUTO_LOAN = 'AUTO_LOAN',
  CAR_BACKED_LOAN = 'CAR_BACKED_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  CASH_ADVANCE = 'CASH_ADVANCE',
  SELECTED_PLANS = 'selected_plans',
  PRODUCT_SIMULATIONS = 'product_simulations',
  CASH_REQUESTS = 'cash_requests',
}

export const APPLICATION_TYPE_LABELS: { [key: string]: string } = {
  [APPLICATION_TYPE.AUTO_LOAN]: 'Crédito Automotriz',
  [APPLICATION_TYPE.CAR_BACKED_LOAN]: 'Crédito con Garantía Automotriz',
  [APPLICATION_TYPE.PERSONAL_LOAN]: 'Préstamo Personal',
  [APPLICATION_TYPE.CASH_ADVANCE]: 'Adelanto de Efectivo',
  [APPLICATION_TYPE.SELECTED_PLANS]: 'Planes Seleccionados',
  [APPLICATION_TYPE.PRODUCT_SIMULATIONS]: 'Simulación de Producto',
  [APPLICATION_TYPE.CASH_REQUESTS]: 'Solicitud de Efectivo',
}; 