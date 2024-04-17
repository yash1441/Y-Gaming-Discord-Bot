const axios = require("axios").default;
const { Agent } = require("https");
const logger = require("../Logger/logger.js");

const ciphers = [
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256'
];

const agent = new Agent({
    ciphers: ciphers.join(':'),
    honorCipherOrder: true,
    minVersion: 'TLSv1.2'
});

/// VALORANT VERSION ///

async function getVersion() {
    const options = {
        method: 'GET',
        url: 'https://valorant-api.com/v1/version'
    }

    const response = await axios.request(options);
    const userAgent = "RiotClient/" + response.data.data.riotClientBuild + " rso-auth (Windows;10;;Professional, x64)";
    const clientVersion = response.data.data.riotClientVersion;

    return { userAgent, clientVersion };
}

/// /// /// /// /// ///

/// AUTHORIZATION FLOW ///

async function authorize(build, username, password) {
    logger.debug('Authorizing user...');

    const cookie = await authCookies(build);
    logger.debug('Got cookies...');

    const token = await authTokens(build, username, password, cookie);

    if (token.error) {
        logger.debug('Authorization Failed.');
        return token;
    }

    logger.debug('Authorized Successfully.');

    token.entitlements_token = await authEntitlements(build, token.access_token);
    token.username = username;
    token.password = password;
    token.clientPlatform = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';

    const puuid = await getPuuid(build, token.access_token);
    token.puuid = puuid;

    return token;
}

async function authCookies(build) {
    const options = {
        method: 'POST',
        url: 'https://auth.riotgames.com/api/v1/authorization',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': build.userAgent
        },
        data: {
            client_id: 'play-valorant-web-prod',
            nonce: '1',
            redirect_uri: 'https://playvalorant.com/opt_in',
            response_type: 'token id_token',
            response_mode: 'query',
            scope: 'account openid'
        },
        httpsAgent: agent
    };

    const cookie = (await axios.request(options))
        .headers['set-cookie'].find((asid) => /^asid/.test(asid));

    return cookie;
}

async function authTokens(build, username, password, cookie) {
    const options = {
        method: 'PUT',
        url: 'https://auth.riotgames.com/api/v1/authorization',
        headers: {
            Cookie: cookie,
            'User-Agent': build.userAgent,
            'Content-Type': 'application/json'
        },
        data: {
            type: 'auth',
            username: username,
            password: password,
            language: 'en_US'
        },
        httpsAgent: agent
    }

    const response = await axios.request(options).catch((error) => console.error({ error }));

    const result = {
        error: true,
    }

    if (!response || response.data?.error === "auth_failure") {
        return result;
    } else result.error = false;
    const tokens = parseTokensFromUrl(response.data.response.parameters.uri);
    result.access_token = tokens.access_token;
    result.id_token = tokens.id_token;

    return result;
}

async function authEntitlements(build, token) {
    const options = {
        method: 'POST',
        url: 'https://entitlements.auth.riotgames.com/api/token/v1',
        data: {},
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': build.userAgent
        }
    };

    const response = await axios.request(options);

    const entitlements = response.data.entitlements_token;

    return entitlements;
}

async function getPuuid(build, token) {
    const options = {
        method: 'GET',
        url: 'https://auth.riotgames.com/userinfo',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': build.userAgent
        }
    }

    const response = await axios.request(options);

    return response.data.sub;
}

const parseTokensFromUrl = (uri) => {
    const accessTokenRegex = /access_token=([^&]+)/;
    const idTokenRegex = /id_token=([^&]+)/;

    const accessTokenMatch = uri.match(accessTokenRegex);
    const idTokenMatch = uri.match(idTokenRegex);

    const accessToken = accessTokenMatch && accessTokenMatch[1];
    const idToken = idTokenMatch && idTokenMatch[1];

    return {
        access_token: accessToken,
        id_token: idToken,
    };
};

/// /// /// /// /// ///

/// StoreFront ///

async function getStoreFront(login) {
    const options = {
        method: 'POST',
        url: 'https://pd.ap.a.pvp.net/store/v3/storefront/' + login.puuid,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': login.build.userAgent,
            Authorization: `Bearer ${login.access_token}`,
            'X-Riot-Entitlements-JWT': login.entitlements_token,
            'X-Riot-ClientVersion': login.build.clientVersion,
            'X-Riot-ClientPlatform': login.clientPlatform
        },
        data: {}
    }

    const response = await axios.request(options);

    return response.data.SkinsPanelLayout.SingleItemStoreOffers;
}

async function getPlayerNightmarket(login) {
    const options = {
        method: 'GET',
        url: 'https://pd.ap.a.pvp.net/store/v2/storefront/' + login.puuid,
        headers: {
            Authorization: `Bearer ${login.access_token}`,
            'X-Riot-Entitlements-JWT': login.entitlements_token,
            'X-Riot-ClientVersion': login.build.clientVersion,
            'X-Riot-ClientPlatform': login.clientPlatform
        }
    }

    const response = await axios.request(options);

    if (response.data.BonusStore) {
        return response.data.BonusStore.BonusStoreOffers;
    }

    return undefined;
}

module.exports = { getVersion, authorize, getStoreFront, getPlayerNightmarket };