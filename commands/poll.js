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
		)
		.addStringOption((option) =>
			option
				.setName("choices")
				.setDescription("Choices for the poll")
				.setRequired(false)
				.setMaxLength(256)
		),
	async execute(interaction) {
		await interaction.reply({ content: `Creating the poll...`, ephemeral: true });

		const title = interaction.options.getString("title");
		const choicesString = interaction.options.getString("choices");

		const options = await getChoices(choicesString);

		const embed = new EmbedBuilder()
			.setTitle(title)
			.setColor(0x0099ff)
			.setFooter({
				text: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			});

		for (const option of options) {
			embed.addFields({ name: option.name, value: option.emoji, inline: true });
		}

		const message = await interaction.channel.send({ embeds: [embed] });
		for (const option of options) {
			await message.react(option.emoji);
		}

		await interaction.editReply({ content: 'Created poll! ' + messageLink(interaction.channelId, message.id) });
	},
};

async function getChoices(choicesString) {
	if (!choicesString) {
		return [
			{
				emoji: '🔼',
				name: 'Upvote'
			},
			{
				emoji: '🔽',
				name: 'Downvote'
			}
		]
	}

	const choices = choicesString.split("|");
	const count = choices.length;

	const options = [];
	for (let i = 0; i < count; i++) {
		options.push({
			emoji: String.fromCodePoint(0x1F1E6 + i),
			name: choices[i].trim(),
		});
	}

	return options;
}