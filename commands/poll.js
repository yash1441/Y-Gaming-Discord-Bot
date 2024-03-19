const { SlashCommandBuilder, EmbedBuilder, messageLink } = require("discord.js");
const logger = require("../Logger/logger.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("poll")
		.setDescription("Create a poll.")
        .setDMPermission(false)
		.addStringOption((option) =>
			option
				.setName("title")
				.setDescription("Title of the poll")
				.setRequired(true)
				.setMaxLength(256)
		),
	async execute(interaction) {
		await interaction.reply({ content: `Creating the poll...`, ephemeral: true });

		const title = interaction.options.getString("title");
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x0099ff)
            .setFooter({
                text: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
            });

        const message = await interaction.channel.send({ embeds: [embed] });
        await message.react('🔼').then(message.react('🔽'));

		await interaction.editReply({ content: 'Created poll! ' + messageLink(interaction.channelId, message.id) });
	},
};
