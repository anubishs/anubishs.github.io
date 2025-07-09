

// Initialize particles.js
particlesJS('particles-js', {
    "particles": {
        "number": {
            "value": 80,
            "density": {
                "enable": true,
                "value_area": 800
            }
        },
        "color": {
            "value": "#ffffff"
        },
        "shape": {
            "type": "circle",
            "stroke": {
                "width": 0,
                "color": "#6c5ce7"
            }
        },
        "opacity": {
            "value": 0.5,
            "random": false,
            "anim": {
                "enable": false,
                "speed": 1,
                "opacity_min": 0.1,
                "sync": false
            }
        },
        "size": {
            "value": 3,
            "random": true,
            "anim": {
                "enable": false,
                "speed": 40,
                "size_min": 0.1,
                "sync": false
            }
        },
        "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#00cec9",
            "opacity": 0.4,
            "width": 1
        },
        "move": {
            "enable": true,
            "speed": 1,
            "direction": "none",
            "random": false,
            "straight": false,
            "out_mode": "out",
            "bounce": false,
            "attract": {
                "enable": false,
                "rotateX": 600,
                "rotateY": 1200
            }
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": {
                "enable": true,
                "mode": "repulse"
            },
            "onclick": {
                "enable": true,
                "mode": "push"
            },
            "resize": true
        },
        "modes": {
            "grab": {
                "distance": 400,
                "line_linked": {
                    "opacity": 1
                }
            },
            "bubble": {
                "distance": 400,
                "size": 40,
                "duration": 2,
                "opacity": 8,
                "speed": 3
            },
            "repulse": {
                "distance": 100,
                "duration": 0.4
            },
            "push": {
                "particles_nb": 4
            },
            "remove": {
                "particles_nb": 2
            }
        }
    },
    "retina_detect": true
});
function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

