const { EmbedBuilder, bold } = require("discord.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");
const axios = require("axios").default;
const fs = require("fs");
const path = require("path");
const logger = require("../Logger/logger.js");

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_IP,
    dialect: 'mysql',
    logging: false
});
const csgoRanks = require("../Models/csgoRanks")(sequelize, Sequelize.DataTypes);

const ranks = [
    {
        name: "Unranked",
        emoji: "<:unranked:1138816376497246219>"
    },
    {
        name: "Silver I",
        emoji: "<:s1:1138816485586899014>"
    },
    {
        name: "Silver II",
        emoji: "<:s2:1138816575579889816>"
    },
    {
        name: "Silver III",
        emoji: "<:s3:1138816605720158218>"
    },
    {
        name: "Silver IV",
        emoji: "<:s4:1138816638045667378>"
    },
    {
        name: "Silver Elite",
        emoji: "<:se:1138816693230108792>"
    },
    {
        name: "Silver Elite Master",
        emoji: "<:sem:1138816721948528683>"
    },
    {
        name: "Gold Nova I",
        emoji: "<:gn1:1138816766689161338>"
    },
    {
        name: "Gold Nova II",
        emoji: "<:gn2:1138816791762698393>"
    },
    {
        name: "Gold Nova III",
        emoji: "<:gn3:1138816817289244753>"
    },
    {
        name: "Gold Nova Master",
        emoji: "<:gnm:1138816869726433390>"
    },
    {
        name: "Master Guardian I",
        emoji: "<:mg1:1138816904761442306>"
    },
    {
        name: "Master Guardian II",
        emoji: "<:mg2:1138816950689091614>"
    },
    {
        name: "Master Guardian Elite",
        emoji: "<:mge:1138816976228200478>"
    },
    {
        name: "Distinguished Master Guardian",
        emoji: "<:dmg:1138817027629400196>"
    },
    {
        name: "Legendary Eagle",
        emoji: "<:le:1138817060735033374>"
    },
    {
        name: "Legendary Eagle Master",
        emoji: "<:lem:1138817083216506882>"
    },
    {
        name: "Supreme Master First Class",
        emoji: "<:smfc:1138817119182663770>"
    },
    {
        name: "The Global Elite",
        emoji: "<:ge:1138817149570404442>"
    },
];

const ratings = [
    {
        name: "Unrated",
        emoji: "<:unranked:1138816376497246219>"
    },
    {
        name: "Common",
        emoji: "<:common:1151898756405534740>"
    },
    {
        name: "Uncommon",
        emoji: "<:uncommon:1151898774910795866>"
    },
    {
        name: "Rare",
        emoji: "<:rare:1151898770435493908>"
    },
    {
        name: "Mythical",
        emoji: "<:mythical:1151898765943382107>"
    },
    {
        name: "Legendary",
        emoji: "<:legendary:1151898761149292625>"
    },
    {
        name: "Ancient",
        emoji: "<:ancient:1151898753062666260>"
    },
    {
        name: "Unusual",
        emoji: "<:unusual:1151898783760789534>"
    },
];

function getRatingIndex(rating) {
    if (rating == 0) return 0;
    if (rating < 5000) return 1;
    if (rating < 10000) return 2;
    if (rating < 15000) return 3;
    if (rating < 20000) return 4;
    if (rating < 25000) return 5;
    if (rating < 30000) return 6;
    if (rating >= 30000) return 7;
}

async function getPlayerEmbeds(steamId) {
    const sid = new SteamID(steamId);
    const steamId64 = sid.getSteamID64()

    let userStats = await getPlayerInfo(steamId64, steamId);

    if (userStats == 0) return 0;
    if (userStats == -1) return -1;

    if (!userStats.rankImage) {
        userStats.rankImage = "https://static.csstats.gg/images/ranks/" + userStats.rank.toString() + ".png"
    }

    const csgoembed = new EmbedBuilder()
        .setTitle(`${escapeMarkdown(userStats.name)}`)
        .setDescription(`## ` + ranks[userStats.rank].name)
        .setThumbnail(userStats.rankImage)
        .addFields(
            { name: "Best Rank", value: ranks[userStats.bestRank].emoji + " " + ranks[userStats.bestRank].name, inline: true },
            { name: "Wins", value: userStats.csgoWins, inline: true },
        )
        .setColor("#5d79ae")
        .setFooter({
            text: "Last Played " + userStats.csgoLastPlayed,
            iconURL:
                "https://static.csstats.gg/images/logo-csgo.png",
        });

    const cs2embed = new EmbedBuilder()
        .setTitle(`${escapeMarkdown(userStats.name)}`)
        .setDescription(`## ` + userStats.rating.toString())
        .setThumbnail(userStats.ratingImage)
        .addFields(
            { name: "Best Rating", value: ratings[getRatingIndex(userStats.bestRating)].emoji + " " + userStats.bestRating.toString(), inline: true },
            { name: "Wins", value: userStats.cs2Wins, inline: true },
        )
        .setColor("#de9b35")
        .setFooter({
            text: "Last Played " + userStats.cs2LastPlayed,
            iconURL:
                "https://static.csstats.gg/images/logo-cs2.png",
        });

    return [csgoembed, cs2embed];
}

