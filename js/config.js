/* Optional settings.

   Out of the box the Observatory runs entirely on its own collection — 35 clips
   picked by hand, listed in js/deck.js, no key and no account needed.

   If you ever want it to be endless: get a free API key from
   https://developers.giphy.com/dashboard/ (create an app, choose "API"), paste
   it below, and the button will start mixing freshly searched dogs in with the
   curated ones. If the key is wrong, rate-limited, or the network is out, the
   site quietly falls back to the collection — it never breaks. */

var CONFIG = {
  GIPHY_API_KEY: '',

  /* what it goes looking for when a key is present */
  GIPHY_TERMS: [
    'senior dog zoomies',
    'old dog running',
    'dog running in circles',
    'dog zoomies',
    'old dog happy running',
    'senior dog playing'
  ],

  /* roughly how often a live clip is preferred over a curated one */
  LIVE_SHARE: 0.5
};
