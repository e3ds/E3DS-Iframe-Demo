window.e3ds = {
	// list of event listeners
	events: {},
	onEvent(eventName, callback) {
		this.events[eventName] = callback;
	}
};

function HandleResponseFromUE4(message)//process whatever u want to do with your message
{
	// this message can be set to a ui element here
	console.log(message);
	alert(message);
}


//eagle3dstreaming's Server   to Iframe communication
const eventHandler = (event) => {
	if (typeof event.data === 'string' || event.data instanceof String) {
		HandleResponseFromUE4(event.data);
	}
}

window.addEventListener("message", eventHandler);
