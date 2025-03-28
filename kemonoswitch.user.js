// ==UserScript==
// @name         Switch to Kemono
// @namespace    http://tampermonkey.net/
// @version      2.6.0
// @description  Press ALT+k to switch to Kemono
// @author       ZeeWanderer
// @match        https://www.patreon.com/*
// @match        https://*.fanbox.cc/*
// @match        https://*.gumroad.com/*
// @match        https://subscribestar.adult/*
// @match        https://fantia.jp/*
// @match        https://kemono.party/*/user/*
// @match        https://kemono.su/*/user/*
// @icon         https://kemono.su/static/favicon.ico
// @updateURL    https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @downloadURL  https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @grant        none
// ==/UserScript==

const kemono_domain = "kemono.su";
const kemono_domain_party = "kemono.party";
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

function switch_patreon_to_kemono()
{
    const creatorID0 = window.__NEXT_DATA__?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap?.campaign?.data?.relationships?.creator?.data?.id;
    const creatorID1 = window.__NEXT_DATA__?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap?.creator?.data?.relationships?.creator?.data?.id;
    const creatorID2 = window.__NEXT_DATA__?.props?.pageProps?.bootstrapEnvelope?.pageBootstrap?.creator?.included?.[1]?.id;
    const queryMatch = window.location.search.match(patreonIdRegex);
    const queryID    = queryMatch?.groups?.id;

    let ID = creatorID0 || creatorID1 || creatorID2 || queryID;

    if (!ID)
    {
        console.error("No valid ID found. Aborting redirection.");
        return;
    }

    window.location.assign(`https://${kemono_domain}/patreon/user/${ID}`);
}


function switch_fanbox_to_kemono()
{
    const creatorImageRegex = /(?:creator|user)\/(?<userId>\d+)\/cover/;
    const postImageRegex = /post\/(?<postId>\d+)\/cover/;
    try
    {
        let userId = undefined
        let postId = undefined
        let bg_images = Array.from(document.querySelectorAll('[style^="background-image:"')).map((e)=>{ return e.style.backgroundImage });

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

        if (userId)
        {
            window.location.assign(postId === undefined ? `https://${kemono_domain}/fanbox/user/${userId}` : `https://${kemono_domain}/fanbox/user/${userId}/post/${postId}`);
        }
        else
        {
            throw "userId not found";
        }
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

        const data = JSON.parse(profile.innerHTML.replace(/^\s+|\s+$/g,''));
        const ID = data.creator_profile.external_id

        window.location.assign(`https://${kemono_domain}/gumroad/user/${ID}`)
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

    const userIDRegex = /\/(?<userId>[^\/]+)/

    try
    {
        const match = window.location.pathname.match(userIDRegex);
        if (match)
        {
             window.location.assign(`https://${kemono_domain}/subscribestar/user/${match.groups.userId}`);
        }
    }
    catch(e)
    {
        console.log(e)
    }
}

function switch_fantia_to_kemono()
{
    const userIDRegex = /fanclubs\/(?<userId>\d+)/
    const postIDRegex = /posts\/(?<postId>\d+)/

    try
    {
        let userId = undefined;
        let postId = undefined;

        const userIdMatch = window.location.pathname.match(userIDRegex);
        if (userIdMatch)
        {
             userId = userIdMatch.groups.userId
        }

        const postIdMatch = window.location.pathname.match(postIDRegex);
        if (postIdMatch)
        {
             postId = postIdMatch.groups.postId
        }

        if(userId == undefined)
        {
            try
            {
                const profile = document.querySelector('script[type="application/ld+json"]');
                const data = JSON.parse(profile.innerHTML.replace(/^\s+|\s+$/g,''));
                const url = data.author.url
                const userIdMatch = url.match(userIDRegex);
                userId = userIdMatch.groups.userId
            }
            catch(a)
            {
                throw a;
            }
        }

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