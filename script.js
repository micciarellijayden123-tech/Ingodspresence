const yearEl = document.getElementById('year');
const signupForm = document.getElementById('signup-form');
const formMessage = document.getElementById('form-message');

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
