

````markdown
# 📜 Manual de Configuración – DYNASTY BOT ⚙️

¡Hola! 👋

Este manual contiene todo lo que debes saber sobre la configuración del bot:  
para qué sirve cada canal y cada rol, los comandos necesarios, los permisos requeridos en algunos casos y los posibles errores que podrías encontrar.

---

## 🔧 Configuración Inicial (¡Haz esto primero!)

### 0. Instala dependencias

Antes de comenzar, asegúrate de instalar las dependencias necesarias del proyecto.  
Solo necesitas ejecutar el siguiente comando desde la raíz del proyecto:

```bash
npm install
````

Esto instalará automáticamente todas las dependencias definidas en el archivo `package.json`.

> ⚠️ **Si estás utilizando un host como Sparked u otro similar:**
> Algunos hosts no permiten ejecutar `npm install` desde consola.
> En ese caso, deberás instalar las dependencias **manualmente**, utilizando la tienda o biblioteca de paquetes del host.

---

### 1. Prepara tu archivo `.env`

Crea un archivo llamado `.env` con el siguiente contenido y completa los valores:

```env
DISCORD_TOKEN=pega_aquí_el_token_de_tu_bot
CLIENT_ID=el_id_de_la_aplicación_bot
GUILD_ID=id_del_servidor_de_DYNASTY
ERROR_WEBHOOK_URL=opcional_para_recibir_errores_en_discord
```

> 🔍 **¿Cómo obtengo estos datos?**
>
> * Activa el **Modo Desarrollador** en Discord:
>   `Ajustes > Apariencia > Modo Desarrollador`
> * Los IDs se copian con clic derecho sobre canales, roles o el servidor
> * El token lo obtienes desde el [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)

---

### 2. Edita `config.json`

Este archivo define los canales y roles que el bot necesita para funcionar. Ejemplo:

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

## 🚀 Inicia el Bot

Una vez que hayas completado la configuración de estos archivos:

* `.env` (con tus credenciales)
* `config.json` (con los IDs de canales y roles)
* `teams.json` (manualmente o con `/newteam`)

… ya puedes **iniciar el bot** desde la raíz del proyecto con el siguiente comando:

```bash
node .
```

Esto ejecutará el archivo principal (`index.js`) y pondrá el bot en línea.

> ✅ Al iniciar por primera vez, el bot generará automáticamente archivos como `database.sqlite` y `keys.json` si no existen.

> ⚠️ **Si estás utilizando un host como Sparked o similar:**
> Estos servicios normalmente **no permiten iniciar el bot con `node .` desde la consola**.
> En su lugar, deberás especificar manualmente el archivo principal como archivo de inicio:

```
index.js
```

Asegúrate también de configurar correctamente las variables de entorno y tener las dependencias instaladas mediante la tienda o panel del host.

---

## 🗄️ Archivos Automáticos

Estos archivos los gestiona el bot de forma automática:

| Archivo           | Función                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `database.sqlite` | Base de datos (se crea sola al iniciar)                                |
| `data/keys.json`  | Claves de emergencia (40 claves generadas automáticamente)             |
| `logos/`          | Carpeta donde deben guardarse los logos de los equipos (ej: `RMA.png`) |

> ⚠️ **Importante**:
> Es normal que al usar `/fichar` por primera vez veas un error si `keys.json` aún no ha sido generado.
> Espera a que el bot termine de iniciar completamente y vuelve a intentarlo.

---

## ⚽ Configuración de Equipos

### 📝 Método Manual (Recomendado)

Edita el archivo `teams.json` con este formato:

```json
{
  "equipos": [
    {
      "nombre": "Real Madrid",
      "id": "123456789012345678",
      "abreviacion": "RMA",
      "uniformes": {
        "local": "/colors white 90 #FFFFFF #000000",
        "visitante": "/colors purple 40 #5E17EB #FFFFFF"
      }
    }
  ]
}
```

**Pasos adicionales:**

1. Crea el rol del equipo en Discord.
2. Guarda su logo como `RMA.png` en la carpeta `logos/`.
3. Asegúrate de que los comandos de colores sigan el formato que usa el bot.

---

### 🤖 Método por Comando

También puedes usar el comando `/newteam` para registrar equipos de forma interactiva:

* Adjunta el logo
* Especifica nombre, abreviación (3 letras) y rol
* Define uniformes local y visitante

> ⚠️ Necesitas permiso de **Administrador** para este comando.

---

## 🔄 Registro Masivo de Equipos

Una vez configurado el archivo `teams.json`, ejecuta:

```bash
/regall
```

Esto hará lo siguiente:

✅ Registrará todos los equipos en la base de datos
✅ Asignará automáticamente jugadores según sus roles
✅ Formateará los nicks (ej: `#RMA Usuario`)

> ⚠️ Este comando también requiere permisos de **Administrador**.

---

## 🏆 Títulos y Premios

### 1. Títulos de Torneos

Edita manualmente `trophys.json` así:

```json
"titulos": [
  {
    "nombre": "Liga T7 [Lapas del Yare]",
    "id": "123456789012345678"
  }
]
```

---

### 2. Premios Individuales

Usa este comando para registrar premios individuales:

```bash
/registerindv rol: @MVP nombre: "Mejor Jugador T7"
```

---

## 🎫 Sistema de Tickets

1. Asegúrate de que el canal esté bien configurado en `config.json`.
2. Ejecuta el comando:

```bash
/ticket
```

> ⚠️ Solo usuarios con el rol de **Organizador** podrán utilizar esta función.

---

## 💼 Control del Mercado

Para abrir o cerrar el mercado, usa:

```bash
/market abrir
/market cerrar
```

Cuando el mercado está **cerrado**:

* Se habilitan fichajes de emergencia.
* Cada equipo puede hacer hasta **3 fichajes de emergencia**.
* Se utilizan las claves generadas en `keys.json`.
