const yearEl = document.getElementById('year');
const signupForm = document.getElementById('signup-form');
const formMessage = document.getElementById('form-message');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (signupForm && formMessage) {
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formMessage.textContent = 'Thank you for joining the movement. We will be in touch soon.';
    signupForm.reset();
  });
}
