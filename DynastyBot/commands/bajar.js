const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const config = require('../data/config.json');
const teams = require('../data/teams.json');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bajar')
    .setDescription('Da de baja a un jugador de su club')
    .addUserOption(option =>
      option.setName('jugador')
        .setDescription('Jugador a dar de baja')
        .setRequired(true)
    ),

  async execute(interaction) {
    const jugador = interaction.options.getUser('jugador');
    const miembro = interaction.guild.members.cache.get(interaction.user.id);
    
    const equipoRol = miembro.roles.cache.find(role => 
      teams.equipos.some(equipo => equipo.id === role.id)
    );
    
    const canal = interaction.guild.channels.cache.get(config.canal_movimientos_bajas);

    if (!config.estado_mercado) {
      return interaction.reply({
        content: '❌ El mercado de transferencias está cerrado actualmente. No puedes dar de baja a un jugador.',
        ephemeral: true
      });
    }

    if (!miembro.roles.cache.has(config.rol_dt) && !miembro.roles.cache.has(config.rol_sub_dt)) {
      return interaction.reply({ 
        content: '❌ No tienes el rol de DT o Sub-DT.', 
        ephemeral: true 
      });
    }

    if (!equipoRol) {
      return interaction.reply({ 
        content: '❌ No tienes el rol de un equipo registrado.', 
        ephemeral: true 
      });
    }

    try {
      // Obtener datos del equipo desde teams.json
      const equipoData = teams.equipos.find(e => e.id === equipoRol.id);
      if (!equipoData) {
        return interaction.reply({ 
          content: '❌ El equipo no está registrado correctamente.', 
          ephemeral: true 
        });
      }

      // Verificar en base de datos
      const equipoDB = await Equipo.findOne({ where: { nombre: equipoRol.name } });
      if (!equipoDB) {
        return interaction.reply({ 
          content: '❌ El equipo no está registrado en la base de datos.', 
          ephemeral: true 
        });
      }

      const registroJugador = await Jugador.findOne({ where: { discordId: jugador.id } });

      if (!registroJugador || registroJugador.equipo !== equipoRol.name) {
        return interaction.reply({ 
          content: '❌ El jugador no pertenece a tu club.', 
          ephemeral: true 
        });
      }

      // Actualizar el jugador
      registroJugador.equipo = 'Agente Libre';
      await registroJugador.save();

      // Remover rol y nickname
      const miembroJugador = interaction.guild.members.cache.get(jugador.id);
      if (miembroJugador) {
        try {
          await miembroJugador.roles.remove(equipoRol);
          await miembroJugador.setNickname(jugador.globalName || null);
        } catch (err) {
          console.error(`Error al actualizar roles/nickname: ${err.message}`);
        }
      }

      const fondoBajaPath = path.join(__dirname, '../Logos', 'debaja.png');
      const fondoBajaExists = fs.existsSync(fondoBajaPath);
      const fondoBaja = fondoBajaExists 
        ? new AttachmentBuilder(fondoBajaPath, { name: 'debaja.png' })
        : null;

      const logoPath = path.join(__dirname, '../Logos', `${equipoData.abreviacion}.png`);
      const logoExists = fs.existsSync(logoPath);
      const logoAttachment = logoExists
        ? new AttachmentBuilder(logoPath, { name: `${equipoData.abreviacion}.png` })
        : null;

      const bajaEmbed = new EmbedBuilder()
        .setTitle('⚡ Baja de Jugador')
        .setDescription(`**${equipoRol.name}** ha dado de baja a **${jugador.username}**`)
        .addFields(
          { name: 'DT', value: interaction.user.username, inline: true },
          { name: 'Jugadores restantes', value: `${(await Jugador.count({ where: { equipo: equipoRol.name } }))}/16`, inline: true },
          { name: 'Estado', value: '✅ Baja confirmada', inline: true }
        )
        .setColor('#FF4500')
        .setTimestamp()
        .setImage('attachment://debaja.png');

      if (logoAttachment) {
        bajaEmbed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
      }

      await canal.send({
        embeds: [bajaEmbed],
        files: [
          fondoBaja,
          logoAttachment
        ].filter(Boolean)
      });

      // DM USUARIO
      try {
        await jugador.send(`Has sido dado de baja de **${equipoRol.name}**.`);
      } catch (error) {
        console.error(`No se pudo enviar DM a ${jugador.tag}: ${error.message}`);
      }

      // DM DT
      await interaction.reply({ 
        content: `✅ ${jugador.username} ha sido dado de baja correctamente`, 
        ephemeral: true 
      });

    } catch (error) {
      console.error(`Error en comando bajar: ${error.message}`);
      await interaction.reply({ 
        content: '❌ Ocurrió un error al procesar la baja', 
        ephemeral: true 
      });
    }
  }
};