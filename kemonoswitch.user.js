// ==UserScript==
// @name         Switch to Kemono
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Press ALT+k to switch to Kemono
// @author       ZeeWanderer
// @match        https://www.patreon.com/*
// @match        https://*.fanbox.cc/*
// @match        https://*.gumroad.com/*
// @match        https://subscribestar.adult/*
// @match        https://fantia.jp/*
// @match        https://kemono.party/*/user/*
// @match        https://kemono.su/*/user/*
// @match        https://kemono.cr/*/user/*
// @icon         https://kemono.su/static/favicon.ico
// @updateURL    https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @downloadURL  https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @grant        none
// ==/UserScript==

const kemono_domain = "kemono.cr";
const kemono_domain_party = "kemono.cr";
const patreon_domain = "www.patreon.com";
const fanbox_domain = "fanbox.cc";
const gumroad_domain = "gumroad.com";
const subscribestar_domain = "subscribestar.adult";
const fantia_domain = "fantia.jp";

const kemonoRegex = /\/(?<service>\w+)\/user\/(?<userId>[^\/]+)(\/post\/(?<postId>\d+))?/;
const patreonIdRegex = /\?u=(?<id>\d+)/;

const patreon_service = "patreon";
const fanbox_service = "fanbox";
const gumroad_service = "gumroad";
const subscribestar_service = "subscribestar";
const fantia_service = "fantia";
const boosty_service = "boosty";

