# Changelog

# 🚀 Changelog - Historial de Cambios

## [2.5.0] - 2025-07-09

### 🔧 Correcciones Críticas
- **Comando `/newteam`**:
  - 🛑 **Botón problemático**: Se desactivaba después de procesar (ahora se bloquea al instante)
  - 🔄 **Duplicación**: Ya no permite añadir múltiples equipos por clicks repetidos
  - 🛡️ **Seguridad**: Solo el usuario que ejecutó el comando puede interactuar

- **Comando `/newtrophy`**:
  - ✅ **Nuevo sistema de confirmación**: Muestra embed de revisión antes de guardar
  - 🔒 **Protección añadida**: Otros usuarios no pueden tocar los botones
  - 📝 **Validación mejorada**: Evita errores en nombres de premios

- **Comando `/perfil`**:
  - ⚡ **Más rápido**: Implementado `deferReply` para evitar timeout de Discord
  - 🚀 **Optimizado**: Código reorganizado para mejor rendimiento

### 🕒 Sistema de Timeouts
- **`/ayuda`**:
  - ⏳ Ahora se cierra automáticamente después de 15s de inactividad
  - 👤 Exclusivo: Solo el autor puede interactuar

- **`/historial`**:
  - 🕑 Menú de selección se autodestruye tras 15s
  - 📛 Muestra mensaje de "Embed suspendido" cuando expira

- **`/club`**:
  - 🔄 Implementado `deferReply` para feedback inmediato
  - 🏎️ Optimizado el tiempo de carga


## 🔄 Sistema de Equipos (v2.5)

| Característica | Detalle |
|---------------|---------|
| ID Automático | Genera equipoId único (101, 102...) |
| Sincronización | Detecta cambios en teams.json |
| Protección | Previene duplicados y corrupción |

## [2.4.0] - 2025-07-08

### Nuevas Características
- **Comando Newteam Mejorado**:
  - Sistema interactivo con botones de confirmación
    - ✅ **Añadir ahora**: Registra inmediatamente en la base de datos
    - ❌ **Añadir después**: Solo guarda en teams.json para usar con /regall luego
  - Asignación automática de equipoId (misma lógica que /regall)
  - Actualización en tiempo real de jugadores con el rol asignado
    - Modificación de nicknames (#ABR Nombre)
    - Registro en base de datos
  - Verificación de duplicados (nombres, abreviaciones, roles)
  - Feedback visual mejorado con embeds detallados

### Cambios Técnicos
- **Sistema de Equipos**:
  - Unificación del sistema de IDs entre newteam y regall
  - Mecanismo de sincronización mejorado

### Notas para los comandos
```javascript
// Estructura mínima requerida para comandos
metadata: {
  category: '⚙️ Categoría',
  description: 'Descripción detallada',
  usage: '/comando <parámetros>',
  example: '/comando ejemplo'
}
```

---

## [2.3.0] - 2025-07-07

### Corregido
- **Comando Fichar**:
  - Error crítico por archivo de configuración no definido (`config.json`)
  - Implementación de carga adecuada del archivo
  - Validación para archivos faltantes

- **Sistema de Premios**:
  - Corrección de bug grave de sobreescritura (usaba `config.json` en lugar de `trophys.json`)
  - Ruta de escritura corregida:
  ```javascript
  fs.writeFile('./data/trophys.json', JSON.stringify(trophys, null, 2), (err) => {
  ```

- **Comando Ayuda**:
  - Refactorización completa del manejo de errores
  - Sistema de categorías resiliente:
    - Comandos sin metadatos → "⚙️ Otros"
    - Eliminación de errores por metadatos faltantes
    - Garantía de ejecución del embed principal
  - Mejoras en manejo de imágenes:
    - Fallback a `ayuda.png`
    - Sistema de thumbnails/images robusto
  - Mensajes de error más informativos

### Mejoras Técnicas
- Sistema de validación de metadatos mejorado
- Categorización tolerante a fallos

---

## Sistema de Equipos (Actualizado)

### Identificación Única
- `equipoId` numérico autoincremental (101, 102...)
- Asignación automática en `/regall` y `/newteam`

### Sincronización Inteligente
- Detecta y registra:
  - Equipos nuevos (sin `equipoId`)
  - Equipos no existentes en DB
- Elimina:
  - Equipos sin `equipoId` en teams.json
  - Equipos eliminados completamente
- Actualiza:
  - Nombres/abreviaciones
  - Propaga cambios a jugadores

### Mecanismo de Resincronización
| Acción | Resultado |
|--------|-----------|
| Borrar `equipoId` | Sistema detecta como nuevo (asigna nuevo ID) |
| Borrar equipo completo | Eliminación definitiva |

> **Nota Técnica**: La base de datos trabaja exclusivamente con `equipoId`