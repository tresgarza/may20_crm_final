/**
 * Constants for application types used throughout the application
 */

export enum APPLICATION_TYPE {
  AUTO_LOAN = "AUTO_LOAN",
  CAR_BACKED_LOAN = "CAR_BACKED_LOAN",
  PERSONAL_LOAN = "PERSONAL_LOAN",
  CASH_ADVANCE = "CASH_ADVANCE",
  SELECTED_PLANS = "SELECTED_PLANS",
  PRODUCT_SIMULATIONS = "PRODUCT_SIMULATIONS",
  CASH_REQUESTS = "CASH_REQUESTS"
}

export const APPLICATION_TYPE_LABELS: Record<APPLICATION_TYPE, string> = {
  [APPLICATION_TYPE.AUTO_LOAN]: "Préstamo de Auto",
  [APPLICATION_TYPE.CAR_BACKED_LOAN]: "Préstamo con Garantía de Auto",
  [APPLICATION_TYPE.PERSONAL_LOAN]: "Préstamo Personal",
  [APPLICATION_TYPE.CASH_ADVANCE]: "Adelanto de Efectivo",
  [APPLICATION_TYPE.SELECTED_PLANS]: "Planes Seleccionados",
  [APPLICATION_TYPE.PRODUCT_SIMULATIONS]: "Simulaciones de Producto",
  [APPLICATION_TYPE.CASH_REQUESTS]: "Solicitudes de Efectivo"
}; 