const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	EmbedBuilder,
} = require("discord.js");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("test")
		.setType(ApplicationCommandType.User),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle("Test")
			.setDescription("This is a test");
		await interaction.reply({ ephemeral: true, embeds: [embed] });
	},
};