async function getPlayerInfo(steamId64, steamId) {
    const url = "https://csstats.gg/player/" + steamId64;
    const html = await cloudscraper.get(url);

    console.log({ url });

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const playerName = $('#player-name').text().trim();

    const csgoCurrentRankImage = $('#csgo-rank .rank img').attr('src');
    let csgoCurrentRank = 0;
    if (csgoCurrentRankImage) csgoCurrentRank = parseInt(csgoCurrentRankImage.split('/ranks/')[1].split('.png')[0]);

    const csgoBestRankImage = $('#csgo-rank .best img').attr('src');
    let csgoBestRank = 0;
    if (csgoBestRankImage) csgoBestRank = parseInt(csgoBestRankImage.split('/ranks/')[1].split('.png')[0]);

    let cs2CurrentRating = $('#cs2-rank .rank .cs2rating span').text().trim();
    if (!cs2CurrentRating) cs2CurrentRating = 0;
    else cs2CurrentRating = parseInt(cs2CurrentRating.replace(',', '').replace('-', 0));

    let cs2CurrentRatingImage = $('#cs2-rank .rank .cs2rating').css('background-image');
    if (!cs2CurrentRatingImage) cs2CurrentRatingImage = "https://static.csstats.gg/images/ranks/0.png";
    else cs2CurrentRatingImage = cs2CurrentRatingImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');

    let cs2BestRating = $('#cs2-rank .best .cs2rating span').text().trim();
    if (!cs2BestRating) cs2BestRating = 0;
    else cs2BestRating = parseInt(cs2BestRating.replace(',', '').replace('-', 0));

    let cs2BestRatingImage = $('#cs2-rank .best .cs2rating').css('background-image');
    if (!cs2BestRatingImage) cs2BestRatingImage = "https://static.csstats.gg/images/ranks/0.png";
    else cs2BestRatingImage = cs2BestRatingImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');

    let csgoWins = $('#csgo-rank .wins').text().trim();
    if (!csgoWins) csgoWins = 'NA';

    let cs2Wins = $('#cs2-rank .wins').text().trim();
    if (!cs2Wins) cs2Wins = 'NA';

    let csgoLastPlayed = $('#csgo-rank .icon').contents().filter(function () {
        return this.nodeType === 3;
    }).text().trim();
    if (!csgoLastPlayed) csgoLastPlayed = 'Unknown';

    let cs2LastPlayed = $('#cs2-rank .icon').contents().filter(function () {
        return this.nodeType === 3;
    }).text().trim();
    if (!cs2LastPlayed) cs2LastPlayed = 'Unknown';

    const playerData = {
        name: playerName,
        rank: csgoCurrentRank,
        rankImage: csgoCurrentRankImage,
        bestRank: csgoBestRank,
        bestRankImage: csgoBestRankImage,
        rating: cs2CurrentRating,
        ratingImage: cs2CurrentRatingImage,
        bestRating: cs2BestRating,
        bestRatingImage: cs2BestRatingImage,
        csgoWins: csgoWins,
        cs2Wins: cs2Wins,
        csgoLastPlayed: csgoLastPlayed,
        cs2LastPlayed: cs2LastPlayed,
    }

    console.log({ playerData });

    const [userRanks, created] = await csgoRanks.findOrCreate({ where: { steam_id: steamId }, defaults: { steam_id: steamId, current_rank: playerData.rank, best_rank: playerData.bestRank, current_rating: playerData.rating, best_rating: playerData.bestRating } });

    if (!created) {
        if (userRanks.current_rank != 0 && playerData.rank == 0) playerData.rank = userRanks.current_rank;
        if (userRanks.best_rank != 0 && playerData.bestRank == 0) playerData.bestRank = userRanks.best_rank;
        if (userRanks.current_rating != 0 && playerData.rating == 0) playerData.rating = userRanks.current_rating;
        if (userRanks.best_rating != 0 && playerData.bestRating == 0) playerData.bestRating = userRanks.best_rating;

        if (playerData.bestRank < playerData.rank) {
            playerData.bestRank = playerData.rank;
            playerData.bestRankImage = playerData.rankImage;
        }

        if (playerData.bestRating < playerData.rating) {
            playerData.bestRating = playerData.rating;
            playerData.bestRatingImage = playerData.ratingImage;
        }

        await csgoRanks.update({ current_rank: playerData.rank, best_rank: playerData.bestRank, current_rating: playerData.rating, best_rating: playerData.bestRating }, { where: { steam_id: steamId } });
    }

    return playerData;
}

