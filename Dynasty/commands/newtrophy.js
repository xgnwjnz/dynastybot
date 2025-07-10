const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../data/config.json');
const trophys = require('../data/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newtrophy')
    .setDescription('🏅 Registra un título o premio individual')
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('🎖️ Rol del título o premio')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nombre')
        .setDescription('📛 Nombre (solo letras y espacios)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('temporada')
        .setDescription('📆 Número de temporada (1-99)')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('🏷️ Tipo de premio')
        .setRequired(true)
        .addChoices(
          { name: '🏆 Título', value: 'titulo' },
          { name: '🎖️ Individual', value: 'individual' }
        )
    )
    .addStringOption(option =>
      option.setName('division')
        .setDescription('⚽ División (ej: D1, D2)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('equipo')
        .setDescription('👕 Equipo (para títulos)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.reply({ 
        content: '🚫 *No tienes permisos para usar este comando.* Need: `Organizador`',
        ephemeral: true 
      });
    }

    const rol = interaction.options.getRole('rol');
    const nombreBase = interaction.options.getString('nombre').trim();
    const temporada = interaction.options.getInteger('temporada');
    const tipo = interaction.options.getString('tipo');
    const divisionInput = interaction.options.getString('division') || 'D1';
    const equipo = interaction.options.getString('equipo');

    if (!/^[a-zA-ZÁÉÍÓÚÑáéíóúñ\s]+$/.test(nombreBase)) {
      return interaction.reply({
        content: '❌ El nombre solo puede contener letras y espacios.',
        ephemeral: true
      });
    }

    if (/\bT\d{1,2}\b/.test(nombreBase)) {
      return interaction.reply({
        content: '❌ No incluyas la temporada en el nombre.',
        ephemeral: true
      });
    }

    if (tipo === 'individual' && divisionInput) {
      return interaction.reply({
        content: '❌ No se puede especificar división en premios individuales.',
        ephemeral: true
      });
    }

    if (tipo === 'titulo' && !equipo) {
      return interaction.reply({
        content: '❌ Debes especificar un equipo para títulos.',
        ephemeral: true
      });
    }

    const nombreFinal = tipo === 'individual' 
      ? `${nombreBase} - T${temporada}`
      : `${nombreBase} ${divisionInput} - T${temporada} [${equipo}]`;

    const trophysPath = path.join(__dirname, '../data/trophys.json');
    let trophys;
    
    try {
      trophys = JSON.parse(await fs.readFile(trophysPath, 'utf8'));
    } catch (error) {
      console.error('Error al leer trophys.json:', error);
      return interaction.reply({
        content: '❌ Error al cargar los premios existentes.',
        ephemeral: true
      });
    }

    const categoria = tipo === 'individual' ? 'premios_individuales' : 'titulos';
    if (trophys[categoria].some(t => t.id === rol.id)) {
      return interaction.reply({
        content: '❌ Este rol ya está registrado como premio.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🆕 Nuevo Premio/Título')
      .setDescription('Revisa los datos antes de confirmar')
      .addFields(
        { name: 'Tipo', value: tipo === 'individual' ? '🎖️ Individual' : '🏆 Título', inline: true },
        { name: 'Nombre', value: nombreFinal, inline: true },
        { name: 'Rol', value: rol.toString(), inline: true },
        { name: 'Temporada', value: `T${temporada}`, inline: true }
      )
      .setColor('#FFD700');

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirmar_trophy')
        .setLabel('✅ Confirmar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancelar_trophy')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
    );

    const mensaje = await interaction.reply({
      embeds: [embed],
      components: [botones],
      ephemeral: true
    });

    const filter = i => {
      return i.user.id === interaction.user.id && 
             (i.customId === 'confirmar_trophy' || i.customId === 'cancelar_trophy');
    };

    const collector = mensaje.createMessageComponentCollector({ 
      filter, 
      time: 60000,
      max: 1 
    });

    collector.on('collect', async i => {
      try {
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirmar_trophy_disabled')
            .setLabel(i.customId === 'confirmar_trophy' ? 'Procesando...' : 'Cancelando...')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('cancelar_trophy_disabled')
            .setLabel(i.customId === 'confirmar_trophy' ? 'Procesando...' : 'Cancelando...')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await i.update({ components: [disabledButtons] });

        if (i.customId === 'cancelar_trophy') {
          await i.followUp({
            content: '❌ Registro de premio cancelado.',
            ephemeral: true
          });
          return;
        }

        trophys[categoria].push({ nombre: nombreFinal, id: rol.id });

        try {
          await fs.writeFile(trophysPath, JSON.stringify(trophys, null, 2));
          await i.followUp({
            content: `✅ ${tipo === 'individual' ? 'Premio individual' : 'Título'} registrado correctamente:\n**${nombreFinal}**`,
            ephemeral: true
          });
        } catch (error) {
          console.error('Error al guardar:', error);
          await i.followUp({
            content: '❌ Error al guardar el premio.',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error en collector:', error);
        await i.followUp({
          content: '❌ Ocurrió un error al procesar.',
          ephemeral: true
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏱️ Tiempo de confirmación agotado.',
          components: []
        }).catch(console.error);
      }
    });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox