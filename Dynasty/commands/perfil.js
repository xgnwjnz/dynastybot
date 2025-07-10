const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Op } = require('sequelize');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const trophys = require('../data/trophys.json');
const path = require('path');
const fs = require('fs').promises;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('📋 Muestra el perfil completo de un jugador')
    .addUserOption(option =>
      option.setName('jugador')
        .setDescription('👤 Jugador cuyo perfil quieres ver')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const jugadorDiscord = interaction.options.getUser('jugador') || interaction.user;

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //              Buscar jugador en la BD
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const jugadorDB = await Jugador.findOne({ 
        where: { discordId: jugadorDiscord.id },
        attributes: ['equipo', 'discordId'] 
      });

      if (!jugadorDB) {
        return interaction.editReply({
          content: '📭 *Este jugador aún no está registrado en el sistema.*',
          ephemeral: true
        });
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //              Buscar equipo y abreviación
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let abreviacionEquipo = null;
      if (jugadorDB.equipo !== 'Agente Libre') {
        const equipoDB = await Equipo.findOne({
          where: { nombre: { [Op.like]: jugadorDB.equipo } }, 
          attributes: ['abreviacion'],
          raw: true 
        });
        abreviacionEquipo = equipoDB?.abreviacion;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //        Obtener títulos y premios del jugador
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const miembro = await interaction.guild.members.fetch(jugadorDiscord.id).catch(() => null);

      const [titulos, premios] = miembro 
        ? [
            trophys.titulos
              .filter(t => miembro.roles.cache.has(t.id))
              .map(t => `🏆 ${t.nombre}`)
              .join('\n') || '🔸 *Sin títulos aún*',
            trophys.premios_individuales
              .filter(p => miembro.roles.cache.has(p.id))
              .map(p => `🎖️ ${p.nombre}`)
              .join('\n') || '🔹 *Sin premios individuales*'
          ]
        : ['❓ *No se pudo verificar títulos*', '❓ *No se pudo verificar premios*'];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //              Obtener imagen del equipo
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const logosDir = path.join(__dirname, '../Logos');
      let imagenPath;

      if (jugadorDB.equipo === 'Agente Libre') {
        imagenPath = path.join(logosDir, 'carrer.png');
      } else {
        imagenPath = path.join(logosDir, `${abreviacionEquipo || 'default'}.png`);
      }

      try {
        await fs.access(imagenPath);
      } catch {
        imagenPath = path.join(logosDir, 'default.png');
      }

      const imagenAttachment = new AttachmentBuilder(imagenPath, { name: 'club.png' });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //              Crear embed de perfil
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const embed = new EmbedBuilder()
        .setTitle(`🎯 Perfil de *${jugadorDiscord.username}*`)
        .setThumbnail('attachment://club.png')
        .setColor('#4da6ff')
        .addFields(
          { name: '📌 Equipo', value: jugadorDB.equipo, inline: true },
          { name: ' Títulos colectivos', value: titulos, inline: false },
          { name: ' Premios individuales', value: premios, inline: false }
        )
        .setFooter({ text: `🆔 ID del jugador: ${jugadorDiscord.id}` });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //              Responder al usuario
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await interaction.editReply({
        embeds: [embed],
        files: [imagenAttachment]
      });

    } catch (error) {
      console.error('❌ Error en el comando /perfil:', error);
      await interaction.editReply({
        content: '⚠️ *Ocurrió un pequeño error al mostrar el perfil. Inténtalo nuevamente más tarde.*',
        ephemeral: true
      });
    }
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox