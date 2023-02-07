const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	EmbedBuilder,
} = require("discord.js");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Edit Embed")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
		const message = interaction.targetMessage;
		const embed = message.embeds[0];
		console.log(embed);
	},
};
