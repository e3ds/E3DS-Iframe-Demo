// [E3DS-UNITY-IFRAME] Two-way messages between a Unity app streamed on Eagle 3D Streaming and the web page around it.
//
// Copy this one file into your Unity project. It needs Unity Render Streaming (and works beside our Eagle 3D Streaming
// package). Add it to your Render Streaming object, put it in the Broadcast component's "streams" list, and set
// "Local" ON and "Label" to anything (e.g. "e3ds-page") - see Assets/Editor/E3dsIframeDemoBuild.cs, which does exactly
// that from code.
//
// HOW IT WORKS
//   Because this channel is LOCAL, the Unity app opens it. Our player in the browser adopts a data channel that the
//   app opens as its app-message channel, and speaks the same small binary format it speaks with Unreal apps:
//
//     page -> app   byte 50 ("UIInteraction") or 51 ("Command"), then uint16 length, then the text as UTF-16LE.
//                   The text is JSON: whatever your web page sent, e.g. {"action":"setColor","value":"#ff0000"}.
//     app  -> page  byte 1 ("Response"), then the text as UTF-16LE (no length). Send JSON with a "cmd" field - the
//                   player hands it to the web page that embeds the stream (postMessage), as it does for Unreal.
//
//   A web page sends to the app with  iframe.contentWindow.postMessage(JSON.stringify({cmd:"sendDataToUE",
//   value:{...}}), "*")  (players that know the newer name also take "sendMessageToStreamingBuild").
//
// Name your "cmd" values with your own prefix (this demo uses "unity."): a few plain names are commands for the player
// itself (for example "ForceEndSession" ends the session, "toggleFullscreen", "captureScreenShot").
using System;
using System.Collections.Concurrent;
using System.Text;
using Unity.RenderStreaming;
using UnityEngine;

namespace Eagle3DStreaming.IframeDemo
{
    public class E3dsPageChannel : DataChannelBase
    {
        const byte FromPageUIInteraction = 50;
        const byte FromPageCommand = 51;
        const byte ToPageResponse = 1;

        /// <summary>A message from the web page (the JSON text it sent). Raised on the main thread, in Update.</summary>
        public event Action<string> OnPageMessage;

        /// <summary>True once the channel to the viewer's browser is open.</summary>
        public bool Ready => Channel != null && Channel.ReadyState == Unity.WebRTC.RTCDataChannelState.Open;

        readonly ConcurrentQueue<string> _inbox = new ConcurrentQueue<string>();
        bool _loggedOther;

        protected override void OnMessage(byte[] bytes)
        {
            try
            {
                if (bytes == null || bytes.Length < 1) return;
                byte type = bytes[0];
                if (type != FromPageUIInteraction && type != FromPageCommand)
                {
                    // the player also sends its own housekeeping messages (initial settings, quality requests...) - not for us
                    if (!_loggedOther) { _loggedOther = true; Debug.Log("[E3DS-UNITY-IFRAME] player message type " + type + " ignored (only 50/51 carry page data)"); }
                    return;
                }
                if (bytes.Length < 3) return;
                int chars = BitConverter.ToUInt16(bytes, 1);
                int byteCount = Math.Min(chars * 2, bytes.Length - 3);
                string text = Encoding.Unicode.GetString(bytes, 3, byteCount);
                _inbox.Enqueue(text);
            }
            catch (Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] message from the page not understood: " + e.Message); }
        }

        void Update()
        {
            while (_inbox.TryDequeue(out var text))
            {
                try { OnPageMessage?.Invoke(text); }
                catch (Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] page message handler failed: " + e); }
            }
        }

        /// <summary>Send a JSON text to the web page. It should contain a "cmd" field. Returns false if no viewer is connected.</summary>
        public bool SendToPage(string json)
        {
            try
            {
                if (!Ready) return false;
                var buf = new byte[1 + json.Length * 2];
                buf[0] = ToPageResponse;
                Encoding.Unicode.GetBytes(json, 0, json.Length, buf, 1);
                Send(buf);
                return true;
            }
            catch (Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] sending to the page failed: " + e.Message); return false; }
        }
    }
}