const patreonCreatorIdRegex = /"creator":\{"data":\{"id":"(\d+)"/;

function* iter_patreon_string_chunks(frag_array)
{
    if (!Array.isArray(frag_array)) return;

    for (let i = 0; i < frag_array.length; i++)
    {
        const entry = frag_array[i];
        if (!Array.isArray(entry)) continue;
        if (entry[0] !== 1) continue;

        const chunk = entry[1];
        if (typeof chunk === "string" && chunk.length) yield chunk;
    }
}

function find_patreon_creator_id_in_string(s)
{
    const match = s.match(patreonCreatorIdRegex);
    if (!match) return null;
    return match[1] || match[2] || null;
}

function extract_patreon_creator_id(frag_array)
{
    for (const chunk of iter_patreon_string_chunks(frag_array))
    {
        const id = find_patreon_creator_id_in_string(chunk);
        if (id !== null) return id;
    }
    return null;
}

const RESOLVER_COST = {
    cheap: 1,
    medium: 3,
    expensive: 5
};

const RESOLVER_BIAS = {
    highest: 3,
    high: 2,
    neutral: 0,
    low: -2,
    lowest: -3
};

function resolve_with_resolvers(resolvers, context)
{
    function is_allowed(when, ctx)
    {
        if (typeof when === "function") return !!when(ctx);
        if (when === undefined) return true;
        return !!when;
    }

    function resolve_bias(bias, ctx)
    {
        if (typeof bias === "function") return bias(ctx);
        if (typeof bias === "number") return bias;
        if (typeof bias === "string") return RESOLVER_BIAS[bias] ?? 0;
        return 0;
    }

    function resolve_cost(cost)
    {
        if (typeof cost === "number") return cost;
        if (typeof cost === "string") return RESOLVER_COST[cost] ?? 0;
        return 0;
    }

    const ordered = resolvers
        .map(function (resolver, index) {
            const allowed = is_allowed(resolver.when, context);
            const bias = resolve_bias(resolver.bias, context);
            const cost = resolve_cost(resolver.cost);
            return { resolver: resolver, allowed: allowed, bias: bias, cost: cost, index: index };
        })
        .filter(function (entry) { return entry.allowed; })
        .sort(function (a, b) {
            if (a.bias !== b.bias) return b.bias - a.bias;
            if (a.cost !== b.cost) return a.cost - b.cost;
            return a.index - b.index;
        })
        .map(function (entry) { return entry.resolver; });

    for (const resolver of ordered)
    {
        const result = resolver.getId(context);
        if (result) return result;
    }
    return null;
}

const patreonIdResolvers = [
    {
        name: "bootstrap_campaign",
        when: function (ctx) { return !!ctx.pageBootstrap; },
        cost: "cheap",
        bias: function (ctx) { return ctx.isCw ? "low" : "high"; },
        getId: function (ctx) { return ctx.pageBootstrap?.campaign?.data?.relationships?.creator?.data?.id; }
    },
    {
        name: "bootstrap_creator_relationship",
        when: function (ctx) { return !!ctx.pageBootstrap; },
        cost: "cheap",
        bias: function (ctx) { return ctx.isCw ? "low" : "high"; },
        getId: function (ctx) { return ctx.pageBootstrap?.creator?.data?.relationships?.creator?.data?.id; }
    },
    {
        name: "bootstrap_creator_included",
        when: function (ctx) { return !!ctx.pageBootstrap; },
        cost: "medium",
        bias: function (ctx) { return ctx.isCw ? "low" : "neutral"; },
        getId: function (ctx) { return ctx.pageBootstrap?.creator?.included?.[1]?.id; }
    },
    {
        name: "next_fragments",
        when: function (ctx) { return Array.isArray(ctx.nextFragments) && ctx.nextFragments.length > 0; },
        cost: "expensive",
        bias: function (ctx) { return ctx.isCw ? "high" : "low"; },
        getId: function (ctx) { return extract_patreon_creator_id(ctx.nextFragments); }
    },
    {
        name: "query_param",
        when: function (ctx) { return ctx.search.indexOf("?u=") !== -1; },
        cost: "cheap",
        bias: "highest",
        getId: function (ctx) {
            const queryMatch = ctx.search.match(patreonIdRegex);
            return queryMatch?.groups?.id || null;
        }
    }
];

function resolve_patreon_creator_id()
{
    const pageBootstrap = window.__NEXT_DATA__?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap;

    const context = {
        pageBootstrap: pageBootstrap,
        nextFragments: window.__next_f,
        search: window.location.search,
        pathname: window.location.pathname,
        isCw: window.location.pathname.startsWith("/cw/")
    };
    return resolve_with_resolvers(patreonIdResolvers, context);
}

function switch_patreon_to_kemono()
{
    let ID = resolve_patreon_creator_id();

    if (!ID)
    {
        console.error("No valid ID found. Aborting redirection.");
        return;
    }

    window.location.assign(`https://${kemono_domain}/patreon/user/${ID}`);
}



const fanboxIdResolvers = [
    {
        name: "background_images",
        cost: "expensive",
        bias: "neutral",
        getId: function () {
            const creatorImageRegex = /(?:creator|user)\/(?<userId>\d+)\/cover/;
            const postImageRegex = /post\/(?<postId>\d+)\/cover/;

            let userId = undefined;
            let postId = undefined;
            const bg_images = Array.from(document.querySelectorAll('[style^="background-image:"')).map((e)=>{ return e.style.backgroundImage });

            for (let image_idx in bg_images)
            {
                if (userId && postId)
                {
                    break;
                }

                const image = bg_images[image_idx];

                if (userId === undefined)
                {
                    const match = image.match(creatorImageRegex); // look for (creator|user)/<userId>/cover
                    if (match)
                    {
                        userId = match.groups.userId;
                    }
                }

                if (postId === undefined)
                {
                    const match = image.match(postImageRegex); // look for post/<postId>/cover
                    if (match)
                    {
                        postId = match.groups.postId;
                    }
                }
            }

            if (!userId) return null;
            return { userId: userId, postId: postId };
        }
    }
];

const gumroadIdResolvers = [
    {
        name: "profile_script",
        cost: "medium",
        bias: "neutral",
        getId: function () {
            // universal selector
            let profile = document.querySelector('script[type="application/json"][class=js-react-on-rails-component][data-component-name*="Profile"]');
            if (profile === null)
            {
                // main page selector
                profile = document.querySelector("script[data-component-name=Profile]");
            }
            if (profile === null)
            {
                // product page selector
                profile = document.querySelector("script[data-component-name=ProfileProductPage]");
            }
            if (profile === null) return null;

            const data = JSON.parse(profile.innerHTML.replace(/^\s+|\s+$/g,""));
            return data.creator_profile.external_id || null;
        }
    }
];

const subscribestarIdResolvers = [
    {
        name: "path_id",
        cost: "cheap",
        bias: "neutral",
        getId: function () {
            const userIDRegex = /\/(?<userId>[^\/]+)/;
            const match = window.location.pathname.match(userIDRegex);
            if (!match) return null;
            return match.groups.userId || null;
        }
    }
];

const fantiaIdResolvers = [
    {
        name: "path_ids",
        cost: "cheap",
        bias: "neutral",
        getId: function () {
            const userIDRegex = /fanclubs\/(?<userId>\d+)/;
            const postIDRegex = /posts\/(?<postId>\d+)/;

            const userIdMatch = window.location.pathname.match(userIDRegex);
            if (!userIdMatch) return null;

            const postIdMatch = window.location.pathname.match(postIDRegex);
            const postId = postIdMatch?.groups?.postId;
            return { userId: userIdMatch.groups.userId, postId: postId };
        }
    },
    {
        name: "ld_json",
        cost: "medium",
        bias: "low",
        getId: function () {
            const userIDRegex = /fanclubs\/(?<userId>\d+)/;
            const postIDRegex = /posts\/(?<postId>\d+)/;
            const postIdMatch = window.location.pathname.match(postIDRegex);
            const postId = postIdMatch?.groups?.postId;

            const profile = document.querySelector('script[type="application/ld+json"]');
            if (profile === null) return null;

            const data = JSON.parse(profile.innerHTML.replace(/^\s+|\s+$/g,""));
            const url = data.author?.url;
            if (!url) return null;

            const userIdMatch = url.match(userIDRegex);
            if (!userIdMatch) return null;
            return { userId: userIdMatch.groups.userId, postId: postId };
        }
    }
];

function switch_fanbox_to_kemono()
{
    try
    {
        const ids = resolve_with_resolvers(fanboxIdResolvers, {});
        if (!ids || !ids.userId)
        {
            throw "userId not found";
        }

        const userId = ids.userId;
        const postId = ids.postId;
        window.location.assign(postId === undefined ? `https://${kemono_domain}/fanbox/user/${userId}` : `https://${kemono_domain}/fanbox/user/${userId}/post/${postId}`);
    }
    catch(b)
    {
        console.log(b)
    }
}

function switch_gumroad_to_kemono()
{
    try
    {
        const ID = resolve_with_resolvers(gumroadIdResolvers, {});
        if (!ID) throw "gumroad id not found";

        window.location.assign(`https://${kemono_domain}/gumroad/user/${ID}`);
    }
    catch(e)
    {
        console.log(e)
    }
}

function switch_subscribestar_to_kemono()
{
    // TODO: Allow transition to posts.
    // Can't do for naow cause i did not find a creator with a free post and i don't have the subscribtion so idk apout post url and page content

    try
    {
        const userId = resolve_with_resolvers(subscribestarIdResolvers, {});
        if (!userId) return;

        window.location.assign(`https://${kemono_domain}/subscribestar/user/${userId}`);
    }
    catch(e)
    {
        console.log(e)
    }
}

function switch_fantia_to_kemono()
{
    try
    {
        const ids = resolve_with_resolvers(fantiaIdResolvers, {});
        if (!ids || !ids.userId) throw "userId not found";

        const userId = ids.userId;
        const postId = ids.postId;
        window.location.assign(postId === undefined ? `https://${kemono_domain}/fantia/user/${userId}` : `https://${kemono_domain}/fantia/user/${userId}/post/${postId}`);
    }
    catch(e)
    {
        console.log(e)
    }
}

function switch_kemono_to_service()
{
    try
    {
        const match = window.location.pathname.match(kemonoRegex);

        const service = match.groups.service;
        const userId = match.groups.userId;
        const postId = match.groups.postId;

        switch (service)
        {
            case patreon_service:
                window.location.assign(postId === undefined ? `https://www.patreon.com/user?u=${userId}` : `https://www.patreon.com/posts/${postId}`)
                break;
            case fanbox_service:
                window.location.assign(`https://www.pixiv.net/fanbox/creator/${userId}`)
                break;
            case gumroad_service:
                window.location.assign(`https://gumroad.com/${userId}`)
                break;
            case subscribestar_service:
                window.location.assign(`https://subscribestar.adult/${userId}`)
                break;
            case fantia_service:
                window.location.assign(postId === undefined ? `https://fantia.jp/fanclubs/${userId}` : `https://fantia.jp/posts/${postId}`)
                break;
            case boosty_service:
                window.location.assign(`https://boosty.to/${userId}`)
                break;
            default:
                console.log(`Unsupported service: ${service}`)
                break;
        }
    }
    catch (b) {
        console.log(b)
    }
}

function switch_()
{
    const hostname = window.location.hostname;
    switch (hostname) {
        case kemono_domain: // user in on kemono, get service and switch them back
        case kemono_domain_party:
            switch_kemono_to_service();
            break;
        case patreon_domain: // user in on patreon, switch them to kemono
            switch_patreon_to_kemono();
            break;
        case subscribestar_domain: // user in on subscribestar, switch them to kemono
            switch_subscribestar_to_kemono();
            break;
        case fantia_domain: // user in on fantia, switch them to kemono
            switch_fantia_to_kemono();
            break;
        default: // Handle subdomain snowflakes
            if(hostname.endsWith(gumroad_domain))
            {
                switch_gumroad_to_kemono();
                break;
            }
            if(hostname.endsWith(fanbox_domain))
            {
                switch_fanbox_to_kemono();
                break;
            }
            console.log(`Unsupported host: ${hostname}`)
            break;
    }
}

function keyboard_events(event)
{
    if (event.altKey)
    {
        if (event.key === 'k' || event.key === 'K' || event.key === 'л' || event.key === 'Л')
        {
            switch_();
        }
    }
}

function setup()
{
    window.addEventListener("keydown", keyboard_events, true);
}

setup();
