const { SlashCommandBuilder } = require('@discordjs/builders');
const config = require('../data/config.json');
const trophys = require('../data/trophys.json');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registerindv')
    .setDescription('Registra un premio individual')
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('Rol del premio individual')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nombre')
        .setDescription('Nombre del premio')
        .setRequired(true)
  ),

  async execute(interaction) {
    const rol = interaction.options.getRole('rol');
    const nombre = interaction.options.getString('nombre');

    if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.reply({
        content: 'No tienes permiso para ejecutar este comando.',
        ephemeral: true
      });
    }

    if (trophys.premios_individuales.some(premio => premio.id === rol.id)) {
      return interaction.reply({
        content: 'Este premio ya está registrado.',
        ephemeral: true,
      });
    }

    // Registrar premio al json
    trophys.premios_individuales.push({ nombre, id: rol.id });

    fs.writeFile('./data/trophys.json', JSON.stringify(config, null, 2), (err) => {
      if (err) {
        console.error(err);
        return interaction.reply({
          content: 'Hubo un error al guardar el premio en la configuración.',
          ephemeral: true,
        });
      }

      interaction.reply({
        content: `Premio registrado: **${nombre}** con el rol **${rol.name}**.`,
        ephemeral: true,
      });
    });
  },
};