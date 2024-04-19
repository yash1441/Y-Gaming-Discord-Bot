const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
require("dotenv").config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("toproll")
		.setDescription("Testing toproll"),
	async execute(interaction) {
        const button = new ButtonBuilder()
            .setCustomId('toproll')
            .setLabel('Toproll');
        
        const row = new ActionRowBuilder().addComponents(button);
		await interaction.reply({ content: 'Test', components: [row], ephemeral: true });
	},
};
