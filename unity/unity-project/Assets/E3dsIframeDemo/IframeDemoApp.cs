// [E3DS-UNITY-IFRAME] The demo scene's behaviour: what the web page can change, and what the app tells the page.
//
//   from the page  {"id":"p7","action":"setColor","value":"#ff3300"}    every action is answered with unity.ack
//     setColor  value "#rrggbb"                       colour of the object
//     setSpin   number  degrees per second            0 stops it
//     setShape  value cube | sphere | capsule | cylinder
//     showText  value  any text                       shown on the banner inside the app
//     setLight  value day | night
//     ping      (nothing)                             answered with unity.pong (the page measures the round trip)
//     getState  (nothing)                             answered with unity.state
//     endSession (nothing)                            the APP ends the session: it sends {"cmd":"ForceEndSession"},
//                                                     a command our player carries out
//   to the page (all have "cmd" and a running "seq")
//     unity.ready          the channel is open (app name, Unity version, screen size)
//     unity.ack            {id, action, ok, error?}
//     unity.pong           {id}
//     unity.state          {shape, color, spin, light, text}
//     unity.objectClicked  the viewer clicked the object in the stream {shape, color, clicks}
//     unity.buttonClicked  the viewer pressed the button drawn inside the app {count}
//     unity.stats          every 5 s {fps, uptime}
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Eagle3DStreaming.IframeDemo
{
    public class IframeDemoApp : MonoBehaviour
    {
        public E3dsPageChannel channel;
        public Transform hero;
        public Camera cam;
        public Light sun;
        public Text banner;
        public Text lastMessage;
        public Text buttonCountText;

        [System.Serializable]
        class PageMsg { public string id; public string action; public string value; public float number; }

        float _spin = 45f;
        string _shape = "cube";
        string _color = "#3fa9f5";
        string _light = "day";
        int _seq, _clicks, _buttonCount, _frames;
        float _statsAt, _readyAt = -1f;
        bool _readySent;
        readonly Dictionary<string, Mesh> _meshes = new Dictionary<string, Mesh>();
        readonly HashSet<string> _seenIds = new HashSet<string>();

        void Start()
        {
            try
            {
                foreach (var kv in new[] { ("cube", PrimitiveType.Cube), ("sphere", PrimitiveType.Sphere), ("capsule", PrimitiveType.Capsule), ("cylinder", PrimitiveType.Cylinder) })
                {
                    var tmp = GameObject.CreatePrimitive(kv.Item2);
                    _meshes[kv.Item1] = tmp.GetComponent<MeshFilter>().sharedMesh;
                    Destroy(tmp);
                }
                ApplyColor(_color);
                ApplyLight(_light);
                channel.OnPageMessage += OnPageMessage;
                channel.OnStartedChannel += _ => { _readySent = false; _readyAt = Time.unscaledTime + 1f; Debug.Log("[E3DS-UNITY-IFRAME] page channel open"); };
                channel.OnStoppedChannel += _ => Debug.Log("[E3DS-UNITY-IFRAME] page channel closed");
                _statsAt = Time.unscaledTime + 5f;
            }
            catch (System.Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] demo start failed: " + e); }
        }

        void Update()
        {
            try
            {
                _frames++;
                hero.Rotate(0f, _spin * Time.deltaTime, 0f, Space.World);

                // announce once, a moment after the channel opens (the player adopts the channel as it arrives)
                if (!_readySent && _readyAt > 0 && Time.unscaledTime >= _readyAt && channel.Ready)
                {
                    _readySent = true;
                    Send("unity.ready", J("app", Application.productName) + "," + J("unityVersion", Application.unityVersion) + "," + J("screen", Screen.width + "x" + Screen.height));
                }

                if (Time.unscaledTime >= _statsAt)
                {
                    float fps = _frames / 5f; _frames = 0; _statsAt = Time.unscaledTime + 5f;
                    if (channel.Ready) Send("unity.stats", "\"fps\":" + fps.ToString("0.0", CultureInfo.InvariantCulture) + ",\"uptime\":" + ((int)Time.realtimeSinceStartup));
                }

                // the viewer clicks (or taps) the object in the stream
                var p = Pointer.current;
                if (p != null && p.press.wasPressedThisFrame)
                {
                    var ray = cam.ScreenPointToRay(p.position.ReadValue());
                    if (Physics.Raycast(ray, out var hit, 100f) && hit.transform == hero)
                    {
                        _clicks++;
                        hero.localScale = Vector3.one * 1.25f;
                        Send("unity.objectClicked", J("shape", _shape) + "," + J("color", _color) + ",\"clicks\":" + _clicks);
                    }
                }
                hero.localScale = Vector3.Lerp(hero.localScale, Vector3.one, 6f * Time.deltaTime);
            }
            catch (System.Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] demo update failed: " + e); }
        }

        /// <summary>Wired to the button drawn inside the app.</summary>
        public void OnInAppButton()
        {
            _buttonCount++;
            if (buttonCountText != null) buttonCountText.text = "Pressed " + _buttonCount + "x";
            Send("unity.buttonClicked", "\"count\":" + _buttonCount);
        }

        void OnPageMessage(string json)
        {
            PageMsg m = null;
            try { m = JsonUtility.FromJson<PageMsg>(json); }
            catch (System.Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] page message is not JSON: " + e.Message); }
            // The player itself also sends a few messages on this channel - e.g. {"Resolution.Width":1135,"Resolution.Height":638}
            // when the viewer's frame changes size (made for Unreal apps). They have no "action": skip them here.
            if (m == null || string.IsNullOrEmpty(m.action)) { Debug.Log("[E3DS-UNITY-IFRAME] player/page message without an action (not shown): " + json); return; }
            if (lastMessage != null) lastMessage.text = "From the web page: " + (json.Length > 90 ? json.Substring(0, 90) + "..." : json);
            // a page may send the same message under two command names (old and new players); answer it once
            if (!string.IsNullOrEmpty(m.id)) { if (_seenIds.Contains(m.id)) return; _seenIds.Add(m.id); }
            Debug.Log("[E3DS-UNITY-IFRAME] page -> app: " + json);

            string error = null;
            switch (m.action)
            {
                case "setColor": if (!ApplyColor(m.value)) error = "not a colour: " + m.value; break;
                case "setSpin": _spin = Mathf.Clamp(m.number, -720f, 720f); break;
                case "setShape":
                    if (m.value != null && _meshes.TryGetValue(m.value, out var mesh)) { hero.GetComponent<MeshFilter>().sharedMesh = mesh; _shape = m.value; }
                    else error = "unknown shape: " + m.value;
                    break;
                case "showText": banner.text = string.IsNullOrEmpty(m.value) ? " " : m.value; break;
                case "setLight": if (!ApplyLight(m.value)) error = "unknown light: " + m.value; break;
                case "ping": Send("unity.pong", J("id", m.id)); return;
                case "getState": Send("unity.state", StateJson() + "," + J("id", m.id)); return;
                case "endSession":
                    Send("unity.ack", J("id", m.id) + "," + J("action", m.action) + ",\"ok\":true");
                    // a command for the PLAYER (not the page): it ends the session and shows "Session Ended"
                    channel.SendToPage("{\"cmd\":\"ForceEndSession\"}");
                    return;
                default: error = "unknown action: " + m.action; break;
            }
            Send("unity.ack", J("id", m.id) + "," + J("action", m.action) + ",\"ok\":" + (error == null ? "true" : "false") + (error == null ? "" : "," + J("error", error)));
        }

        string StateJson() => J("shape", _shape) + "," + J("color", _color) + ",\"spin\":" + _spin.ToString("0.##", CultureInfo.InvariantCulture) + "," + J("light", _light) + "," + J("text", banner.text);

        bool ApplyColor(string hex)
        {
            if (string.IsNullOrEmpty(hex) || !ColorUtility.TryParseHtmlString(hex, out var c)) return false;
            hero.GetComponent<Renderer>().material.color = c;
            _color = hex;
            return true;
        }

        bool ApplyLight(string mode)
        {
            if (mode == "day") { cam.backgroundColor = new Color(0.55f, 0.75f, 0.95f); sun.intensity = 1.2f; RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.6f); }
            else if (mode == "night") { cam.backgroundColor = new Color(0.03f, 0.04f, 0.10f); sun.intensity = 0.15f; RenderSettings.ambientLight = new Color(0.08f, 0.08f, 0.15f); }
            else return false;
            _light = mode;
            return true;
        }

        void Send(string cmd, string fields)
        {
            _seq++;
            var json = "{" + J("cmd", cmd) + ",\"seq\":" + _seq + (string.IsNullOrEmpty(fields) ? "" : "," + fields) + "}";
            if (!channel.SendToPage(json)) Debug.Log("[E3DS-UNITY-IFRAME] no viewer page connected - not sent: " + cmd);
        }

        static string J(string key, string value)
        {
            var sb = new StringBuilder();
            sb.Append('"').Append(key).Append("\":\"");
            foreach (var ch in value ?? "")
            {
                if (ch == '"' || ch == '\\') sb.Append('\\').Append(ch);
                else if (ch < 0x20) sb.Append("\\u").Append(((int)ch).ToString("x4"));
                else sb.Append(ch);
            }
            return sb.Append('"').ToString();
        }
    }
}
