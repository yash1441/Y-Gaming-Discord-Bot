const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../Logger/logger.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("giveaway")
		.setDescription("Organize and manage giveaways.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a giveaway.")
                .addChannelOption((option) =>
                option
                    .setName("channel")
                    .setDescription("Select the channel to host the giveaway in.")
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("winners")
                        .setDescription("Select the number of winners.")
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("Select the duration of the giveaway in minutes.")
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("title")
                        .setDescription("Select the title of the giveaway.")
                        .setRequired(true)
                )
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("reroll")
				.setDescription("Reroll a giveaway winner.")
                .addStringOption((option) =>
                    option
                        .setName("message-id")
                        .setDescription("Select the message ID of the giveaway to reroll.")
                        .setRequired(true)
                )
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("end")
				.setDescription("End a giveaway prematurely.")
                .addStringOption((option) =>
                    option
                        .setName("message-id")
                        .setDescription("Select the message ID of the giveaway to end.")
                        .setRequired(true)
                )
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("list")
				.setDescription("List of ongoing giveaways.")
		),
	async execute(interaction) {
		const subCommand = interaction.options.getSubcommand();

        if (subCommand === "create") {
            await interaction.reply({ content: "Creating the giveaway...", ephemeral: true });
            
            const channel = interaction.options.getChannel("channel");
            const winners = interaction.options.getInteger("winners");
            const duration = interaction.options.getInteger("duration");
            const title = interaction.options.getString("title");

            const currentTime = getCurrentTime();
            const endTime = currentTime + (duration * 60);

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`Click the button below to join the giveaway!`)
                .addFields(
                    { name: "Winners", value: winners.toString(), inline: true },
                    { name: "Host", value: `${interaction.user}`, inline: true },
                    { name: "Entries", value: `0`, inline: true },
                    { name: "Ends", value: `<t:${endTime}:R>`, inline: true }
                )
                .setColor("Random");

            const giveawayMessage = channel.send({ embeds: [giveawayEmbed] });
            const giveawayMessageId = giveawayMessage.id;

            const giveawayData = {
                giveawayMessageId: {
                    "messageId": giveawayMessageId,
                    "host": interaction.user.id,
                    "winners": winners,
                    "endTime": endTime,
                    "entries": [],
                    "ended": false,
                    "winner": null
                }
            }

            fs.readFile('./Data/giveaways.json', 'utf8', (error, data) => {
                if (error) {
                    logger.error("Error reading giveaways.json: " + error);
                    return;
                }
        
                let fileData = [];
                if (data.trim() !== '') {
                    try {
                        fileData = JSON.parse(data);
                    } catch (parseError) {
                        logger.error("Error parsing giveaways.json: " + parseError);
                        return;
                    }
                }
                fileData.push(giveawayData);
        
                fs.writeFile('./Data/giveaways.json', JSON.stringify(fileData, null, 4), (writeError) => {
                    if (writeError) {
                        logger.error("Error writing giveaways.json: " + writeError);
                    } else {
                        logger.info(`${user} created giveaway: ${giveawayMessageId}`);
                    }
                });
            });
        }
	},
};


function getCurrentTime () {
    return Math.floor(Date.now() / 1000)
  }