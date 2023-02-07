const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	EmbedBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require("discord.js");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Edit Embed")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
		const message = interaction.targetMessage;
		const embed = message.embeds[0];

		const fields = {
			title: new TextInputBuilder()
				.setCustomId("title")
				.setStyle(TextInputStyle.Short)
				.setLabel("Title"),
			description: new TextInputBuilder()
				.setCustomId("description")
				.setStyle(TextInputStyle.Paragraph)
				.setLabel("Description"),
		};

		const modal = new ModalBuilder()
			.setCustomId("editEmbed" + message.id)
			.setTitle("Edit Embed")
			.setComponents(
				new ActionRowBuilder().setComponents(fields.title),
				new ActionRowBuilder().setComponents(fields.description)
			);

		await interaction.showModal(modal);

		const submit = await interaction
			.awaitModalSubmit({
				time: 60000,
				filter: (i) => i.user.id === interaction.user.id,
			})
			.catch((error) => {
				console.log(error);
				return null;
			});

		if (submit) {
			let newEmbed = new EmbedBuilder()
				.setTitle(submit.fields.getTextInputValue("title"))
				.setDescription(submit.fields.getTextInputValue("description"))
				.setColor(embed.color);

			await message.edit({ embeds: [newEmbed] });

			await submit.reply({ content: "Embed edited.", ephemeral: true });
		} else {
			await interaction.reply({ content: "Timed out.", ephemeral: true });
		}
	},
};
