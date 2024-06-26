const axios = require("axios").default;
const https = require("https");
const tls = require('tls');
const logger = require("../Logger/logger.js");

const sigalgs = [
    'ecdsa_secp256r1_sha256',
    'rsa_pss_rsae_sha256',
    'rsa_pkcs1_sha256',
    'ecdsa_secp384r1_sha384',
    'rsa_pss_rsae_sha384',
    'rsa_pkcs1_sha384',
    'rsa_pss_rsae_sha512',
    'rsa_pkcs1_sha512',
    'rsa_pkcs1_sha1',
];

const ciphers = [
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256'
];

const agent = new https.Agent({
    ciphers: ciphers.join(':'),
    honorCipherOrder: true,
    minVersion: 'TLSv1.2',
    sigalgs: sigalgs.join(':'),
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

    const setCookie = await authCookies(build);
    const cookie = setCookie.headers['set-cookie'].find((asid) => /^asid/.test(asid));

    logger.debug(JSON.stringify(setCookie));

    const authResponse = await authTokens(build, username, password, cookie);
    const token = parseTokensFromUrl(JSON.parse(authResponse.body).response.parameters.uri);

    logger.debug(JSON.stringify(token));

    token.entitlements_token = await authEntitlements(build, token.access_token);
    token.username = username;
    token.password = password;
    token.clientPlatform = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';

    const puuid = await getPuuid(build, token.access_token);
    token.puuid = puuid;

    return token;
}

async function authCookies(build) {
    return new Promise((resolve, reject) => {
        const req = https.request('https://auth.riotgames.com/api/v1/authorization', {
            method: 'POST',
            headers: {
                'user-agent': build.userAgent,
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            agent
        }, res => {
            const chunks = [];
            res.on('data', chunk => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString()
                });
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify({
            acr_values: '',
            claims: '',
            client_id: 'play-valorant-web-prod',
            code_challenge: '',
            code_challenge_method: '',
            nonce: 1,
            redirect_uri: 'https://playvalorant.com/opt_in',
            response_type: 'token id_token',
            response_mode: 'query',
            scope: 'account openid'
        }));
        req.end();
    });
}

async function authTokens(build, username, password, cookie) {
    const options = {
        method: "PUT",
        hostname: "auth.riotgames.com",
        port: null,
        path: "/api/v1/authorization",
        headers: {
            "cookie": cookie,
            "user-agent": build.userAgent,
            "Cache-Control": 'no-cache',
            "Content-Type": "application/json",
            "Keep-Alive": true,
        },
        agent
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, function (res) {
            const chunks = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString()
                });
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify({
            type: 'auth',
            username: username,
            password: password,
            remember: true,
            language: 'en_US'
        }));
        req.end();
    });
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

    if (response.data.BonusStore) {
        return response.data.BonusStore.BonusStoreOffers;
    }

    return undefined;
}

module.exports = { getVersion, authorize, getStoreFront, getPlayerNightmarket };