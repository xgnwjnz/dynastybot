const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const trophys = require('../data/trophys.json');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Muestra el perfil de un jugador')
    .addUserOption(option =>
      option.setName('jugador')
        .setDescription('Jugador cuyo perfil quieres ver')
        .setRequired(false)
    ),

  async execute(interaction) {
    const jugadorDiscord = interaction.options.getUser('jugador') || interaction.user;
    
    try {
      // Buscar jugador en la bd
      const jugadorDB = await Jugador.findOne({ 
        where: { discordId: jugadorDiscord.id }
      });

      if (!jugadorDB) {
        return interaction.reply({
          content: '❌ Este jugador no está registrado en el sistema',
          ephemeral: true
        });
      }

      let abreviacionEquipo = null;
      if (jugadorDB.equipo !== 'Agente Libre') {
        const equipoDB = await Equipo.findOne({
          where: { nombre: jugadorDB.equipo },
          attributes: ['abreviacion']
        });
        abreviacionEquipo = equipoDB?.abreviacion;
      }

      // Obtener títulos y premios segun los roles y los registrados en trophys.json
      const miembro = interaction.guild.members.cache.get(jugadorDiscord.id);
      const titulos = miembro ? 
        trophys.titulos
          .filter(t => miembro.roles.cache.has(t.id))
          .map(t => t.nombre)
          .join('\n') || 'Sin títulos' 
        : 'No se pudo verificar títulos';

      const premios = miembro ?
        trophys.premios_individuales
          .filter(p => miembro.roles.cache.has(p.id))
          .map(p => p.nombre)
          .join('\n') || 'Sin premios'
        : 'No se pudo verificar premios';

      let imagenPath = path.join(__dirname, '../Logos', 
        jugadorDB.equipo === 'Agente Libre' 
          ? 'carrer.png' 
          : `${abreviacionEquipo || 'default'}.png`);

      if (!fs.existsSync(imagenPath)) {
        imagenPath = path.join(__dirname, '../Logos', 'default.png');
      }

      const imagenAttachment = new AttachmentBuilder(imagenPath, { 
        name: 'club.png' 
      });

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(`⚽ Perfil de ${jugadorDiscord.username}`)
        .setThumbnail(`attachment://club.png`) 
        .addFields(
          { name: 'Equipo', value: jugadorDB.equipo, inline: true },
          { name: 'Abreviación', value: abreviacionEquipo || '-', inline: true },
          { name: 'Títulos', value: titulos, inline: false },
          { name: 'Premios Individuales', value: premios, inline: false }
        )
        .setColor('#3498db')
        .setFooter({ text: `ID: ${jugadorDiscord.id}` });

      await interaction.reply({
        embeds: [embed],
        files: [imagenAttachment]
      });

    } catch (error) {
      console.error('Error en comando perfil:', error);
      await interaction.reply({
        content: '❌ Ocurrió un error al mostrar el perfil',
        ephemeral: true
      });
    }
  }
};