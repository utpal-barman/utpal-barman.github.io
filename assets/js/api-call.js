// Also this can be a way
// const response = async () => await (await (fetch('https://api.github.com/users/utpal-barman/repos'))).json()

let data;

const url = 'https://api.github.com/users/utpal-barman/repos';
const response = fetch(url)
  .then((response) => response.json())
  .catch((err) => console.log(err));

response.then((data) => {
  for (i = 0; i < data.length; i++) {
    appendProjectCard(data[i].name, data[i].html_url, data[i].description, i);
  }
  $('#u-carousel').slick({
    dots: false,
    speed: 700,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    appendArrows: $('#u-carousel'),
    slidesToShow: 3,
    slidesToScroll: 2,
    responsive: [
      {
        breakpoint: 981,
        settings: {
          arrows: false,
          centerPadding: '40px',
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          centerPadding: '40px',
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  });
  // end of slide init
});

function appendProjectCard(name, link, description, i) {
  $('#u-carousel').append(`
        <div class="u-carousel-item p-4 card m-2 u-card">
            <span class="u-text-brand font-weight-bold"> ${name}</span > 
            <hr>
            <div style="height: 100px;">
                <span class="w-date">${description}</span>

            </div>

            <a target="_blank"
                class="btn btn-outline-dark px-3 py-2 text-uppercase"
                target="_blank" href="${link}"
                rel="noreferrer">
                Project Details
            </a>

        </div>
    
    
    `);

  console.log(name, link, description);
}
