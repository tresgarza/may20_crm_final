# Programa de Prueba Automatizada para Verificar la Independencia de Vistas Kanban

Este documento proporciona un script detallado para probar la independencia entre las vistas Kanban para Asesores y Administradores de Empresa. El objetivo es verificar que las acciones realizadas en una vista no afecten a la otra, manteniendo la integridad e independencia de cada flujo de trabajo.

## Estructura del Proyecto de Prueba

```
tests/
├── independence.test.ts       # Tests principales de independencia
├── utils.ts                   # Funciones de utilidad para las pruebas
└── setup.ts                   # Configuración y credenciales
```

## Requerimientos de Prueba

```bash
npm install --save-dev playwright @playwright/test typescript
```

## Script de Prueba Principal

### `independence.test.ts`

```typescript
import { test, expect, Page } from '@playwright/test';
import { login, getKanbanCardPosition, moveKanbanCard } from './utils';
import { ADVISOR_CREDENTIALS, COMPANY_ADMIN_CREDENTIALS, TEST_APPLICATIONS } from './setup';

test.describe('Kanban Board Independence Tests', () => {
  test('should maintain independent card positions between roles', async ({ browser }) => {
    // Crear dos contextos de navegador separados para simular dos usuarios diferentes
    const advisorContext = await browser.newContext();
    const companyContext = await browser.newContext();
    
    const advisorPage = await advisorContext.newPage();
    const companyPage = await companyContext.newPage();
    
    // Paso 1: Iniciar sesión con ambos roles
    await test.step('Login as both roles', async () => {
      await login(advisorPage, ADVISOR_CREDENTIALS);
      await login(companyPage, COMPANY_ADMIN_CREDENTIALS);
      
      // Verificar que cada usuario ha llegado a su dashboard
      await expect(advisorPage.locator('[data-testid="advisor-dashboard"]')).toBeVisible();
      await expect(companyPage.locator('[data-testid="company-dashboard"]')).toBeVisible();
    });
    
    // Paso 2: Navegar a las vistas Kanban respectivas
    await test.step('Navigate to Kanban boards', async () => {
      await advisorPage.click('[data-testid="kanban-nav-link"]');
      await companyPage.click('[data-testid="kanban-nav-link"]');
      
      // Verificar que cada usuario ve su tablero Kanban correspondiente
      await expect(advisorPage.locator('[data-testid="advisor-kanban-board"]')).toBeVisible();
      await expect(companyPage.locator('[data-testid="company-kanban-board"]')).toBeVisible();
    });
    
    // Paso 3: Registrar posiciones iniciales de tarjetas
    const applicationId = TEST_APPLICATIONS[0].id;
    let initialAdvisorPosition, initialCompanyPosition;
    
    await test.step('Record initial card positions', async () => {
      initialAdvisorPosition = await getKanbanCardPosition(advisorPage, applicationId);
      initialCompanyPosition = await getKanbanCardPosition(companyPage, applicationId);
      
      console.log(`Initial positions - Advisor: ${initialAdvisorPosition}, Company: ${initialCompanyPosition}`);
    });
    
    // Paso 4: Mover tarjeta en vista de Asesor
    await test.step('Move card in Advisor view', async () => {
      const targetStatus = 'IN_REVIEW';
      await moveKanbanCard(advisorPage, applicationId, targetStatus);
      
      // Verificar que la tarjeta se movió correctamente en la vista de Asesor
      const newAdvisorPosition = await getKanbanCardPosition(advisorPage, applicationId);
      expect(newAdvisorPosition).toBe(targetStatus);
      expect(newAdvisorPosition).not.toBe(initialAdvisorPosition);
    });
    
    // Paso 5: Verificar que la posición en la vista de Empresa NO cambió
    await test.step('Verify Company view remains unchanged', async () => {
      // Recargar la página para asegurarse de que se obtienen los datos más recientes
      await companyPage.reload();
      
      // Esperar a que el tablero cargue completamente
      await companyPage.waitForSelector('[data-testid="company-kanban-board"]');
      
      // Verificar que la posición de la tarjeta en la vista de Empresa sigue siendo la misma
      const currentCompanyPosition = await getKanbanCardPosition(companyPage, applicationId);
      expect(currentCompanyPosition).toBe(initialCompanyPosition);
    });
    
    // Paso 6: Mover tarjeta en vista de Empresa
    await test.step('Move card in Company view', async () => {
      const targetStatus = 'APPROVED';
      await moveKanbanCard(companyPage, applicationId, targetStatus);
      
      // Verificar que la tarjeta se movió correctamente en la vista de Empresa
      const newCompanyPosition = await getKanbanCardPosition(companyPage, applicationId);
      expect(newCompanyPosition).toBe(targetStatus);
      expect(newCompanyPosition).not.toBe(initialCompanyPosition);
    });
    
    // Paso 7: Verificar que la posición en la vista de Asesor NO cambió
    await test.step('Verify Advisor view remains unchanged', async () => {
      // Recargar la página para asegurarse de que se obtienen los datos más recientes
      await advisorPage.reload();
      
      // Esperar a que el tablero cargue completamente
      await advisorPage.waitForSelector('[data-testid="advisor-kanban-board"]');
      
      // Verificar la posición actual de la tarjeta en la vista de Asesor
      const currentAdvisorPosition = await getKanbanCardPosition(advisorPage, applicationId);
      
      // Esperamos que siga en la posición donde la dejamos (IN_REVIEW), no en la posición inicial ni en APPROVED
      expect(currentAdvisorPosition).not.toBe(initialAdvisorPosition);
      expect(currentAdvisorPosition).not.toBe('APPROVED'); // No debería haber cambiado a APPROVED
    });
    
    // Paso 8: Verificar que los indicadores de aprobación son visibles y correctos
    await test.step('Verify approval indicators', async () => {
      // Verificar indicadores en vista de Asesor
      const advisorApprovalBadge = advisorPage.locator(`[data-testid="company-approval-badge"][data-approved="true"]`);
      await expect(advisorApprovalBadge).toBeVisible();
      
      // Verificar indicadores en vista de Empresa
      const companyApprovalBadge = companyPage.locator(`[data-testid="advisor-approval-badge"][data-approved="false"]`);
      await expect(companyApprovalBadge).toBeVisible();
    });
    
    // Cerrar contextos
    await advisorContext.close();
    await companyContext.close();
  });
  
  test('should show approval status correctly across roles', async ({ browser }) => {
    // Establecer dos contextos de navegador
    const advisorContext = await browser.newContext();
    const companyContext = await browser.newContext();
    
    const advisorPage = await advisorContext.newPage();
    const companyPage = await companyContext.newPage();
    
    // Iniciar sesión y navegar a las vistas Kanban
    await login(advisorPage, ADVISOR_CREDENTIALS);
    await login(companyPage, COMPANY_ADMIN_CREDENTIALS);
    
    await advisorPage.click('[data-testid="kanban-nav-link"]');
    await companyPage.click('[data-testid="kanban-nav-link"]');
    
    const applicationId = TEST_APPLICATIONS[1].id;
    
    // Aprobar desde la vista de Asesor
    await test.step('Approve from Advisor view', async () => {
      await moveKanbanCard(advisorPage, applicationId, 'APPROVED');
      
      // Verificar que cambió a APPROVED
      const advisorPosition = await getKanbanCardPosition(advisorPage, applicationId);
      expect(advisorPosition).toBe('APPROVED');
    });
    
    // Verificar que el indicador de aprobación del Asesor es visible en la vista de Empresa
    await test.step('Verify approval indicator in Company view', async () => {
      await companyPage.reload();
      await companyPage.waitForSelector('[data-testid="company-kanban-board"]');
      
      const advisorApprovalBadge = companyPage.locator(`[data-testid="advisor-approval-badge"][data-approved="true"]`);
      await expect(advisorApprovalBadge).toBeVisible();
      
      // La tarjeta debería seguir en su columna original en la vista de Empresa
      const companyPosition = await getKanbanCardPosition(companyPage, applicationId);
      expect(companyPosition).not.toBe('APPROVED'); // No debería haberse movido a APPROVED
    });
    
    await advisorContext.close();
    await companyContext.close();
  });
});
```

