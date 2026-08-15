# Evaluación de proveedores musicales — 15 de agosto de 2026

## Spotify

La app técnica de SongTap aún no puede crearse desde el panel de Spotify, por lo que el vínculo OAuth individual por Manager queda pendiente. El modelo diseñado mantiene una conexión, tokens renovables y playlist seleccionada por `venueId`.

## YouTube / YouTube Music

La alternativa oficial disponible es **YouTube Data API**, no una API pública independiente de YouTube Music. Permite búsquedas de videos y metadatos, así como playlists del usuario mediante OAuth. Cada Manager puede autorizar su propia cuenta de Google/YouTube y el servicio puede guardar la conexión por `venueId`.

No debe presentarse como un sustituto de licenciamiento para música ambiental o reproducción pública en locales. La plataforma y las licencias de comunicación pública deben revisarse antes de usarla para reproducir música comercial.

## SoundCloud

SoundCloud ofrece API oficial y OAuth 2.1 con PKCE. El flujo Authorization Code permite acciones sobre la cuenta del usuario, incluidas playlists; Client Credentials solo permite recursos públicos. Exige una app técnica con Client ID y Client Secret, igual que Spotify o Google.

## Recomendación de arquitectura

Mantener un adaptador de proveedor por local, con una tabla de conexión vinculada a `venueId`, tokens solo en servidor, estado de renovación y modo manual de respaldo. En la interfaz se mostrará el proveedor conectado y jamás se reutilizarán conexiones entre locales.

## Comparación de opciones sin costo directo

| Opción | Uso viable en SongTap | Costo inicial / límite relevante | Decisión |
|---|---|---|---|
| **YouTube Data API** | Búsqueda de videos, datos de playlists y metadatos por cuenta Manager mediante OAuth. | Incluye una cuota predeterminada: hasta 100 llamadas `search.list` al día y 10.000 unidades diarias combinadas. Requiere un proyecto y cliente OAuth de Google Cloud, pero la documentación de cuota no indica un cargo por la cuota base. | **Opción preferida** para metadatos por local cuando se cree el proyecto técnico. |
| **Discogs API** | Catálogo de lanzamientos, artistas, títulos y créditos; no es una cola de streaming. | El contenido CC0 puede usarse bajo sus condiciones; existen restricciones y atribución obligatoria, con límites que Discogs puede imponer. | Alternativa complementaria para catálogo físico, no para la primera integración de canciones solicitadas. |
| **MusicBrainz** | Datos abiertos de obras, artistas y grabaciones; no requiere API key. | El servicio web sin acuerdo comercial es gratuito solo para uso no comercial y exige máximo una petición por segundo. | No seleccionar para el ERP comercial sin acuerdo con MetaBrainz. |
| **Last.fm** | Metadatos y enlaces de catálogo; no reproduce música. | El uso comercial exige un acuerdo comercial y atribución. | No seleccionar. |
| **Deezer** | La API tiene acceso gratuito para páginas y aplicaciones personales. | Sus términos limitan el servicio y contenido a propósito y entorno no comercial. | No seleccionar para locales comerciales. |
| **TheAudioDB** | Búsqueda básica de artistas, álbumes y canciones. | Ofrece API v1 gratuita con capacidad limitada; la v2 moderna y límites mayores requieren plan premium. | Útil para prototipos, no como proveedor principal de producción. |

## Conclusión actual

La mejor ruta sin costo directo es mantener **YouTube Data API** como proveedor de metadatos por Manager, usando la cuota base de Google y protegiendo las llamadas con caché y límites internos. La integración no habilita ni licencia reproducción pública: SongTap mantiene el control manual de Staff y cada local debe contar con los permisos musicales que le correspondan.

## Fuentes oficiales

- Spotify Authorization Code Flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- YouTube OAuth: https://developers.google.com/youtube/v3/guides/authentication
- YouTube playlists: https://developers.google.com/youtube/v3/docs/playlists/list
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- SoundCloud API guide: https://developers.soundcloud.com/docs/api/guide
- YouTube Data API quota calculator: https://developers.google.com/youtube/v3/determine_quota_cost
- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz data license: https://musicbrainz.org/doc/About/Data_License
- Last.fm API terms: https://www.last.fm/api/tos
- Discogs API terms: https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use
- Deezer developer terms: https://developers.deezer.com/termsofuse
- TheAudioDB free API: https://www.theaudiodb.com/free_music_api
