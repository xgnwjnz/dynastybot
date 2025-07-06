const { SlashCommandBuilder } = require('discord.js');
const config = require('../data/config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mercado')
    .setDescription('Abrir o cerrar el mercado de transferencias')
    .addStringOption(option =>
      option.setName('accion')
        .setDescription('Acción a realizar')
        .setRequired(true)
        .addChoices(
          { name: 'Abrir', value: 'abrir' },
          { name: 'Cerrar', value: 'cerrar' }
        )
    ),
    
  async execute(interaction) {
    const accion = interaction.options.getString('accion');

    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.reply({
        content: 'No tienes permiso para ejecutar este comando.',
        ephemeral: true
      });
    }

    // Actualizar el estado del mercado
    const nuevoEstado = accion === 'abrir';
    config.estado_mercado = nuevoEstado;

    // Guardar cambios en config.json
    const configPath = path.join(__dirname, '../data/config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    interaction.reply({
      content: `El mercado de transferencias ha sido **${nuevoEstado ? 'abierto' : 'cerrado'}**.`,
      ephemeral: false
    });
  }
};