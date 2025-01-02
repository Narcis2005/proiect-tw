const burger = document.querySelector(".burger");
const nav = document.querySelector(".menu");

burger.addEventListener("click", (e) => {
  nav.classList.toggle("open");
})