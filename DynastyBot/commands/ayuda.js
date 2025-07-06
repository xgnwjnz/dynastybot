const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra todos los comandos disponibles organizados por categorías'),

  async execute(interaction, client) {
    const imagesDir = path.join(__dirname, '../logos');
    const mainImage = 'ayuda.png';
    const categoryImages = {
      'config': 'config.png',
      'gestion': 'gestion.png',
      'carrer': 'carrer.png'
    };

    const mainImagePath = path.join(imagesDir, mainImage);
    const mainImageExists = fs.existsSync(mainImagePath);
    const mainAttachment = mainImageExists 
      ? new AttachmentBuilder(mainImagePath, { name: 'ayuda.png' })
      : null;

    const categories = new Set();
    client.commandsData.forEach(cmd => categories.add(cmd.category));

    const categoryMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('Selecciona una categoría')
        .addOptions(Array.from(categories).map(category => ({
          label: category.split(' ')[1],
          description: `Ver comandos de ${category}`,
          value: category
        })))
    );

    const mainEmbed = new EmbedBuilder()
      .setTitle('📚 Centro de Ayuda')
      .setDescription('Selecciona una categoría para ver los comandos disponibles')
      .setColor('#2b2d31')
      .setFooter({ text: `Total de comandos: ${client.commands.size}` });

    if (mainImageExists) {
      mainEmbed.setImage('attachment://ayuda.png');
    }

    await interaction.reply({ 
      embeds: [mainEmbed], 
      components: [categoryMenu],
      files: mainAttachment ? [mainAttachment] : [],
      ephemeral: true 
    });

    const filter = i => i.customId === 'help_category' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      const selectedCategory = i.values[0];
      const categoryCommands = Array.from(client.commandsData.values())
        .filter(cmd => cmd.category === selectedCategory);

      const categoryImage = categoryImages[selectedCategory.toLowerCase().split(' ')[1]] || null;
      const categoryImagePath = path.join(imagesDir, categoryImage);
      const categoryImageExists = fs.existsSync(categoryImagePath);
      const categoryAttachment = categoryImageExists
        ? new AttachmentBuilder(categoryImagePath, { name: categoryImage })
        : null;

      const categoryEmbed = new EmbedBuilder()
        .setTitle(`${selectedCategory} - Comandos`)
        .setColor('#5865F2')
        .setDescription(`**${categoryCommands.length} comandos disponibles**\n\n${
          categoryCommands.map(cmd => 
            `**${cmd.usage}**\n${cmd.description}`
          ).join('\n\n')
        }`)
        .setFooter({ text: 'Usa /ayuda para volver al menú principal' });

      if (categoryImageExists) {
        categoryEmbed.setThumbnail(`attachment://${categoryImage}`);
      }

      await i.update({ 
        embeds: [categoryEmbed], 
        components: [categoryMenu],
        files: categoryAttachment ? [categoryAttachment] : []
      });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};