const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("crosshair")
		.setDescription("Share your Valorant crosshair")
		.addStringOption((option) =>
			option
				.setName("profile-code")
				.setDescription("Valorant crosshair profile code")
				.setRequired(true)
		),
	async execute(interaction, client) {
		await interaction.deferReply();
		let profileCode = interaction.options.getString("profile-code");
		let crosshairEmbed, file;
		const crosshairBuffer = await vapi.getCrosshair({
			code: profileCode,
		});

		fs.writeFileSync(`crosshair.png`, crosshairBuffer.data);
		file = "crosshair.png";

		crosshairEmbed = new EmbedBuilder()
			.setColor("#00FF00")
			.setTitle("Crosshair")
			.setDescription("`" + profileCode + "`")
			.setImage("attachment://crosshair.png");

		await interaction.editReply({ embeds: [crosshairEmbed], files: [file] });

		fs.unlinkSync(file);
	},
};
