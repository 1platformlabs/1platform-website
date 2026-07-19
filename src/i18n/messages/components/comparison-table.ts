import { defineMessages } from '@i18n/ui';

/**
 * ComparisonTable's own copy: the two column eyebrows, the accessible mark
 * labels that stand in for the (visually hidden on mobile) column headers,
 * and the six default rows shown when a page mounts the table without
 * passing its own `rows` prop (currently the home page and the solutions
 * overview page).
 */
export default defineMessages({
  en: {
    'comparisonTable.eyebrow.without': 'Separate tools',
    'comparisonTable.eyebrow.with': '1Platform',
    'comparisonTable.mark.without': 'Separate tools:',
    'comparisonTable.mark.with': '1Platform:',
    'comparisonTable.row1.without': 'A separate subscription per tool to manage and renew',
    'comparisonTable.row1.with': 'One account, one bill',
    'comparisonTable.row2.without': 'You wire the integrations between them yourself',
    'comparisonTable.row2.with': 'Capabilities already connected',
    'comparisonTable.row3.without': 'Each tool ships its own API, auth and error format',
    'comparisonTable.row3.with': 'One REST API, one token pair',
    'comparisonTable.row4.without': 'Customer and order data split across dashboards',
    'comparisonTable.row4.with': 'One dashboard, one source of truth',
    'comparisonTable.row5.without': 'Invoices reconciled by hand against payments',
    'comparisonTable.row5.with': 'Invoices issued from every transaction',
    'comparisonTable.row6.without': 'Content copy-pasted between tools to publish',
    'comparisonTable.row6.with': 'Content generated and published in place',
  },
  es: {
    'comparisonTable.eyebrow.without': 'Herramientas sueltas',
    'comparisonTable.eyebrow.with': '1Platform',
    'comparisonTable.mark.without': 'Herramientas sueltas:',
    'comparisonTable.mark.with': '1Platform:',
    'comparisonTable.row1.without':
      'Una suscripción por separado para cada herramienta, que hay que gestionar y renovar',
    'comparisonTable.row1.with': 'Una cuenta, una factura',
    'comparisonTable.row2.without': 'Tú conectas las integraciones entre ellas',
    'comparisonTable.row2.with': 'Funciones ya conectadas',
    'comparisonTable.row3.without':
      'Cada herramienta trae su propia API, autenticación y formato de error',
    'comparisonTable.row3.with': 'Una API REST, un solo par de tokens',
    'comparisonTable.row4.without': 'Datos de clientes y pedidos repartidos entre paneles',
    'comparisonTable.row4.with': 'Un panel, una única fuente de verdad',
    'comparisonTable.row5.without': 'Facturas conciliadas a mano contra los pagos',
    'comparisonTable.row5.with': 'Facturas emitidas desde cada transacción',
    'comparisonTable.row6.without': 'Contenido copiado y pegado entre herramientas para publicarlo',
    'comparisonTable.row6.with': 'Contenido generado y publicado directamente',
  },
});