### `utils.ts`

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Inicia sesión en la aplicación
 */
export async function login(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', credentials.email);
  await page.fill('[data-testid="password-input"]', credentials.password);
  await page.click('[data-testid="login-button"]');
  
  // Esperar a que se complete la navegación después del inicio de sesión
  await page.waitForURL('**/dashboard');
}

/**
 * Obtiene la posición actual de una tarjeta en el tablero Kanban
 * Retorna el ID de la columna (estado) donde se encuentra la tarjeta
 */
export async function getKanbanCardPosition(page: Page, applicationId: string): Promise<string> {
  // Buscar la tarjeta en el tablero
  const card = page.locator(`[data-testid="kanban-card-${applicationId}"]`);
  await expect(card).toBeVisible();
  
  // Obtener el padre Droppable que representa la columna
  const column = await card.evaluate(node => {
    let el = node as HTMLElement;
    while (el && !el.getAttribute('data-rbd-droppable-id')) {
      el = el.parentElement as HTMLElement;
    }
    return el ? el.getAttribute('data-rbd-droppable-id') : null;
  });
  
  return column || '';
}

/**
 * Mueve una tarjeta Kanban a una nueva columna
 */
export async function moveKanbanCard(page: Page, applicationId: string, targetStatus: string): Promise<void> {
  // Localizar la tarjeta a mover
  const card = page.locator(`[data-testid="kanban-card-${applicationId}"]`);
  
  // Localizar la columna de destino
  const targetColumn = page.locator(`[data-rbd-droppable-id="${targetStatus}"]`);
  
  // Realizar la operación de arrastrar y soltar
  const cardBox = await card.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  
  if (!cardBox || !targetBox) {
    throw new Error('No se pudo obtener la posición de la tarjeta o la columna destino');
  }
  
  // Calcular puntos de inicio y fin para la operación de arrastrar y soltar
  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;
  
  // Ejecutar la operación de arrastrar y soltar
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 }); // Mover en pasos para simular arrastre real
  await page.mouse.up();
  
  // Esperar a que se complete la actualización
  await page.waitForTimeout(1000); // Esperar a que se complete la animación y actualización
}
```

### `setup.ts`

```typescript
// Credenciales para las pruebas
export const ADVISOR_CREDENTIALS = {
  email: 'advisor@example.com',
  password: 'securepassword'
};