// Project Page JS
$(document).ready(function() {
    // Get project ID from URL
    const getProjectId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    };

    // Fetch project data
    const loadProjectData = async () => {
        const projectId = getProjectId();

        try {
            const response = await fetch('data/projects.json');
            const projects = await response.json();
            const project = projects.find(p => p.id === projectId);

            if (project) {
                renderProject(project);
            } else {
                showError();
            }
        } catch (error) {
            console.error('Error loading project data:', error);
            showError();
        }
    };

    // Show error message
    const showError = () => {
        $('#loader').fadeOut();
        $('#error').css('display', 'flex');
    };

    // Check if value is empty
    const isEmpty = (value) => {
        if (value === null || value === undefined) return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
    };

    // Render project to page
    const renderProject = (project) => {
        // Set main project info
        $('#project-title').text(project.title);
        $('#project-tagline').text(project.tagline);
        document.title = `${project.title} | Anubis Alves`;

        // Set project meta
        const metaContainer = $('#project-meta');
        const metaItems = [
            { icon: 'fas fa-calendar', text: `Lançamento: ${project.releaseDate}`, condition: !isEmpty(project.releaseDate) },
            { icon: 'fas fa-user', text: `Função: ${project.role}`, condition: !isEmpty(project.role) },
            { icon: 'fas fa-clock', text: `Tempo de desenvolvimento: ${project.developmentTime}`, condition: !isEmpty(project.developmentTime) },
            { icon: 'fas fa-download', text: `Downloads: ${project.downloads}`, condition: !isEmpty(project.downloads) }
        ].filter(item => item.condition);

        if (metaItems.length > 0) {
            metaContainer.html(metaItems.map(item => `
                <div class="meta-item">
                    <i class="${item.icon}"></i> ${item.text}
                </div>
            `).join(''));
        } else {
            metaContainer.fadeOut();
        }

        // Set project buttons
        const buttonsContainer = $('#project-buttons');
        const buttons = [
            { text: 'Acesse o projeto', icon: 'fa fa-globe', link: project.liveLink, condition: !isEmpty(project.liveLink) },
            { text: 'Source Code', icon: 'fab fa-github', link: project.sourceLink, condition: !isEmpty(project.sourceLink) }
        ].filter(button => button.condition);

        if (buttons.length > 0) {
            buttonsContainer.html(buttons.map((button, index) => `
                <a href="${button.link}" class="btn ${index > 0 ? 'btn-outline' : ''}" target="_blank">
                    <i class="${button.icon}"></i> ${button.text}
                </a>
            `).join(''));
        } else {
            buttonsContainer.fadeOut();
        }

        // Set project overview
        const overviewContent = $('#project-overview');
        if (!isEmpty(project.overview)) {
            overviewContent.html(project.overview);
        } else {
            $('#overview-title').addClass('hidden');
            overviewContent.addClass('hidden');
        }

        // Set challenges
        const challengesContent = $('#project-challenges');
        if (!isEmpty(project.challenges)) {
            challengesContent.text(project.challenges);
        } else {
            $('#challenges-section').addClass('hidden');
        }

        // Set features
        const featuresContainer = $('#project-features');
        if (!isEmpty(project.features)) {
            featuresContainer.html(project.features.map(feature => `
                <div class="feature-card">
                    <i class="${feature.icon}"></i>
                    <h3>${feature.title}</h3>
                    <p>${feature.description}</p>
                </div>
            `).join(''));
        } else {
            $('#features-section').addClass('hidden');
        }

        // Set tech stack
        const techContainer = $('#project-tech');
        if (!isEmpty(project.techStack)) {
            techContainer.html(project.techStack.map(tech => `
                <span class="tech">${tech}</span>
            `).join(''));
        } else {
            techContainer.addClass('hidden');
        }

        // Set project meta details
        const metaDetailsContainer = $('#project-meta-details');
        const metaDetails = [
            { icon: 'fas fa-code-branch', text: `Versão: ${project.version}`, condition: !isEmpty(project.version) },
            { icon: 'fas fa-download', text: `Tamanho: ${project.size}`, condition: !isEmpty(project.size) },
            { icon: 'fas fa-star', text: `Nota: ${project.rating}`, condition: !isEmpty(project.rating) }
        ].filter(item => item.condition);

        if (metaDetails.length > 0) {
            metaDetailsContainer.html(metaDetails.map(item => `
                <div class="meta-item">
                    <i class="${item.icon}"></i> ${item.text}
                </div>
            `).join(''));
        } else {
            metaDetailsContainer.addClass('hidden');
        }

        // Set team members
        const teamContainer = $('#project-team');
        if (!isEmpty(project.team)) {
            teamContainer.html(project.team.map(member => `
                <div class="team-member">
                    <img src="${member.avatar}" alt="${member.name}">
                    <div>${member.name}</div>
                    <small>${member.role}</small>
                </div>
            `).join(''));
        } else {
            $('#team-card').addClass('hidden');
        }

        // Set awards
        const awardsCard = $('#awards-card');
        if (!isEmpty(project.awards)) {
            awardsCard.html(`
                <h3>Premiações</h3>
                <ul class="awards-list">
                    ${project.awards.map(award => `<li>${award}</li>`).join('')}
                </ul>
            `);
        } else {
            awardsCard.addClass('hidden');
        }

        // Set download buttons
        const downloadCard = $('#download-card');
        if (!isEmpty(project.platforms)) {
            downloadCard.html(`
                <h3>Baixe agora</h3>
                <p>Disponível nas plataformas:</p>
                <div class="platforms-container">
                    ${project.platforms.map(platform => `
                        <a href="${platform.link}" class="btn platform-btn" target="_blank">
                            <i class="${platform.icon}"></i>
                            ${platform.name}
                        </a>
                    `).join('')}
                </div>
            `);
        } else {
            downloadCard.addClass('hidden');
        }

        // Set gallery items
        const galleryContainer = $('#project-gallery');
        if (!isEmpty(project.gallery)) {
            galleryContainer.html(project.gallery.map(item => {
                if (item.type === 'image') {
                    return `
                        <div class="gallery-item" data-caption="${item.caption}">
                            <img src="${item.url}" alt="${item.caption}">
                        </div>
                    `;
                } else {
                    // Check if it's a YouTube video
                    if (isYouTubeUrl(item.videoUrl)) {
                        const youtubeId = item.videoUrl;
                        return `
                            <div class="gallery-item video youtube" 
                                data-video-id="${youtubeId}">
                                <img src="${item.thumbnail}" alt="${item.caption}">
                            </div>
                        `;
                    } else {
                        return `
                            <div class="gallery-item video" 
                                data-video="${item.videoUrl}">
                                <img src="${item.thumbnail}" alt="${item.caption}">
                            </div>
                        `;
                    }
                }
            }).join(''));

            // Add click handlers using jQuery
            $('.gallery-item').on('click', function() {
                const $item = $(this);
                
                if ($item.hasClass('video')) {
                    if ($item.hasClass('youtube')) {
                        const videoId = $item.data('video-id').split('com/')[1];
                        openYouTubeModal(videoId);
                    } else {
                        const videoUrl = $item.data('video');
                        openModal(videoUrl);
                    }
                } else {
                    const imgUrl = $item.find('img').attr('src');
                    const caption = $item.data('caption'); // Get caption from data attribute
                    openImageModal(imgUrl, caption);
                }
            });
        } else {
            $('#gallery-section').addClass('hidden');
        }

        // Hide loader and show content
        $('#loader').fadeOut();
        $('#project-content').fadeIn();
    };

    // Video Modal Functions
    const openModal = (videoUrl) => {
        const $modal = $('#videoModal');
        const $modalContent = $modal.find('.modal-content');
        
        $modalContent.html(`
            <span class="close-modal" id="closeModal">&times;</span>
            <video id="projectVideo" controls autoplay>
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `);
        
        $modal.fadeIn();
        $modal.css("display", "flex")
        const video = document.getElementById('projectVideo');
        video.play();
        
        $('#closeModal').on('click', () => closeModal());
    };

    const closeModal = () => {
        const $modal = $('#videoModal');
        if (!$modal.hasClass("youtube")) {
            const video = document.getElementById('projectVideo');
            if (video) video.pause();
        }
        $modal.removeClass("youtube");
        $modal.find('.modal-content').empty();
        $modal.fadeOut();
    };
    
    const closeModalImage = () => {
        $('#galleryModal').fadeOut();
    };

    // YouTube modal
    function openYouTubeModal(videoId) {
        const $modal = $('#videoModal');
        $modal.addClass("youtube");
        const $modalContent = $modal.find('.modal-content');
        
        $modalContent.html(`
            <span class="close-modal" id="closeModal">&times;</span>
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `);
        
        $modal.fadeIn();
        $modal.css("display", "flex")
        $('#closeModal').on('click', () => closeModal());
    }

    // Image modal
    function openImageModal(imgUrl, caption) {
        const $modal = $('#galleryModal');
        const $modalContent = $modal.find('.modal-content');
        
        $modalContent.html(`
            <span class="close-modal" id="closeModalImage">&times;</span>
            <img src="${imgUrl}" class="modal-image">
            ${caption ? `<div class="image-caption">${caption}</div>` : ''}
        `);
        
        $modal.fadeIn();
        $modal.css("display", "flex")
        $('#closeModalImage').on('click', () => closeModalImage());
    }

    // Close modal when clicking outside
    $(window).on('click', function(event) {
        const $videoModal = $('#videoModal');
        if (event.target === $videoModal[0]) {
            closeModal();
        }
        
        const $galleryModal = $('#galleryModal');
        if (event.target === $galleryModal[0]) {
            closeModalImage();
        }
    });

    // Initialize
    loadProjectData();
    
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
});