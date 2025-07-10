const {SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
const Jugador = require('../models/Jugador');
const teams = require('../data/teams.json');
const config = require('../data/config.json');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('club')
    .setDescription('🏰 Muestra información detallada de un club')
    .addStringOption(option =>
      option.setName('nombre')
        .setDescription('🔍 Selecciona el club que deseas consultar')
        .setRequired(true)
        .addChoices(...teams.equipos.map(equipo => ({
          name: equipo.nombre,
          value: equipo.nombre
        })))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const nombreClub = interaction.options.getString('nombre');
    const equipo = teams.equipos.find(e => e.nombre === nombreClub);
    if (!equipo) return interaction.editReply(`❌ No se encontró el club: ${nombreClub}`);

    try {
      const miembros = interaction.guild.members.cache;
      const jugadores = await Jugador.findAll({ where: { equipo: nombreClub } });

      const jugadoresActualizados = await Promise.all(
        jugadores.map(async jugador => {
          const miembro = miembros.get(jugador.discordId);

          if (!miembro) {
            await jugador.update({ equipo: 'Agente Libre' });
            return null;
          }

          if (miembro.user.tag !== jugador.nombre) {
            await jugador.update({ nombre: miembro.user.tag });
          }

          return jugador;
        })
      ).then(result => result.filter(j => j !== null));

      const dt = miembros.find(member =>
        (member.roles.cache.has(config.rol_dt_primera) || member.roles.cache.has(config.rol_dt_segunda)) &&
        member.roles.cache.has(equipo.id)
      );

      const logoPath = path.join(__dirname, '../Logos', `${equipo.abreviacion}.png`);
      const logoAttachment = fs.existsSync(logoPath)
        ? new AttachmentBuilder(logoPath, { name: `${equipo.abreviacion}.png` })
        : null;

      const embed = new EmbedBuilder()
        .setTitle(`${equipo.nombre.toUpperCase()}`)
        .setDescription([
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`,
          `**• Abreviación**: \`${equipo.abreviacion}\``,
          `**• Director Técnico**: ${dt ? `<@${dt.id}>` : '🚫 No asignado'}`,
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
        ].join('\n'))
        .addFields(
          {
            name: '👥 **Plantilla Actual**',
            value: jugadoresActualizados.length
              ? jugadoresActualizados.map(j => `→ <@${j.discordId}>`).join('\n')
              : '🚫 No hay jugadores registrados',
            inline: false
          },
          {
            name: '🟢 **Uniforme Local**',
            value: `\`${equipo.uniformes.local}\``,
            inline: true
          },
          {
            name: '🔴 **Uniforme Visitante**',
            value: `\`${equipo.uniformes.visitante}\``,
            inline: true
          },
          {
            name: '📊 **Resumen**',
            value: `**${jugadoresActualizados.length}/${equipo.limiteJugadores || 16}** jugadores registrados`,
            inline: false
          }
        )
        .setColor(equipo.color || '#3498db')
        .setFooter({
          text: `Solicitado por ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      if (logoAttachment) {
        embed.setThumbnail(`attachment://${equipo.abreviacion}.png`);
      }

      await interaction.editReply({
        embeds: [embed],
        files: logoAttachment ? [logoAttachment] : []
      });

    } catch (error) {
      console.error('Error en comando /club:', error);
      await this.handleError(error, interaction);

      await interaction.editReply({
        content: '⚠️ Ocurrió un error al procesar la información del club.'
      });
    }
  },

  async handleError(error, interaction) {
    const webhookURL = process.env.ERROR_WEBHOOK_URL;
    if (!webhookURL) return;

    try {
      const webhook = new WebhookClient({ url: webhookURL });
      await webhook.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🚨 Error en comando /club')
            .setColor('#FF0000')
            .addFields(
              { name: 'Usuario', value: interaction.user?.tag || 'N/A', inline: true },
              { name: 'Servidor', value: interaction.guild?.name || 'DM', inline: true },
              { name: 'Error', value: `\`\`\`${(error.stack || error.message).slice(0, 1000)}\`\`\`` }
            )
            .setTimestamp()
        ]
      });
    } catch (err) {
      console.error('Error enviando error al webhook:', err);
    }
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox