/**
 * Types for @eagle3dstreaming/iframe-embed.
 * Every command and event: https://learn.eagle3dstreaming.com/wiki/iframe-demo-manual
 */

/** The current platform event names. Others may be added; any string is accepted by on(). */
export type E3dsPlatformEventType =
    | "session.queued"
    | "session.queuePositionChanged"
    | "session.regionChosen"
    | "session.hostFound"
    | "session.hostReserved"
    | "build.acquiring"
    | "build.preparing"
    | "build.started"
    | "stream.ready"
    | "e3ds.listening"
    | "build.listening"
    | "stream.playing"
    | "connection.stats"
    | "session.ending"
    | "build.stopped"
    | "session.expired"
    | "stream.failed"
    | "session.error"
    | "notice"
    | "screenshot"
    | "commandReceived"
    | "viewportResolution"
    | "takeUserDeviceInfo"
    | "appInfo"
    | "keyEmulated"
    | "micDevices"
    | "micDeviceChanged";

export interface E3dsPlatformEvent {
    type: string;
    /** session.ending: a sentence for a person to read. */
    message?: string;
    /** session.queued / session.queuePositionChanged. */
    queuePosition?: number;
    queueTotal?: number;
    /** build.acquiring / build.preparing, 0-100. */
    percent?: number | string;
    [key: string]: unknown;
}

/** A message your Unreal application sent to the page. */
export type E3dsAppMessage = { cmd?: string; [key: string]: unknown } | string;

export type E3dsListener<T = unknown> = (data: T, type: string) => void;

export interface CreateE3dsIframeOptions {
    /** https://<connector>.eagle3dstreaming.com/v5/<owner>/<AppName>/<configuration> */
    url?: string;
    /** Where to create the iframe (selector or element). */
    container?: string | HTMLElement;
    /** Use this existing iframe instead of creating one. */
    iframe?: string | HTMLIFrameElement;
    /** Frame permissions, default ["fullscreen"]. e.g. ["fullscreen", "microphone"]. */
    allow?: string[];
    /** Title for the created iframe (accessibility). */
    title?: string;
    /** Keep keyboard focus on the stream when the player asks. Default true. */
    autoFocus?: boolean;
    /** Print every message to the console. Default false. */
    log?: boolean;
    /** Origin commands are posted to. Default "*". */
    targetOrigin?: string;
}

export interface E3dsIframe {
    readonly iframe: HTMLIFrameElement;

    on(type: "appMessage", fn: E3dsListener<E3dsAppMessage>): () => void;
    on(type: E3dsPlatformEventType | "*" | (string & {}), fn: E3dsListener<E3dsPlatformEvent>): () => void;
    off(type: string, fn: E3dsListener<any>): void;
    once(type: "appMessage", fn: E3dsListener<E3dsAppMessage>): () => void;
    once(type: E3dsPlatformEventType | "*" | (string & {}), fn: E3dsListener<E3dsPlatformEvent>): () => void;

    /** Any command the player accepts, sent as { cmd, value }. Returns false when the frame has no window yet. */
    send(cmd: string, value?: unknown): boolean;

    sendMessageToStreamingBuild(data: string | object): boolean;
    sendConsoleCommand(command: string): boolean;
    setVideoDetailLevel(level: "low" | "medium" | "high" | "ultra"): void;
    setVolume(volume: number): boolean;
    switchMouseControlSchemeTo(scheme: "Hovering" | "Locked" | (string & {})): boolean;
    setTouchInputEnabled(enabled: boolean): boolean;
    pressKey(key: string): boolean;
    keyDown(key: string): boolean;
    keyUp(key: string): boolean;
    pressPlay(): boolean;
    freezeResolution(width: number, height: number): boolean;
    useViewportResolution(): boolean;
    captureScreenshot(): boolean;
    getDeviceInfo(): boolean;
    getAppInfo(): boolean;
    getMicDevices(): boolean;
    setMicDevice(deviceId: string): boolean;
    terminateSession(): boolean;

    focus(): void;
    reload(): void;
    setUrl(url: string): void;
    destroy(): void;
}

export declare const PACKAGE_NAME: string;
export declare const VERSION: string;
export declare function createE3dsIframe(options: CreateE3dsIframeOptions): E3dsIframe;

declare const _default: { createE3dsIframe: typeof createE3dsIframe; VERSION: string; PACKAGE_NAME: string };
export default _default;
