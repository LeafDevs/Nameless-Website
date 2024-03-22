const phrase = "root:password";

console.log(phrase.match('[^:]*$')[0]);
console.log(phrase.match('[^:]*')[0])