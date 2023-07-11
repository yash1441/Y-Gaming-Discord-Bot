const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const logger = require("../Logger/logger.js");


const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_IP,
    dialect: 'mysql',
    logging: false
});
const giveawayData = require("../Models/giveawayData")(sequelize, Sequelize.DataTypes);
const giveawayEntries = require("../Models/giveawayEntries")(sequelize, Sequelize.DataTypes);
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
];

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
                        .setName("prize")
                        .setDescription("Enter the prize of the giveaway.")
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
            const prize = interaction.options.getString("prize");

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`Click the button below to join the giveaway!`)
                .addFields(
                    { name: "Host", value: `${interaction.user}`, inline: true },
                    { name: "Winners", value: winners.toString(), inline: true }
                )
                .setColor("#00FF00")
                .setImage(GIVEAWAY_IMAGES[Math.floor(Math.random() * 5) + 5]);

            const giveawayMessage = await channel.send({ embeds: [giveawayEmbed] });

            await giveawayData.create({
                message_id: giveawayMessage.id,
                channel_id: channel.id,
                server_id: interaction.guild.id,
                host: interaction.user.id,
                prize: prize,
                winners: winners,
                active: true,
            });

            const giveawayButton = new ButtonBuilder()
                .setCustomId("giveaway_" + giveawayMessage.id)
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

            giveawayEmbed.setFooter({ text: `Message ID: ${giveawayMessage.id}` });

            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await interaction.editReply({ content: `Giveaway successfully created in ${channel}` });
        } else if (subCommand === "end") {
            await interaction.reply({ content: "Ending the giveaway...", ephemeral: true });

            const messageId = interaction.options.getString("message-id");

            const giveaway = await giveawayData.findOne({ where: { message_id: messageId } });
            const entries = await giveawayEntries.findAll({ where: { message_id: messageId } });
            const entriesCount = entries.length;
            const prize = giveaway.prizes;
            const host = giveaway.host;

            if (!giveaway) {
                return await interaction.editReply({ content: `Cannot find a giveaway with the Message ID: \`${messageId}\`` });
            } else if (!giveaway.active) {
                return await interaction.editReply({ content: `The giveaway hass already ended.` });
            }

            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway.channel_id).messages.fetch(giveaway.message_id);
            const winners = giveaway.winners;
            const selectedWinners = randomizeWinners(entries, winners);

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Host", value: `<@${host}>`, inline: true },
                    { name: "Winners", value: selectedWinners.map(discord_id => `<@${discord_id}>`).join(", "), inline: true }
                )
                .setColor("#FF0000")
                .setImage(GIVEAWAY_IMAGES[Math.floor(Math.random() * 5)]);
            const giveawayButton = new ButtonBuilder()
                .setCustomId("disabledGiveaway")
                .setLabel(entriesCount.toString())
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji("👤");
            const row = new ActionRowBuilder().addComponents(giveawayButton);
            giveawayEmbed.setFooter({ text: `Message ID: ${giveaway.message_id}` });
            giveawayMessage.edit({ embeds: [giveawayEmbed], components: [row] });

            await giveawayData.update({ active: false, winners: winners }, { where: { message_id: messageId } });
            for (const entry of selectedWinners) {
                await giveawayEntries.update({ won: true }, { where: { message_id: messageId, discord_id: entry.discord_id } });
            }

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
            const prize = giveawayData[messageId]["prize"];

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

            await interaction.editReply({ content: `Giveaway winners successfully rerolled.` });

        } else if (subCommand === "list") {
            await interaction.reply({ content: "Generating the list of giveaways..." });

            const embed = new EmbedBuilder()
                .setTitle("Giveaway List")
                .setImage("https://i.ibb.co/vxZD5R9/Giveaway-List.png")
                .setColor("#0000FF");

            let giveawayData = {};
            try {
                giveawayData = JSON.parse(fs.readFileSync('./Data/giveaways.json', 'utf8'));
            } catch (error) {
                logger.error('Error reading giveawayData file:\n' + error);
            }

            const serverId = interaction.guild.id;
            const giveaways = Object.values(giveawayData).filter(giveaway => giveaway.serverId === serverId && giveaway.ended === false);

            for (const giveaway of giveaways) {
                await interaction.guild.members.fetch(giveaway.host).then((member) => {
                    embed.addFields({ name: giveaway.prize, value: `- https://discord.com/channels/${giveaway.serverId}/${giveaway.channelId}/${giveaway.messageId}` });
                })
            }

            if (giveaways.length === 0) {
                embed.setDescription("There are no ongoing giveaways.");
            }

            await interaction.editReply({ content: "", embeds: [embed] });
        }
    },
};

function randomizeWinners(entries, winners) {
    const shuffledEntries = [...entries];
    for (let i = shuffledEntries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledEntries[i], shuffledEntries[j]] = [shuffledEntries[j], shuffledEntries[i]];
    }
    return shuffledEntries.slice(0, winners);
}