# Bloques comerciales opcionales de la composición fotográfica

`PhotographicServiceHome.astro` sirve a Medipago, a 1Platform (perfiles
anteriores) y a tenants comerciales. Los bloques de esta página son opcionales:
existen sólo si el contenido del tenant (`SitePages`, ruta `/`) los publica, y
`src/lib/photographic-content.ts` los valida. Un tenant sin estas claves sirve el
mismo HTML que antes.

| Bloque | Claves (`photographic.…`) | Validación |
|---|---|---|
| Delivery | `verticals.delivery.{eyebrow,title,description,stageLabel,panelTitle,tag,orderTitle,orderNote,cta}`, `milestones.{0..2}.{title,text}`, `benefits.{0,1}` | existe si hay `title`; el resto es obligatorio |
| Anuncios | `verticals.ads.{eyebrow,title,description,stageLabel,panelTitle,tag,brand,creative,channels,cta}`, `plan.{0,1}.{term,value}`, `benefits.{0,1}` | existe si hay `title` |
| Canal nombrado | `verticals.ads.mode` = `meta` | configuración de staff; habilita `{adsName}`, `{adsNetwork1}`, `{adsNetwork2}` |
| Accesos directos | `solutions.linksLabel`, `solutions.links.N.{label,href,footerLabel?}` | 2–8, anclas `#cobros-presenciales`, `#enlaces-de-cobro`, `#facturacion`, `#delivery`, `#anuncios`, sólo si el bloque destino existe |
| Recorrido | `route.label`, `route.items.N.{title,text,icon}` | 2–6 pasos |
| Íconos | `hero.featureN.icon`, `audience.items.N.icon`, `route.items.N.icon` | lista cerrada `ILLUSTRATION_ICONS` |
| Calculadora | `calculator.mode` = `manual` + `calculator.{formTitle,amount,rate,ratePlaceholder,rateHelp,submit,result,fee,empty,changed,incomplete,done,invalidAmount,invalidRate,title,description,contact,note}`, `ui.calculator_nojs` | el visitante escribe el porcentaje; no hay tarifa del tenant |
| Escala | `theme.typeScale` = `compact` | excluye la revisión de legibilidad de `collections` |
| Pie | `actions.footer`, `illustrations.linkFootnote` | opcionales; por defecto `actions.header` y `hero.feature2` |
| Contacto | `contact.messages.{delivery,ads}` | obligatorias con su vertical |

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
