import { defineMessages } from '@i18n/ui';

/**
 * ProcessSpine's own default steps + label — used only by the one caller that
 * mounts it with no props (the home page's bare `<ProcessSpine />`). Every
 * other caller passes its own `steps`/`label`, which live in that caller's
 * page module, not here.
 */
export default defineMessages({
  en: {
    'processSpine.defaultLabel': 'How it works, step by step',
    'processSpine.step.account': 'Create your account',
    'processSpine.step.pick': 'Pick: store or website',
    'processSpine.step.domain': 'Connect your domain',
    'processSpine.step.content': 'Generate content',
    'processSpine.step.payments': 'Enable payments and invoicing',
    'processSpine.step.live': 'Go live',
  },
  es: {
    'processSpine.defaultLabel': 'Cómo funciona, paso a paso',
    'processSpine.step.account': 'Crea tu cuenta',
    'processSpine.step.pick': 'Elige: tienda o sitio web',
    'processSpine.step.domain': 'Conecta tu dominio',
    'processSpine.step.content': 'Genera contenido',
    'processSpine.step.payments': 'Activa pagos y facturación',
    'processSpine.step.live': 'Publica',
  },
});
