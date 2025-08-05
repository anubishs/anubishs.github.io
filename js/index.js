
// Initialize particles.js
particlesJS('particles-js', {
    particles: {
        number: {
            value: 200,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: '#6c5ce7'
        },
        shape: {
            type: 'triangle',
            stroke: {
                width: 2,
                color: '#bcb8d7'
            }
        },
        opacity: {
            value: 0.5,
            random: true,
            anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 3,
            random: true,
            anim: {
                enable: true,
                speed: 2,
                size_min: 0.1,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 50,
            color: '#6c5ce7',
            opacity: 0.4,
            width: 2
        },
        move: {
            enable: true,
            speed: 1,
            direction: 'none',
            random: true,
            straight: false,
            out_mode: 'out',
            bounce: false
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: {
                enable: true,
                mode: 'grab'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 140,
                line_linked: {
                    opacity: 1
                }
            },
            push: {
                particles_nb: 4
            }
        }
    },
    retina_detect: true
});

// Smooth scrolling for navigation links
$('a[href^="#"]').on('click', function(e) {
    e.preventDefault();
    const target = $(this.getAttribute('href'));
    if (target.length) {
        $('html, body').animate({
            scrollTop: target.offset().top
        }, 800);
    }
});
// // jQuery version of the commented form submission
// $('.contact-form form').on('submit', function(e) {
//     e.preventDefault();
    
//     // Form validation
//     const name = $('#name').val();
//     const email = $('#email').val();
//     const message = $('#message').val();
    
//     if (!name || !email || !message) {
//         alert('Please fill in all required fields');
//         return;
//     }
    
//     // Simple email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         alert('Please enter a valid email address');
//         return;
//     }
    
//     // Here you would normally send the form data to your server
//     // For now, we'll just show a success message
//     alert('Message sent successfully! I\'ll get back to you soon.');
//     this.reset();
// });

$(document).ready(function () {
    fetch('data/projects.json')
        .then(response => response.json())
        .then(projects => {
            const container = $('#projects-container');

            const projectCards = projects.slice(0, 6).map(project => {
                const hasCover = Boolean(project.projectCover && project.projectCover.trim());
                
                const backgroundStyle = hasCover
                    ? `background-image: url('${project.projectCover}'); background-size: cover; background-position: center;`
                    : `background: linear-gradient(45deg, ${project.color1}, ${project.color2});`;

                const iconMarkup = hasCover ? '' : `<i class="${project.icon}"></i>`;

                const techStackMarkup = project.techStack
                    .slice(0, 6)
                    .map(tech => `<span class="tech">${tech}</span>`)
                    .join('');

                return `
                    <div class="project-card">
                        <div class="project-img" style="${backgroundStyle}">
                            ${iconMarkup}
                        </div>
                        <div class="project-content">
                            <h3>${project.title}</h3>
                            <p>${project.shortDescription}</p>
                            <div class="tech-stack">
                                ${techStackMarkup}
                            </div>
                            <a href="project.html?id=${project.id}" class="btn">Ver Projeto</a>
                        </div>
                    </div>
                `;
            }).join('');

            container.html(projectCards);
        })
        .catch(error => console.error('Error loading projects:', error));
});
