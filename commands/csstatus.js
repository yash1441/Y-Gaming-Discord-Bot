const { ContextMenuCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

const RANK_NAMES = [
    "Silver I",
    "Silver II",
    "Silver III",
    "Silver IV",
    "Silver Elite",
    "Silver Elite Master",
    "Gold Nova I",
    "Gold Nova II",
    "Gold Nova III",
    "Gold Nova Master",
    "Master Guardian I",
    "Master Guardian II",
    "Master Guardian Elite",
    "Distinguished Master Guardian",
    "Legendary Eagle",
    "Legendary Eagle Master",
    "Supreme Master First Class",
    "The Global Elite",
];

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Get Ranks")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
		const message = interaction.targetMessage;
		if (message.embeds.length > 0) {
            return await interaction.reply({ content: "This is not a valid CS:GO status message." });
        }

        const regex = /(\d+)\s+(\d+)\s+"([^"]+)"\s+([^\s]+)/g;
        let match;
        const namesAndUniqueIds = [];

        while ((match = regex.exec(message.content)) !== null) {
            const [, userid, , name, uniqueid] = match;
            namesAndUniqueIds.push({ name, uniqueid });
        }

        console.log(namesAndUniqueIds);
	},
};
