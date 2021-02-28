window.e3ds = {
	// list of event listeners
	events: {},
	onEvent(eventName, callback){
		this.events[eventName] = callback;
	}
};

function HandleResponseFromUE4(jsonObj)//process whatever u want to do with your object
{
	if(window.e3ds.events[jsonObj.cmd]){
		window.e3ds.events[jsonObj.cmd](jsonObj);
	}
}


//eagle3dstreaming's Server   to Iframne communication
window.onmessage = (event) => {
	console.log('Message From SS -- > Iframe  ', event.data);


	if (!event.data.type) // is it a data not from server
	{
		const parsedData = JSON.parse(event.data);
		console.log('Message From UE4-- > Iframe  :', parsedData)
		if (parsedData.cmd)//than is it a data from ue4 ???
		{
			HandleResponseFromUE4(parsedData)//process the data sent by ue4
		}
	} else {
		const loaderStep1 = document.getElementById("loaderStep1");
		const loaderStep2 = document.getElementById("loaderStep2");
		const loaderStep3 = document.getElementById("loaderStep3");
		const iframeElem = document.getElementById("iframe_1");
		const sidebar = document.getElementById("sidebar");


		console.log("received data event type " + event.data.type)
		switch (event.data.type) {
			case "ResponseFromUE4":
				console.log("UE4->iframe: " + event.data.descriptor)
				myHandleResponseFunction(event.data.descriptor);
				break;
			case "stage1_inqueued":
				loaderStep1.style.visibility = "visible";
				break;
			case "stage2_deQueued":
				// loading screen 1 hides
				break;
			case "stage3_slotOccupied":
				loaderStep1.style.visibility = "hidden";
				loaderStep2.style.visibility = "visible";
				break;
			case "stage4_playBtnShowedUp":
				//loading screen 2 hides
				loaderStep2.style.visibility = "hidden";
				iframeElem.style.visibility = "visible";
				loaderStep3.style.visibility = "visible";
				let playButton = document.getElementById("playButton");
				onPlayBtnPressed();
				break;
			case "stage5_playBtnPressed":
				sidebar.style.visibility = "visible";
				break;
			case "isIframe":
				let obj = {
					cmd: 'isIframe',
					value: true
				};
				sendToMainPage(obj);
				break;
			default:
				console.error("Unhandled message data type");
				break;
		}
	}
}


function onPlayBtnPressed() {
	let loaderStep2 = document.getElementById("loaderStep2")
	loaderStep2.style.visibility = "hidden";
	let loaderStep3 = document.getElementById("loaderStep3")
	loaderStep3.style.visibility = "hidden";
	let eleBanner = document.getElementById("iframe_1")
	eleBanner.style.visibility = "visible";
}

function sendToMainPage(obj) {
	let origin = "*"
	let myIframe = document.getElementById("iframe_1");
	myIframe.contentWindow.postMessage(JSON.stringify(obj), origin);
}

function switchTo(val) {
	console.log("=== Registered switchTo action, Value is: ", val);

	let descriptor = {
		Teleport: val
	};
	//emitUIInteraction(descriptor);
	let obj =
		{
			cmd: "sendToUe4",
			value: descriptor,

		}
	sendToMainPage(obj)
}

let isFullScreen = false

function goToFullScreen() {
	var cmd = isFullScreen ? "Off" : "On";
	isFullScreen = !isFullScreen;
	console.log("=== Registered full screen action, Value is: ", cmd);
	let descriptor = {
		FullScreen: cmd
	};
	//emitUIInteraction(descriptor);
	let obj =
		{
			cmd: "sendToUe4",
			value: descriptor,
		}
	sendToMainPage(obj)
}
