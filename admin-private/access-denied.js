document.querySelector("#sign-out").addEventListener("click", async () => {
  const sessionResponse = await fetch("/api/auth/session");
  const session = sessionResponse.ok ? await sessionResponse.json() : {};
  await fetch("/api/auth/logout", { method: "POST", headers: session.csrfToken ? { "X-CSRF-Token": session.csrfToken } : {} });
  window.location.assign("/admin/login");
});
