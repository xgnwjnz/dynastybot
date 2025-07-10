const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Jugador = require('../models/Jugador');
const path = require('path');
const fs = require('fs');

const competitionChannelsPath = path.join(__dirname, '../data/competition_channels.json');
const configPath = path.join(__dirname, '../data/config.json');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    let competitionChannels = {};
    if (fs.existsSync(competitionChannelsPath)) {
      competitionChannels = JSON.parse(fs.readFileSync(competitionChannelsPath, 'utf8'));
    }

    const competitionName = competitionChannels[message.channel.id];
    if (!competitionName) return;

    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const STATISTICIAN_ROLE_ID = config.rol_estadistiquero_id;

    if (!STATISTICIAN_ROLE_ID || !message.member.roles.cache.has(STATISTICIAN_ROLE_ID)) {
      try {
        await message.delete(); 
        await message.channel.send({ 
          content: `⛔ <@${message.author.id}>, tu mensaje fue eliminado. Este canal está designado solo para **añadir estadísticas** y requieres el rol de ${STATISTICIAN_ROLE_ID ? `estadistiquero (<@&${STATISTICIAN_ROLE_ID}>)` : 'estadistiquero (rol no configurado)'} para hacerlo.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(`No pude eliminar el mensaje de ${message.author.tag} o enviar respuesta efímera: ${err.message}`);
      }
      return;
    }

    const mencionado = message.mentions.users.first();
    const contenido = message.content.toLowerCase();
    const regex = /\b(g\d+|a\d+|cs\d+|c\d+|s\d+|og\d+|gp\d+)\b/g;
    const coincidencias = [...contenido.matchAll(regex)];

    if (!mencionado || coincidencias.length === 0) {
      try {
        await message.delete();
        await message.channel.send({ 
          content: `⚠️ <@${message.author.id}>, tu mensaje fue eliminado. Este canal es exclusivamente para añadir estadísticas. El formato correcto es: \`@jugador gX aY csZ ogW\` (sustituye X,Y,Z,W por números).`,
          ephemeral: true
        });
      } catch (err) {
        console.error(`No pude eliminar el mensaje incorrecto de ${message.author.tag} o enviar respuesta efímera: ${err.message}`);
      }
      return;
    }

    console.log(`📥 Procesando estadísticas para ${mencionado.tag} en ${competitionName}`);

    const stats = { goles: 0, asistencias: 0, autogoles: 0, vallas: 0 };
    for (const match of coincidencias) {
      const letra = match[0].match(/[a-z]+/)[0];
      const valor = parseInt(match[0].match(/\d+/)[0]);
      if (letra === 'g') stats.goles += valor;
      if (letra === 'a') stats.asistencias += valor;
      if (['og', 'gp'].includes(letra)) stats.autogoles += valor;
      if (['cs', 'c', 's'].includes(letra)) stats.vallas += valor;
    }

    let jugador = await Jugador.findOne({ where: { discordId: mencionado.id } });

    if (!jugador) {
      try {
        await message.delete(); 
        await message.channel.send({ 
          content: `⛔ <@${message.author.id}>, el jugador <@${mencionado.id}> no está registrado en la base de datos. Para poder añadirle estadísticas, debe ser **fichado** primero usando el comando \`/fichar\`.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(`No pude eliminar el mensaje o enviar respuesta efímera sobre jugador no registrado: ${err.message}`);
      }
      return; 
    }

    const nombreActual = message.mentions.members.first()?.displayName || mencionado.username;
    if (jugador.nombre !== nombreActual) {
      jugador.nombre = nombreActual;
      await jugador.save();
    }

    const currentStats = (jugador.estadisticas && jugador.estadisticas[competitionName]) ||
                         { goles: 0, asistencias: 0, vallas: 0, autogoles: 0 };

    const embed = new EmbedBuilder()
      .setTitle('📊 Confirmar Estadísticas')
      .setDescription(`Estas son las estadísticas detectadas para **${jugador.nombre}** en **${competitionName}**:`)
      .addFields(
        { name: '⚽ Goles', value: `${stats.goles} (actual: ${currentStats.goles || 0})`, inline: true },
        { name: '🎯 Asistencias', value: `${stats.asistencias} (actual: ${currentStats.asistencias || 0})`, inline: true },
        { name: '🧤 Vallas invictas', value: `${stats.vallas} (actual: ${currentStats.vallas || 0})`, inline: true },
        { name: '😅 Autogoles', value: `${stats.autogoles} (actual: ${currentStats.autogoles || 0})`, inline: true }
      )
      .setColor('#3498db')
      .setFooter({ text: 'Tienes 5 minutos para confirmar' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirmar_stats_${message.id}`)
        .setLabel('✅ Confirmar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`cancelar_stats_${message.id}`)
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
    );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    client.tempStats = client.tempStats || new Map();
    client.tempStats.set(message.id, {
      autorId: message.author.id,
      jugadorId: jugador.id,
      competencia: competitionName,
      stats,
      timestamp: Date.now()
    });

    setTimeout(() => {
      if (client.tempStats.has(message.id)) {
        client.tempStats.delete(message.id);
        reply.edit({ components: [] }).catch(console.error);
      }
    }, 300000); 
  }
};