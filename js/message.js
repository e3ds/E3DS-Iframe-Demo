
const messageHandler = (event) => {
	const iframeElem = document.getElementById("iframe_1");


	console.log("received data event type " + event.data.type)
	switch (event.data.type) {
		case "ResponseFromUE4":
			console.log("Response from Unreal to iframe: " + event.data.descriptor)
			break;
		case "stage1_inqueued":
			
			break;
		case "stage2_deQueued":
			break;
		case "stage3_slotOccupied":
			
			break;
		case "stage4_playBtnShowedUp":
			let playButton = document.getElementById("playButtonParent");
			playButton.click();
			onPlayBtnPressed();
			break;
		case "stage5_playBtnPressed":
			streamStarted = true;
			//show customSkipBtn
			const customSkipBtn = document.getElementById("customSkipBtn");
			if(customSkipBtn){
				customSkipBtn.style.display = "flex";
			}
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
			iframeElem.style.visibility = "hidden";
			$('#iframe_1').focus();
			document.getElementById("iframe_1").src = document.getElementById("iframe_1").src;
			break;
		case "videoStreamFailed":
			iframeElem.style.visibility = "hidden";
			$('#iframe_1').focus();
			document.getElementById("iframe_1").src = document.getElementById("iframe_1").src;
			break;
		case "Error_Redirect":
			iframeElem.style.visibility = "visible";
			$('#iframe_1').focus();
		default:
			console.error("Unhandled message data type");
			break;
	}
}



