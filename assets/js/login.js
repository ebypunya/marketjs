function togglePassword(inputId) {
	const passwordInput = document.getElementById(inputId);
	const toggleIcon = event.target;
	
	if (passwordInput.type === "password") {
		passwordInput.type = "text";
        toggleIcon.textContent = "🙈"; // Icon hide
    } else {
    	passwordInput.type = "password";
        toggleIcon.textContent = "👁️"; // Icon show
    }
}