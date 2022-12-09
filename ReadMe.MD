# E3DS Iframe Demo

### Demo of IFrame
https://iframe_ue5.eagle3dstreaming.com/


Ue4 project source code used in the dmeo:
https://bitbucket.org/Eagle3DStreaming/e3dsfeaturestemplate/

more deatils doc:
https://eagle3dstreaming.atlassian.net/l/c/Ndx0mHy1

https://eagle3dstreaming.atlassian.net/l/c/VcBU1G1R


## Overview
## How to handle events thrown from UE4 App
From UE4 App, if you send any json object that doesn't contain `type` property, it will be catched `window.e3ds.onEvent` function.
you can send json object like the following:
```
{"cmd":"run","room":"dining room"}
```


To send JSON from Unreal Project and send as Pixel Streaming Response, add the Pixel Streamer Input to the Player Controller of your project with Pixel Streaming Plugin enabled for your project.



In your blueprint where you want to set this up (Actor/Pawn), Create a function called Send Pixel Streaming Response and create a string Variable Pixel Streaming Response String. In the function you can retrieve reference of Pixel Streaming Component from the Player Controller using the Actor > Get Component by Class node. Click the Component Class input, and look for the PixelStreamingInputComponent in the list. Set the json response you want to send in Pixel Streaming Response String and call the Send Pixel Streaming Response function on event where needed.
Example JSON object-
`{"cmd":"run","room":"dining room"}`
This will go in Pixel Streaming Response String variable.

![Example of blueprint catching events from webpage](https://github.com/e3ds/E3DS-Iframe-Demo/blob/main/images/ue4-pixelstreaming-response.png?raw=true)


![Example of blueprint catching events from webpage](https://github.com/e3ds/E3DS-Iframe-Demo/blob/main/images/Sending%20Response%20to%20Iframe.png?raw=true)

<br><br>
Here, `run` is the event name. You can handle this event by setting an event listener like below:

```
window.e3ds.onEvent("run", (data) => {
	console.log("Raven is running in the " + data.room);
});
```
The above code will just print, `Raven running in the dining room`.

Now, what you want to do is upto you. You can always leave a message on our support center if you have any questions regarding this.

## How to send events from iframe page to UE4

From Javascript client page:

```
let descriptor = {
		Teleport: "dining room"
	};
let obj = {
	cmd: "sendToUe4",
	value: descriptor
}
sendToMainPage(obj)
```

To catch this event on the Unreal Engine side, use **Bind Event to OnPixelStreamingInputEvent** node. You have to attach a **UI Interaction** node to the `event` field of **Bind Event to OnPixelStreamingInputEvent**. You need to bind this event once, typically at the start of your game.

Following is an example that retrieves `Teleport` value from the JSON string passed from the page:

![Example of blueprint catching events from webpage](https://github.com/e3ds/E3DS-Iframe-Demo/blob/main/images/ue4-catching-event-from-page.png?raw=true)


### Frequently Asked Questions

##### How do I add an element
You can use DOM manipulation API of javascript to do so.   
We have implemented an iframe as an example. You can click `increaseSessionTime` to make that iframe visible. Check the `/js/eventHandler.js` file.    
Check the following links and examples:
https://www.w3schools.com/js/js_htmldom.asp
https://www.w3schools.com/jsref/met_document_createelement.asp

### Important links
* https://www.w3schools.com/js/js_htmldom.asp
* https://www.w3schools.com/jsref/met_document_createelement.asp

https://iframe.eagle3dstreaming.com/
https://iframe_react.eagle3dstreaming.com/
https://iframe_ue5.eagle3dstreaming.com/
