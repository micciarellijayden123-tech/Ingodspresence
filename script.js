const yearEl = document.getElementById('year');
const signupForm = document.getElementById('signup-form');
const formMessage = document.getElementById('form-message');
const themeStorageKey = 'site-theme';

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const themeSelect = document.querySelector('#theme-select');
  if (themeSelect) {
    themeSelect.value = theme;
  }
}

const savedTheme = localStorage.getItem(themeStorageKey);
setTheme(savedTheme === 'dark' ? 'dark' : 'light');

const themeSettings = document.createElement('div');
themeSettings.className = 'theme-settings';
themeSettings.innerHTML = `
  <button type="button" class="theme-settings-toggle" aria-expanded="false" aria-controls="theme-settings-panel">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.81.5l-.06.07h-3.4l-.04-.08a1.7 1.7 0 0 0-1.6-1.04 1.7 1.7 0 0 0-.74.17l-.08.04-2.94-1.7.02-.08a1.7 1.7 0 0 0-.5-1.81l-.07-.06v-3.4l.08-.04a1.7 1.7 0 0 0 .87-1.48 1.7 1.7 0 0 0-.17-.74l-.04-.08 1.7-2.94.08.02a1.7 1.7 0 0 0 1.81-.5l.06-.07h3.4l.04.08a1.7 1.7 0 0 0 1.6 1.04 1.7 1.7 0 0 0 .74-.17l.08-.04 2.94 1.7-.02.08a1.7 1.7 0 0 0 .5 1.81l.07.06v3.4l-.08.04a1.7 1.7 0 0 0-.87 1.48Z"></path>
    </svg>
    <span>Settings</span>
  </button>
  <div class="theme-settings-panel" id="theme-settings-panel" hidden>
    <p class="theme-settings-title">Settings</p>
    <label class="theme-settings-label" for="theme-select">Appearance</label>
    <select id="theme-select">
      <option value="light">Light mode</option>
      <option value="dark">Dark mode</option>
    </select>
    <p class="theme-settings-help">Choose how Ingodspresence looks on this device.</p>
  </div>
`;

const settingsToggle = themeSettings.querySelector('.theme-settings-toggle');
const settingsPanel = themeSettings.querySelector('.theme-settings-panel');
const themeSelect = themeSettings.querySelector('#theme-select');

settingsToggle.addEventListener('click', () => {
  const isOpen = settingsToggle.getAttribute('aria-expanded') === 'true';
  settingsToggle.setAttribute('aria-expanded', String(!isOpen));
  settingsPanel.hidden = isOpen;

  if (!isOpen) {
    themeSelect.focus();
  }
});

themeSelect.addEventListener('change', () => {
  localStorage.setItem(themeStorageKey, themeSelect.value);
  setTheme(themeSelect.value);
  settingsPanel.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  settingsToggle.focus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && settingsToggle.getAttribute('aria-expanded') === 'true') {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
    settingsToggle.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!themeSettings.contains(event.target)) {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
  }
});

const nav = document.querySelector('.nav');
if (nav) {
  nav.append(themeSettings);
} else {
  themeSettings.classList.add('theme-settings-floating');
  document.body.append(themeSettings);
}
setTheme(document.documentElement.dataset.theme);

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (signupForm && formMessage) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton ? submitButton.textContent : 'Join the Mission';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      const response = await fetch(signupForm.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: signupForm.firstName.value,
          lastName: signupForm.lastName.value,
          email: signupForm.email.value,
          prayerRequest: signupForm.prayerRequest.value,
        }),
      });

      if (response.ok) {
        formMessage.textContent = 'Thank you for joining the mission. Check your inbox for resources and next steps.';
        signupForm.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      formMessage.textContent = 'There was an issue submitting your sign-up. Please try again or email us directly.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
}
