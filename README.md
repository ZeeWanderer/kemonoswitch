# KemonoSwitch
A simple userscript to switch between paywall websites and kemono.party.

## Usage
Press ALT+K to switch to kemono or back. 

Usersript will try to match service<->kemono for supported services. That includes post pages if possible. 

Do note that when switching from service post page to kemono post page if a specific post was not imported you will end up on the creator's page.

## Support
- pateon: `patreon::creator<->kemono::creator`, `patreon::post<->kemono::post`
- fanbox: `fanbox::creator<->kemono::creator`, `fanbox::post->kemono::post`, `kemono::post->fanbox::creator`
- gumroad: `gumroad::creator<->kemono::creator`, `gumroad::post->kemono::creator`, `kemono::post->gumroad::creator`
- subscribestar: `subscribestar::creator<->kemono::creator`, `kemono::post->subscribestar::creator`
- fantia: `fantia::creator<->kemono::creator`, `fantia::post<->kemono::post`
