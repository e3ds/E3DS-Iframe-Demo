/**
 * iframe-config.js — the only file you need to edit to point this demo at your own app.
 *
 * Everything else in this demo reads its settings from here, so you should not
 * need to go hunting through the other files to change a URL or an element id.
 */

// eslint-disable-next-line no-unused-vars
const DEMO_CONFIG = {
    /**
     * The address of the streaming app you want to show.
     *
     * You get this URL from your Eagle 3D Streaming dashboard. It follows the
     * pattern:
     *
     *     https://<your-connector>.eagle3dstreaming.com/v5/<owner>/<appName>/<version>
     *
     * The value below points at a public sample app so this demo works the
     * moment you open it. Replace it with your own to see your own app.
     */
    /* The same application the Web SDK demo streams, so the two demos can be
     * compared side by side and the difference between them is the transport,
     * not the app. Its Character and Skin buttons appear once the stream is up -
     * see E3DS_APP_CONTROLS in demo-ui-panel.js. */
    streamUrl: "https://connector.eagle3dstreaming.com/v5/demo/EpicPixelStreamingSample/E3DS-Iframe-Demo",

    /**
     * The streams the Connection dropdown offers. Picking one restarts the stream with it; "Type a new URL..." at
     * the end of the list opens a box for any other. Add your own apps here.
     */
    streams: [
        { label: "Car configurator", url: "https://connector.eagle3dstreaming.com/v5/e3ds_demo/AutomotiveConfigurator/default" },
        { label: "E3DS Features Template", url: "https://connector.eagle3dstreaming.com/v5/demo/E3DSFeaturesTemplate/default" },
        { label: "Pixel Streaming sample", url: "https://connector.eagle3dstreaming.com/v5/demo/EpicPixelStreamingSample/E3DS-Iframe-Demo" },
    ],

    /**
     * The id of the <iframe> element in index.html that holds the stream.
     *
     * There is no reason to change this unless you rename the element in the
     * HTML. It lives here so that no other file has to hard-code it.
     */
    iframeElementId: "streamFrame",

    /**
     * Set to true to print every message exchanged with the platform to the
     * browser console (press F12 to open it).
     *
     * This is genuinely useful while you are building your own integration:
     * it lets you see the exact order things happen in, and the exact shape of
     * the data you receive. Turn it off for a production page - it is noisy.
     */
    logMessages: true
};
