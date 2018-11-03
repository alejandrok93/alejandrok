let arr = [
  'Search for a product',
  'Lets find a product',
  'What is the product',
  'Get that printer',
  'Search for a product',
  'Lets find a product',
  'What is the product',
  'Get that printer',
  'What is the product'
]
// document.addEventListener('DOMContentLoaded', animate, false);

const input = document.querySelectorAll('.search')
console.log(input[0])
const search = input[0]
search.addEventListener('onclick', ()=> {
  console.log('i was clicked')
$('div.display-text p').text('')
})

console.log(input)
async function animate() {
    for(let i=0;i< 5; i++) {
      $('div.display-text p').text(arr[i])
  console.log($('div.display-text p').text(arr[i]))
    
}
}


const delay = ms => new Promise(res => setTimeout(res, ms));