export const COMPANY_ADMIN_CREDENTIALS = {
  email: 'company@example.com',
  password: 'securepassword'
};

// Aplicaciones de prueba
export const TEST_APPLICATIONS = [
  {
    id: 'app-001',
    name: 'Test Application 1'
  },
  {
    id: 'app-002',
    name: 'Test Application 2'
  }
];
```

## Configuración de Playwright

### `playwright.config.ts`

```typescript
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    }
  ],
};

export default config;
```

## Ejecución de las Pruebas

```bash
# Instalar dependencias
npm install --save-dev playwright @playwright/test typescript

# Instalar navegadores
npx playwright install

# Ejecutar pruebas
npx playwright test
```

## Integración con GitHub Actions

Puedes integrar estas pruebas con GitHub Actions añadiendo un archivo `.github/workflows/kanban-tests.yml`:

```yaml
name: Kanban Independence Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start application
        run: npm run dev & npx wait-on http://localhost:3000
      - name: Run Playwright tests
        run: npx playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Notas Importantes para Desarrolladores

1. **Atributos data-testid requeridos**:
   - `[data-testid="advisor-dashboard"]` y `[data-testid="company-dashboard"]` en los dashboards
   - `[data-testid="kanban-nav-link"]` en el enlace de navegación
   - `[data-testid="advisor-kanban-board"]` y `[data-testid="company-kanban-board"]` en los tableros Kanban
   - `[data-testid="kanban-card-{id}"]` en cada tarjeta
   - `[data-testid="advisor-approval-badge"]` y `[data-testid="company-approval-badge"]` en los indicadores de aprobación
   - Atributo `data-approved="true|false"` en los badges para indicar estado de aprobación

2. **Estructura requerida de React Beautiful DnD**:
   - Atributos `data-rbd-droppable-id` en las columnas con el valor del estado
   - Atributos `data-rbd-draggable-id` en las tarjetas con el ID de la aplicación

3. **Modificaciones al Componente Kanban**:
   - Asegúrate de que la implementación del componente Kanban sigue las recomendaciones de la guía de desarrollo
   - Las tarjetas deben filtrarse por el campo de estado específico de cada rol
   - La actualización de estados debe afectar solo al campo específico del rol

## Pruebas Adicionales Sugeridas

1. **Pruebas de concurrencia**: Simular movimientos simultáneos de la misma tarjeta por diferentes roles
2. **Pruebas de estado inválido**: Intentar transiciones de estado inválidas (p.ej., de NEW a APPROVED sin pasar por IN_REVIEW)
3. **Pruebas de resiliencia**: Simular fallos de red durante las operaciones de arrastrar y soltar
4. **Pruebas de carga**: Verificar el rendimiento con un gran número de tarjetas

---

Este programa de prueba automática proporciona una verificación completa de la independencia entre las vistas Kanban para diferentes roles, asegurando que la aplicación funciona como se espera y mantiene la integridad de los datos en cada vista. 