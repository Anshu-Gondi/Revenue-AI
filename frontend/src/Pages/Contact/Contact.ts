import './Contact.css';
import { showToast } from '../../Components/Toast/Toast';

export function renderContactPage() {
  setTimeout(() => {
    const form = document.getElementById('contactForm') as HTMLFormElement | null;
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
      };

      try {
        const response = await fetch('http://127.0.0.1:8000/api/contact/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (response.ok) {
          showToast(result.message || "Message sent successfully!", 'success');
          form.reset(); // Clear form on success
        } else {
          showToast(result.error || "Something went wrong.", 'error');
        }
      } catch {
        showToast("Error connecting to server.", 'error');
      }
    });
  }, 0);

  return `
    <section class="contact-section">
      <h1 class="contact-title">Contact Me</h1>
      <p class="contact-text">
        I'd love to hear from you — whether it's a project idea, collaboration, or just a friendly hello!
      </p>
      <form id="contactForm" class="contact-form">
        <input type="text" name="name" placeholder="Your Name" required />
        <input type="email" name="email" placeholder="Your Email" required />
        <textarea name="message" placeholder="Your Message" rows="5" required></textarea>
        <button type="submit" class="contact-button">Send Message</button>
      </form>
      <p class="email-hint">
        Or email me directly at <a href="mailto:agondi982@gmail.com">agondi982@gmail.com</a>
      </p>
    </section>
  `;
}
