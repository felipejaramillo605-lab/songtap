# Auditoría de Accesibilidad — SongTap

Este documento registra la auditoría y cumplimiento de accesibilidad (WCAG 2.1 AA / WCAG 1.4.4 / 1.4.10) para la plataforma **SongTap by CS2**, enfocado en dispositivos móviles y portales de cliente vía QR.

## Hallazgos y Estado de Corrección

| Requisito WCAG | Componente / Archivo | Estado | Descripción del Hallazgo / Solución |
|----------------|----------------------|--------|-------------------------------------|
| **1.4.4** (Resize Text) | `client/index.html` | **Corregido** | Se eliminó `maximum-scale=1` del meta viewport para permitir el zoom en dispositivos móviles. |
| **3.1.1** (Language of Page) | `client/index.html` | **Corregido** | Se cambió el atributo `lang="en"` por `lang="es-CO"` dado que la interfaz está íntegramente en español. |
| **2.1.1 / 4.1.2** (Buttons / ARIA) | Paneles Staff, Manager, Owner, Componentes | **Corregido** | Se agregaron etiquetas `aria-label` descriptivas en español a todos los botones interactivos sin texto visible. |
| **4.1.3** (Status Messages) | `MusicQueue.tsx`, `ApplauseVoting.tsx`, `ClientMenu.tsx` | **Corregido** | Se añadieron contenedores con `aria-live="polite"` para notificar actualizaciones en tiempo real sin alterar el foco del usuario. |
| **2.5.5** (Target Size) | `ClientMenu.tsx`, `ApplauseVoting.tsx` | **Verificado** | Los elementos táctiles principales cumplen con dimensiones mínimas y áreas de interacción en pantallas táctiles móviles. |

---
*Autor: SongTap Engineering Team / Manus*
