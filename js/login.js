function handleLogin(e){
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    //your login logic goes here
    localStorage.setItem("isAuthenticated", true);
    window.location.href = "/E3DS_Iframe_Demo.htm";
}