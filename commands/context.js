const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
} = require("discord.js");
const translate = require("google-translate-api");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Translate")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
		const message = interaction.targetMessage.content;
		translate(message, { to: "en" })
			.then((res) => {
				console.log(res.text);
				interaction.reply({ ephemeral: true, content: "Translated." });
			})
			.catch((err) => {
				console.log(err);
				interaction.reply({ ephemeral: true, content: "Error." });
			});
	},
};