async function getMultiLink(status) {
    let url = "https://csstats.gg/player/multi?";

    for (const [index, player] of status.entries()) {
        let playerName = encodeURI(player.name.replace('#', '%23'));
        url += `data[${index}][0]=${playerName}&data[${index}][1]=${player.steamId}&`;
    }

    return url;
}

async function getStatusEmbed(message) {
    const regex = /(\d+)\s+(\d+)\s+"([^"]+)"\s+([^\s]+)/g;
    let match;
    const status = [];

    while ((match = regex.exec(message.content)) !== null) {
        const [, userid, , name, steamId] = match;
        status.push({ name, steamId });
    }

    const multiPlayerInfo = await getMultiPlayerInfo(status);

    const embed = new EmbedBuilder()
        .setTitle("CS:GO Status Ranks")
        .setColor("Random");

    let namesArray = [], ranksArray = [], steamIdArray = [];

    for (const player of multiPlayerInfo) {
        namesArray.push(bold(escapeMarkdown(player.name)));
        steamIdArray.push(player.steamId);
        ranksArray.push(ranks[player.rank].emoji);
    }

    embed.addFields(
        { name: 'Player', value: namesArray.join('\n'), inline: true },
        { name: 'Steam ID', value: steamIdArray.join('\n'), inline: true },
        { name: 'Rank', value: ranksArray.join('\n'), inline: true },
    );

    for (const player of multiPlayerInfo) {
        const [dbRank, created] = await csgoRanks.findOrCreate({ where: { steam_id: player.steamId }, defaults: { steam_id: player.steamId, current_rank: player.rank } });
        if (!created) {
            if (dbRank.current_rank != 0 && player.rank == 0) player.rank = dbRank.current_rank;
            await csgoRanks.update({ current_rank: player.rank }, { where: { steam_id: player.steamId } });
        }
    }

    return embed;
}

async function getMultiPlayerInfo(status) {
    const players = status;
    const url = await getMultiLink(status);
    const html = await cloudscraper.get(url);

    const $ = cheerio.load(html);
    const table = $('#player-data-table');
    const rankRow = table.find('tr[data-type-row="rank"]');

    let rankData = rankRow.find('td img').map((index, element) => $(element).attr('data-rank-value')).get();

    for (const [index, player] of players.entries()) {
        if (!rankData[index]) rankData[index] = 0;
        player.rank = parseInt(rankData[index]);
    }

    return players;
}

function escapeMarkdown(text) {
    var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
}

async function getSkinNamesList() {
    const jsonData = fs.readFileSync(path.join(__dirname, '../Data/cs-items.json'), 'utf8');
    const itemsData = JSON.parse(jsonData);
    const itemsArray = [];

    for (const itemId in itemsData) {
        const item = itemsData[itemId];
        const itemName = item.name;
        if (itemName) itemsArray.push(itemName);
    }

    return itemsArray;

    // const data = JSON.parse(jsonData);
    // await axios.get('https://bymykel.github.io/CSGO-API/api/en/all.json').then((response) => {
    //     const itemsData = response.data;
    //     const itemsArray = [];

    //     for (const itemId in itemsData) {
    //         const item = itemsData[itemId];
    //         const itemName = item.name;
    //         if (itemName) itemsArray.push(itemName);
    //     }

    //     const itemsString = JSON.stringify(itemsData, null, 2);
    //     fs.writeFileSync(path.join(__dirname, '../Data/cs-items.json'), itemsString);
    //     logger.info('CSGO: Loaded ' + itemsArray.length + ' items.');
    //     return itemsArray;
    // });
}

async function getSkinWearsList(itemName) {
    const jsonData = fs.readFileSync(path.join(__dirname, '../Data/cs-items.json'), 'utf8');
    const itemsData = JSON.parse(jsonData);
    const wearsArray = [];

    for (const itemId in itemsData) {
        const item = itemsData[itemId];
        if (item.name == itemName && item.wears) {
            item.wears.forEach(wear => wearsArray.push(wear));
        } else continue;
    }

    if (wearsArray.length < 1) wearsArray.push('NA');

    return wearsArray;
}

async function getSkinData(skin, log) {
    const url = "https://buff-price.czernouskovi.eu/item?name=" + encodeURI(skin);
    let skinData = {};
    await axios.get(url).then((response) => {
        skinData = response.data;
        if (!skinData) skinData = { error: "Unable to find " + skin + " in the BUFF database." }
    }).catch((error) => {
        skinData = { error: "Unable to find " + skin + " in the BUFF database." }
    });

    if (log) console.log(skinData);
    return skinData;
}

module.exports = { getStatusEmbed, getPlayerEmbeds, getSkinNamesList, getSkinWearsList, getSkinData };