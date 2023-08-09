const { ContextMenuCommandBuilder, ApplicationCommandType } = require("discord.js");
const logger = require("../Logger/logger.js");
const CSGO = require('../Utils/cs-stuff.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("Get Ranks")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        await interaction.reply({ content: "Checking if it is a valid CS:GO status message..." });

        const message = interaction.targetMessage;
        if (message.embeds.length > 0 || !message.content.includes('STEAM_')) {
            return await interaction.editReply({ content: "This is not a valid CS:GO status message." });
        }

        await message.channel.sendTyping();

        try {
            const embed = await CSGO.getStatusEmbed(message);
            if (!embed.data.fields[0]) {
                logger.error('Could not fetch rank status embed.');
                await interaction.editReply({ content: "Could not fetch rank status embed." });
                return;
            }
            await interaction.editReply({ content: "", embeds: [embed] });
        } catch (error) {
            logger.error('Could not send rank status embed.');
            await interaction.editReply({ content: "Could not send rank status embed." });
            console.log(error);
        }
    },
};