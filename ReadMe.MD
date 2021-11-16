# E3DS Iframe Demo
## Overview
## How to handle events thrown from UE4 App
From UE4 App, if you send any json object that doesn't contain `type` property, it will be catched `window.e3ds.onEvent` function.
you can send json object like the following:
```
{"cmd":"dance","room":"dining room"}
```


To send JSON from Unreal Project and send as Pixel Streaming Response, add the Pixel Streamer Input to the Player Controller of your project with Pixel Streaming Plugin enabled for your project.



In your blueprint where you want to set this up (Actor/Pawn), Create a function called Send Pixel Streaming Response and create a string Variable Pixel Streaming Response String. In the function you can retrieve reference of Pixel Streaming Component from the Player Controller using the Actor > Get Component by Class node. Click the Component Class input, and look for the PixelStreamingInputComponent in the list. Set the json response you want to send in Pixel Streaming Response String and call the Send Pixel Streaming Response function on event where needed.
Example json object-
{"cmd":"dance","room":"dining room"}
This will go in Pixel Streaming Response String variable.




<br><br>
Here, `dance` is the event name. You can handle this event by setting an event listener like below:

```
window.e3ds.onEvent("dance", (data) => {
	console.log("Raven dancing in the " + data.room);
});
```
The above code will just print, `Raven dancing in the dining room`.

Now, what you want to do is upto you. You can always leave a message on our support center if you have any questions regarding this.

### Demo of IFrame
https://iframe.eagle3dstreaming.com

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


