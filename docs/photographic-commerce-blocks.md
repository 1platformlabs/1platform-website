# Bloques comerciales opcionales de la composición fotográfica

`PhotographicServiceHome.astro` sirve a Medipago, a 1Platform (perfiles
anteriores) y a tenants comerciales. Los bloques de esta página son opcionales:
existen sólo si el contenido del tenant (`SitePages`, ruta `/`) los publica, y
`src/lib/photographic-content.ts` los valida. Un tenant sin estas claves conserva su presentación anterior. Los estilos nuevos
se cargan por URL sólo cuando publica tienda, correo o el modo uniforme; no
cambian el bundle CSS que reciben las otras composiciones.

| Bloque | Claves (`photographic.…`) | Validación |
|---|---|---|
| Delivery | `verticals.delivery.{eyebrow,title,description,stageLabel,panelTitle,tag,orderTitle,orderNote,cta}`, `milestones.{0..2}.{title,text}`, `benefits.{0,1}` | existe si hay `title`; el resto es obligatorio |
| Tienda | `verticals.store.{eyebrow,title,description,stageLabel,panelTitle,tag,address,summaryTitle,summaryText,cta}`, `products.{0,1}.{title,category,icon}`, `benefits.{0,1}`, `contact.messages.store` | opcional por `title`; contenido completo e iconos cerrados |
| Correo | `verticals.email.{eyebrow,title,description,stageLabel,panelTitle,tag,identityLabel,address,messageLabel,subject,message,signature,cta}`, `benefits.{0,1}`, `contact.messages.email` | opcional por `title`; dirección ilustrativa en texto, sin mailto |
| Cuadrícula uniforme | `solutions.mode=uniform` | opcional; tres cobros + capacidades publicadas en una cuadrícula; anuncios aparte |
| Anuncios | `verticals.ads.{eyebrow,title,description,stageLabel,panelTitle,tag,brand,creative,channels,cta}`, `plan.{0,1}.{term,value}`, `benefits.{0,1}` | existe si hay `title` |
| Canal nombrado | `verticals.ads.mode` = `meta` | configuración de staff; habilita `{adsName}`, `{adsNetwork1}`, `{adsNetwork2}` |
| Accesos directos | `solutions.linksLabel`, `solutions.links.N.{label,href,footerLabel?}` | 2–8, anclas `#cobros-presenciales`, `#enlaces-de-cobro`, `#facturacion`, `#delivery`, `#tienda-online`, `#correo-profesional`, `#anuncios`, sólo si el bloque destino existe |
| Recorrido | `route.label`, `route.items.N.{title,text,icon}` | 2–6 pasos |
| Íconos | `hero.featureN.icon`, `audience.items.N.icon`, `route.items.N.icon` | lista cerrada `ILLUSTRATION_ICONS` |
| Calculadora | `calculator.mode` = `manual` + `calculator.{formTitle,amount,rate,ratePlaceholder,rateHelp,submit,result,fee,empty,changed,incomplete,done,invalidAmount,invalidRate,title,description,contact,note}`, `ui.calculator_nojs` | el visitante escribe el porcentaje; no hay tarifa del tenant |
| Escala | `theme.typeScale` = `compact` | excluye la revisión de legibilidad de `collections` |
| Pie | `actions.footer`, `illustrations.linkFootnote` | opcionales; por defecto `actions.header` y `hero.feature2` |
| Contacto | `contact.messages.{delivery,store,email,ads}` | obligatorias con su vertical |

Las claves que terminan en `.href`, `.icon`, `.mode`, `theme.*` y
`contact.messages.*` son configuración para el API: el dueño del sitio no las
edita desde su panel. Un marcador `{ads…}` en un tenant sin canal se muestra
literal y no rompe la página.

## Por qué los nombres del canal no viven en el contenido

El API rechaza «Meta Ads», «Facebook» e «Instagram» en todo texto guardado, y
`scripts/check-tells.sh` (regla 10) los prohíbe en `src/`. Un tenant que vende
ese canal como servicio propio necesita nombrarlo: los nombres están en
`src/lib/advertising-channels.ts`, única excepción de la regla 10 por lugar y
por palabra (con self-tests de control negativo), y se muestran sólo con la
configuración `verticals.ads.mode`. El resto de la protección no cambia.

Primer caso: Vende Fácil (`vendefacil.1platform.pro`). Contenido y activación:
`epics/vendefacil-landing/contenido/` del monorepo.

## Servicios uniformes

`solutions.mode=uniform` conserva el orden cobros/enlaces/facturación y añade
Delivery/Tienda/Correo, si existen, a una sola cuadrícula con `grid-auto-rows: 1fr`.
La altura la decide el contenido. En 561–1100 px cada tarjeta es una fila de dos
columnas; hasta 560 px es vertical. Las ilustraciones son ejemplos; sus CTA
navegan a `destinations.support` (o app, según el contrato anterior), con el
mensaje propio sólo si ese canal admite `text`. No hay operaciones comerciales.

Sin ese modo se conserva la composición anterior, incluso con Delivery/anuncios.
Los iconos nuevos son `bag`, `book`, `mail`; se emiten sólo cuando se necesitan.
La dirección de correo ilustrativa conserva `email_off` para evitar la
ofuscación automática del borde, como el bloque de correo anterior.

Parche, diff y reversión: [activación](content-patches/vendefacil-servicios-uniformes/ACTIVACION.md).
