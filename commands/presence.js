const { SlashCommandBuilder, ActivityType, PermissionFlagsBits } = require("discord.js");
const logger = require("../Logger/logger.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("presence")
        .setDescription("Set bot presence.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((option) =>
            option
                .setName("status")
                .setDescription("Set online status for the bot")
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        interaction.client.user.setPresence({
            activities: [
                {
                    name: `in ${interaction.client.guilds.cache.size} servers`,
                    type: ActivityType.Streaming,
                    url: "https://twitch.tv/tansmh",
                },
            ],
            status: `dnd`,
        });

        await interaction.editReply({
            content: "Presence set!",
            ephemeral: true,
        });
    },
};
