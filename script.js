const yearEl = document.getElementById('year');
const signupForm = document.getElementById('signup-form');
const formMessage = document.getElementById('form-message');
const emailInput = document.getElementById('email-input');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (signupForm && formMessage) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton ? submitButton.textContent : 'Notify Me';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      if (!window.emailjs) {
        throw new Error('EmailJS is not loaded');
      }

      const result = await window.emailjs.send(
        'service_jj8s2v7',
        'template_n7wqj2e',
        {
          email: emailInput ? emailInput.value : '',
        }
      );

      if (result?.status === 200) {
        formMessage.textContent = 'Thank you for joining the movement. We will be in touch soon.';
        signupForm.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      formMessage.textContent = 'Your submission is being processed. Please check your inbox shortly.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
}
