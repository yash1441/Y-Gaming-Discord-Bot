const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const logger = require("../Logger/logger.js");

const GIVEAWAY_IMAGES = [
    "https://i.ibb.co/0FZMTLb/Giveaway-End1.png",
    "https://i.ibb.co/LpzrXQ4/Giveaway-End2.png",
    "https://i.ibb.co/89sy4DC/Giveaway-End3.png",
    "https://i.ibb.co/QQ4Wnj0/Giveaway-End4.png",
    "https://i.ibb.co/x2NCndK/Giveaway-End5.png",
    "https://i.ibb.co/5Rhg7Rj/Giveaway-Start1.png",
    "https://i.ibb.co/Rz8zqYd/Giveaway-Start2.png",
    "https://i.ibb.co/xDkRZ0t/Giveaway-Start3.png",
    "https://i.ibb.co/gMWyV21/Giveaway-Start4.png",
    "https://i.ibb.co/Tc9kVQ5/Giveaway-Start5.png"
]

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
                .setImage(GIVEAWAY_IMAGES[Math.floor(Math.random() * 5)]);

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

            giveawayEmbed.setFooter({ text: `Message ID: ${giveawayMessageId}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway successfully created in ${channel}` });
        } else if (subCommand === "end") {
            await interaction.reply({ content: "Ending the giveaway...", ephemeral: true });

            const messageId = interaction.options.getString("message-id");

            let giveawayData = {};
            try {
                giveawayData = JSON.parse(fs.readFileSync('./Data/giveaways.json', 'utf8'));
            } catch (error) {
                logger.error('Error reading giveawayData file:\n' + error);
            }

            const giveaway = giveawayData[messageId];

            if (giveaway === undefined) {
                return await interaction.editReply({ content: "Giveaway not found." });
            } else if (giveaway["ended"] === true) {
                return await interaction.editReply({ content: "Giveaway has already ended." });
            }

            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway["channelId"]).messages.fetch(giveaway["messageId"]);
            const prize = giveawayMessage.embeds[0].title;

            giveawayData[messageId]["ended"] = true;

            let winners = giveaway["winners"];
            let entries = giveaway["entries"];

            if (entries.length <= winners) {
                winners = entries.length;
                giveawayData[messageId]["winner"] = entries;
            } else {
                while (giveawayData[messageId]["winner"].length < winners) {
                    let winnerIndex = [];
                    let randomIndex = Math.floor(Math.random() * entries.length);

                    while (winnerIndex.includes(randomIndex)) {
                        randomIndex = Math.floor(Math.random() * entries.length);
                    }
                    winnerIndex.push(randomIndex);
                    giveawayData[messageId]["winner"].push(entries[randomIndex]);
                }
            }

            fs.writeFileSync("./Data/giveaways.json", JSON.stringify(giveawayData, null, 2), "utf8");

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Host", value: `<@${giveaway["host"]}>`, inline: true },
                    { name: "Winners", value: giveawayData[messageId]["winner"].map(id => `<@${id}>`).join(", "), inline: true }
                )
                .setColor("#FF0000")
                .setImage(GIVEAWAY_IMAGES[Math.floor(Math.random() * 5)]);

            const giveawayButton = new ButtonBuilder()
                .setCustomId("disabledGiveaway")
                .setLabel(giveaway["entries"].length.toString())
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji("👤");

            const row = new ActionRowBuilder().addComponents(giveawayButton);

            giveawayEmbed.setFooter({ text: `Message ID: ${giveaway["messageId"]}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway successfully ended.` });
        } else if (subCommand === "reroll") {
            await interaction.reply({ content: "Rerolling the giveaway...", ephemeral: true });

            const messageId = interaction.options.getString("message-id");

            let giveawayData = {};
            try {
                giveawayData = JSON.parse(fs.readFileSync('./Data/giveaways.json', 'utf8'));
            } catch (error) {
                logger.error('Error reading giveawayData file:\n' + error);
            }

            const giveaway = giveawayData[messageId];

            if (giveaway === undefined) {
                return await interaction.editReply({ content: "Giveaway not found." });
            } else if (giveaway["ended"] === false) {
                return await interaction.editReply({ content: "Giveaway has not ended yet." });
            }

            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway["channelId"]).messages.fetch(giveaway["messageId"]);
            const prize = giveawayMessage.embeds[0].title;

            let winners = giveaway["winners"];
            let entries = giveaway["entries"];

            if (entries.length <= winners) {
                winners = entries.length;
                giveawayData[messageId]["winner"] = entries;
            } else {
                giveawayData[messageId]["winner"] = [];
                while (giveawayData[messageId]["winner"].length < winners) {
                    let winnerIndex = [];
                    let randomIndex = Math.floor(Math.random() * entries.length);

                    while (winnerIndex.includes(randomIndex)) {
                        randomIndex = Math.floor(Math.random() * entries.length);
                    }
                    winnerIndex.push(randomIndex);
                    giveawayData[messageId]["winner"].push(entries[randomIndex]);
                }
            }

            fs.writeFileSync("./Data/giveaways.json", JSON.stringify(giveawayData, null, 2), "utf8");

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Host", value: `<@${giveaway["host"]}>`, inline: true },
                    { name: "Winners", value: giveawayData[messageId]["winner"].map(id => `<@${id}>`).join(", "), inline: true }
                )
                .setColor("#FF0000")
                .setImage(GIVEAWAY_IMAGES[Math.floor(Math.random() * 5) + 5]);

            const giveawayButton = new ButtonBuilder()
                .setCustomId("disabledGiveaway")
                .setLabel(giveaway["entries"].length.toString())
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji("👤");

            const row = new ActionRowBuilder().addComponents(giveawayButton);

            giveawayEmbed.setFooter({ text: `Message ID: ${giveaway["messageId"]}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway winners successfully rerolled.` });

        } else if (subCommand === "list") {
            await interaction.reply({ content: "Generating the list of giveaways..." });

            const embed = new EmbedBuilder()
                .setTitle("Giveaway List")
                .setImage("https://i.ibb.co/D47Zpr2/Giveaway-List.png")
                .setColor("#0000FF");

            let giveawayData = {};
            try {
                giveawayData = JSON.parse(fs.readFileSync('./Data/giveaways.json', 'utf8'));
            } catch (error) {
                logger.error('Error reading giveawayData file:\n' + error);
            }

            const serverId = interaction.guild.id;

            const giveaways = Object.entries(giveawayData).filter(([key, value]) => value.serverId === serverId);

            console.log(giveaways);

            for (const [key, entry] of Object.entries(giveaways)) {
                const { messageId, serverId, channelId } = entry;
                const messageLink = `https://discord.com/channels/${serverId}/${channelId}/${messageId}`;
                embed.addFields({ name: entry.prize, value: messageLink });
            }

            await interaction.editReply({ content: "", embeds: [embed] });
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