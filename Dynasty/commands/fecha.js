const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const config = require('../data/config.json');

moment.tz.setDefault('America/Caracas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fecha')
    .setDescription('📅 Envía un embed con la fecha y hora actual en Venezuela')
    .addIntegerOption(option =>
      option.setName('jornada')
        .setDescription('🧮 Número de la jornada')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('archivo')
        .setDescription('🖼️ Imagen del cronograma de la jornada')
        .setRequired(true)
    ),

  //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
  //               EJECUCIÓN DEL COMANDO           //
  //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.reply({
        content: '🚫 *No tienes permisos para usar este comando.* Need: `Organizador`',
        ephemeral: true
      });
    }

    const jornada = interaction.options.getInteger('jornada');
    const archivo = interaction.options.getAttachment('archivo');
    const canal = interaction.guild.channels.cache.get(config.canal_fechas);

    if (!canal) {
      return interaction.reply({
        content: '❌ *No se encontró el canal de fechas configurado.*',
        ephemeral: true
      });
    }

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //              CÁLCULO DE HORA REDONDEADA       //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    const ahora = moment();
    const minutosParaRedondear = 15 - (ahora.minutes() % 15);
    const horaRedondeada = ahora.add(minutosParaRedondear, 'minutes').format('HH:mm');

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //               CONSTRUCCIÓN DEL EMBED          //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    const embed = new EmbedBuilder()
      .setTitle(`🗓️ Jornada ${jornada}`)
      .setDescription('📌 *Horarios estimados para los partidos en hora venezolana*')
      .setImage(archivo.url)
      .addFields({
        name: '🕒 **Hora redondeada (Venezuela)**',
        value: `\`${horaRedondeada}\``,
        inline: true
      })
      .setColor('#00FF00')
      .setFooter({
        text: '⌛ Si la hora parece incorrecta, utiliza el comando /hora para verificarla.',
      })
      .setTimestamp();

    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    //               ENVÍO DEL MENSAJE               //
    //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
    await canal.send({ embeds: [embed] });

    const cooldownTime = 12 * 60 * 60 * 1000;
    const lastUpdate = Date.now();

    await interaction.reply({
      content: `✅ *La jornada **${jornada}** fue publicada correctamente en <#${config.canal_fechas}>.*`,
      ephemeral: true
    });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox