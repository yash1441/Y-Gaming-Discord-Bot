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
		const { message } = interaction.targetMessage;
		console.log({ message });
		translate(message.content, { to: "en" })
			.then((res) => {
				interaction.reply({ ephemeral: true, content: res.text });
			})
			.catch((err) => {
				interaction.reply({ ephemeral: true, content: err });
			});
	},
};
