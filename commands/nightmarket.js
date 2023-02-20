const {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("nightmarket")
		.setDescription("Check nightmarket in Valorant"),
	async execute(interaction, client) {
		const modal = new ModalBuilder()
			.setCustomId("valorant-login")
			.setTitle("Valorant Login");

		const usernameInput = new TextInputBuilder()
			.setCustomId("username")
			.setLabel("Username")
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const passwordInput = new TextInputBuilder()
			.setCustomId("password")
			.setLabel("Password")
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const firstInput = new ActionRowBuilder().addComponents(usernameInput);
		const secondInput = new ActionRowBuilder().addComponents(passwordInput);

		modal.addComponents(firstInput, secondInput);

		await interaction.showModal(modal);
	},
};
