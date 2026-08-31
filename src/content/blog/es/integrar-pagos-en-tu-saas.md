---
title: "Cómo integrar pagos en la API de tu SaaS"
description: "Una guía pensada para desarrolladores sobre cómo agregar una API de pagos a tu SaaS: URLs de checkout, webhooks, saldos, reembolsos y las decisiones de arquitectura que importan."
pubDate: 2026-05-20
author: "1Platform Team"
category: "payments-invoicing"
translationKey: "integrating-payments-into-your-saas"
readingTime: 11
ogImage: "/og/blog-integrating-payments-into-your-saas.png"
tags: ["api de pagos", "saas", "desarrolladores", "webhooks", "facturación"]
---

## Qué significa realmente "integrar pagos"

La frase es más corta que el trabajo. Cuando un SaaS dice "vamos a agregar pagos", normalmente hay cuatro funcionalidades distintas escondidas detrás de un solo ticket:

1. **Checkout** — una página alojada donde el usuario ingresa una tarjeta y se le cobra
2. **Webhooks** — eventos servidor a servidor cuando le pasa algo a ese cobro
3. **Saldo y libro contable** — un registro interno de quién pagó qué y cuánto le queda
4. **Reembolsos, reintentos y disputas** — las partes que la demo nunca muestra

Cada uno de esos es un sistema completo por sí solo. Hecho mal, terminas lanzando un checkout que funciona para los clientes del camino feliz y genera tickets de soporte para todos los demás. Hecho bien, terminas lanzando algo que sobrevive al primer contracargo, la primera caída de webhooks y la primera vez que un experimento de marketing duplica tu tráfico.

Este artículo es una guía pensada para desarrolladores sobre cómo hacer bien este trabajo usando la API de pagos de 1Platform. Los mismos principios aplican si usas un procesador distinto — la plataforma es solo el ejemplo.

## El modelo de dos tokens en 30 segundos

Si nunca integraste con la API de 1Platform, el modelo de autenticación importa porque afecta cómo conectas los pagos:

- **Token de app** (`Authorization: Bearer ak-...`) — del lado del servidor, identifica *tu aplicación* ante la plataforma
- **Token de usuario** (`x-user-token: sk-...`) — identifica *a uno de tus usuarios*, cuyo saldo afecta la operación

La mayoría de los endpoints de pago requiere ambos. El token de app dice "esta solicitud viene de MyApp". El token de usuario dice "y el usuario al que concierne es `user_abc123`". Esta separación te permite razonar sobre la autorización sin exponer credenciales a nivel de app en el navegador.

Para generar la URL de checkout, llamas a la API desde tu backend (con ambos tokens). El navegador nunca ve ninguno de los dos; solo ve la URL de checkout resultante.

## Paso 1 — Generar una URL de checkout

La URL de checkout es la pieza central de la integración. Tu backend llama a la plataforma con el monto, la descripción y algunas opciones; la plataforma devuelve una URL a la que rediriges al usuario.

```bash
curl -X POST https://api.1platform.pro/api/v1/users/transactions/checkout \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "x-user-token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 49.00,
    "currency": "USD",
    "description": "Pro plan — monthly",
    "metadata": {
      "plan_id": "pro_monthly",
      "internal_user_id": "u_842"
    },
    "success_url": "https://myapp.com/billing/thanks",
    "cancel_url": "https://myapp.com/billing"
  }'
```

La respuesta contiene un `checkout_url` al que rediriges el navegador. El campo `metadata` es un objeto de forma libre — cualquier cosa que pongas ahí vuelve a ti en cada webhook de esta transacción, que es lo que te permite reconciliar los eventos de la plataforma con tus registros internos.

Dos notas de implementación:

- `success_url` y `cancel_url` son a donde llega el usuario después del flujo. Úsalas para actualizar la UI de forma optimista, pero **nunca** marques al usuario como pagado solo porque llegó a `success_url`. El usuario llega a esa URL cuando el *redireccionamiento* se completa, no cuando el *pago* se completa. Marca al usuario como pagado solo cuando llegue el webhook.
- `metadata` es tu clave de reconciliación. Pon tu ID interno de usuario, tu ID interno de pedido, lo que necesites. Vuelve en cada evento.

## Paso 2 — Manejar webhooks

El webhook es lo que te dice que el pago realmente ocurrió. La plataforma envía uno a una URL que configuras, firmado con un HMAC de tu secreto.

