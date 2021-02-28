function HandleResponseFromUE4(jsonObj)//process whatever u want to do with your object
{
	if (event.data.cmd == "ToggleBrowserMouse") {

	}
}


//eagle3dstreaming's Server   to Iframne communication
window.onmessage = (event) => {
	console.log('Message From SS -- > Iframe  ' + JSON.stringify(event.data))

	if (!event.data.hasOwnProperty('type'))// is it a data not from server
	{
		let parsedData = JSON.parse(event.data)
		console.log('Message From UE4-- > Iframe  :' + JSON.stringify(parsedData))
		if (event.data.hasOwnProperty('cmd'))//than is it a data from ue4 ???
		{
			HandleResponseFromUE4(parsedData)//process the data sent by ue4
		}
	} else if (event.data.hasOwnProperty('type'))// is it data from server only
	{
		console.log("window.onmessage event.data.type: " + event.data.type)
		switch (event.data.type){
			case "ResponseFromUE4":
				console.log("UE4->iframe: " + event.data.descriptor)
				myHandleResponseFunction(event.data.descriptor);
				break;
			case "stage1_inqueued":
				let loaderStep1 = document.getElementById("loaderStep1")
				loaderStep1.style.visibility = "visible";
				break;
		}
		if (event.data.type === "stage2_deQueued") {
			//loading screen 1 hides
		} else if (event.data.type === "stage3_slotOccupied") {
			let loaderStep1 = document.getElementById("loaderStep1")
			loaderStep1.style.visibility = "hidden";
			let loaderStep2 = document.getElementById("loaderStep2")
			loaderStep2.style.visibility = "visible";
		} else if (event.data.type === "stage4_playBtnShowedUp") {
			//loading screen 2 hides
			let loaderStep2 = document.getElementById("loaderStep2")
			loaderStep2.style.visibility = "hidden";
			let eleBanner = document.getElementById("iframe_1")
			eleBanner.style.visibility = "visible";
			let loaderStep3 = document.getElementById("loaderStep3")
			loaderStep3.style.visibility = "visible";
			let playButton = document.getElementById("playButton");
			onPlayBtnPressed();
		} else if (event.data.type === "stage5_playBtnPressed") {
			let eleBanner = document.getElementById("sidebar")
			eleBanner.style.visibility = "visible";
		} else if (event.data.type === "isIframe") {
			let obj = {
				cmd: 'isIframe',
				value: true
			};
			sendToMainPage(obj);
		}
	}

}
