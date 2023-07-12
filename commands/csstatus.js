const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require("discord.js");
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
        await interaction.reply({ content: "Checking if it is a valid CS:GO status message..." });

		const message = interaction.targetMessage;
		if (message.embeds.length > 0) {
            return await interaction.editReply({ content: "This is not a valid CS:GO status message." });
        }

        await interaction.editReply({ content: "Collecting player names and Steam IDs..." });

        const regex = /(\d+)\s+(\d+)\s+"([^"]+)"\s+([^\s]+)/g;
        let match;
        const status = [];

        while ((match = regex.exec(message.content)) !== null) {
            const [, userid, , name, steamId] = match;
            status.push({ name, steamId });
        }

        const embed = new EmbedBuilder()
            .setTitle("CS:GO Status Ranks")
            .setColor("Random");

        for (const player of status) {
            await interaction.editReply({ content: `Getting rank for ${player.name}...` });
            let sid = new SteamID(player.steamId);
            let url = "https://csgostats.gg/player/" + sid.getSteamID64();

            let userStats = await getPlayerRank(url);

            if (userStats === 0) {
                embed.addFields({ name: player.name, value: "Unranked", inline: true });
            } else if (userStats === -1) {
                embed.addFields({ name: player.name, value: "Error", inline: true });
            } else {
                if (RANK_NAMES[userStats.rank] == undefined) embed.addFields({ name: player.name, value: "Unranked", inline: true });
                else embed.addFields({ name: player.name, value: RANK_NAMES[userStats.rank], inline: true });
            }
        }

        await interaction.editReply({ content: "", embeds: [embed] });
	},
};

async function getPlayerRank(url) {
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const rankContainer = $('.player-ranks');
    
    if (rankContainer.length > 0) {
        const rankImages = rankContainer.find('img[src]');
        const playerData = {};

        playerData.rank = getRank(0, rankImages);
        playerData.bestRank = getRank(1, rankImages);

        return playerData;
    } else return -1;
}

function getRank(index, rankImages) {
    if (index >= rankImages.length) {
      return null;
    }

    const imageSrc = rankImages.eq(index).attr('src');
    const rankIndex = parseInt(imageSrc.split('/ranks/')[1].split('.png')[0]) - 1;

    return rankIndex;
};