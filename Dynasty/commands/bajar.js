const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
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
    try {
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //                   SETUP                      //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const jugador = interaction.options.getUser('jugador');
      const miembro = interaction.guild.members.cache.get(interaction.user.id);
      const canal = interaction.guild.channels.cache.get(config.canal_movimientos_bajas);

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              VALIDACIONES INICIALES           //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const rolesPermitidos = [
        config.rol_dt_primera,
        config.rol_dt_segunda,
        config.rol_sub_dt_primera,
        config.rol_sub_dt_segunda
      ];

      if (!config.estado_mercado) {
        throw new Error('Mercado cerrado - No se pueden realizar bajas');
      }

      if (!miembro.roles.cache.some(role => rolesPermitidos.includes(role.id))) {
        throw new Error('Permisos insuficientes: No eres DT/Sub-DT de Primera o Segunda División');
      }

      const equipoRol = miembro.roles.cache.find(role => 
        teams.equipos.some(equipo => equipo.id === role.id)
      );
      
      if (!equipoRol) {
        throw new Error('Usuario no pertenece a ningún equipo registrado');
      }

      if (!canal) {
        throw new Error('Canal de bajas no configurado');
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //          VALIDACIONES DE EQUIPO/JUGADOR       //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const equipoData = teams.equipos.find(e => e.id === equipoRol.id);
      if (!equipoData) {
        throw new Error('Datos del equipo no encontrados');
      }

      const equipoDB = await Equipo.findOne({ where: { nombre: equipoRol.name } });
      if (!equipoDB) {
        throw new Error('Equipo no encontrado en la base de datos');
      }

      const registroJugador = await Jugador.findOne({ where: { discordId: jugador.id } });
      if (!registroJugador || registroJugador.equipo !== equipoRol.name) {
        throw new Error('Jugador no pertenece al equipo del DT');
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              PROCESO DE BAJA                  //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      registroJugador.equipo = 'Agente Libre';
      await registroJugador.save();

      const miembroJugador = interaction.guild.members.cache.get(jugador.id);
      if (miembroJugador) {
        try {
          await miembroJugador.roles.remove(equipoRol);
          await miembroJugador.setNickname(jugador.globalName || null);
        } catch (err) {
          console.warn(`Advertencia al actualizar roles/nickname: ${err.message}`);
        }
      }

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              NOTIFICACIONES                   //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      const cargarAsset = (carpeta, archivo) => {
        const ruta = path.join(__dirname, carpeta, archivo);
        return fs.existsSync(ruta) ? new AttachmentBuilder(ruta, { name: archivo }) : null;
      };

      const fondoBaja = cargarAsset('../Logos', 'debaja.png');
      const logoAttachment = cargarAsset('../Logos', `${equipoData.abreviacion}.png`);

      const bajaEmbed = new EmbedBuilder()
        .setTitle('📤 Baja Confirmada')
        .setDescription(`**${equipoRol.name}** ha liberado a **${jugador.username}**`)
        .addFields(
          { name: '👔 Director Técnico', value: interaction.user.username, inline: true },
          { name: '📊 Plantilla actual', value: `${(await Jugador.count({ where: { equipo: equipoRol.name } }))}/16`, inline: true },
          { name: '🔄 Estado', value: '✅ Proceso completado', inline: true }
        )
        .setColor('#FF4500')
        .setTimestamp()
        .setImage('attachment://debaja.png');

      if (logoAttachment) {
        bajaEmbed.setThumbnail(`attachment://${equipoData.abreviacion}.png`);
      }

      await canal.send({
        embeds: [bajaEmbed],
        files: [fondoBaja, logoAttachment].filter(Boolean)
      });

      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      //              MENSAJES PRIVADOS                //
      //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
      try {
        await jugador.send({
          content: `🏃‍♂️ Has sido liberado de **${equipoRol.name}**\n\n` +
                   'Ahora eres un agente libre y puedes ser fichado por otro equipo.'
        });
      } catch (error) {
        console.warn(`No se pudo enviar DM a ${jugador.tag}`);
      }

      return interaction.reply({ 
        content: `✅ ${jugador.username} ha sido dado de baja correctamente`, 
        ephemeral: true 
      });

    } catch (error) {
      await this.handleError(error, interaction);
      return interaction.reply({ 
        content: '⚠️ Ocurrió un problema al procesar la baja. Por favor, inténtalo nuevamente.', 
        ephemeral: true 
      });
    }
  },

  async handleError(error, interaction) {
    console.error('Error en comando bajar:', error);
    
    if (process.env.ERROR_WEBHOOK_URL) {
      try {
        const errorWebhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
        
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ Error en comando /bajar')
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