// ==UserScript==
// @name         Switch to Kemono
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Press ALT+k to switch to Kemono
// @author       ZeeWanderer
// @match        https://www.patreon.com/*
// @icon         https://kemono.party/static/favicon.ico
// @updateURL    https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @downloadURL  https://raw.githubusercontent.com/ZeeWanderer/kemonoswitch/master/kemonoswitch.user.js
// @grant        none
// ==/UserScript==

function switch_to_kemono()
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
            ID = window.patreon.bootstrap.post.included[0].id + "/post/" + window.patreon.bootstrap.post.data.id
        }
    }
    finally
    {
        window.location.assign("https://kemono.party/patreon/user/" + ID)
    }
}

function keyboard_events(event)
{
    if (event.altKey)
    {
        if (event.key === "k")
        {
            switch_to_kemono();
        }
    }
}

function setup()
{
    window.addEventListener("keydown", keyboard_events, true);
}

setup();