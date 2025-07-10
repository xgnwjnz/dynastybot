const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
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
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //                   SETUP                      //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const jugador = interaction.options.getUser('jugador');
      const clave = interaction.options.getString('clave');
      const esEmergencia = Boolean(clave);
      const miembro = interaction.guild.members.cache.get(interaction.user.id);
      
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              VALIDACIONES INICIALES           //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const rolesPermitidos = [
        config.rol_dt_primera,
        config.rol_dt_segunda,
        config.rol_sub_dt_primera,
        config.rol_sub_dt_segunda
      ];

      if (!miembro.roles.cache.some(role => rolesPermitidos.includes(role.id))) {
        throw new Error('Permisos insuficientes para fichar');
      }

      const equipoRol = miembro.roles.cache.find(role => 
        teams.equipos.some(equipo => equipo.id === role.id)
      );
      
      if (!equipoRol) {
        throw new Error('Usuario no es DT de ningún equipo registrado');
      }

      const equipoData = teams.equipos.find(e => e.id === equipoRol.id);
      const canalFichajes = interaction.guild.channels.cache.get(config.canal_movimientos_fichajes);
      
      if (!canalFichajes) {
        throw new Error('Canal de fichajes no encontrado');
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              PREPARACIÓN DE ASSETS            //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const cargarAsset = (carpeta, archivo) => {
        const ruta = path.join(__dirname, carpeta, archivo);
        return fs.existsSync(ruta) ? new AttachmentBuilder(ruta, { name: archivo }) : null;
      };

      const fondoFichaje = cargarAsset('../Logos', 'fondofichajes.png');
      const logoAttachment = cargarAsset('../Logos', `${equipoData.abreviacion}.png`);

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //            VALIDACIONES ESPECÍFICAS           //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      if (esEmergencia) {
        if (config.estado_mercado) {
          throw new Error('Intento de usar clave de emergencia con mercado abierto');
        }

        const claveValida = keys.claves_emergencia.find(c => c.clave === clave && !c.used);
        if (!claveValida) {
          throw new Error('Clave de emergencia inválida o ya usada');
        }
      }

      const jugadoresEquipo = await Jugador.findAll({ where: { equipo: equipoRol.name } });
      if (jugadoresEquipo.length >= 16) {
        throw new Error('Equipo ya tiene plantilla completa (16/16)');
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //          GESTIÓN DEL REGISTRO DEL JUGADOR      //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      let registroJugador = await Jugador.findOne({ where: { discordId: jugador.id } });
      if (!registroJugador) {
        registroJugador = await Jugador.create({ 
          nombre: jugador.username, 
          discordId: jugador.id, 
          equipo: 'Agente Libre' 
        });
      }

      if (registroJugador.equipo !== 'Agente Libre') {
        throw new Error(`Jugador ya pertenece a ${registroJugador.equipo}`);
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //         PROCESO DE FICHAJE NORMAL             //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      if (!esEmergencia) {
        if (!config.estado_mercado) {
          throw new Error('Intento de fichar con mercado cerrado sin clave');
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 Fichaje pendiente • ${equipoRol.name}`)
          .setDescription(`**${interaction.user.username}** quiere incorporar a **${jugador.username}** a su plantilla`)
          .addFields(
            { name: '📊 Plantilla actual', value: `${jugadoresEquipo.length}/16 jugadores`, inline: true },
            { name: '🔄 Estado', value: 'Esperando confirmación...', inline: true }
          )
          .setColor('#5865F2')
          .setImage('attachment://fondofichajes.png')
          .setFooter({ text: 'Tienes 24 horas para responder' });

        if (logoAttachment) {
          embed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
        }

        const botones = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('fichar_aceptar')
            .setLabel('✅ Aprobar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('fichar_rechazar')
            .setLabel('❌ Rechazar')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('fichar_cancelar')
            .setLabel('✖️ Cancelar')
            .setStyle(ButtonStyle.Secondary)
        );

        const mensaje = await canalFichajes.send({ 
          embeds: [embed], 
          components: [botones],
          files: [fondoFichaje, logoAttachment].filter(Boolean)
        });

        const collector = mensaje.createMessageComponentCollector({ time: 86400000 });

        collector.on('collect', async i => {
          try {
            if (i.customId === 'fichar_aceptar' || i.customId === 'fichar_rechazar') {
              if (i.user.id !== jugador.id) {
                await i.reply({
                  content: `Este fichaje no es para ti! Es de <@${jugador.id}>`,
                  ephemeral: true
                });
                return;
              }
              
              if (i.customId === 'fichar_aceptar') {
                registroJugador.equipo = equipoRol.name;
                await registroJugador.save();
                
                const miembroJugador = interaction.guild.members.cache.get(jugador.id);
                await miembroJugador.roles.add(equipoRol);
                
                const embedAceptado = EmbedBuilder.from(embed)
                  .spliceFields(1, 1, { name: '🔄 Estado', value: '✅ Fichaje aprobado', inline: true })
                  .setColor('#57F287');
                
                await i.update({ 
                  embeds: [embedAceptado], 
                  components: [],
                  files: [fondoFichaje, logoAttachment].filter(Boolean)
                });
              } else {
                const embedRechazado = EmbedBuilder.from(embed)
                  .spliceFields(1, 1, { name: '🔄 Estado', value: '❌ Fichaje rechazado', inline: true })
                  .setColor('#ED4245');
                
                await i.update({ 
                  embeds: [embedRechazado], 
                  components: [],
                  files: [fondoFichaje, logoAttachment].filter(Boolean)
                });
              }
              collector.stop();
            } 
            else if (i.customId === 'fichar_cancelar') {
              if (i.user.id !== interaction.user.id) {
                await i.reply({
                  content: `No puedes cancelar! Solo puede <@${interaction.user.id}>`,
                  ephemeral: true
                });
                return;
              }
              
              const embedCancelado = EmbedBuilder.from(embed)
                .spliceFields(1, 1, { name: '🔄 Estado', value: '✖️ Fichaje cancelado', inline: true })
                .setColor('#99AAB5');
              
              await i.update({ 
                embeds: [embedCancelado], 
                components: [],
                files: [fondoFichaje, logoAttachment].filter(Boolean)
              });
              collector.stop();
            }
          } catch (error) {
            console.error('Error en la interacción:', error);
            if (!i.replied) {
              await i.reply({
                content: 'Ocurrió un error al procesar tu acción',
                ephemeral: true
              });
            }
          }
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            const lastEmbed = mensaje.embeds[0];
            if (lastEmbed && lastEmbed.fields && lastEmbed.fields[1].value === 'Esperando confirmación...') {
              const embedExpirado = EmbedBuilder.from(lastEmbed)
                .spliceFields(1, 1, { name: '🔄 Estado', value: '⌛ Tiempo agotado', inline: true })
                .setColor('#99AAB5');
              
              mensaje.edit({ 
                embeds: [embedExpirado], 
                components: [],
                files: [fondoFichaje, logoAttachment].filter(Boolean)
              }).catch(console.error);
            }
          }
        });

        return interaction.reply({
          content: `📨 Solicitud de fichaje enviada para **${jugador.username}**`,
          ephemeral: true
        });
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //         PROCESO DE FICHAJE DE EMERGENCIA      //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      registroJugador.equipo = equipoRol.name;
      await registroJugador.save();

      const claveIndex = keys.claves_emergencia.findIndex(c => c.clave === clave);
      keys.claves_emergencia[claveIndex].used = true;
      fs.writeFileSync(path.join(__dirname, '../data/keys.json'), JSON.stringify(keys, null, 2));

      const miembroJugador = interaction.guild.members.cache.get(jugador.id);
      await miembroJugador.roles.add(equipoRol);
      
      if (equipoData.abreviacion) {
        await miembroJugador.setNickname(`#${equipoData.abreviacion} ${jugador.username}`)
          .catch(() => console.log('⚠️ No se pudo actualizar el apodo'));
      }

      const emergenciaEmbed = new EmbedBuilder()
        .setTitle('🚨 Fichaje Express')
        .setDescription(`**${equipoRol.name}** ha realizado un fichaje urgente`)
        .addFields(
          { name: '👤 Jugador', value: jugador.username, inline: true },
          { name: '👔 Director Técnico', value: interaction.user.username, inline: true },
          { name: '🔑 Clave usada', value: `||${clave.slice(0, 3)}...${clave.slice(-3)}||`, inline: true },
          { name: '📈 Plantilla actual', value: `${jugadoresEquipo.length + 1}/16`, inline: true }
        )
        .setColor('#FEE75C')
        .setImage('attachment://fondofichajes.png');

      if (logoAttachment) {
        emergenciaEmbed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
      }

      await canalFichajes.send({
        embeds: [emergenciaEmbed],
        files: [fondoFichaje, logoAttachment].filter(Boolean)
      });

      return interaction.reply({
        content: `🎉 ¡Fichaje de emergencia completado! Bienvenido/a **${jugador.username}** a **${equipoRol.name}**`,
        ephemeral: true
      });

    } catch (error) {
      await this.handleError(error, interaction);
      return interaction.reply({
        content: '⚠️ Vaya, algo no ha salido bien... ¿Podrías intentarlo de nuevo?',
        ephemeral: true
      });
    }
  },

  async handleError(error, interaction) {
    console.error('Error en comando fichar:', error);
    
    if (process.env.ERROR_WEBHOOK_URL) {
      try {
        const errorWebhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
        
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ Error en comando /fichar')
          .setColor('#FF0000')
          .addFields(
            { name: 'Usuario', value: interaction.user?.tag || 'Desconocido', inline: true },
            { name: 'Servidor', value: interaction.guild?.name || 'DM', inline: true },
            { name: 'Canal', value: interaction.channel?.name || 'DM', inline: true },
            { name: 'Error', value: `\`\`\`${error.message}\`\`\`` },
            { name: 'Stack', value: `\`\`\`${error.stack?.slice(0, 1000) || 'No disponible'}\`\`\`` }
          )
          .setTimestamp();

        await errorWebhook.send({
          embeds: [errorEmbed],
          content: `🚨 Error en ${interaction.guild?.name || 'DM'}`
        });
      } catch (webhookError) {
        console.error('Error al enviar a webhook:', webhookError);
      }
    }
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox