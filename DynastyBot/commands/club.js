const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Jugador = require('../models/Jugador');
const teams = require('../data/teams.json');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('club')
    .setDescription('Muestra la información de un club')
    .addStringOption(option =>
      option.setName('nombre')
        .setDescription('Nombre del club')
        .setRequired(true)
        .addChoices(teams.equipos.map(equipo => ({ name: equipo.nombre, value: equipo.nombre })))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const nombreClub = interaction.options.getString('nombre');
    console.log(`Recibido el nombre del club: ${nombreClub}`);

    const equipo = teams.equipos.find(e => e.nombre === nombreClub);
    if (!equipo) {
      console.error(`No se encontró el equipo: ${nombreClub}`);
      return interaction.editReply({ content: 'No se encontró el club especificado.', ephemeral: true });
    }

    try {
      console.log(`Buscando jugadores del equipo ${nombreClub}...`);
      const jugadores = await Jugador.findAll({ where: { equipo: nombreClub } });

      const jugadoresActualizados = [];
      console.log(`Jugadores encontrados: ${jugadores.length}`);

      for (const jugador of jugadores) {
        const miembro = interaction.guild.members.cache.get(jugador.discordId);
        console.log(`Verificando al jugador: ${jugador.nombre} (${jugador.discordId})`);

        if (!miembro) {
          console.log(`Jugador no encontrado en el servidor. Actualizando a "Agente Libre"`);
          await jugador.update({ equipo: 'Agente Libre' });
        } else if (miembro.user.tag !== jugador.nombre) {
          console.log(`El nombre del jugador ha cambiado, actualizando en la base de datos`);
          await jugador.update({ nombre: miembro.user.tag });
        } else {
          jugadoresActualizados.push(jugador);
        }
      }

      const jugadoresList = jugadoresActualizados.length
        ? jugadoresActualizados.map(j => `<@${j.discordId}>`).join("\n")
        : 'No hay jugadores registrados.';
      console.log(`Jugadores actualizados: ${jugadoresActualizados.length}`);

      const dtMember = interaction.guild.members.cache.find(member =>
        member.roles.cache.has(config.rol_dt) && member.roles.cache.has(equipo.id)
      );
      const dt = dtMember ? `<@${dtMember.id}>` : 'No asignado';

      const logoPath = path.join(__dirname, '../Logos', `${equipo.abreviacion}.png`);
      const logoExists = fs.existsSync(logoPath);
      const logoAttachment = logoExists
        ? new AttachmentBuilder(logoPath, { name: `${equipo.abreviacion}.png` })
        : null;

      const jugadoresTotal = jugadoresActualizados.length;
      const jugadoresMax = equipo.limiteJugadores || 16;

      const embed = new EmbedBuilder()
        .setTitle(`Información del Club: ${equipo.nombre}`)
        .setDescription(`**Abreviación:** ${equipo.abreviacion}\n**Director Técnico:** ${dt}`)
        .addFields(
          { name: 'Jugadores', value: jugadoresList, inline: false },
          { name: 'Local', value: equipo.uniformes.local, inline: false },
          { name: 'Visitante', value: equipo.uniformes.visitante, inline: false },
          { name: '\u200B', value: `**${jugadoresTotal}/${jugadoresMax} Jugadores**`, inline: false }
        )
        .setColor('#FFD700')
        .setTimestamp();

      if (logoAttachment) {
        embed.setThumbnail(`attachment://${equipo.abreviacion}.png`);
      }

      console.log(`Enviando la respuesta con los datos del club: ${equipo.nombre}`);
      await interaction.editReply({
        embeds: [embed],
        files: logoAttachment ? [logoAttachment] : [],
        ephemeral: false
      });

    } catch (error) {
      console.error(`Error al generar el perfil del club: ${error.message}`);
      interaction.editReply({ content: 'Hubo un error al obtener la información del club.', ephemeral: true });
    }
  }
};
