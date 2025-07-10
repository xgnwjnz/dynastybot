const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, WebhookClient
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('📚 Centro de ayuda interactivo con todos los comandos disponibles')
    .setDMPermission(false),

  async execute(interaction, client) {
    try {
      const assetsDir = path.join(__dirname, '../Logos');
      const loadAsset = (name) => {
        const file = path.join(assetsDir, name);
        return fs.existsSync(file) ? new AttachmentBuilder(file, { name }) : null;
      };

      const banner = loadAsset('ayuda.png');
      const categoryAssets = {
        'Configuración': 'config.png',
        'Gestión': 'gestion',
        'Carrera': 'career.png'
      };

      const loadedAssets = Object.fromEntries(
        Object.entries(categoryAssets).map(([k, v]) => [k, loadAsset(v)])
      );

      const commandData = new Map();
      const categories = new Set(['⚙️ Otros']);

      client.commands?.forEach(cmd => {
        if (!cmd?.data?.name) return;
        const meta = client.commandsData?.get(cmd.data.name) || {};
        const cat = meta.category || '⚙️ Otros';
        categories.add(cat);
        commandData.set(cmd.data.name, {
          name: cmd.data.name,
          description: cmd.data.description,
          category: cat,
          usage: meta.usage || `/${cmd.data.name}`,
          emoji: meta.emoji || '❔'
        });
      });

      const buildMenu = () => {
        const getEmoji = (e) => {
          if (!e) return { name: '❔' };
          if (/\p{Emoji}/u.test(e)) return { name: e.trim() };
          const match = e.match(/<a?:(\w+):(\d+)>/);
          return match ? { id: match[2] } : { name: '❔' };
        };

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('🌐 Selecciona una categoría')
            .addOptions([...categories].map(cat => ({
              label: cat.replace(/^[^\w]+/g, '').trim() || 'General',
              value: cat,
              emoji: getEmoji(cat.split(' ')[0]),
              description: `Comandos de ${cat}`.slice(0, 50)
            })))
        );
      };

      const mainEmbed = new EmbedBuilder()
        .setTitle('✨ Centro de Ayuda Interactivo')
        .setDescription([
          '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
          'Explora todos los comandos disponibles organizados por categorías.',
          'Selecciona una opción del menú para ver los comandos específicos.',
          '',
          `📊 **Total de comandos:** ${commandData.size}`,
          `🗂️ **Categorías disponibles:** ${categories.size}`,
          '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬'
        ].join('\n'))
        .setColor('#5865F2')
        .setFooter({
          text: `${client.user.username} • Ayuda interactiva`,
          iconURL: client.user.displayAvatarURL()
        });

      if (banner) mainEmbed.setImage('attachment://ayuda.png');

      const buildEmbed = (cat) => {
        const cmds = [...commandData.values()].filter(c => c.category === cat);
        const embed = new EmbedBuilder()
          .setTitle(`${cat} • Comandos`)
          .setColor('#2b2d31')
          .setFooter({ text: `${cmds.length} comandos disponibles`, iconURL: client.user.displayAvatarURL() });

        embed.setDescription(
          cmds.length
            ? cmds.map(c => `**${c.emoji} ${c.usage}**\n${c.description}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`).join('\n')
            : '🔍 No hay comandos disponibles en esta categoría'
        );

        const img = loadedAssets[cat];
        if (img) {
          embed.setThumbnail(`attachment://${categoryAssets[cat]}`);
        } else if (banner) {
          embed.setImage('attachment://ayuda.png');
        }

        return embed;
      };

      await interaction.reply({
        embeds: [mainEmbed],
        components: [buildMenu()],
        files: banner ? [banner] : [],
        ephemeral: true
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId === 'help_category',
        time: 5 * 60_000,
        idle: 15_000
      });

      collector.on('collect', async i => {
        const category = i.values[0];
        const embed = buildEmbed(category);
        const file = loadedAssets[category] || banner;
        await i.update({
          embeds: [embed],
          components: [buildMenu()],
          files: file ? [file] : []
        });
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'idle') {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏳ Menú cerrado por inactividad')
            .setColor('#2b2d31');
          await interaction.editReply({ embeds: [timeoutEmbed], components: [], files: [] }).catch(() => {});
        } else {
          await interaction.editReply({ components: [] }).catch(() => {});
        }
      });

    } catch (error) {
      await this.handleError(error, interaction);
      await interaction.reply({
        content: '⚠️ No se pudo cargar el sistema de ayuda. Por favor, inténtalo más tarde.',
        ephemeral: true
      });
    }
  },

  async handleError(error, interaction) {
    console.error('Error en comando ayuda:', error);

    if (process.env.ERROR_WEBHOOK_URL) {
      try {
        const hook = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Error en comando /ayuda')
          .setColor('#ED4245')
          .addFields(
            { name: 'Usuario', value: interaction.user?.tag || 'N/A', inline: true },
            { name: 'Canal', value: interaction.channel?.name || 'DM', inline: true },
            { name: 'Timestamp', value: new Date().toISOString(), inline: true },
            { name: 'Error', value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` },
            { name: 'Stack', value: `\`\`\`${error.stack?.slice(0, 1000) || 'No disponible'}\`\`\`` }
          )
          .setTimestamp();

        await hook.send({ content: `🚨 Error en ${interaction.guild?.name || 'DM'}`, embeds: [embed] });
      } catch (e) {
        console.error('Error al enviar a webhook:', e);
      }
    }
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox