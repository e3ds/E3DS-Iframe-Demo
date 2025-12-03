const messageHandler = (event) => {
	const loaderStep1 = document.getElementById("loaderStep1");
	const loaderStep2 = document.getElementById("loaderStep2");
	const loaderStep3 = document.getElementById("loaderStep3");
	const iframeElem = document.getElementById("iframe_1");
	const sidebar = document.getElementById("sidebar");


	console.log("received data event type " + event.data.type)
	switch (event.data.type) {
		case "ResponseFromUE4":
			console.log("Response from Unreal to iframe: " + event.data.descriptor)
			break;
		case "stage1_inqueued":
			loaderStep1.style.visibility = "visible";
			break;
		case "stage2_deQueued":
			// loading screen 1 hides
			break;
		case "stage3_slotOccupied":
			loaderStep1.style.display = "none";
			loaderStep2.style.visibility = "visible";
			break;
		case "stage4_playBtnShowedUp":
			//loading screen 2 hides
			loaderStep2.style.visibility = "hidden";
			iframeElem.style.visibility = "visible";
			// loaderStep3.style.visibility = "visible";
			let playButton = document.getElementById("playButtonParent");
			playButton.click();
			onPlayBtnPressed();
			break;
		case "stage5_playBtnPressed":
			sidebar.style.visibility = "visible";
			loaderStep2.style.display = "none";
			iframeElem.style.visibility = "visible";
			$('#iframe_1').focus();
			break;
		case "_focus":
			document.getElementById("iframe_1").focus();
			break;
		case "isIframe":
			let obj = {
				cmd: 'isIframe',
				value: true
			};
			document.getElementById("iframe_1").focus();
			document.getElementById("iframe_1").contentWindow.postMessage(JSON.stringify(obj), "*");;
			break;
			
		case "QueueNumberUpdated":
			console.log("QueueNumberUpdated. New queuePosition: : " +  event.data.queuePosition)
			break;
			
		case "stage3_1_AppAcquiringProgress":
			console.log("stage3_1_AppAcquiringProgress percent: " + JSON.stringify( event.data.percent))
			break;
			
		case "stage3_2_AppPreparationProgress":
			console.log("stage3_2_AppPreparationProgress percent:" + JSON.stringify( event.data.percent))
			break;	
		case "shortCuts":
			console.log("Key pressed");
			break;
		case "sessionExpired":
			sidebar.style.visibility = "hidden";
			loaderStep2.style.display = "flex";
			iframeElem.style.visibility = "hidden";
			$('#iframe_1').focus();
			document.getElementById("iframe_1").src = document.getElementById("iframe_1").src;
			break;
		case "videoStreamFailed":
			sidebar.style.visibility = "hidden";
			loaderStep2.style.display = "flex";
			iframeElem.style.visibility = "hidden";
			$('#iframe_1').focus();
			document.getElementById("iframe_1").src = document.getElementById("iframe_1").src;
			break;
		case "Error_Redirect":
			loaderStep2.style.display = "none";
			iframeElem.style.visibility = "visible";
			$('#iframe_1').focus();
		default:
			console.error("Unhandled message data type");
			break;
	}
}



