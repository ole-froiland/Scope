const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const button = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  button.disabled = true;
  button.textContent = "Kontrollerer …";
  try {
    const formData = new FormData(form);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Innloggingen mislyktes.");
    message.className = "message success";
    message.textContent = "Innlogging godkjent. Åpner admin …";
    window.location.assign(result.redirect || "/admin");
  } catch (error) {
    message.className = "message";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Logg inn";
  }
});
