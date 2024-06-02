export const messageHandler = (event) => {
	if(!event.data.type) return;
    switch (event.data.type) {
		case "ResponseFromUE4":
			console.log("UE4->iframe: " + event.data.descriptor)
			break;
		case "stage1_inqueued":

			break;
		case "stage2_deQueued":
			// loading screen 1 hides
			break;
		case "stage3_slotOccupied":

			break;
		case "stage4_playBtnShowedUp":

			let playButton = document.getElementById("playButtonParent");
			playButton.click();
			onPlayBtnPressed();
			break;
		case "stage5_playBtnPressed":
			document.getElementById("iframe_1").focus();
			break;
		case "_focus":
			document.getElementById("iframe_1").focus();
			break;
		case "isIframe":
			let obj = {
				cmd: 'isIframe',
				value: true
			};
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
		case "Error_Redirect":
			
            break;
		default:
			console.error("Unhandled message data type");
			break;
	}
}

function onPlayBtnPressed() {
	
}