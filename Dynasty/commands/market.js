const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const config = require('../data/config.json');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mercado')
    .setDescription('🔄 Abre o cierra el mercado de transferencias')
    .addStringOption(option =>
      option.setName('accion')
        .setDescription('¿Qué deseas hacer con el mercado?')
        .setRequired(true)
        .addChoices(
          { name: '📬 Abrir mercado', value: 'abrir' },
          { name: '📪 Cerrar mercado', value: 'cerrar' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const accion = interaction.options.getString('accion');

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //      PERMISOS: Solo Organizadores     //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.editReply({
        content: '🚫 *No tienes permisos para usar este comando.* Need: `Organizador`',
        ephemeral: true
      });
    }

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //       ACTUALIZAR ARCHIVO LOCAL        //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    const nuevoEstado = accion === 'abrir';
    config.estado_mercado = nuevoEstado;
    fs.writeFileSync(
      path.join(__dirname, '../data/config.json'),
      JSON.stringify(config, null, 2),
      'utf8'
    );

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //          CREAR EMBED DE AVISO         //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    const mensaje = nuevoEstado
      ? '📢 *¡El mercado de transferencias ha sido abierto!*'
      : '📕 *El mercado ha sido cerrado hasta nuevo aviso.*';

    const embed = new EmbedBuilder()
      .setTitle(nuevoEstado ? '🔓 Mercado Abierto' : '🔒 Mercado Cerrado')
      .setDescription(mensaje)
      .setColor('#4da6ff')
      .setTimestamp()
      .setFooter({
        text: `Actualizado por ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //        ENVIAR A CANALES WEBHOOK       //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    const canalFichajes = new WebhookClient({ url: config.canal_movimientos_fichajes });
    const canalBajas = new WebhookClient({ url: config.canal_movimientos_bajas });

    try {
      await canalFichajes.send({ embeds: [embed] });
      await canalBajas.send({ embeds: [embed] });
    } catch (err) {
      console.warn('⚠️ No se pudo enviar a los canales de movimientos:', err.message);
    }

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //  NOTIFICAR A TODOS LOS DTs Y SUB-DTs  //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    try {
      const staffRoles = [
        config.rol_dt_primera,
        config.rol_dt_segunda,
        config.rol_sub_dt_primera,
        config.rol_sub_dt_segunda
      ];

      const staffMembers = interaction.guild.members.cache.filter(member => 
        staffRoles.some(role => member.roles.cache.has(role))
      );

      await Promise.all(staffMembers.map(async member => {
        try {
          await member.send({ 
            content: '📢 **Notificación importante sobre el mercado de transferencias**',
            embeds: [embed] 
          });
          console.log(`✅ Notificación enviada a ${member.user.tag}`);
        } catch (error) {
          console.warn(`❌ No se pudo enviar DM a ${member.user.tag}`);
        }
      }));

    } catch (error) {
      console.error('Error al notificar al staff técnico:', error);
    }

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //        ENVIAR A WEBHOOK DE LOGS       //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    if (process.env.ERROR_WEBHOOK_URL) {
      try {
        const logWebhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
        await logWebhook.send({
          content: `📋 *El mercado fue* \`${nuevoEstado ? 'abierto' : 'cerrado'}\` *por* **${interaction.user.tag}**.`,
          embeds: [embed]
        });
      } catch (logError) {
        console.error('Error al enviar al webhook de logs:', logError);
      }
    }

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //      RESPUESTA FINAL AL USUARIO       //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    await interaction.editReply({
      content: `✅ El mercado ahora está **${nuevoEstado ? 'ABIERTO' : 'CERRADO'}**.`,
      embeds: [embed]
    });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox