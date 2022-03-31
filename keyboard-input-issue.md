# Keyboard Input Issue
If Unreal App has "input" field in it, you will need to add the following snippet of code in the parent HTML file.

```
window.addEventListener('message', (message) => {
	if (message.data.type === '_focus') {
		document.getElementById("iframe_1").focus();
	}
})
```

Here, `iframe_1` is the id of the iframe element.


If you face any issues please contact our support, we will be pleased to co-operate.
