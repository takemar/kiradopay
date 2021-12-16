/** @type {import('next').NextConfig} */
module.exports = require('next-pwa')({
  pwa: {
    dest: "public",
    runtimeCaching: [{
      handler: "NetworkFirst",
      urlPattern: ({ url, sameOrigin }) => (
        sameOrigin && url.pathname.match(/^\/events\/[^\/]*$/)
      ),
    }]
  },
  reactStrictMode: true,
});
