const pageNumber = document.querySelector('.page-number');
const sections = document.querySelectorAll('section');

const sectionNumbers = {
  home: '01',
  about: '02',
  skills: '03',
  projects: '04',
  contact: '05'
};

function updatePageNumber() {
  let current = 'home';

  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
      current = section.id;
    }
  });

  pageNumber.textContent = sectionNumbers[current];
}

window.addEventListener('scroll', updatePageNumber);
updatePageNumber();

// Smooth scroll
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href'))
      .scrollIntoView({ behavior: 'smooth' });
  });
});

function analyseForm() {
  alert("Merci pour votre message ! Je vous répondrai dès que possible.");
}