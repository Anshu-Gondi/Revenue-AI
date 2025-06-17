import './About.css'

export function renderAboutPage() {
  return `
    <section class="about-section">
      <h1 class="about-title">About Me</h1>
      <p class="about-text">
        I am a passionate <strong>Full-Stack Developer</strong> and <strong>Data Scientist</strong> with expertise in building
        dynamic web applications and predictive models. I blend creativity with logic to bring ideas to life.
      </p>
      
      <h2 class="about-subheading">⚙️ Skills</h2>
      <ul class="skills-list">
        <li>💻 Full-Stack Development (HTML, CSS, JS, TypeScript, Node.js, Django)</li>
        <li>📊 Data Science (Python, Pandas, Scikit-learn, Matplotlib)</li>
        <li>🧠 AI & Predictive Modeling (Regression, Classification, NLP)</li>
      </ul>

      <div class="links">
        <a class="link-button" href="https://www.youtube.com/@ag_youtube" target="_blank">🎥 YouTube</a>
        <a class="link-button" href="https://github.com/Anshu-Gondi" target="_blank">💻 GitHub</a>
      </div>
    </section>
  `;
}
