const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	MessageFlags,
} = require("discord.js");
const logger = require("../Logger/logger.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("member")
		.setDescription("Get member data.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("User to get data of")
				.setRequired(true),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const user = interaction.options.getUser("user");

		console.log({ user });

		await interaction.editReply({ content: "Done" });
	},
};
