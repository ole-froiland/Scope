const cookiePreferenceName = "scope_cookie_preferences";
const cookieConsentBanners = document.querySelectorAll("[data-simple-cookie-consent]");

function hasCookiePreferences() {
  const savedValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${cookiePreferenceName}=`));

  if (!savedValue) return false;

  try {
    JSON.parse(decodeURIComponent(savedValue.split("=").slice(1).join("=")));
    return true;
  } catch {
    return false;
  }
}

function saveCookiePreferences(allowOptionalCookies) {
  const preferences = {
    necessary: true,
    analytics: allowOptionalCookies,
    marketing: allowOptionalCookies,
    updatedAt: new Date().toISOString(),
  };
  const maxAge = 60 * 60 * 24 * 365;

  document.cookie = `${cookiePreferenceName}=${encodeURIComponent(JSON.stringify(preferences))}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("scope:cookie-preferences", { detail: preferences }));
}

cookieConsentBanners.forEach((banner) => {
  if (!hasCookiePreferences()) banner.hidden = false;

  banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCookiePreferences(button.dataset.cookieChoice === "all");
      banner.hidden = true;
    });
  });
});
