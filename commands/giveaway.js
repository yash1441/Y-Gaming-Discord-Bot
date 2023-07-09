const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
            const title = interaction.options.getString("title");

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`Click the button below to join the giveaway!`)
                .addFields(
                    { name: "Winners", value: winners.toString(), inline: true },
                    { name: "Host", value: `${interaction.user}`, inline: true },
                )
                .setColor("#00FF00")
                .setImage("https://i.ibb.co/5hJfvZt/Carl-bot-Giveaway-Image.png");

            let giveawayMessage;

            await channel.send({ embeds: [giveawayEmbed] }).then((message) => {
                giveawayMessage = message;
            });

            const giveawayMessageId = giveawayMessage.id;
            const giveawayData = {};
            giveawayData[giveawayMessageId] = {
                "serverId": interaction.guild.id,
                "channelId": channel.id,
                "messageId": giveawayMessageId,
                "host": interaction.user.id,
                "winners": winners,
                "entries": [],
                "ended": false,
                "winner": []
            };

            storeGiveawayData(giveawayData);

            const giveawayButton = new ButtonBuilder()
                .setCustomId("giveaway_" + giveawayMessageId)
                .setLabel("Join")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🎉");

            const disableButton = new ButtonBuilder()
                .setCustomId("disabledGiveaway")
                .setLabel("0")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji("👤");

            const row = new ActionRowBuilder().addComponents(giveawayButton, disableButton);

            giveawayEmbed.setFooter({ text: `Giveaway ID: ${giveawayMessageId}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway successfully created in ${channel}` });
        } else if (subCommand === "end") {
            await interaction.reply({ content: "Ending the giveaway...", ephemeral: true });

            const messageId = interaction.options.getString("message-id");

            let giveawayData = {};
            try {
                const data = fs.readFileSync('./Data/giveaways.json', 'utf8');
                giveawayData = JSON.parse(data);
            } catch (error) {
                logger.error('Error reading giveawayData file:\n' + error);
            }

            const giveaway = giveawayData[messageId];
            if (giveaway === undefined) {
                await interaction.editReply({ content: "Giveaway not found." });
                return;
            }

            giveawayData[messageId]["ended"] = true;

            let winners = giveaway["winners"];
            let entries = giveaway["entries"];

            if (entries.length < winners) {
                winners = entries.length;
                giveawayData[messageId]["winner"] = entries;
            } else {
                entries = entries.slice();

                while (giveawayData[messageId]["winner"].length < winners) {
                    const randomIndex = entries[Math.floor(Math.random() * entries.length)];
                    const winner = entries.splice(randomIndex, 1)[0];
                    giveawayData[messageId]["winner"].push(winner);
                }
            }

            fs.writeFileSync("./Data/giveaways.json", JSON.stringify(giveawayData, null, 2), "utf8");

            logger.debug(giveawayData[messageId]["winner"].join(", "));

            const giveawayEmbed = new EmbedBuilder()
                .setTitle("Giveaway Ended")
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Winners", value: giveawayData[messageId]["winner"].join(", "), inline: true },
                    { name: "Host", value: `<@${giveaway["host"]}>`, inline: true },
                )
                .setColor("#FF0000")
                .setImage("https://i.ibb.co/5hJfvZt/Carl-bot-Giveaway-Image.png");

            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway["channelId"]).messages.fetch(giveaway["messageId"]);

            const giveawayButton = new ButtonBuilder()
                .setCustomId("disabledGiveaway")
                .setLabel(giveaway["entries"].length.toString())
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji("👤");

            const row = new ActionRowBuilder().addComponents(giveawayButton);

            giveawayEmbed.setFooter({ text: `Giveaway ID: ${giveaway["messageId"]}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway successfully ended.` });
        }
    },
};


function getCurrentTime() {
    return Math.floor(Date.now() / 1000)
}

function storeGiveawayData(giveawayData) {
    // Load existing giveawayData objects from the JSON file
    let existingData = {};
    try {
        const data = fs.readFileSync('./Data/giveaways.json', 'utf8');
        existingData = JSON.parse(data);
    } catch (error) {
        logger.error('Error reading giveawayData file:\n' + error);
    }

    // Merge the new giveawayData with the existing data
    const updatedData = {
        ...existingData,
        ...giveawayData
    };

    // Write the updated data back to the JSON file
    try {
        fs.writeFileSync('./Data/giveaways.json', JSON.stringify(updatedData, null, 2));
        logger.info('giveawayData successfully stored.');
    } catch (error) {
        logger.error('Error writing giveawayData file:\n' + error);
    }
}