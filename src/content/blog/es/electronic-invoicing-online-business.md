---
title: "Facturación electrónica para negocios online"
description: "Cómo aceptar pagos online y emitir facturas electrónicas conformes a la normativa desde una sola plataforma: las reglas regulatorias, el flujo de trabajo y el modelo de integración."
pubDate: 2026-05-20
author: "1Platform Team"
category: "payments-invoicing"
translationKey: "electronic-invoicing-online-business"
readingTime: 10
ogImage: "/og/blog-electronic-invoicing-online-business.png"
tags: ["facturación electrónica", "pagos", "cumplimiento", "ecommerce", "fel"]
---

## El cambio silencioso en el cumplimiento normativo

Durante la mayor parte de la última década, la facturación electrónica fue algo que solo preocupaba a las grandes empresas. La autoridad tributaria local exigía a las empresas emitir facturas firmadas digitalmente en un formato XML específico, mientras los pequeños negocios seguían imprimiendo PDFs con un logo arriba.

Esa ventana se cerró. En toda Latinoamérica, el sur de Europa y, cada vez más, en Asia, la norma converge en la misma forma: cada transacción comercial debe generar una factura electrónica, firmada por un proveedor autorizado, transmitida a la autoridad tributaria y entregada al cliente — todo dentro de una ventana que suele medirse en horas, a veces en minutos.

Si aceptas pagos online y no emites facturas electrónicas conformes a la normativa, una de estas tres cosas es cierta:

1. Estás operando por debajo del umbral que le importa a la autoridad (por lo general, no por mucho tiempo)
2. Estás expuesto a multas, retención de pagos o auditorías
3. Estás por perder clientes que necesitan una factura deducible de impuestos que no puedes emitir

La buena noticia: desde una perspectiva de ingeniería, este problema está resuelto. La mala noticia: la mayoría de los equipos lo resuelve mal, acoplando un proveedor de facturación a un sistema de checkout que no sabe nada de él.

Este artículo trata sobre cómo hacerlo bien cuando estás lanzando — o refactorizando — un negocio online.

## Qué requiere realmente la facturación electrónica

En los mercados que ya la implementaron, los requisitos principales resultan sorprendentemente similares:

- **Un identificador único de factura**, emitido por la autoridad tributaria, no por tu sistema. Lo solicitas a la autoridad (o a un proveedor autorizado que precarga un lote) y consumes uno por factura.
- **Una firma digital**, usando un certificado emitido a tu negocio. El certificado autentica que *tu* negocio emitió la factura, no alguien usando tu identificación tributaria.
- **Un payload estructurado** (normalmente XML) que contiene comprador, vendedor, ítems de línea, impuestos, totales y el identificador único.
- **Un paso de transmisión** que envía el payload firmado a la autoridad dentro de un plazo (a menudo 24 o 72 horas, a veces casi en tiempo real).
- **Un paso de entrega** que envía una versión legible para humanos (PDF) al cliente junto con el XML firmado.
- **Un requisito de archivo** que te obliga a conservar las copias firmadas durante varios años.

En la práctica, esto significa que cada venta se convierte en una transacción que no termina cuando se cobra la tarjeta, sino cuando la autoridad confirma la recepción de la factura firmada.

## La forma incorrecta: la facturación como algo secundario

La arquitectura más común en el mundo real luce así:

1. El cliente hace el checkout y paga con tarjeta
2. El procesador de pagos confirma el cobro
3. Se dispara un webhook, tu backend crea un pedido
4. Un cron job aparte (o un segundo webhook, o una exportación manual) envía el pedido a un proveedor de facturación
5. El proveedor de facturación emite una factura, falla en silencio si algo sale mal, y tu equipo se entera tres días después cuando un contador escribe un correo

Los modos de falla son predecibles:

- **Los reembolsos no se reflejan** porque el proveedor de facturación no conoce el webhook de reembolso
- **Las ediciones manuales de pedidos divergen** porque el panel actualiza solo el pedido, no la factura
- **Las autorizaciones fallidas dejan facturas fantasma** cuando la facturación se dispara antes de la confirmación de captura
- **Las tasas de impuesto se desalinean** porque la tasa vive en dos lugares
- **Hay descalces de moneda** entre el checkout y la factura porque los dos sistemas tienen tipos de cambio distintos

Cada uno de estos es una caída real en producción. No son errores que se arreglan una vez; son deuda de integración que sigue produciendo errores nuevos cada vez que uno de los dos sistemas cambia.

## La forma correcta: la facturación como un paso de primera clase

La alternativa es tratar la facturación igual que tratas los pagos: un paso integrado en el pipeline del pedido, propiedad del mismo sistema, con el mismo modelo de datos.

Así es como funciona en 1Platform:

- El checkout ya conoce tu identificación tributaria, la del cliente (si se solicita), la tasa de impuesto, los ítems de línea y la moneda
- Cuando la tarjeta autoriza, se crea el pedido
- Cuando la tarjeta captura, la factura se *emite en la misma transacción*
- Si la factura falla (la autoridad está caída, el lote de identificadores se agotó, hay un error de firma), el sistema reintenta automáticamente y lo muestra en el panel
- Si ocurre un reembolso, se genera una nota de crédito automáticamente
- Si un pedido se edita manualmente, el pedido y la factura se reemiten juntos

No hay un segundo sistema. No hay un webhook que mantener. No hay una exportación nocturna.

## Qué necesitas configurar

Del lado de la plataforma, la facturación electrónica se configura una vez por negocio. La configuración es:

