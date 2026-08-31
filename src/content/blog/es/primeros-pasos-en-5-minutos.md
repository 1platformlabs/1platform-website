---
title: "Primeros pasos con 1Platform: de cero a contenido publicado en 5 minutos"
description: "Un tutorial de inicio rápido que muestra cómo pasar de crear tu cuenta a publicar tu primer artículo usando la API de 1Platform."
pubDate: 2024-10-25
author: "1Platform Team"
category: "api-tutorials"
translationKey: "getting-started-5-minutes"
readingTime: 5
tags: ["tutorial", "primeros-pasos", "api", "quickstart"]
---

## Requisitos previos

Solo necesitas una cuenta de 1Platform y una herramienta para hacer solicitudes HTTP (cURL, Postman o cualquier lenguaje de programación).

## Paso 1: obtén tu token de API

Después de crear tu cuenta, intercambia tu clave de API por un token JWT:

```bash
curl -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

## Paso 2: agrega tu sitio web

Registra tu sitio web en la plataforma:

```bash
curl -X POST https://api.1platform.pro/api/v1/users/websites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://yourblog.com", "name": "My Blog"}'
```

## Paso 3: genera tu primer artículo

Envía un trabajo de generación de contenido:

```bash
curl -X POST https://api.1platform.pro/api/v1/posts/content/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"keyword": "your target keyword", "website_id": "WEBSITE_ID"}'
```

## Paso 4: verifica el estado del trabajo

La generación de contenido es asíncrona. Consulta el estado del trabajo:

```bash
curl https://api.1platform.pro/api/v1/posts/content/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Paso 5: publica

Cuando el trabajo termina, el contenido está listo. Si tienes configurada la publicación en tu CMS, puede publicarse automáticamente.

¡Eso es todo! De crear tu cuenta a contenido publicado en 5 pasos. Consulta nuestra [documentación completa](https://developer.1platform.pro/) para funciones avanzadas.
