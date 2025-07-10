// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox

// ┌────────────────────────────────────────────────────────────────────┐
// │                      CONFIGURACIÓN INICIAL                         │
// └────────────────────────────────────────────────────────────────────┘
const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const sequelize = require("./utils/database");
const Jugador = require('./models/Jugador');
const Equipo = require('./models/Equipo');

// ┌────────────────────────────────────────────────────────────────────┐
// │                     CONFIGURACIÓN DEL CLIENTE                      │
// └────────────────────────────────────────────────────────────────────┘
const Client = new Discord.Client({
    intents: 3276799,
    presence: {
        status: "online", // Cambia a "online", "idle", "dnd" o "invisible" según necesites
        activities: [{
            name: "EMPY", 
            type: Discord.ActivityType.Playing // Playing, Streaming, Listening, Watching, Competing, Custom
            // url: "empy" // necesario si la activida es streaming
        }]
    }
});

// ┌────────────────────────────────────────────────────────────────────┐
// │                     MANEJO CENTRALIZADO DE ERRORES                 │
// └────────────────────────────────────────────────────────────────────┘
const errorWebhook = process.env.ERROR_WEBHOOK_URL 
    ? new Discord.WebhookClient({ url: process.env.ERROR_WEBHOOK_URL })
    : null;

async function handleError(error, context = "General") {
    const timestamp = new Date().toISOString();
    const errorMessage = `⚠️ **Error en ${context}**\n\`\`\`${error.stack || error}\`\`\``;
    
    console.error(`[${timestamp}] ${context}:`, error);
    
    if (errorWebhook) {
        try {
            await errorWebhook.send({
                content: errorMessage,
                username: "Error Logger",
            });
        } catch (webhookError) {
            console.error("Error enviando a webhook:", webhookError);
        }
    }
}

// ┌────────────────────────────────────────────────────────────────────┐
// │               VERIFICACIÓN Y CREACIÓN DE BASE DE DATOS            │
// └────────────────────────────────────────────────────────────────────┘
async function initializeDatabase() {
    try {
        const dbPath = path.resolve(__dirname, 'database.sqlite');
        
        if (!fs.existsSync(dbPath)) {
            console.log('Creando y sincronizando la base de datos...');
            
            Equipo.hasMany(Jugador);
            Jugador.belongsTo(Equipo);
            
            await sequelize.sync({ force: true });
            console.log('Base de datos creada y sincronizada correctamente');
        } else {
            console.log('Base de datos ya existe, no se requiere creación');
        }
    } catch (error) {
        console.error('Error al sincronizar la base de datos:', error);
        throw error;
    }
}

// ┌────────────────────────────────────────────────────────────────────┐
// │                     REGISTRO Y VALIDACIÓN DE METADATOS             │
// └────────────────────────────────────────────────────────────────────┘
function validateCommandMetadata(command, fileName) {
    const defaultMetadata = {
        category: '⚙️ Otros',
        description: command.data?.description || 'Sin descripción',
        usage: `/${command.data?.name || fileName.replace('.js', '')}`,
        requiredPermissions: []
    };

    if (!command.metadata) {
        console.warn(`⚠️ Comando ${command.data?.name || fileName} no tiene metadatos definidos.`);
        return defaultMetadata;
    }

    const validated = { ...defaultMetadata, ...command.metadata };
    
    if (command.metadata.category) {
        console.log(`ℹ️ Comando ${command.data.name} tiene categoría: ${command.metadata.category}`);
    } else {
        console.warn(`⚠️ Comando ${command.data.name} no tiene categoría definida. Usando '${defaultMetadata.category}'`);
    }
    
    if (command.metadata.description) {
        console.log(`ℹ️ Comando ${command.data.name} tiene descripción personalizada`);
    } else {
        console.warn(`⚠️ Comando ${command.data.name} usa descripción por defecto`);
    }

    return validated;
}

async function loadCommandsWithMetadata() {
    Client.commands = new Discord.Collection();
    Client.commandsMetadata = new Map(); 
    
    const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
    
    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            
            if (!command.data?.name) {
                console.warn(`⚠️ El archivo ${file} no tiene una propiedad 'data' o 'data.name'. Será omitido.`);
                continue;
            }
            
            const metadata = validateCommandMetadata(command, file);
            Client.commandsMetadata.set(command.data.name, metadata);
            
            Client.commands.set(command.data.name, command);
            console.log(`✅ Comando cargado: ${command.data.name}`);
            
        } catch (error) {
            handleError(error, `Loading Command ${file}`);
        }
    }
}

