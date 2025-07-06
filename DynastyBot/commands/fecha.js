const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone'); 
const config = require('../data/config.json');
moment.tz.setDefault("America/Caracas"); 


module.exports = {
  data: new SlashCommandBuilder()
    .setName('fecha')
    .setDescription('Envía un embed con la fecha y hora actual en Venezuela')
    .addIntegerOption(option => 
      option.setName('jornada')
        .setDescription('Número de la jornada')
        .setRequired(true)
    )
    .addAttachmentOption(option => 
      option.setName('archivo')
        .setDescription('Imagen de la jornada')
        .setRequired(true)
    ),

  async execute(interaction) {

    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
        return interaction.reply({ content: 'No tienes el rol de organizador para usar este comando.', ephemeral: true });
    }

    const jornada = interaction.options.getInteger('jornada');
    const archivo = interaction.options.getAttachment('archivo');
    const canal = interaction.guild.channels.cache.get(config.canal_fechas);

    if (!canal) {
        return interaction.reply({ content: 'No se pudo encontrar el canal de fechas.', ephemeral: true });
    }
    
    const now = moment(); 
    const horaVenezuela = now.format('HH:mm'); 

    const minutosRestantes = 15 - (now.minutes() % 15);
    const horaAjustada = now.add(minutosRestantes, 'minutes').format('HH:mm');

    const fechaEmbed = new EmbedBuilder()
      .setTitle(`Jornada ${jornada}`)
      .setDescription('Horarios de la próxima fecha (Venezuela)')
      .setImage(archivo.url)
      .addFields(
        { name: 'Hora Venezolana (Aproximada)', value: horaAjustada, inline: true }
      )
      .setColor('#00FF00')
      .setTimestamp()
      .setFooter({ text: 'Si la hora no parece correcta,\nUsa el comando /hora para ver la hora en Venezuela.'});

    await canal.send({
      embeds: [fechaEmbed]
    });

    const cooldownTime = 12 * 60 * 60 * 1000; 
    let lastUpdate = Date.now();


    const interval = setInterval(async () => {
      if (Date.now() - lastUpdate >= cooldownTime) {
        clearInterval(interval);
        return;
      }

      const updatedHoraVenezuela = moment().tz('America/Caracas');
      const minutosRestantesActualizados = 15 - (updatedHoraVenezuela.minutes() % 15);
      const horaAjustadaActualizada = updatedHoraVenezuela.add(minutosRestantesActualizados, 'minutes').format('HH:mm');

      fechaEmbed.fields[0].value = horaAjustadaActualizada; 

      const mensaje = await canal.send({
        embeds: [fechaEmbed]
      });

      lastUpdate = Date.now(); 
    }, 15 * 60 * 1000); 
  }
};