- **Identificación tributaria y razón social** — lo que aparece en cada factura
- **Conexión con el proveedor autorizado** — la plataforma se encarga de la integración con el proveedor autorizado de la autoridad en tu país
- **Tasa de impuesto por defecto** — aplicada a la mayoría de los productos; se admiten excepciones por producto
- **Esquema de numeración de facturas** — por lo general dejas que la plataforma lo maneje; algunas autoridades exigen un formato específico
- **Destinatarios de correo** — por defecto, el cliente y tu bandeja de finanzas
- **Disparador de emisión** — por lo general `on_capture` (después de que el pago captura); `on_authorization` está disponible pero rara vez es correcto

Eso es todo. La mayoría de las tiendas dedica menos de diez minutos a este paso, una sola vez.

## Qué pasa en cada transacción

Una vez configurado, esto es lo que hace la plataforma en cada venta:

```
1. El cliente paga en el checkout
2. El pago se autoriza
3. Se crea el pedido (estado: autorizado)
4. El pago se captura
5. Se actualiza el pedido (estado: pagado)
6. Se arma el contenido de la factura (líneas, impuestos, datos del comprador)
7. Se firma el contenido con tu certificado
8. Se transmite el contenido a la autoridad tributaria
9. La autoridad responde con la confirmación y el identificador final de la factura
10. Se genera el PDF y se archiva el XML firmado
11. El cliente recibe la factura por correo electrónico
12. Queda una copia para el equipo de finanzas en el panel
```

Cada paso es visible en la vista de detalle del pedido. Si algo falla, la falla está en el pedido mismo, no enterrada en el panel de un proveedor separado.

## Reembolsos, notas de crédito y casos límite

La parte más difícil de la facturación electrónica no es el camino feliz. Es lo que pasa cuando algo cambia después de que la factura ya existe.

**Reembolso** — La mayoría de las autoridades exigen una *nota de crédito* en lugar de eliminar la factura original. La nota de crédito referencia la original, tiene su propio identificador único, se firma y se transmite por separado. La plataforma la emite automáticamente cuando se procesa un reembolso.

**Reembolso parcial** — Se emite una nota de crédito solo por el monto reembolsado. La factura original sigue siendo válida.

**Edición de pedido** — Si una línea del pedido se corrige antes de emitir la factura, la original se reemplaza. Si es después, se emite una nota de crédito más una factura nueva.

**El cliente solicita una identificación tributaria distinta** — Puedes reemitir una factura dentro de una ventana corta (normalmente el mismo día) emitiendo una nota de crédito para la original y una factura nueva con la identificación corregida.

**Autorización anulada** — No se emite ninguna factura (el disparador era `on_capture` y la captura nunca ocurrió).

Cada uno de estos es un flujo integrado, no un proceso manual.

## Múltiples mercados, múltiples autoridades

Si vendes a través de fronteras, los requisitos varían según la jurisdicción:

- **Guatemala** — FEL (Factura Electrónica en Línea), validada casi en tiempo real
- **México** — CFDI 4.0, con XML firmado por el PAC
- **Colombia** — factura electrónica validada por la DIAN
- **Chile** — DTE del SII
- **España** — Verifactu / SII / mandato B2B en despliegue
- **Argentina** — CAE de AFIP por factura

La plataforma abstrae cada autoridad detrás de una interfaz uniforme. Configuras una vez por negocio, y la plataforma enruta al proveedor autorizado correcto según el país del comprador y tu identificación tributaria. Si vendes B2C a través de fronteras, normalmente solo necesitas un país de emisión; si tienes entidades legales en varias jurisdicciones, puedes configurarlas como negocios separados bajo una misma cuenta.

## Por qué no deberías construir esto tú mismo

Todo equipo que intentó construir facturación electrónica internamente aprendió la misma lección: la especificación es larga, las reglas de validación cambian sin aviso, y los entornos de prueba de las autoridades se comportan distinto a producción.

La plataforma justifica su costo solo con esta funcionalidad. Las integraciones se mantienen de forma centralizada. Los cambios de esquema se absorben en las versiones. Las caídas de proveedores se sortean con reintentos. Tu equipo no escribe nada de este código.

Si eres ingeniero y leíste esto pensando "probablemente podría hacerlo en un sprint" — por favor, no lo hagas. Lo que se rompe no es la emisión. Es la larga cola de casos límite que solo aparecen a escala, y solo después de que la ley volvió a cambiar.

## Cómo agregar facturación a un negocio existente

Si ya aceptas pagos online en otro lado y quieres agregar facturación conforme a la normativa:

1. **Trae tus pagos a 1Platform** — el camino más simple. Una vez que los pagos están en la plataforma, la facturación es un solo interruptor.
2. **Usa la API de facturación de forma independiente** — es compatible, pero asumes el problema de sincronización. Cada solicitud manual de factura incluye el comprador, los ítems de línea, los totales y tu `business_id`. La plataforma emite, firma, transmite y devuelve los identificadores. Igual necesitas manejar reembolsos y notas de crédito desde tu sistema de pagos existente.

El primer camino es el que elige la mayoría de los equipos una vez que se dan cuenta de cuánta lógica exige el segundo.

## Por dónde empezar

El flujo de facturación de la plataforma está documentado de punta a punta en `developer.1platform.pro`, en "Facturación". La configuración del panel vive en Configuración del negocio → Facturación.

Si estás empezando desde cero, el orden recomendado es:

1. Agrega al menos un negocio con una identificación tributaria real
2. Sube tu certificado de firma
3. Emite una factura de prueba desde el panel
4. Conecta los pagos a través de 1Platform
5. Activa la emisión automática al capturar

La mayoría de los equipos completa esto en unas pocas horas, incluyendo la espera de la verificación del certificado.

La facturación electrónica es el tipo de funcionalidad en la que solo piensas cuando algo sale mal. El punto de usar una plataforma que se hace cargo de esto de punta a punta es que, el día en que algo hubiera salido mal, no te enteras — porque nada salió mal.