Los eventos que te importan para pagos son:

- `transaction.created` — el cliente llegó al checkout (rara vez hay que actuar sobre esto)
- `transaction.approved` — la tarjeta autorizó correctamente
- `transaction.captured` — el cobro se capturó y los fondos se movieron
- `transaction.declined` — la tarjeta fue rechazada
- `transaction.refunded` — se emitió un reembolso
- `transaction.disputed` — el cliente inició un contracargo

El manejador de webhooks mínimo viable luce así en pseudocódigo:

```
1. Verifica la firma HMAC contra tu secreto
2. Parsea el evento
3. Si el `event_id` ya se procesó, responde 200 (idempotencia)
4. Guarda el evento en tu base de datos
5. Actualiza el registro del usuario según `event.type` y `event.metadata`
6. Responde 200
```

Algunas cosas con las que la gente tropieza:

- **Verifica la firma primero.** Siempre. De lo contrario, un atacante puede forjar eventos `transaction.captured` y otorgarse acceso a sí mismo.
- **La idempotencia es obligatoria, no opcional.** La plataforma reintenta ante cualquier respuesta que no sea 2xx, y un problema de red de tu lado va a producir entregas duplicadas incluso si respondiste 200. Mantén una tabla de `event_id` → estado.
- **No bloquees la respuesta.** Procesa el evento de forma asíncrona si toma más de uno o dos segundos. La plataforma espera un 2xx rápido; las tareas de larga duración van en un job en segundo plano disparado por el evento.
- **Prueba la ruta de falla.** Reproduce un evento después de marcarlo como procesado y verifica que tu manejador no haga nada.

## Paso 3 — Mantén tu modelo de saldo interno

Si tu SaaS es por consumo (por llamada de API, por mensaje, por render), necesitas un saldo interno.

La plataforma en sí mantiene un saldo por usuario que puedes leer y ajustar:

- `GET /api/v1/users/me/billing` — saldo actual, uso mensual, plan
- `POST /api/v1/users/balance/credit` — acredita el saldo (después de un pago exitoso)
- `POST /api/v1/users/balance/debit` — debita el saldo (después de una operación exitosa)

El patrón que funciona:

- **No manejes dos libros contables.** Usa el saldo de la plataforma como fuente de verdad. Tu propia base de datos lo cachea.
- **Debita antes de la operación, no después.** Reserva el saldo, ejecuta la operación, confirma o reembolsa.
- **Haz que los reembolsos sean idempotentes.** Si reembolsas $5 dos veces porque se dispararon dos webhooks, tu equipo de soporte te va a odiar.

Un flujo de consumo luce así:

```
1. El usuario dispara la operación en tu aplicación
2. Tu backend llama a `debit(user, cost)`
3. Si el débito falla (saldo insuficiente), responde 402 al cliente
4. Ejecuta la operación
5. Si la operación falla, llama a `refund(user, cost)`
6. Devuelve el resultado
```

La respuesta `402 Payment Required` está estandarizada en la API — tu frontend puede detectarla y ofrecerle al usuario un flujo de recarga sin que tu código tenga que hacer un caso especial por cada endpoint.

## Paso 4 — Construye el flujo de recarga

Cuando un usuario se queda sin saldo, necesita un camino rápido de vuelta a "cliente que paga". La versión más corta:

1. El frontend llama a un endpoint protegido por débito y recibe un 402
2. El frontend muestra un modal con tres montos de recarga sugeridos y un campo personalizado
3. El usuario elige un monto
4. El frontend llama a tu backend para generar una URL de checkout con el monto elegido
5. El usuario es redirigido al checkout y paga
6. Se dispara el webhook `transaction.captured`
7. Tu manejador de webhooks llama a `credit(user, amount)`
8. El frontend sondea el saldo del usuario hasta que se actualiza (o usa el flujo de webhook → notificación in-app de la plataforma)

El paso de sondeo suele omitirse en la primera implementación y aparece como un ticket de soporte de "pagué pero no tengo créditos". Resuélvelo sondeando (simple) o enviando la actualización al cliente vía SSE/WebSocket (más limpio).

## Paso 5 — Suscripciones vs. pago por uso

Si tu SaaS tiene planes de tarifa fija y precios por consumo, necesitas decidir cómo interactúan.

El modelo que la plataforma soporta de fábrica:

- **Plan** = una tarifa recurrente que otorga una asignación mensual (o uso ilimitado de algunos endpoints)
- **Saldo** = créditos de recarga usados para cualquier consumo por encima de la asignación

