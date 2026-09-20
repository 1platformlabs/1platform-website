/**
 * Sonda del banco para SDD-05 — el 301 de la dirección de plataforma al dominio propio.
 *
 * Pega contra el proceso REAL del sitio (`dist/server/entry.mjs`, build de
 * producción, adaptador Node) usando `http.request` con la cabecera `Host`
 * puesta a mano. **No** usa `fetch`: `fetch` descarta el `Host` que le pases y
 * manda el de la URL, así que un sitio multiinquilino probado con `fetch` mide
 * siempre el mismo inquilino y miente.
 *
 *   SITE=http://127.0.0.1:5121 node tests/bench/probe-sitios-subdominio.mjs
 *   SITE=http://127.0.0.1:4421 CONTROL=1 node tests/bench/probe-sitios-subdominio.mjs
 *
 * El sitio habla con la API del banco, así que el manifiesto —y su
 * `redirect_to`— salen de una Mongo real y no de un doble. Los casos que
 * RENDERIZAN usan `oneplatform`, que es el único inquilino del banco con copia
 * de verdad (48 documentos sembrados por `seed_site_pages.py`): un inquilino
 * sin copia no puede renderizar, y probar ahí mediría la falta del fixture.
 */
import http from 'node:http'

const SITE = new URL(process.env.SITE ?? 'http://127.0.0.1:5121')
const CONTROL = process.env.CONTROL === '1'
const TAG = 'E2E-SUS-1'
const slug = TAG.toLowerCase()
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `   — ${detail}` : ''}`)
}

/** Un GET con el `Host` que se le pida, reintentando los cortes de transporte. */
function get(host, path, attempt = 0) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: SITE.hostname,
        port: SITE.port,
        path,
        method: 'GET',
        headers: { host },
        timeout: 25000,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            truncated: false,
          }),
        )
        // ⚠️ `aborted`/`error` en la RESPUESTA, no sólo en el pedido. Un
        // inquilino publicado al que le falta la copia de la ruta hace que el
        // render reviente A MITAD DEL STREAM: las cabeceras ya salieron con
        // 200 y el cuerpo se corta. Sin estos dos manejadores la promesa no se
        // resuelve nunca, el bucle de eventos se vacía y node sale con 0 —
        // exactamente igual que una corrida exitosa, pero sin resumen. Costó
        // tres corridas leerlo como «la sonda se cuelga».
        const cut = () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            truncated: true,
          })
        res.on('aborted', cut)
        res.on('error', cut)
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  }).catch(async (err) => {
    if (attempt >= 3) throw err
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    return get(host, path, attempt + 1)
  })
}

/**
 * Reintenta mientras la respuesta sea el 503 de «no pude preguntarle a la API».
 *
 * El sitio le da 3 s a la API y la VM de contenedores de este banco está
 * compartida con otros proyectos, así que un 503 aislado es ruido del entorno y
 * no la respuesta del producto. Un 503 que sobrevive cinco intentos sí lo es.
 */
async function getStable(host, path) {
  let last
  for (let i = 0; i < 6; i += 1) {
    last = await get(host, path)
    if (last.status !== 503) return last
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
  }
  return last
}

async function main() {
  // ══ El caso REAL: `oneplatform`, con sus 48 documentos de copia ══════════
  // Su dominio propio (`1platform.pro`) está confirmado, así que su dirección
  // de plataforma (`oneplatform.1platform.pro`) tiene que redirigir.
  //
  // ⚠️ La ruta lleva barra final a propósito: el adaptador Node normaliza la
  // barra ANTES del middleware, así que `/pricing` sale con un 301 propio de
  // Astro (`Location: /pricing/`) que no es el de esta épica. Medirlo sin la
  // barra hace pasar la aserción por la razón equivocada.
  let r = await getStable('oneplatform.1platform.pro', '/pricing/?ref=e2e')
  check(
    'SDD-05 CA-1 · la dirección de plataforma responde 301 al dominio propio, con ruta y query',
    r.status === 301 && r.headers.location === 'https://1platform.pro/pricing/?ref=e2e',
    `HTTP ${r.status} location=${r.headers.location}`,
  )
  check(
    'SDD-05 CA-1 · el 301 no renderiza la página (cuerpo vacío)',
    r.status === 301 && (r.body ?? '').length === 0,
    `bytes=${(r.body ?? '').length}`,
  )
  check(
    'SDD-05 CA-4 · el 301 lleva `cache-control` acotado y no eterno',
    /max-age=([1-9]\d*)/.test(r.headers['cache-control'] ?? ''),
    `cache-control=${r.headers['cache-control']}`,
  )

  // CA-2/CA-3 · por su PROPIO dominio sirve la página y NO redirige. Es el
  // control del bucle: el 301 de arriba sólo es seguro si este es un 200.
  r = await getStable('1platform.pro', '/pricing/')
  check(
    'SDD-05 CA-2/CA-3 · por su propio dominio sirve la página y no redirige (sin bucle)',
    r.status === 200 && r.body.includes('<html') && r.body.length > 10000,
    `HTTP ${r.status} location=${r.headers.location ?? '-'} bytes=${r.body.length}`,
  )
  // …y por un ALIAS tampoco redirige.
  r = await getStable('www.1platform.pro', '/')
  check(
    'SDD-05 CA-3 · por un alias tampoco redirige',
    r.status === 200,
    `HTTP ${r.status} location=${r.headers.location ?? '-'}`,
  )

  // CA-2 · un sitio SIN dominio propio confirmado no redirige: su dirección de
  // plataforma es donde vive. (`e2e-sus-1-unconf` tiene `domain_is_final=false`.)
  r = await getStable(`${slug}-unconf.1platform.pro`, '/')
  check(
    'SDD-05 CA-2 · con el dominio propio SIN confirmar, la dirección de plataforma no redirige',
    r.status !== 301,
    `HTTP ${r.status} location=${r.headers.location ?? '-'}`,
  )

  // Controles negativos del propio sitio.
  r = await getStable('zzqx-noexiste-7k.1platform.pro', '/')
  check(
    'SDD-05 · control · un subdominio inventado no recibe el sitio de nadie',
    r.status === 404,
    `HTTP ${r.status}`,
  )
  r = await getStable('api.1platform.pro', '/')
  check(
    'SDD-05 · control · `api.1platform.pro` no recibe el sitio del slug `api`',
    r.status === 404,
    `HTTP ${r.status}`,
  )

  const ok = results.filter((x) => x.ok).length
  console.log(`\n${CONTROL ? 'CONTROL' : 'RAMA'}: ${ok}/${results.length} en verde`)
  if (ok !== results.length) {
    console.log('Rojos:')
    for (const x of results.filter((y) => !y.ok)) console.log(`  - ${x.name}`)
  }
  // `process.exit()` a secas TRUNCA la salida: en macOS `console.log` a una
  // tubería es asíncrono, y la corrida anterior perdió tres líneas y el resumen
  // entero por eso — lo que se lee como «la sonda se colgó».
  process.exitCode = ok === results.length ? 0 : 1
}

main().catch((e) => {
  console.error('la sonda murió:', e)
  process.exitCode = 2
})
