const { SlashCommandBuilder } = require("discord.js");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("account")
		.setDescription("Get your account information (For development purposes)")
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Valorant username with hashtag. Example: Name#Tag")
				.setRequired(true)
		),
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });
		if (!interaction.options.getString("username").includes("#")) {
			return await interaction.editReply({
				content: `**Error:** Cannot find __${interaction.options.getString(
					"username"
				)}__. Make sure the username is in this format - \`Name#Tag\``,
			});
		}
		let valoID = "NULL";
		valoID = interaction.options.getString("username").split("#", 2);

		const accountData = await vapi.getAccount({
			name: valoID[0],
			tag: valoID[1],
		});

		console.log(accountData);

		await interaction.editReply({
			content: `Done`,
		});
	},
};
