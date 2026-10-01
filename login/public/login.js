/**
 * login.js - ask the server whether the username and password are right, and
 * only then put the stream into the iframe.
 *
 * The page never knows the stream address on its own: the server returns it in
 * the answer to a correct login (see server.js for why).
 */
const form = document.getElementById('login');
const errorBox = document.getElementById('error');
const submit = document.getElementById('submit');
const stream = document.getElementById('stream');
const frame = document.getElementById('streamFrame');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    submit.disabled = true;
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('username').value.trim(),
                password: document.getElementById('password').value
            })
        });
        const answer = await response.json().catch(() => ({}));
        if (!response.ok || !answer.ok) {
            errorBox.textContent = answer.error || 'Sign-in failed.';
            return;
        }
        // Correct login: show the stream.
        form.style.display = 'none';
        stream.style.display = 'flex';
        frame.src = answer.streamUrl;
    } catch (e) {
        errorBox.textContent = 'Could not reach the login server.';
    } finally {
        submit.disabled = false;
        document.getElementById('password').value = '';
    }
});

document.getElementById('signOut').addEventListener('click', () => {
    // Emptying the iframe ends the stream session on the platform side.
    frame.src = 'about:blank';
    stream.style.display = 'none';
    form.style.display = 'block';
});
