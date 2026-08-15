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

## Fuentes oficiales

- Spotify Authorization Code Flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- YouTube OAuth: https://developers.google.com/youtube/v3/guides/authentication
- YouTube playlists: https://developers.google.com/youtube/v3/docs/playlists/list
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- SoundCloud API guide: https://developers.soundcloud.com/docs/api/guide
