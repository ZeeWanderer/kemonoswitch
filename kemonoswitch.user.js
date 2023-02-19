// ==UserScript==
// @name         Switch to Kemono
// @namespace    http://tampermonkey.net/
// @version      2.0.1
// @description  Press ALT+k to switch to Kemono
// @author       ZeeWanderer
// @match        https://www.patreon.com/*
// @match        https://kemono.party/*/user/*
// @icon         https://kemono.party/static/favicon.ico
// @updateURL    https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @downloadURL  https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @grant        none
// ==/UserScript==

const kemono_hostname = "kemono.party";
const patreon_hostname = "www.patreon.com";

const kemonoRegex = /\/(?<service>\w+)\/user\/(?<userId>[^\/]+)(\/post\/(?<postId>\d+))?/;

const patreon_service = "patreon";
const fanbox_service = "fanbox";
const gumroad_service = "gumroad";
const subscribestar_service = "subscribestar";
const fantia_service = "fantia";
const boosty_service = "boosty";

function switch_patreon_to_kemono()
{
    let ID = "";
    try
    {
        ID = window.patreon.bootstrap.campaign.data.relationships.creator.data.id
    }
    catch(a)
    {
        try
        {
            ID = window.patreon.bootstrap.creator.included[0].id
        }
        catch(b)
        {
            ID = `${window.patreon.bootstrap.post.included[0].id}/post/${window.patreon.bootstrap.post.data.id}`
        }
    }
    finally
    {
        window.location.assign(`https://kemono.party/patreon/user/${ID}`)
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
                window.location.assign(`https://fantia.jp/fanclubs/${userId}`)
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
        case kemono_hostname: // user in on kemono, get service and switch them back
            switch_kemono_to_service();
            break;
        case patreon_hostname: // user in on patreon, switch them to kemono
            switch_patreon_to_kemono();
            break;
        default:
            console.log(`Unsupported host: ${hostname}`)
            break;
    }
}

function keyboard_events(event)
{
    if (event.altKey)
    {
        if (event.key === 'k' || event.key === 'л')
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
