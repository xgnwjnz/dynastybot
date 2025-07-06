const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const config = require('../data/config.json');
const teams = require('../data/teams.json');
const keys = require('../data/keys.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fichar')
    .setDescription('Ficha a un jugador para tu equipo')
    .addUserOption(option =>
      option.setName('jugador')
        .setDescription('Jugador a fichar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('clave')
        .setDescription('Clave de emergencia (solo si el mercado está cerrado)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const jugador = interaction.options.getUser('jugador');
      const clave = interaction.options.getString('clave');
      const esEmergencia = Boolean(clave);
      const miembro = interaction.guild.members.cache.get(interaction.user.id);
      
      // Verificación básica de permisos
      if (!miembro.roles.cache.some(role => [config.rol_dt, config.rol_sub_dt].includes(role.id))) {
        return interaction.reply({ content: '❌ No tienes permiso para fichar jugadores', ephemeral: true });
      }

      // Buscar equipo del DT
      const equipoRol = miembro.roles.cache.find(role => 
        teams.equipos.some(equipo => equipo.id === role.id)
      );
      
      if (!equipoRol) {
        return interaction.reply({ content: '❌ No perteneces a ningún equipo registrado', ephemeral: true });
      }

      // Obtener datos del equipo
      const equipoData = teams.equipos.find(e => e.id === equipoRol.id);
      const canalFichajes = interaction.guild.channels.cache.get(config.canal_movimientos_fichajes);
      
      if (!canalFichajes) {
        return interaction.reply({ content: '❌ No se encontró el canal de fichajes', ephemeral: true });
      }

      // Configuración de imágenes
      const fondoFichajePath = path.join(__dirname, '../Logos', 'fondofichajes.png');
      const fondoFichajeExists = fs.existsSync(fondoFichajePath);
      const fondoFichaje = fondoFichajeExists 
        ? new AttachmentBuilder(fondoFichajePath, { name: 'fondofichajes.png' })
        : null;

      const logoPath = path.join(__dirname, '../Logos', `${equipoData.abreviacion}.png`);
      const logoExists = fs.existsSync(logoPath);
      const logoAttachment = logoExists
        ? new AttachmentBuilder(logoPath, { name: `${equipoData.abreviacion}.png` })
        : null;

      // Validación modo emergencia
      if (esEmergencia) {
        if (config.estado_mercado) {
          return interaction.reply({
            content: '❌ Solo puedes usar fichajes de emergencia cuando el mercado está CERRADO',
            ephemeral: true
          });
        }

        const claveValida = keys.claves_emergencia.find(c => c.clave === clave && !c.used);
        if (!claveValida) {
          return interaction.reply({
            content: '❌ Clave inválida o ya utilizada',
            ephemeral: true
          });
        }
      }

      // Verificar límite de jugadores
      const jugadoresEquipo = await Jugador.findAll({ where: { equipo: equipoRol.name } });
      if (jugadoresEquipo.length >= 16) {
        return interaction.reply({ 
          content: '❌ El equipo ya tiene el máximo de 16 jugadores', 
          ephemeral: true 
        });
      }

      // Buscar o crear registro del jugador
      let registroJugador = await Jugador.findOne({ where: { discordId: jugador.id } });
      if (!registroJugador) {
        registroJugador = await Jugador.create({ 
          nombre: jugador.username, 
          discordId: jugador.id, 
          equipo: 'Agente Libre' 
        });
      }

      // Verificar si ya está en equipo
      if (registroJugador.equipo !== 'Agente Libre') {
        return interaction.reply({
          content: `❌ ${jugador.username} ya pertenece a ${registroJugador.equipo}`,
          ephemeral: true
        });
      }

      // Proceso de fichaje normal (con confirmación)
      if (!esEmergencia) {
        if (!config.estado_mercado) {
          return interaction.reply({
            content: '❌ El mercado está cerrado. Usa una clave de emergencia si es necesario',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('📝 Solicitud de Fichaje')
          .setDescription(`**${equipoRol.name}** quiere fichar a **${jugador.username}**`)
          .addFields(
            { name: 'DT', value: interaction.user.username, inline: true },
            { name: 'Jugadores actuales', value: `${jugadoresEquipo.length}/16`, inline: true },
            { name: 'Estado', value: 'Esperando confirmación', inline: true }
          )
          .setColor('#2b82d3')
          .setImage('attachment://fondofichajes.png');

        if (logoAttachment) {
          embed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
        }

        const botones = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('fichar_aceptar')
            .setLabel('Aceptar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('fichar_rechazar')
            .setLabel('Rechazar')
            .setStyle(ButtonStyle.Danger)
        );

        const mensaje = await canalFichajes.send({ 
          embeds: [embed], 
          components: [botones],
          files: [
            fondoFichaje,
            logoAttachment
          ].filter(Boolean)
        });

        const collector = mensaje.createMessageComponentCollector({ time: 86400000 }); // 24 horas

        collector.on('collect', async i => {
          if (i.customId === 'fichar_aceptar') {
            // Proceso de aceptación
            registroJugador.equipo = equipoRol.name;
            await registroJugador.save();
            
            // Asignar rol al jugador
            const miembroJugador = interaction.guild.members.cache.get(jugador.id);
            await miembroJugador.roles.add(equipoRol);
            
            // Actualizar embed
            await i.update({
              embeds: [embed.setFields(
                embed.data.fields.slice(0, 2),
                { name: 'Estado', value: '✅ Fichaje completado', inline: true }
              ).setColor('#00ff00')],
              components: []
            });
          } else {
            // Proceso de rechazo
            await i.update({
              embeds: [embed.setFields(
                embed.data.fields.slice(0, 2),
                { name: 'Estado', value: '❌ Fichaje rechazado', inline: true }
              ).setColor('#ff0000')],
              components: []
            });
          }
          collector.stop();
        });

        return interaction.reply({
          content: `✅ Solicitud de fichaje enviada para ${jugador}`,
          ephemeral: true
        });
      }

      // Proceso de fichaje de emergencia (sin confirmación)
      registroJugador.equipo = equipoRol.name;
      await registroJugador.save();

      // Marcar clave como usada
      const claveIndex = keys.claves_emergencia.findIndex(c => c.clave === clave);
      keys.claves_emergencia[claveIndex].used = true;
      fs.writeFileSync(path.join(__dirname, '../data/keys.json'), JSON.stringify(keys, null, 2));

      // Asignar rol y nickname
      const miembroJugador = interaction.guild.members.cache.get(jugador.id);
      await miembroJugador.roles.add(equipoRol);
      
      if (equipoData.abreviacion) {
        await miembroJugador.setNickname(`#${equipoData.abreviacion} ${jugador.username}`)
          .catch(() => console.log('No se pudo cambiar el nickname'));
      }

      // Crear embed para emergencia
      const emergenciaEmbed = new EmbedBuilder()
        .setTitle('⚡ Fichaje de Emergencia')
        .setDescription(`${equipoRol.name} ha fichado a ${jugador.username}`)
        .addFields(
          { name: 'DT', value: interaction.user.username, inline: true },
          { name: 'Clave usada', value: clave.slice(0, 3) + '...' + clave.slice(-3), inline: true },
          { name: 'Jugadores', value: `${jugadoresEquipo.length + 1}/16`, inline: true }
        )
        .setColor('#ffaa00')
        .setImage('attachment://fondofichajes.png');

      if (logoAttachment) {
        emergenciaEmbed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
      }

      // Notificar en el canal
      await canalFichajes.send({
        embeds: [emergenciaEmbed],
        files: [
          fondoFichaje,
          logoAttachment
        ].filter(Boolean)
      });

      return interaction.reply({
        content: `✅ Fichaje de emergencia completado para ${jugador}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error en comando fichar:', error);
      return interaction.reply({
        content: '❌ Ocurrió un error al procesar el fichaje',
        ephemeral: true
      });
    }
  }
};