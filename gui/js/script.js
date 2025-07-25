// const swiper = new Swiper('.swiper-container', {
//   loop: true,
//   spaceBetween: 0,
//   slidesPerView: 3,
//   centeredSlides: false,
//   autoplay: {
//     delay: 10000,
//     disableOnInteraction: false,
//   },
//   navigation: {
//     nextEl: '.swiper-button-next',
//     prevEl: '.swiper-button-prev',
//   },
//   breakpoints: {
//     768: {
//       slidesPerView: 2,
//     },
//     1024: {
//       slidesPerView: 3,
//     }
//   }
// });
const swiper = new Swiper('.swiper-container', {
  effect: "cards",
  grabCursor: true,
  // loop: true,
  cardsEffect: {
    slideShadows: false,
    perSlideOffset: 15, // Space between cards in px
    // perSlideRotate: 1, // Rotation of cards in degrees
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
});
swiper.slideTo(2, 0)
