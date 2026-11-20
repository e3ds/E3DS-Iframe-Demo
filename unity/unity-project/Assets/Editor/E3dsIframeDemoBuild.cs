// [E3DS-UNITY-IFRAME] Builds the Unity iframe demo from nothing, in batch mode:
//   Unity.exe -batchmode -quit -projectPath <this project> -executeMethod E3dsIframeDemoBuild.Build -logFile build.log
// Creates the scene (camera, light, ground, the object the page controls, the in-app UI, the Render Streaming object
// with the page channel) and builds Build\E3DS_UnityIframeDemo.exe. Zip the Build folder and upload it in the Control
// Panel ("Streams with: Unity").
using System.IO;
using Eagle3DStreaming;
using Eagle3DStreaming.IframeDemo;
using Unity.RenderStreaming;
using UnityEditor;
using UnityEditor.Events;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

public static class E3dsIframeDemoBuild
{
    const string ScenePath = "Assets/Scenes/IframeDemo.unity";
    const string ExeName = "E3DS_UnityIframeDemo";

    public static void Build()
    {
        try
        {
            UseInputSystemOnly();
            CreateScene();
            PlayerSettings.productName = ExeName;
            PlayerSettings.companyName = "Eagle 3D Streaming";
            PlayerSettings.runInBackground = true;
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.resizableWindow = false;
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = "Build/" + ExeName + ".exe",
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            };
            var report = BuildPipeline.BuildPlayer(options);
            Debug.Log("E3DS BUILD RESULT: " + report.summary.result + " size " + report.summary.totalSize);
            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded) EditorApplication.Exit(1);
        }
        catch (System.Exception e) { Debug.LogError("[E3DS-UNITY-IFRAME] build failed: " + e); EditorApplication.Exit(1); }
    }

    // Player Settings > Active Input Handling = Input System Package. Render Streaming's InputReceiver needs it.
    static void UseInputSystemOnly()
    {
        var ps = Unsupported.GetSerializedAssetInterfaceSingleton("PlayerSettings");
        var so = new SerializedObject(ps);
        var prop = so.FindProperty("activeInputHandler");
        if (prop != null) { prop.intValue = 1; so.ApplyModifiedProperties(); }
    }

    static void CreateScene()
    {
        Directory.CreateDirectory("Assets/Scenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        var cam = new GameObject("Camera").AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.transform.position = new Vector3(0f, 1.6f, -5.2f);
        cam.transform.rotation = Quaternion.Euler(10f, 0f, 0f);
        cam.gameObject.AddComponent<AudioListener>();

        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.shadows = LightShadows.Soft;
        sun.transform.rotation = Quaternion.Euler(45f, -30f, 0f);

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.localScale = new Vector3(3f, 1f, 3f);

        var hero = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hero.name = "Hero";
        hero.transform.position = new Vector3(0f, 1.1f, 0f);

        var es = new GameObject("EventSystem");
        es.AddComponent<EventSystem>();
        es.AddComponent<InputSystemUIInputModule>();

        var canvasGo = new GameObject("Canvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        canvasGo.AddComponent<GraphicRaycaster>();
        var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        var title = NewText("Title", canvasGo.transform, font, 30, TextAnchor.UpperLeft, new Vector2(0, 1), new Vector2(40, -30), new Vector2(1100, 50));
        title.text = "Unity app - streamed by Eagle 3D Streaming";

        var banner = NewText("Banner", canvasGo.transform, font, 64, TextAnchor.UpperCenter, new Vector2(0.5f, 1), new Vector2(0, -110), new Vector2(1700, 160));
        banner.text = "Hello from Unity";
        banner.fontStyle = FontStyle.Bold;

        var last = NewText("LastMessage", canvasGo.transform, font, 28, TextAnchor.LowerLeft, new Vector2(0, 0), new Vector2(40, 40), new Vector2(1300, 50));
        last.text = "From the web page: (nothing yet)";

        var hint = NewText("Hint", canvasGo.transform, font, 26, TextAnchor.LowerLeft, new Vector2(0, 0), new Vector2(40, 95), new Vector2(1300, 50));
        hint.text = "Click the object - the web page is told.";

        var buttonGo = new GameObject("PageButton", typeof(RectTransform), typeof(Image), typeof(Button));
        buttonGo.transform.SetParent(canvasGo.transform, false);
        var brt = buttonGo.GetComponent<RectTransform>();
        // right side, well above the bottom corner: our player draws its settings gear in the bottom-right corner
        brt.anchorMin = brt.anchorMax = new Vector2(1, 0); brt.pivot = new Vector2(1, 0);
        brt.anchoredPosition = new Vector2(-60, 220); brt.sizeDelta = new Vector2(460, 110);
        buttonGo.GetComponent<Image>().color = new Color(1f, 0.82f, 0.2f);
        var label = NewText("Label", buttonGo.transform, font, 32, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(460, 110));
        label.text = "Say hello to the web page"; label.color = Color.black;
        var count = NewText("ButtonCount", canvasGo.transform, font, 26, TextAnchor.LowerRight, new Vector2(1, 0), new Vector2(-60, 340), new Vector2(460, 40));
        count.text = "Pressed 0x";

        // Render Streaming object, laid out as our Eagle 3D Streaming package lays it out - plus the page channel.
        // (Our package adds its own object only when the first scene has none with E3dsStreaming on it.)
        var rs = new GameObject("E3DS RenderStreaming");
        var video = rs.AddComponent<VideoStreamSender>();
        video.source = VideoStreamSource.Screen;
        var audio = rs.AddComponent<AudioStreamSender>();
        audio.source = AudioStreamSource.APIOnly; // fed by the package's E3dsAudioTap
        var input = rs.AddComponent<InputReceiver>();
        var browser = rs.AddComponent<E3dsBrowserMessages>();
        SetChannel(browser, false, E3dsBrowserMessages.ChannelLabel); // the page opens this one (touch-device notice)
        var page = rs.AddComponent<E3dsPageChannel>();
        SetChannel(page, true, "e3ds-page");                          // the APP opens this one - the player adopts it
        var broadcast = rs.AddComponent<Broadcast>();
        var bso = new SerializedObject(broadcast);
        var streams = bso.FindProperty("streams");
        var list = new Object[] { video, audio, input, browser, page };
        streams.arraySize = list.Length;
        for (int i = 0; i < list.Length; i++) streams.GetArrayElementAtIndex(i).objectReferenceValue = list[i];
        bso.ApplyModifiedPropertiesWithoutUndo();
        var manager = rs.AddComponent<SignalingManager>();
        manager.runOnAwake = false; // E3dsStreaming.Start calls Run() so the launcher's command line is read
        var mso = new SerializedObject(manager);
        var handlers = mso.FindProperty("handlers");
        handlers.arraySize = 1;
        handlers.GetArrayElementAtIndex(0).objectReferenceValue = broadcast;
        mso.ApplyModifiedPropertiesWithoutUndo();
        rs.AddComponent<E3dsStreaming>();

        var app = new GameObject("IframeDemoApp").AddComponent<IframeDemoApp>();
        app.channel = page; app.hero = hero.transform; app.cam = cam; app.sun = sun;
        app.banner = banner; app.lastMessage = last; app.buttonCountText = count;
        UnityEventTools.AddPersistentListener(buttonGo.GetComponent<Button>().onClick, app.OnInAppButton);

        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        Debug.Log("E3DS SCENE SAVED " + ScenePath);
    }

    static void SetChannel(Object channel, bool local, string label)
    {
        var so = new SerializedObject(channel);
        var l = so.FindProperty("local"); if (l != null) l.boolValue = local; else Debug.LogError("[E3DS-UNITY-IFRAME] no 'local' field on " + channel.GetType().Name);
        var n = so.FindProperty("label"); if (n != null) n.stringValue = label; else Debug.LogError("[E3DS-UNITY-IFRAME] no 'label' field on " + channel.GetType().Name);
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    static Text NewText(string name, Transform parent, Font font, int size, TextAnchor anchor, Vector2 anchorPoint, Vector2 pos, Vector2 box)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Text));
        go.transform.SetParent(parent, false);
        var t = go.GetComponent<Text>(); t.font = font; t.fontSize = size; t.alignment = anchor; t.color = Color.white;
        t.raycastTarget = false;
        var rt = t.rectTransform; rt.anchorMin = rt.anchorMax = anchorPoint; rt.pivot = anchorPoint;
        rt.anchoredPosition = pos; rt.sizeDelta = box;
        var sh = go.AddComponent<Shadow>(); sh.effectDistance = new Vector2(2, -2);
        return t;
    }
}
