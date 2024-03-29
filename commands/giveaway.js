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
                .addBooleanOption((option) =>
                    option
                        .setName("active")
                        .setDescription("Whether to show active or inactive giveaways in the list.")
                        .setRequired(false)
                )
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

            const giveaway = await giveawayData.findOne({ where: { message_id: messageId, active: true } });
            const entries = await giveawayEntries.findAll({ where: { message_id: messageId }, order: sequelize.random() });
            const entriesCount = entries.length;

            if (!giveaway) {
                return await interaction.editReply({ content: `Cannot find an active giveaway with the Message ID: \`${messageId}\`` });
            }

            const prize = giveaway.prize;
            const host = giveaway.host;
            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway.channel_id).messages.fetch(giveaway.message_id);
            const winners = giveaway.winners;
            if (entriesCount == 0) {
                const giveawayEmbed = new EmbedBuilder()
                    .setTitle(prize)
                    .setDescription(`The giveaway has ended!`)
                    .addFields(
                        { name: "Host", value: `<@${host}>`, inline: true },
                        { name: "Winners", value: `-`, inline: true }
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
                await giveawayData.update({ active: false, winners: 0 }, { where: { message_id: messageId } });
                return await interaction.editReply({ content: `No entry found for this giveaway. No winner was selected. Giveaway successfully ended.` });
            }
            const selectedWinners = entries.slice(0, ((entriesCount < winners) ? entriesCount : winners));

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Host", value: `<@${host}>`, inline: true },
                    { name: "Winners", value: selectedWinners.map(win => `<@${win.discord_id}>`).join(", "), inline: true }
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

            const giveaway = await giveawayData.findOne({ where: { message_id: messageId, active: false } });
            const entries = await giveawayEntries.findAll({ where: { message_id: messageId }, order: sequelize.random() });
            const entriesCount = entries.length;
            if (!giveaway) {
                return await interaction.editReply({ content: `Cannot find an inactive giveaway with the Message ID: \`${messageId}\`` });
            } else if (entriesCount == 0) {
                return await interaction.editReply({ content: `No entry found for this giveaway. Reroll failed.` });
            }

            const prize = giveaway.prize;
            const host = giveaway.host;
            const giveawayMessage = await interaction.guild.channels.cache.get(giveaway.channel_id).messages.fetch(giveaway.message_id);
            const winners = giveaway.winners;
            const selectedWinners = entries.slice(0, ((entriesCount < winners) ? entriesCount : winners));

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setDescription(`The giveaway has ended!`)
                .addFields(
                    { name: "Host", value: `<@${host}>`, inline: true },
                    { name: "Winners", value: selectedWinners.map(win => `<@${win.discord_id}>`).join(", "), inline: true }
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

            await giveawayEntries.update({ won: false }, { where: { message_id: messageId, won: true } });

            for (const entry of selectedWinners) {
                await giveawayEntries.update({ won: true }, { where: { message_id: messageId, discord_id: entry.discord_id } });
            }

            await interaction.editReply({ content: `Giveaway winners successfully rerolled.` });

        } else if (subCommand === "list") {
            await interaction.reply({ content: "Generating the list of giveaways..." });

            const active = (interaction.options.getBoolean("active") || interaction.options.getBoolean("active") == null) ? true : false;

            const embed = new EmbedBuilder()
                .setTitle(((active) ? "Active" : "Inactive") + " Giveaway List")
                .setImage("https://i.ibb.co/vxZD5R9/Giveaway-List.png")
                .setColor("#0000FF");

            const giveaways = await giveawayData.findAll({ where: { server_id: interaction.guild.id, active: active } });

            for (const giveaway of giveaways) {
                await interaction.guild.members.fetch(giveaway.host).then(() => {
                    embed.addFields({ name: giveaway.prize, value: `- https://discord.com/channels/${giveaway.server_id}/${giveaway.channel_id}/${giveaway.message_id}` });
                });
            }

            if (giveaways.length === 0) {
                embed.setDescription("There are no giveaways to display.");
            }

            await interaction.editReply({ content: "", embeds: [embed] });
        }
    },
};