Un usuario en el plan "Pro" recibe una asignación mensual de N unidades; una vez que la supera, se consume el saldo; una vez que el saldo se agota, la siguiente operación devuelve 402. La plataforma maneja la facturación de renovación como transacciones recurrentes, que disparan los mismos webhooks que los cobros únicos.

El costo de implementación es sobre todo hacer que tu superficie de API sea honesta sobre qué endpoints están incluidos en el plan y cuáles son de pago por llamada. La plataforma te da una configuración de precios por endpoint y un header de respuesta `X-Operation-Cost` para que el frontend pueda mostrar el costo de cada llamada antes de ejecutarla.

## Paso 6 — Reembolsos, disputas y la cola larga

La parte poco glamorosa de la integración.

**Reembolsos** — `POST /api/v1/users/transactions/{id}/refund` con un `amount` opcional (reembolso completo si se omite). Se dispara el webhook `transaction.refunded`. Si la facturación está activada, se emite una nota de crédito automáticamente. Tu manejador debería debitar el saldo del usuario por el monto reembolsado.

**Disputas** — Fuera de tu control. La plataforma te notifica con `transaction.disputed`. Por lo general tienes una ventana para subir evidencia; revisa el panel de la plataforma. Las disputas cuestan la comisión de contracargo incluso si ganas, así que la estrategia correcta es prevenirlas con descriptores de facturación claros, políticas de reembolso accesibles y soporte al cliente rápido.

**Renovaciones fallidas** — Una renovación de suscripción puede fallar (tarjeta vencida, fondos insuficientes). Se dispara el webhook `transaction.declined`. Por lo general conviene reintentar una vez con un retraso y luego bajar al usuario a un plan gratuito en lugar de bloquearle el acceso.

**Cambio de moneda** — Si vendes en varias regiones, decide de una vez si cobras en la moneda local del usuario (mejor UX, el riesgo cambiario es tuyo) o en una sola moneda base (contabilidad más simple, fricción del lado del cliente). La plataforma soporta ambas; la llamada a la API solo difiere en el campo `currency`.

## Qué no hacer

Una lista corta de errores que aparecen con frecuencia:

- **No marques a los usuarios como pagados en `success_url`.** Espera al webhook.
- **No confíes en webhooks sin firmar.** Verifica el HMAC.
- **No escribas chequeos como `if amount == 49.00` en tu manejador.** Usa `metadata` para identificar el plan, y luego busca el precio en tu configuración.
- **No sondees la plataforma cada minuto para revisar el estado de una transacción.** Los webhooks están diseñados para esto.
- **No ejecutes el débito y la operación en transacciones distintas si tu base de datos soporta una sola.** Una falla parcial que debita sin ejecutar la operación es un bug grave.
- **No guardes números de tarjeta.** El checkout de la plataforma está alojado por una razón. Nunca deberías ver, registrar o tocar un PAN.

## Por dónde empezar

La API de pagos completa está documentada en `developer.1platform.pro`, en "Pagos". El flujo de punta a punta de Pagos + Facturación recorre cada endpoint mencionado arriba con ejemplos listos para copiar y pegar.

Para un SaaS que ya tiene usuarios y solo necesita agregar pagos, la integración mínima es:

1. Un endpoint de backend que genera URLs de checkout
2. Un manejador de webhooks para `transaction.captured` y `transaction.refunded`
3. Un modal de UI que abre la URL de checkout cuando un usuario recibe un 402
4. Un job interno que reintenta las renovaciones fallidas

La mayoría de los equipos lanza la primera versión en unos días y la endurece a lo largo de dos iteraciones. La plataforma maneja el cumplimiento normativo, el alcance de PCI, el filtrado de fraude y el reporte a las autoridades; tu equipo se enfoca en la lógica de integración que vive encima.

Si quieres discutir decisiones de arquitectura para un modelo de facturación no trivial — límites de uso, cuentas de equipo, upgrades prorrateados — la página para desarrolladores en `/for-developers/` es el punto de entrada correcto.

Los pagos son una de esas funcionalidades que se ven fáciles en las páginas de marketing y se convierten en un proyecto de varios trimestres cuando los construyes desde cero. El punto de construir sobre una API de pagos que ya resuelve las partes difíciles es que el trabajo que lanzas es el trabajo que tus usuarios realmente notan.