// ┌────────────────────────────────────────────────────────────────────┐
// │                     CARGA DE COMANDOS Y EVENTOS                    │
// └────────────────────────────────────────────────────────────────────┘
async function loadCommands() {
    await loadCommandsWithMetadata(); 
}

async function registerCommands() {
    try {
        const rest = new Discord.REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        await rest.put(
            Discord.Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: Client.commands.map(cmd => cmd.data.toJSON()) }
        );
        
        console.log(`✨ ${Client.commands.size} comandos registrados en el servidor`);
    } catch (error) {
        handleError(error, "Command Registration");
    }
}

function loadEvents() {
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const event = require(`./events/${file}`);
            if (event.once) {
                Client.once(event.name, (...args) => event.execute(...args, Client));
            } else {
                Client.on(event.name, (...args) => event.execute(...args, Client));
            }
            console.log(`🎉 Evento cargado: ${event.name}`);
        } catch (error) {
            handleError(error, `Loading Event ${file}`);
        }
    }
}

// ┌────────────────────────────────────────────────────────────────────┐
// │                     VERIFICAR CLAVES/GENERAR                       │
// └────────────────────────────────────────────────────────────────────┘
function generarClavesEmergencia(cantidad = 40) {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  const claves = [];

  for (let i = 0; i < cantidad; i++) {
    let clave = '';
    for (let j = 0; j < 10; j++) {
      clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    claves.push({ 
      clave: clave,
      used: false 
    });
  }

  return claves;
}

async function inicializarClavesEmergencia() {
  const rutaClaves = path.join(__dirname, 'data', 'keys.json');
  
  try {
    if (fs.existsSync(rutaClaves)) {
      console.log('✅ Archivo de claves de emergencia detectado (data/keys.json)');
      return;
    }

    if (!fs.existsSync(path.dirname(rutaClaves))) {
      fs.mkdirSync(path.dirname(rutaClaves), { recursive: true });
      console.log('📂 Directorio "data" creado');
    }

    const datosClaves = {
      claves_emergencia: generarClavesEmergencia()
    };

    fs.writeFileSync(rutaClaves, JSON.stringify(datosClaves, null, 2));
    console.log('🔐 40 nuevas claves de emergencia generadas en data/keys.json');
  } catch (error) {
    console.error('❌ Error al inicializar claves de emergencia:');
    console.error(error);
    process.exit(1);
  }
}

// ┌────────────────────────────────────────────────────────────────────┐
// │                     MANEJADORES DE EVENTOS                         │
// └────────────────────────────────────────────────────────────────────┘
Client.on("ready", async () => {
    console.log(`🤖 ${Client.user.tag} está en línea!`);
});

Client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = Client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction, Client);
    } catch (error) {
        handleError(error, `Command ${interaction.commandName}`);
        
        const replyOptions = {
            content: '⚠️ Hubo un error al ejecutar este comando',
            ephemeral: true
        };
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }
    }
});

Client.on("messageCreate", async (message) => {
    if (message.mentions.has(Client.user) && !message.author.bot) {
        const menuCommand = Client.commands.get('ayuda');
        if (!menuCommand) return;
        
        const fakeInteraction = {
            user: message.author,
            reply: (options) => message.reply(options),
            editReply: (options) => message.edit(options),
            channel: message.channel,
            deferReply: () => Promise.resolve(),
            followUp: (options) => message.reply(options)
        };
        
        try {
            await menuCommand.execute(fakeInteraction, Client);
        } catch (error) {
            handleError(error, "Mention Command");
            await message.reply({ content: '⚠️ Hubo un error al mostrar el menú' });
        }
    }
});

// ┌────────────────────────────────────────────────────────────────────┐
// │                     INICIALIZACIÓN DEL BOT                         │
// └────────────────────────────────────────────────────────────────────┘
async function initializeBot() {
    try {
        console.log('⚙️ Iniciando bot...');
        
        // 1. Inicializar base de datos
        await initializeDatabase();
        
        // 2. Cargar comandos y eventos
        await loadCommands();
        loadEvents();

        // 3. Verificar claves de emergencia
        await inicializarClavesEmergencia();
        
        // 4. Registrar comandos
        await registerCommands();
        
        // 5. Iniciar sesión
        await Client.login(process.env.DISCORD_TOKEN);
        
        console.log("🚀 Bot inicializado con éxito");
    } catch (error) {
        handleError(error, "Bot Initialization");
        process.exit(1);
    }
}

initializeBot().catch(error => {
    handleError(error, "Initialize Bot");
    process.exit(1);
});

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox