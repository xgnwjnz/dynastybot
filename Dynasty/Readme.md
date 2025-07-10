
````markdown
<p align="center">
  <img src="https://raw.githubusercontent.com/KvensOs/iDinox/main/docs/logo_idinox.png" alt="iDinox Logo" width="180" />
</p>

# 📜 Manual de Configuración – **iDinox 2.5** ⚙️

---

¡Hola! 👋 Bienvenido al manual oficial de configuración de **iDinox**, tu bot de gestión para ligas y torneos de Haxball. Aquí encontrarás todo lo necesario para ponerlo en marcha y sacarle el máximo provecho.

---

## 🔧 Configuración Inicial (¡Lo primero!)

### 0. Instala las dependencias

Desde la raíz del proyecto, ejecuta:

```bash
npm install
````

Esto instalará todas las librerías necesarias, definidas en `package.json`:

```json
"dependencies": {
  "discord.js": "^14.16.3",
  "dotenv": "^16.4.5",
  "node-cron": "^3.0.3",
  "sequelize": "^6.37.3",
  "sqlite3": "^5.1.7",
  "ws": "^8.17.0"
}
```

> ⚠️ Algunos hosts (Sparked, etc.) no permiten `npm install` vía consola. En ese caso, instala manualmente con su panel.

---

### 1. Crea tu archivo `.env`

```env
DISCORD_TOKEN=tu_token_aquí
CLIENT_ID=tu_client_id_aquí
GUILD_ID=id_de_tu_servidor
ERROR_WEBHOOK_URL=url_webhook_para_errores (opcional)
```

**Consejo:** Activa el modo desarrollador en Discord para copiar IDs fácilmente (`Ajustes > Apariencia > Modo desarrollador`).

---

### 2. Edita el archivo `config.json`

Aquí defines los canales y roles clave que el bot usará. Ejemplo:

```json
{
  "canal_movimientos_fichajes": "123456789",
  "canal_movimientos_bajas": "123456789",
  "canal_fechas": "123456789",
  "canal_tickets": "123456789",
  "canal_logs": "123456789",

  "rol_dt": "123456789",
  "rol_sub_dt": "123456789",
  "rol_ayudante": "123456789",
  "rol_organizador": "123456789",

  "estado_mercado": false
}
```

---

## 🚀 ¡Arranca el bot!

Solo ejecuta:

```bash
node .
```

> ✅ El bot creará archivos como `database.sqlite` y `data/keys.json` automáticamente.

> ⚠️ En hosts como Sparked, configura el archivo principal `index.js` como punto de entrada y usa su panel para variables y dependencias.

---

## 🗄️ Archivos y carpetas clave

| Archivo / Carpeta   | Uso                                                             |
| ------------------- | --------------------------------------------------------------- |
| `database.sqlite`   | Base de datos SQLite creada y gestionada automáticamente        |
| `data/keys.json`    | Claves de emergencia generadas automáticamente                  |
| `logos/`            | Carpeta para logos de equipos (ej: `RMA.png`)                   |
| `data/teams.json`   | Configuración de equipos (manual o vía comandos)                |
| `data/trophys.json` | Premios y títulos registrados (pueden gestionarse con comandos) |

---

## ⚽ Gestión de Equipos

### 📲 Nuevo sistema: `/newteam`

El comando `/newteam` ha mejorado mucho y es el método recomendado para añadir equipos:

* Adjunta logo en la misma acción
* Define nombre, abreviación (3 letras) y rol Discord
* Configura uniformes local y visitante con comandos `/colors`
* Sistema de confirmación con botones para añadir **ahora** o **después**
* Añade automáticamente a la base de datos y actualiza jugadores y apodos

> 🔐 Requiere permiso de administrador.

---

### 📝 Método clásico: edición manual + `/regall`

Si prefieres o necesitas registrar muchos equipos de golpe:

1. Edita `data/teams.json` con los equipos y sus datos
2. Ejecuta `/regall` para sincronizar con la base de datos y Discord

⚠️ Recuerda: si usaste `/newteam` y elegiste "Añadir después", reinicia el bot antes de `/regall`.

---

### 🆚 Comparación rápida

| Característica           | `/newteam` (Botones) | Manual + `/regall` |
| ------------------------ | -------------------- | ------------------ |
| Registro instantáneo     | ✅ Sí                 | ❌ No               |
| Sin reiniciar bot        | ✅ Sí                 | ❌ No               |
| Ideal para pocos equipos | ✅ Sí                 | ❌ No               |
| Ideal para muchos        | ❌ No                 | ✅ Sí               |
| Verificación errores     | ✅ Automática         | ❌ Manual           |
| Actualiza jugadores      | ✅ Inmediata          | ✅ Con `/regall`    |

---

## 🏆 Títulos y Premios

### Nuevo sistema con `/newtrophy`

> 🔄 El antiguo `/registerindv` ya no existe. Ahora todo se maneja con `/newtrophy` para añadir **títulos** y **premios individuales** con confirmación visual.

Esto facilita agregar premios sin editar manualmente `trophys.json`.

---

## 🎫 Sistema de Tickets

* Configura el canal en `config.json`
* Solo usuarios con rol **Organizador** pueden abrir tickets
* Comando: `/ticket`

---

## 💼 Control del Mercado

Abre o cierra el mercado con:

```bash
/market abrir
/market cerrar
```

* Mercado cerrado activa fichajes de emergencia (3 por equipo)
* Se usan claves de `keys.json`

---

## 📝 Sobre los comandos

Puedes agregar metadata opcional para cada comando en el archivo `.js`:

```js
metadata: {
  category: '⚙️ Configuración',
  description: 'Descripción completa del comando',
  usage: '/comando'
}
```

Esto permite organizar mejor el sistema de ayuda y mostrar imágenes según categoría.

---

## Recursos visuales y estilo

<p align="center">
  <img src="https://raw.githubusercontent.com/KvensOs/iDinox/main/docs/screenshot_ayuda.png" alt="Ejemplo ayuda" width="450" />
</p>

Las imágenes para categorías deben guardarse en `/logos` con el nombre de la categoría y extensión `.png`.

---

# 📝 Créditos y Licencia

© 2025 [Keury](https://github.com/KvensOs/iDinox).
Proyecto bajo [Licencia Creative Commons BY 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/deed.es).

---

**¡Gracias por usar iDinox!** 🚀
Si tienes dudas o quieres colaborar, abre un issue o PR en GitHub.

---
