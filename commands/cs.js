const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");
const { decodeCrosshairShareCode, crosshairToConVars } = require("csgo-sharecode");
const fs = require('fs');
const Jimp = require('jimp');
const logger = require("../Logger/logger.js");

// Database //

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_IP,
    dialect: 'mysql',
    logging: false
});
const csgoRanks = require("../Models/csgoRanks")(sequelize, Sequelize.DataTypes);

// CS:GO Ranks //

const RANK_NAMES = [
    "Unranked",
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

// CS:GO Crosshair //

let SHARE_CODE = '';
const WIDTH = 361;
const HEIGHT = 271;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

class Crosshair {
    constructor(raw_bytes = null) {
        raw_bytes = this.codeToBytes(SHARE_CODE);
        this.gap = this.uint8ToInt8(raw_bytes[3]) / 10.0;
        this.outline_thickness = raw_bytes[4] / 2;
        this.red = raw_bytes[5];
        this.green = raw_bytes[6];
        this.blue = raw_bytes[7];
        this.alpha = raw_bytes[8];
        this.split_distance = parseFloat(raw_bytes[9]);
        this.fixed_gap = this.uint8ToInt8(raw_bytes[10]) / 10.0;
        this.color = raw_bytes[11] & 7;
        this.has_outline = (raw_bytes[11] & 8) !== 0 ? 1 : 0;
        this.inner_split_alpha = (raw_bytes[11] >> 4) / 10.0;
        this.outer_split_alpha = (raw_bytes[12] & 0xF) / 10.0;
        this.split_size_ratio = (raw_bytes[12] >> 4) / 10.0;
        this.thickness = raw_bytes[13] / 10.0;
        this.has_center_dot = ((raw_bytes[14] >> 4) & 1) !== 0 ? 1 : 0;
        this.use_weapon_gap = ((raw_bytes[14] >> 4) & 2) !== 0 ? 1 : 0;
        this.has_alpha = ((raw_bytes[14] >> 4) & 4) !== 0 ? 1 : 0;
        this.is_t_style = ((raw_bytes[14] >> 4) & 8) !== 0 ? 1 : 0;
        this.style = (raw_bytes[14] & 0xF) >> 1;
        this.size = raw_bytes[15] / 10.0;
    }

    codeToBytes(SHARE_CODE) {
        const crosshair_code = SHARE_CODE.substring(4).replace('-', '');

        const DICTIONARY = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789";
        const MATCH = /^CSGO(-?[\w]{5}){5}$/.test(SHARE_CODE);

        if (!MATCH) {
            console.log('Not a Valid Crosshair Code!');
            process.exit(1);
        }

        let big = 0;
        for (const char of Array.from(crosshair_code).reverse()) {
            big = big * DICTIONARY.length + DICTIONARY.indexOf(char);
        }

        const bytesNeeded = (n) => (n === 0 ? 1 : parseInt(Math.log(n) / Math.log(256)) + 1);
        const bytesRequired = bytesNeeded(big);
        let bytes = Array.from(big.toString(16).padStart(bytesRequired * 2, '0')).map((x) => parseInt(x, 16));

        if (bytes.length === 18) {
            bytes.push(0x00);
        }

        return Array.from(bytes).reverse();
    }

    uint8ToInt8(input) {
        return input < 128 ? input : input - 256;
    }

    getCrosshairSettings() {
        const settings = `
        cl_crosshairstyle ${this.style};
        cl_crosshairsize ${this.size};
        cl_crosshairthickness ${this.thickness};
        cl_crosshairgap ${this.gap};
        cl_crosshair_drawoutline ${this.has_outline};
        cl_crosshair_outlinethickness ${this.outline_thickness};
        cl_crosshaircolor ${this.color};
        cl_crosshaircolor_r ${this.red};
        cl_crosshaircolor_g ${this.green};
        cl_crosshaircolor_b ${this.blue};
        cl_crosshairusealpha ${this.has_alpha};
        cl_crosshairalpha ${this.alpha};
        cl_crosshairdot ${this.has_center_dot};
        cl_crosshair_t ${this.is_t_style};
        cl_crosshairgap_useweaponvalue ${this.use_weapon_gap};
        cl_crosshair_dynamic_splitdist ${this.split_distance};
        cl_fixedcrosshairgap ${this.fixed_gap};
        cl_crosshair_dynamic_splitalpha_innermod ${this.inner_split_alpha};
        cl_crosshair_dynamic_splitalpha_outermod ${this.outer_split_alpha};
        cl_crosshair_dynamic_maxdist_splitratio ${this.split_size_ratio};
      `;
        console.log(settings);
        return settings;
    }
}

class GenerateCrosshairCoordinates {
    left(THICKNESS, SIZE, GAP) {
        const X1 = Math.ceil(CENTER_X - (SIZE + (GAP / 2)));
        const Y1 = CENTER_Y + (THICKNESS / 2);
        const X2 = Math.ceil(CENTER_X - (GAP / 2));
        const Y2 = CENTER_Y - (THICKNESS / 2);
        return [X1, Y1, X2, Y2];
    }

    top(THICKNESS, SIZE, GAP) {
        const X1 = CENTER_X - (THICKNESS / 2);
        const Y1 = Math.ceil(CENTER_Y - (SIZE + (GAP / 2)));
        const X2 = CENTER_X + (THICKNESS / 2);
        const Y2 = Math.ceil(CENTER_Y - (GAP / 2));
        return [X1, Y1, X2, Y2];
    }

    right(THICKNESS, SIZE, GAP) {
        const X1 = Math.floor(CENTER_X + (GAP / 2));
        const Y1 = CENTER_Y + (THICKNESS / 2);
        const X2 = Math.floor(CENTER_X + (SIZE + (GAP / 2)));
        const Y2 = CENTER_Y - (THICKNESS / 2);
        return [X1, Y1, X2, Y2];
    }

    bottom(THICKNESS, SIZE, GAP) {
        const X1 = CENTER_X - (THICKNESS / 2);
        const Y1 = Math.floor(CENTER_Y + (GAP / 2));
        const X2 = CENTER_X + (THICKNESS / 2);
        const Y2 = Math.floor(CENTER_Y + (SIZE + (GAP / 2)));
        return [X1, Y1, X2, Y2];
    }

    dot(THICKNESS) {
        const X1 = CENTER_X - (THICKNESS / 2);
        const Y1 = CENTER_Y - (THICKNESS / 2);
        const X2 = CENTER_X + (THICKNESS / 2);
        const Y2 = CENTER_Y + (THICKNESS / 2);
        return [X1, Y1, X2, Y2];
    }

    leftOutline(THICKNESS, SIZE, GAP) {
        const X1 = Math.ceil(CENTER_X - (SIZE + (GAP / 2))) - 1;
        const Y1 = CENTER_Y + (THICKNESS / 2) + 1;
        const X2 = Math.ceil(CENTER_X - (GAP / 2)) + 1;
        const Y2 = CENTER_Y - (THICKNESS / 2) - 1;
        return [X1, Y1, X2, Y2];
    }

    topOutline(THICKNESS, SIZE, GAP) {
        const X1 = CENTER_X - (THICKNESS / 2) - 1;
        const Y1 = Math.ceil(CENTER_Y - (SIZE + (GAP / 2))) - 1;
        const X2 = CENTER_X + (THICKNESS / 2) + 1;
        const Y2 = Math.ceil(CENTER_Y - (GAP / 2)) + 1;
        return [X1, Y1, X2, Y2];
    }

    rightOutline(THICKNESS, SIZE, GAP) {
        const X1 = Math.floor(CENTER_X + (GAP / 2)) - 1;
        const Y1 = CENTER_Y + (THICKNESS / 2) + 1;
        const X2 = Math.floor(CENTER_X + (SIZE + (GAP / 2))) + 1;
        const Y2 = CENTER_Y - (THICKNESS / 2) - 1;
        return [X1, Y1, X2, Y2];
    }

    bottomOutline(THICKNESS, SIZE, GAP) {
        const X1 = CENTER_X - (THICKNESS / 2) - 1;
        const Y1 = Math.floor(CENTER_Y + (GAP / 2)) - 1;
        const X2 = CENTER_X + (THICKNESS / 2) + 1;
        const Y2 = Math.floor(CENTER_Y + (SIZE + (GAP / 2))) + 1;
        return [X1, Y1, X2, Y2];
    }

    dotOutline(THICKNESS) {
        const X1 = CENTER_X - (THICKNESS / 2) - 1;
        const Y1 = CENTER_Y - (THICKNESS / 2) - 1;
        const X2 = CENTER_X + (THICKNESS / 2) + 1;
        const Y2 = CENTER_Y + (THICKNESS / 2) + 1;
        return [X1, Y1, X2, Y2];
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("cs")
        .setDescription("Commands related to Counter-Strike.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("rank")
                .setDescription("Get the rank of a player.")
                .addStringOption((option) =>
                    option
                        .setName("steam-id")
                        .setDescription("Enter the Steam ID of the player. Example: STEAM_1:1:123456789")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("crosshair")
                .setDescription("Get the crosshair settings.")
                .addStringOption((option) =>
                    option
                        .setName("crosshair-code")
                        .setDescription("Enter the crosshair code.")
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();

        if (subCommand === "rank") {
            await interaction.reply({ content: "Checking if it is a valid Steam ID..." });

            const steamId = interaction.options.getString("steam-id");

            if (!steamId.startsWith("STEAM_")) {
                return await interaction.editReply({ content: `\`${steamId}\` is an invalid Steam ID.` });
            }

            let sid = new SteamID(steamId);

            let userStats = await getPlayerInfo(sid.getSteamID64());

            if (userStats === 0) {
                return await interaction.editReply({ content: `No matches have been added for \`${steamId}\`.` });
            } else if (userStats === -1) {
                return await interaction.editReply({ content: `An error occured while fetching data for \`${steamId}\`.` });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${userStats.name}'s CS:GO Rank`)
                .setDescription(`## ` + RANK_NAMES[userStats.rank])
                .setThumbnail(`https://static.csgostats.gg/images/ranks/${userStats.rank}.png`)
                .addFields(
                    { name: "Best Rank", value: RANK_NAMES[userStats.bestRank], inline: false }
                )
                .setColor("Random");

            await interaction.editReply({ content: "", embeds: [embed] });
        } else if (subCommand === "crosshair") {
            await interaction.reply({ content: "Checking if it is a valid crosshair code..." });

            SHARE_CODE = interaction.options.getString("crosshair-code");

            // const crosshairConfig = decodeCrosshairShareCode(shareCode);
            // const crosshairConVars = crosshairToConVars(crosshairConfig);

            // await interaction.editReply({ content: `\`\`\`js\n${crosshairConVars}\n\`\`\`` });

            const c = new Crosshair();
            const img = await createImage(c);

            await interaction.editReply({ files: [img] });
        }
    },
};

async function getPlayerInfo(steamId) {
    const url = "https://csgostats.gg/player/" + steamId;
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const rankContainer = $('.player-ranks');
    const playerContainer = $('.player-ident-outer');
    const playerName = playerContainer.find('#player-name').text().trim();

    if (rankContainer.length > 0) {
        const rankImages = rankContainer.find('img[src]');
        const playerData = {};

        playerData.rank = getRank(0, rankImages);
        playerData.bestRank = getRank(1, rankImages);

        if (playerData.rank == null) playerData.rank = 0;
        if (playerData.bestRank == null) playerData.bestRank = playerData.rank;

        const [userRanks, created] = await csgoRanks.findOrCreate({ where: { steam_id: steamId }, defaults: { steam_id: steamId, current_rank: playerData.rank, best_rank: playerData.bestRank } });
        if (!created) {
            if (userRanks.current_rank != 0 && playerData.rank == 0) playerData.rank = userRanks.current_rank;
            if (userRanks.best_rank != 0 && playerData.bestRank == 0) playerData.bestRank = userRanks.best_rank;
            await csgoRanks.update({ current_rank: playerData.rank, best_rank: playerData.bestRank }, { where: { steam_id: steamId } });
        }

        playerData.name = playerName;

        return playerData;
    } else return -1;
}

function getRank(index, rankImages) {
    if (index >= rankImages.length) {
        return null;
    }

    const imageSrc = rankImages.eq(index).attr('src');
    const rankIndex = parseInt(imageSrc.split('/ranks/')[1].split('.png')[0]);

    return rankIndex;
}

function mapGapValue(x) {
    if (x > -5) {
        return parseFloat(x - (-5));
    } else if (x < -5) {
        return parseFloat((x + 5) * -1) - 5;
    } else {
        return parseFloat(0);
    }
}

function roundUpToOdd(f) {
    f = parseInt(Math.ceil(f));
    return parseFloat(f % 2 === 0 ? f + 1 : f);
}

function defaultColors(c) {
    if (c.color === 1) {
        c.blue = 0;
        c.red = 0;
        c.green = 255;
    } else if (c.color === 2) {
        c.blue = 0;
        c.red = 255;
        c.green = 255;
    } else if (c.color === 3) {
        c.blue = 255;
        c.red = 0;
        c.green = 0;
    } else if (c.color === 4) {
        c.blue = 255;
        c.red = 0;
        c.green = 255;
    }
}

async function createImage(c) {
    const img = new Jimp(WIDTH, HEIGHT, 0x00000000);
    const g = new GenerateCrosshairCoordinates();

    if (c.color !== 5) {
        defaultColors(c);
    }

    let SIZE = 2 * c.size;
    let THICKNESS = Math.round(2 * c.thickness) / 2;
    let GAP = 2 * mapGapValue(c.gap);
    GAP = roundUpToOdd(GAP);
    SIZE = roundUpToOdd(SIZE);
    THICKNESS = Math.floor(roundUpToOdd(THICKNESS));

    if (c.hasOutline) {
        img.scan(g.leftOutline(THICKNESS, SIZE, GAP)[0], g.leftOutline(THICKNESS, SIZE, GAP)[1], g.leftOutline(THICKNESS, SIZE, GAP)[2], g.leftOutline(THICKNESS, SIZE, GAP)[3], (x, y, idx) => {
            img.bitmap.data[idx + 0] = 0;
            img.bitmap.data[idx + 1] = 0;
            img.bitmap.data[idx + 2] = 0;
            img.bitmap.data[idx + 3] = 255;
        });
        // ...
        // (repeat the above for other outlines and dots)
        // ...
    }

    img.scan(g.left(THICKNESS, SIZE, GAP)[0], g.left(THICKNESS, SIZE, GAP)[1], g.left(THICKNESS, SIZE, GAP)[2], g.left(THICKNESS, SIZE, GAP)[3], (x, y, idx) => {
        img.bitmap.data[idx + 0] = c.red;
        img.bitmap.data[idx + 1] = c.green;
        img.bitmap.data[idx + 2] = c.blue;
        img.bitmap.data[idx + 3] = c.alpha;
    });

    // ...
    // (repeat the above for other parts of the crosshair)
    // ...

    await img.writeAsync('crosshair.png');
    return img;
}